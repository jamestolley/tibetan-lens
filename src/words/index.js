(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});

  const MINUTE = 60 * 1000;
  const DAY = 24 * 60 * MINUTE;
  const GRADE_KEYS = { 1: "again", 2: "hard", 3: "good", 4: "easy" };
  // Cards whose next review falls within this window return later in the same session.
  const IN_SESSION_WINDOW = 20 * MINUTE;

  const ui = {};
  const state = {
    words: [],
    // Active flashcard session: { practice, queue, total, done, current, revealed }
    review: null
  };

  function getControls() {
    ui.filter = document.getElementById("wordsFilter");
    ui.sort = document.getElementById("wordsSort");
    ui.exportButton = document.getElementById("wordsExport");
    ui.count = document.getElementById("wordsCountValue");
    ui.status = document.getElementById("wordsStatus");
    ui.list = document.getElementById("wordsList");
    ui.listView = document.getElementById("listView");
    ui.startReview = document.getElementById("startReview");
    ui.reviewView = document.getElementById("reviewView");
    ui.reviewProgress = document.getElementById("reviewProgress");
    ui.reviewEnd = document.getElementById("reviewEnd");
    ui.reviewPracticeNote = document.getElementById("reviewPracticeNote");
    ui.reviewSession = document.getElementById("reviewSession");
    ui.reviewCard = document.getElementById("reviewCard");
    ui.reviewHeadword = document.getElementById("reviewHeadword");
    ui.reviewAnswer = document.getElementById("reviewAnswer");
    ui.reviewRomanization = document.getElementById("reviewRomanization");
    ui.reviewGloss = document.getElementById("reviewGloss");
    ui.reviewShow = document.getElementById("reviewShow");
    ui.reviewGrades = document.getElementById("reviewGrades");
    ui.gradeButtons = [...ui.reviewGrades.querySelectorAll("[data-grade]")];
    ui.reviewDone = document.getElementById("reviewDone");
    ui.reviewDoneMessage = document.getElementById("reviewDoneMessage");
    ui.reviewNextDue = document.getElementById("reviewNextDue");
    ui.reviewBack = document.getElementById("reviewBack");
  }

  function createElement(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text !== undefined) {
      node.textContent = text;
    }
    return node;
  }

  function uiLanguage() {
    try {
      return chrome.i18n.getUILanguage();
    } catch (_e) {
      return undefined;
    }
  }

  function formatDate(timestamp) {
    return new Intl.DateTimeFormat(uiLanguage(), { dateStyle: "medium" }).format(new Date(timestamp));
  }

  // Dates less than a day away also show the time (e.g. a card failed with
  // "Again" comes back in ten minutes).
  function formatDueDate(timestamp) {
    const options = timestamp - Date.now() < DAY ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" };
    return new Intl.DateTimeFormat(uiLanguage(), options).format(new Date(timestamp));
  }

  function formatInterval(ms) {
    const minutes = Math.round(ms / MINUTE);
    const [value, unit] = minutes < 24 * 60 ? [Math.max(1, minutes), "minute"] : [Math.round(ms / DAY), "day"];
    return new Intl.NumberFormat(uiLanguage(), { style: "unit", unit, unitDisplay: "short" }).format(value);
  }

  function isDue(word, now = Date.now()) {
    return (word.review?.due ?? 0) <= now;
  }

  function dictionaryUrl(headword) {
    return `dictionary.html?q=${encodeURIComponent(headword)}`;
  }

  function sortWords(words) {
    const sorted = [...words];
    if (ui.sort.value === "oldest") {
      sorted.sort((a, b) => a.savedAt - b.savedAt);
    } else if (ui.sort.value === "due") {
      sorted.sort((a, b) => (a.review?.due ?? 0) - (b.review?.due ?? 0));
    } else {
      sorted.sort((a, b) => b.savedAt - a.savedAt);
    }
    return sorted;
  }

  function matchesFilter(word, query) {
    if (!query) {
      return true;
    }
    return [word.headword, word.gloss, extension.tibetan.toWylie(word.headword)]
      .filter(Boolean)
      .some((text) => text.toLowerCase().includes(query));
  }

  function renderMeta(word) {
    const meta = createElement("p", "word-meta");
    meta.appendChild(
      createElement("span", "", `${extension.i18n.getMessage("wordsSavedOn")} ${formatDate(word.savedAt)}`)
    );

    const due = word.review?.due ?? 0;
    const isDue = due <= Date.now();
    meta.appendChild(
      createElement(
        "span",
        isDue ? "is-due" : "",
        `${extension.i18n.getMessage("wordsNextReview")} ${
          isDue ? extension.i18n.getMessage("wordsDueNow") : formatDate(due)
        }`
      )
    );

    if (word.source?.url) {
      const from = createElement("span", "", `${extension.i18n.getMessage("wordsFrom")} `);
      const link = createElement("a", "", word.source.title || word.source.url);
      link.href = word.source.url;
      link.target = "_blank";
      link.rel = "noopener";
      from.appendChild(link);
      meta.appendChild(from);
    }
    return meta;
  }

  function renderWord(word) {
    const card = createElement("article", "result-card");
    const head = createElement("div", "result-head");

    const headword = createElement("a", "result-headword", word.headword);
    headword.lang = "bo";
    headword.href = dictionaryUrl(word.headword);
    headword.title = extension.i18n.getMessage("dictionaryLookUpWord");
    head.appendChild(headword);

    const extras = createElement("div", "result-extras");
    const wylie = extension.tibetan.toWylie(word.headword);
    if (wylie) {
      extras.appendChild(createElement("span", "result-wylie", wylie));
    }
    const phonetic = extension.tibetan.toPhonetic(word.headword);
    if (phonetic) {
      extras.appendChild(createElement("span", "result-phonetic", phonetic));
    }
    head.appendChild(extras);

    const remove = createElement("button", "word-remove", "✕");
    remove.type = "button";
    remove.title = extension.i18n.getMessage("wordsRemove");
    remove.setAttribute("aria-label", `${extension.i18n.getMessage("wordsRemove")}: ${word.headword}`);
    remove.addEventListener("click", () => removeWord(word));
    head.appendChild(remove);
    card.appendChild(head);

    if (word.gloss) {
      card.appendChild(createElement("p", "word-gloss", word.gloss));
    }
    card.appendChild(renderMeta(word));
    return card;
  }

  function render() {
    const query = ui.filter.value.trim().toLowerCase();
    const visible = sortWords(state.words).filter((word) => matchesFilter(word, query));

    ui.count.textContent = String(state.words.length);
    ui.exportButton.disabled = !state.words.length;

    const dueCount = state.words.filter((word) => isDue(word)).length;
    ui.startReview.hidden = !state.words.length;
    ui.startReview.textContent = dueCount
      ? `${extension.i18n.getMessage("wordsReview")} (${dueCount})`
      : extension.i18n.getMessage("wordsPractice");
    ui.list.replaceChildren(...visible.map(renderWord));

    if (!state.words.length) {
      ui.list.appendChild(createElement("p", "words-empty", extension.i18n.getMessage("wordsEmpty")));
    } else if (!visible.length) {
      ui.list.appendChild(createElement("p", "words-empty", extension.i18n.getMessage("wordsNoMatches")));
    }
  }

  // Removal is immediate; the status line offers an undo that restores the
  // full record, review history included.
  async function removeWord(word) {
    await extension.wordList.remove(word.headword);
    ui.status.replaceChildren(document.createTextNode(`${extension.i18n.getMessage("wordsRemoved")} `));
    const undo = createElement("button", "words-link-button", extension.i18n.getMessage("wordsUndo"));
    undo.type = "button";
    undo.addEventListener("click", async () => {
      await extension.wordList.restore(word);
      ui.status.replaceChildren();
    });
    ui.status.appendChild(undo);
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  // Export as UTF-8 CSV (with a BOM so spreadsheet apps detect the encoding).
  // The Tibetan and Definition columns also import cleanly into Anki.
  function exportCsv() {
    const header = ["Tibetan", "Wylie", "Phonetic", "Definition", "Saved", "Source"];
    const rows = sortWords(state.words).map((word) => [
      word.headword,
      extension.tibetan.toWylie(word.headword),
      extension.tibetan.toPhonetic(word.headword),
      word.gloss,
      new Date(word.savedAt).toISOString().slice(0, 10),
      word.source?.url || ""
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
    const link = createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `teahouse-tibetan-words-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
  }

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // Review the words that are due, oldest due first. With nothing due, offer
  // a practice round over every word that leaves the schedule untouched.
  function startReview() {
    const now = Date.now();
    const due = state.words.filter((word) => isDue(word, now)).sort((a, b) => a.review.due - b.review.due);
    const practice = due.length === 0;
    const cards = practice ? shuffle(state.words) : due;
    if (!cards.length) {
      return;
    }

    state.review = { practice, queue: cards.map((word) => word.headword), total: cards.length, done: 0, current: null, revealed: false };
    ui.listView.hidden = true;
    ui.reviewView.hidden = false;
    ui.reviewSession.hidden = false;
    ui.reviewDone.hidden = true;
    ui.reviewPracticeNote.hidden = !practice;
    showNextCard();
  }

  function showNextCard() {
    const session = state.review;
    let word = null;
    // Skip words removed (e.g. in another tab) since the session started.
    while (session.queue.length && !word) {
      const headword = session.queue.shift();
      word = state.words.find((item) => item.headword === headword) || null;
    }
    if (!word) {
      finishReview();
      return;
    }

    session.current = word;
    session.revealed = false;
    ui.reviewProgress.textContent = `${session.done + 1} / ${session.total}`;
    ui.reviewHeadword.textContent = word.headword;
    ui.reviewHeadword.href = dictionaryUrl(word.headword);
    ui.reviewAnswer.hidden = true;
    ui.reviewShow.hidden = false;
    ui.reviewGrades.hidden = true;
    ui.reviewShow.focus();
  }

  function revealAnswer() {
    const session = state.review;
    if (!session?.current || session.revealed) {
      return;
    }

    const word = session.current;
    session.revealed = true;
    ui.reviewRomanization.textContent = [extension.tibetan.toWylie(word.headword), extension.tibetan.toPhonetic(word.headword)]
      .filter(Boolean)
      .join(" · ");
    ui.reviewGloss.textContent = word.gloss || "";
    ui.reviewAnswer.hidden = false;
    ui.reviewShow.hidden = true;
    ui.reviewGrades.hidden = false;

    // Compute every grade's outcome once, so the interval shown on each button
    // is exactly what gets stored (FSRS fuzzes intervals slightly).
    const now = Date.now();
    session.preview = session.practice ? null : extension.wordList.previewSchedule(word.review, now);
    ui.gradeButtons.forEach((button) => {
      button.querySelector("small").textContent = session.preview
        ? formatInterval(session.preview[button.dataset.grade].due - now)
        : "";
    });
    // Park focus on the card so the Space keyup that revealed the answer
    // doesn't also press whichever grade button would have taken focus.
    ui.reviewCard.focus();
  }

  async function gradeCard(gradeName) {
    const session = state.review;
    if (!session?.revealed) {
      return;
    }

    const word = session.current;
    session.revealed = false;
    let comesBackSoon = gradeName === "again";
    if (session.preview) {
      const next = session.preview[gradeName];
      const updated = await extension.wordList.setReview(word.headword, next);
      const index = state.words.findIndex((item) => item.headword === word.headword);
      if (updated && index >= 0) {
        state.words[index] = updated;
      }
      // FSRS learning steps are minutes long; keep those cards in this session.
      comesBackSoon = next.due - Date.now() < IN_SESSION_WINDOW;
    }

    if (comesBackSoon) {
      session.queue.push(word.headword);
    } else {
      session.done += 1;
    }
    showNextCard();
  }

  function finishReview() {
    const session = state.review;
    ui.reviewSession.hidden = true;
    ui.reviewPracticeNote.hidden = true;
    ui.reviewDone.hidden = false;
    ui.reviewProgress.textContent = "";
    ui.reviewDoneMessage.textContent = extension.i18n.getMessage(session.practice ? "reviewPracticeDone" : "reviewDone");

    const nextDue = Math.min(...state.words.map((word) => word.review?.due ?? Infinity));
    ui.reviewNextDue.textContent = Number.isFinite(nextDue)
      ? `${extension.i18n.getMessage("wordsNextReview")} ${
          nextDue <= Date.now() ? extension.i18n.getMessage("wordsDueNow") : formatDueDate(nextDue)
        }`
      : "";
    session.current = null;
    ui.reviewBack.focus();
  }

  function endReview() {
    state.review = null;
    ui.reviewView.hidden = true;
    ui.listView.hidden = false;
    render();
    ui.startReview.focus();
  }

  function handleReviewKeys(event) {
    if (!state.review?.current || event.repeat || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    if (event.target instanceof Element && event.target.closest("input, select, textarea")) {
      return;
    }

    if (!state.review.revealed && (event.key === " " || event.key === "Enter")) {
      event.preventDefault();
      revealAnswer();
    } else if (state.review.revealed && GRADE_KEYS[event.key]) {
      event.preventDefault();
      gradeCard(GRADE_KEYS[event.key]);
    }
  }

  function bindEvents() {
    ui.filter.addEventListener("input", render);
    ui.sort.addEventListener("change", render);
    ui.exportButton.addEventListener("click", exportCsv);
    ui.startReview.addEventListener("click", startReview);
    ui.reviewShow.addEventListener("click", revealAnswer);
    ui.gradeButtons.forEach((button) => {
      button.addEventListener("click", () => gradeCard(button.dataset.grade));
    });
    ui.reviewEnd.addEventListener("click", endReview);
    ui.reviewBack.addEventListener("click", endReview);
    document.addEventListener("keydown", handleReviewKeys);
    extension.wordList.onChanged((words) => {
      state.words = words;
      render();
    });
  }

  async function init() {
    getControls();
    extension.i18n.localizePage();
    bindEvents();
    state.words = await extension.wordList.getAll();
    render();
  }

  document.addEventListener("DOMContentLoaded", init, { once: true });
})();
