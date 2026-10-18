(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});

  // Saved words live in chrome.storage.local (sync storage is capped at
  // ~100 KB, too small for a growing list with review history), under one key
  // holding a map of headword -> record.
  const STORAGE_KEY = "savedWords";
  const GLOSS_SNAPSHOT_LENGTH = 160;
  const MINUTE = 60 * 1000;
  const DAY = 24 * 60 * MINUTE;

  // Review grades, in button order.
  const GRADES = { again: 0, hard: 1, good: 2, easy: 3 };

  function newReviewState(now) {
    return { due: now, interval: 0, ease: 2.5, reps: 0, lapses: 0, last: null };
  }

  // A small SM-2 variant. `interval` is in days; "again" re-queues the card
  // ten minutes out and restarts its streak.
  function schedule(review, grade, now = Date.now()) {
    const current = { ...newReviewState(now), ...review };
    const next = { ...current, last: now };

    if (grade === GRADES.again) {
      next.reps = 0;
      next.lapses = current.lapses + 1;
      next.ease = Math.max(1.3, current.ease - 0.2);
      next.interval = 0;
      next.due = now + 10 * MINUTE;
      return next;
    }

    let interval;
    if (grade === GRADES.hard) {
      interval = current.reps === 0 ? 1 : Math.max(1, current.interval * 1.2);
      next.ease = Math.max(1.3, current.ease - 0.15);
    } else if (grade === GRADES.easy) {
      interval = current.reps === 0 ? 4 : Math.max(current.interval + 1, current.interval * current.ease * 1.3);
      next.ease = current.ease + 0.15;
    } else {
      interval = current.reps === 0 ? 1 : current.reps === 1 ? 3 : Math.max(current.interval + 1, current.interval * current.ease);
    }

    next.reps = current.reps + 1;
    next.interval = Math.round(interval);
    next.due = now + next.interval * DAY;
    return next;
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
    schedule,
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

    async recordReview(headword, grade, now = Date.now()) {
      const words = await readAll();
      const word = words[normalizeHeadword(headword)];
      if (!word) {
        return null;
      }
      word.review = schedule(word.review, grade, now);
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
