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

  // A word counts as mastered once its review interval reaches three weeks.
  const MASTERED_DAYS = 21;
  // New words pause when this many reviews per daily new word are waiting…
  const BACKLOG_PER_NEW_WORD = 10;
  // …or when this many in-progress words per daily new word are active.
  // At steady state roughly 13 days' worth of new words are in progress, so
  // this only bites when someone falls well behind.
  const ACTIVE_PER_NEW_WORD = 15;

  // Words marked "known" leave regular review; they come back for a quick
  // check-in about twice a year.
  const KNOWN_CHECK_IN_DAYS = 180;

  function stageOf(word) {
    if (word.known) {
      return "known";
    }
    const review = migrateReview(word.review);
    if (review.state === STATES.new) {
      return "new";
    }
    if (review.state === STATES.review) {
      return review.scheduled_days >= MASTERED_DAYS ? "mastered" : "reviewing";
    }
    return "learning";
  }

  function startOfDay(now) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }

  // What to study now. Reviews that are due always come first. New words are
  // introduced up to the daily allowance, and pause when reviews pile up or
  // too many words are still in progress (mastering words frees room). The
  // total number of saved words is never limited.
  function getStudyQueue(words, settings = {}, now = Date.now()) {
    const perDay = Math.max(1, settings.newWordsPerDay || 10);
    const reviews = [];
    const waiting = [];
    let active = 0;
    let introducedToday = 0;
    const today = startOfDay(now);

    words.forEach((word) => {
      const stage = stageOf(word);
      if (stage === "known") {
        if ((word.review?.due ?? 0) <= now) {
          reviews.push(word);
        }
        return;
      }
      if (word.firstReviewedAt >= today) {
        introducedToday += 1;
      }
      if (stage === "new") {
        waiting.push(word);
        return;
      }
      if (stage === "learning" || stage === "reviewing") {
        active += 1;
      }
      if ((word.review?.due ?? 0) <= now) {
        reviews.push(word);
      }
    });

    reviews.sort((a, b) => a.review.due - b.review.due);
    waiting.sort((a, b) => a.savedAt - b.savedAt);

    let allowance = Math.max(0, perDay - introducedToday);
    let limitReason = null;
    if (reviews.length >= perDay * BACKLOG_PER_NEW_WORD) {
      allowance = 0;
      limitReason = "backlog";
    } else if (active >= perDay * ACTIVE_PER_NEW_WORD) {
      allowance = 0;
      limitReason = "active";
    } else if (waiting.length > allowance) {
      limitReason = "daily";
    }

    return {
      reviews,
      newWords: waiting.slice(0, allowance),
      waiting: waiting.length,
      active,
      activeLimit: perDay * ACTIVE_PER_NEW_WORD,
      introducedToday,
      limitReason: waiting.length ? limitReason : null
    };
  }

  // Applies a new review state, noting when a word first leaves "new".
  function applyReview(word, review, now) {
    if (!word.firstReviewedAt && migrateReview(word.review).state === STATES.new && review.state !== STATES.new) {
      word.firstReviewedAt = now;
    }
    word.review = review;
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
    stageOf,
    getStudyQueue,
    MASTERED_DAYS,
    KNOWN_CHECK_IN_DAYS,

    async get(headword) {
      const words = await readAll();
      return words[normalizeHeadword(headword)] || null;
    },

    // Marks a word known (saving it first if needed) or returns it to study.
    // Known words skip regular review apart from a check-in every ~6 months;
    // un-marking sends the word back to New.
    async setKnown(word, known) {
      const headword = normalizeHeadword(word.headword);
      if (!headword) {
        return null;
      }
      const words = await readAll();
      const now = Date.now();
      const existing = words[headword];
      const gloss = word.gloss ?? snapshotGloss(word.glosses);
      const record = existing || {
        headword,
        gloss: gloss || "",
        source: word.source || null,
        savedAt: now,
        review: newReviewState(now)
      };
      record.known = Boolean(known);
      record.review = known
        ? { ...migrateReview(record.review, now), due: now + KNOWN_CHECK_IN_DAYS * DAY }
        : newReviewState(now);
      if (!known) {
        delete record.firstReviewedAt;
      }
      words[headword] = record;
      await writeAll(words);
      return record;
    },

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

    // getStudyQueue() over the stored words.
    async studyQueue(settings, now = Date.now()) {
      return getStudyQueue(await this.getAll(), settings, now);
    },

    // Stores an already-computed review state (e.g. one shown in a preview),
    // optionally changing other fields such as `known` at the same time.
    async setReview(headword, review, changes = {}) {
      const words = await readAll();
      const word = words[normalizeHeadword(headword)];
      if (!word) {
        return null;
      }
      Object.assign(word, changes);
      applyReview(word, review, Date.now());
      await writeAll(words);
      return word;
    },

    async recordReview(headword, grade, now = Date.now(), options) {
      const words = await readAll();
      const word = words[normalizeHeadword(headword)];
      if (!word) {
        return null;
      }
      applyReview(word, schedule(word.review, grade, now, options), now);
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
