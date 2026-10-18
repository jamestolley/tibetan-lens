(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});

  const ui = {};
  const state = {
    words: []
  };

  function getControls() {
    ui.filter = document.getElementById("wordsFilter");
    ui.sort = document.getElementById("wordsSort");
    ui.exportButton = document.getElementById("wordsExport");
    ui.count = document.getElementById("wordsCountValue");
    ui.status = document.getElementById("wordsStatus");
    ui.list = document.getElementById("wordsList");
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

  function bindEvents() {
    ui.filter.addEventListener("input", render);
    ui.sort.addEventListener("change", render);
    ui.exportButton.addEventListener("click", exportCsv);
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
