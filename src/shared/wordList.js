(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});

  // Saved words live in chrome.storage.local (sync storage is capped at
  // ~100 KB, too small for a growing list with review history), under one key
  // holding a map of headword -> record.
  const STORAGE_KEY = "savedWords";
  const GLOSS_SNAPSHOT_LENGTH = 160;
  const DAY = 24 * 60 * 60 * 1000;

  // Review grades, in button order, and their FSRS ratings (Again=1 … Easy=4).
  const GRADES = { again: 0, hard: 1, good: 2, easy: 3 };
  const FSRS_RATINGS = [1, 2, 3, 4];
  // FSRS card states.
  const STATES = { new: 0, learning: 1, review: 2, relearning: 3 };

  const DEFAULT_RETENTION = 0.9;
  const MAXIMUM_INTERVAL_DAYS = 3650;

  const schedulers = new Map();

  // Scheduling uses ts-fsrs (src/shared/ts-fsrs.js), loaded only by pages
  // that review cards; saving words works without it.
  function getScheduler({ retention = DEFAULT_RETENTION, fuzz = true } = {}) {
    const FSRS = globalThis.FSRS;
    if (!FSRS) {
      throw new Error("ts-fsrs is not loaded on this page.");
    }
    const key = `${retention}|${fuzz}`;
    if (!schedulers.has(key)) {
      schedulers.set(
        key,
        FSRS.fsrs(
          FSRS.generatorParameters({
            request_retention: retention,
            maximum_interval: MAXIMUM_INTERVAL_DAYS,
            enable_fuzz: fuzz
          })
        )
      );
    }
    return schedulers.get(key);
  }

  function newReviewState(now) {
    return {
      due: now,
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      learning_steps: 0,
      state: STATES.new,
      last_review: null
    };
  }

  // Records saved before FSRS used an SM-2 variant ({ due, interval, ease,
  // reps, lapses, last }). Convert them, keeping each word's due date and
  // treating its interval as memory stability.
  function migrateReview(review, now = Date.now()) {
    if (!review) {
      return newReviewState(now);
    }
    if ("stability" in review) {
      return { ...newReviewState(now), ...review };
    }

    const reviewed = review.reps > 0;
    const interval = Math.max(0, review.interval || 0);
    const ease = review.ease || 2.5;
    return {
      ...newReviewState(now),
      due: review.due ?? now,
      stability: reviewed ? Math.max(interval, 0.5) : 0,
      difficulty: reviewed ? Math.min(10, Math.max(1, 5 - (ease - 2.5) * 4)) : 0,
      scheduled_days: interval,
      reps: review.reps || 0,
      lapses: review.lapses || 0,
      state: reviewed ? STATES.review : STATES.new,
      last_review: reviewed ? review.last ?? (review.due ?? now) - interval * DAY : null
    };
  }

  function toCard(review, now) {
    const state = migrateReview(review, now);
    return {
      ...state,
      due: new Date(state.due),
      last_review: state.last_review ? new Date(state.last_review) : undefined
    };
  }

  function fromCard(card) {
    return {
      due: card.due.getTime(),
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: card.elapsed_days,
      scheduled_days: card.scheduled_days,
      reps: card.reps,
      lapses: card.lapses,
      learning_steps: card.learning_steps,
      state: card.state,
      last_review: card.last_review ? card.last_review.getTime() : null
    };
  }

  // Next review state after answering with `grade`. options: { retention, fuzz }.
  function schedule(review, grade, now = Date.now(), options) {
    const result = getScheduler(options).next(toCard(review, now), new Date(now), FSRS_RATINGS[grade]);
    return fromCard(result.card);
  }

  // The review state each grade would produce, as { again, hard, good, easy }.
  function previewSchedule(review, now = Date.now(), options) {
    const outcomes = getScheduler(options).repeat(toCard(review, now), new Date(now));
    return Object.fromEntries(
      Object.entries(GRADES).map(([name, grade]) => [name, fromCard(outcomes[FSRS_RATINGS[grade]].card)])
    );
  }

  function normalizeHeadword(headword) {
    return extension.tibetan ? extension.tibetan.normalizeLookupKey(headword || "") : (headword || "").trim();
  }

  function snapshotGloss(glosses) {
    const text = [...new Set((glosses || []).filter(Boolean))].join("; ");
    return text.length > GLOSS_SNAPSHOT_LENGTH ? `${text.slice(0, GLOSS_SNAPSHOT_LENGTH - 1).trimEnd()}…` : text;
  }

  async function readAll() {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const words = stored[STORAGE_KEY];
    return words && typeof words === "object" ? words : {};
  }

  async function writeAll(words) {
    await chrome.storage.local.set({ [STORAGE_KEY]: words });
  }

  extension.wordList = {
    GRADES,
    STATES,
    schedule,
    previewSchedule,
    migrateReview,
    snapshotGloss,

    // All saved words, newest first.
    async getAll() {
      const words = await readAll();
      return Object.values(words).sort((a, b) => b.savedAt - a.savedAt);
    },

    async has(headword) {
      const words = await readAll();
      return Boolean(words[normalizeHeadword(headword)]);
    },

    // word: { headword, glosses?, gloss?, source?: { url, title } }
    async save(word) {
      const headword = normalizeHeadword(word.headword);
      if (!headword) {
        return null;
      }

      const words = await readAll();
      const now = Date.now();
      const existing = words[headword];
      const gloss = word.gloss ?? snapshotGloss(word.glosses);
      words[headword] = {
        headword,
        gloss: gloss || existing?.gloss || "",
        source: word.source || existing?.source || null,
        savedAt: existing?.savedAt || now,
        review: existing?.review || newReviewState(now)
      };
      await writeAll(words);
      return words[headword];
    },

    // Puts back a full record (e.g. to undo a removal), keeping its review history.
    async restore(record) {
      const words = await readAll();
      words[record.headword] = record;
      await writeAll(words);
    },

    async remove(headword) {
      const words = await readAll();
      delete words[normalizeHeadword(headword)];
      await writeAll(words);
    },

    // Saves the word if absent, removes it if present; resolves to the new saved state.
    async toggle(word) {
      if (await this.has(word.headword)) {
        await this.remove(word.headword);
        return false;
      }
      await this.save(word);
      return true;
    },

    async getDue(now = Date.now()) {
      const words = await this.getAll();
      return words.filter((word) => (word.review?.due ?? 0) <= now).sort((a, b) => a.review.due - b.review.due);
    },

    // Stores an already-computed review state (e.g. one shown in a preview).
    async setReview(headword, review) {
      const words = await readAll();
      const word = words[normalizeHeadword(headword)];
      if (!word) {
        return null;
      }
      word.review = review;
      await writeAll(words);
      return word;
    },

    async recordReview(headword, grade, now = Date.now(), options) {
      const words = await readAll();
      const word = words[normalizeHeadword(headword)];
      if (!word) {
        return null;
      }
      word.review = schedule(word.review, grade, now, options);
      await writeAll(words);
      return word;
    },

    // Calls listener(words) with the full list whenever saved words change.
    onChanged(listener) {
      const handler = (changes, areaName) => {
        if (areaName === "local" && changes[STORAGE_KEY]) {
          this.getAll().then(listener).catch(() => {});
        }
      };
      chrome.storage.onChanged.addListener(handler);
      return () => chrome.storage.onChanged.removeListener(handler);
    }
  };
})();
