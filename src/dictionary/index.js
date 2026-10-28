(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});

  const RESULT_LIMIT = 40;
  const SEARCH_DELAY_MS = 200;
  const TIBETAN_PATTERN = /[ༀ-࿿]/u;

  const ui = {};
  const state = {
    settings: null,
    ready: false,
    searchTimer: null,
    saved: new Set()
  };

  function getControls() {
    ui.form = document.getElementById("dictionaryForm");
    ui.search = document.getElementById("dictionarySearch");
    ui.status = document.getElementById("dictionaryStatus");
    ui.results = document.getElementById("dictionaryResults");
  }

  function showStatus(message) {
    ui.status.textContent = message || "";
  }

  function friendlyPos(pos) {
    return extension.i18n.getMessage(`pos_${pos}`, pos);
  }

  function cleanNotes(notes) {
    return (notes || "")
      .split(" | ")
      .filter((part) => part.trim() && !/^\s*POS:/.test(part))
      .join(" | ");
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

  // Append text to a node, wrapping case-insensitive matches of `query` in <mark>.
  function appendHighlighted(node, text, query) {
    if (!query) {
      node.textContent = text;
      return;
    }

    const lower = text.toLowerCase();
    let index = 0;
    while (index < text.length) {
      const found = lower.indexOf(query, index);
      if (found < 0) {
        node.appendChild(document.createTextNode(text.slice(index)));
        break;
      }
      if (found > index) {
        node.appendChild(document.createTextNode(text.slice(index, found)));
      }
      node.appendChild(createElement("mark", "", text.slice(found, found + query.length)));
      index = found + query.length;
    }
  }

  function setSaveState(button, saved) {
    const label = extension.i18n.getMessage(saved ? "savedWord" : "saveWord");
    button.textContent = saved ? "★" : "☆";
    button.title = label;
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", String(saved));
  }

  function createSaveButton(result) {
    const button = createElement("button", "result-save");
    button.type = "button";
    button.dataset.headword = result.headword;
    setSaveState(button, state.saved.has(result.headword));
    button.addEventListener("click", async () => {
      const saved = await extension.wordList.toggle({
        headword: result.headword,
        glosses: result.entries.flatMap((entry) => entry.glosses || [])
      });
      setSaveState(button, saved);
    });
    return button;
  }

  // Keep stars in sync when words are saved or removed elsewhere (other tabs,
  // page tooltips, the word list page).
  function refreshSaveButtons() {
    ui.results.querySelectorAll(".result-save").forEach((button) => {
      setSaveState(button, state.saved.has(button.dataset.headword));
    });
  }

  function renderResult(result, highlight) {
    const card = createElement("article", "result-card");

    const head = createElement("div", "result-head");
    const headword = createElement("button", "result-headword", result.headword);
    headword.type = "button";
    headword.lang = "bo";
    headword.title = extension.i18n.getMessage("dictionaryLookUpWord");
    headword.addEventListener("click", () => runSearch(result.headword, { push: true }));
    head.appendChild(headword);

    const extras = createElement("div", "result-extras");
    (result.posList || []).forEach((pos) => {
      extras.appendChild(createElement("span", "result-pos", friendlyPos(pos)));
    });
    const wylie = extension.tibetan.toWylie(result.headword);
    if (wylie) {
      extras.appendChild(createElement("span", "result-wylie", wylie));
    }
    const phonetic = extension.tibetan.toPhonetic(result.headword);
    if (phonetic) {
      extras.appendChild(createElement("span", "result-phonetic", phonetic));
    }
    head.appendChild(extras);
    head.appendChild(createSaveButton(result));
    card.appendChild(head);

    const definitions = createElement("dl", "result-definitions");
    const byDictionary = new Map();
    result.entries.forEach((entry) => {
      if (!byDictionary.has(entry.dictionaryLabel)) {
        byDictionary.set(entry.dictionaryLabel, { glosses: [], notes: [] });
      }
      const group = byDictionary.get(entry.dictionaryLabel);
      group.glosses.push(...(entry.glosses || []));
      const notes = cleanNotes(entry.notes);
      if (notes) {
        group.notes.push(notes);
      }
    });

    byDictionary.forEach((group, label) => {
      definitions.appendChild(createElement("dt", "", label));
      const definition = createElement("dd");
      appendHighlighted(definition, [...new Set(group.glosses)].join("; "), highlight);
      const notes = [...new Set(group.notes)].join(" | ");
      if (notes) {
        definition.appendChild(createElement("span", "result-notes", notes));
      }
      definitions.appendChild(definition);
    });
    card.appendChild(definitions);

    return card;
  }

  function renderSection(titleKey, subtitle, results, highlight) {
    const section = createElement("section", "result-section");
    const title = createElement("h2", "", extension.i18n.getMessage(titleKey));
    if (subtitle) {
      const sub = createElement("span", "result-section-sub", subtitle);
      sub.lang = "bo";
      title.appendChild(sub);
    }
    section.appendChild(title);
    results.forEach((result) => section.appendChild(renderResult(result, highlight)));
    return section;
  }

  // When nothing matches a multi-syllable word, gloss each syllable instead,
  // the same fallback the page tooltips use.
  function renderWordParts(term) {
    const parts = extension.tibetan
      .normalizeLookupKey(term)
      .split("་")
      .filter((part) => part && TIBETAN_PATTERN.test(part));
    if (parts.length < 2) {
      return null;
    }

    const glossed = parts
      .map((part) => {
        const gloss = extension.botokLookup
          .lookup(part, state.settings)
          .flatMap((entry) => entry.glosses || [])
          .find((text) => text && text !== part);
        return gloss ? { part, gloss } : null;
      })
      .filter(Boolean);
    if (!glossed.length) {
      return null;
    }

    const section = createElement("section", "result-section");
    section.appendChild(createElement("h2", "", extension.i18n.getMessage("wordParts")));
    const list = createElement("ul", "word-parts");
    glossed.forEach(({ part, gloss }) => {
      const item = createElement("li");
      const syllable = createElement("button", "result-headword is-small", `${part}་`);
      syllable.type = "button";
      syllable.lang = "bo";
      syllable.addEventListener("click", () => runSearch(part, { push: true }));
      item.appendChild(syllable);
      item.appendChild(document.createTextNode(` — ${gloss}`));
      list.appendChild(item);
    });
    section.appendChild(list);
    return section;
  }

  function updateUrl(query, push) {
    const url = new URL(window.location.href);
    if (query) {
      url.searchParams.set("q", query);
    } else {
      url.searchParams.delete("q");
    }
    if (url.href !== window.location.href) {
      window.history[push ? "pushState" : "replaceState"](null, "", url);
    }
  }

  function runSearch(rawQuery, { push = false } = {}) {
    const query = (rawQuery || "").trim();
    if (ui.search.value.trim() !== query) {
      ui.search.value = query;
    }
    updateUrl(query, push);

    if (!state.ready) {
      return;
    }

    ui.results.replaceChildren();
    if (!query) {
      showStatus(extension.i18n.getMessage("dictionaryEmpty"));
      return;
    }

    const lookup = extension.botokLookup;
    const sections = [];

    if (TIBETAN_PATTERN.test(query)) {
      const results = lookup.searchTibetan(query, state.settings, RESULT_LIMIT);
      if (results.length) {
        sections.push(renderSection("dictionaryResultsTibetan", "", results, ""));
      } else {
        sections.push(renderWordParts(query));
      }
    } else {
      // Latin input may be Wylie or English, so try both. Wylie results only
      // appear when the converted text is a real headword, because the
      // converter turns any Latin string into (often meaningless) Tibetan.
      const tibetan = extension.tibetan.fromWylie(query);
      const wylieResults = tibetan ? lookup.searchTibetan(tibetan, state.settings, RESULT_LIMIT) : [];
      const englishResults = lookup.searchEnglish(query, state.settings, RESULT_LIMIT);
      const wylieSection = wylieResults.length
        ? renderSection("dictionaryResultsWylie", tibetan, wylieResults, "")
        : null;
      const englishSection = englishResults.length
        ? renderSection("dictionaryResultsEnglish", "", englishResults, query.toLowerCase())
        : null;
      const wylieExact = wylieResults[0]?.headword === extension.tibetan.normalizeLookupKey(tibetan);

      if (wylieExact) {
        sections.push(wylieSection, englishSection);
      } else {
        sections.push(englishSection, wylieSection);
      }
    }

    const rendered = sections.filter(Boolean);
    rendered.forEach((section) => ui.results.appendChild(section));
    showStatus(rendered.length ? "" : extension.i18n.getMessage("dictionaryNoResults"));
  }

  function scheduleSearch() {
    window.clearTimeout(state.searchTimer);
    state.searchTimer = window.setTimeout(() => runSearch(ui.search.value), SEARCH_DELAY_MS);
  }

  function bindEvents() {
    ui.search.addEventListener("input", scheduleSearch);
    ui.form.addEventListener("submit", (event) => {
      event.preventDefault();
      window.clearTimeout(state.searchTimer);
      runSearch(ui.search.value, { push: true });
    });
    window.addEventListener("popstate", () => {
      runSearch(new URL(window.location.href).searchParams.get("q") || "");
    });
    extension.storage.onSettingsChanged((settings) => {
      state.settings = settings;
      runSearch(ui.search.value);
    });
    extension.wordList.onChanged((words) => {
      state.saved = new Set(words.map((word) => word.headword));
      refreshSaveButtons();
    });
  }

  async function init() {
    getControls();
    extension.i18n.localizePage();
    bindEvents();

    ui.search.value = new URL(window.location.href).searchParams.get("q") || "";
    showStatus(extension.i18n.getMessage("loadingDictionaries"));

    try {
      state.settings = await extension.storage.getSettings();
      state.saved = new Set((await extension.wordList.getAll()).map((word) => word.headword));
      await extension.botokLookup.ensureReady();
    } catch (error) {
      console.error("[Teahouse:dictionary] failed to load dictionaries", error);
      showStatus(extension.i18n.getMessage("dictionaryLoadError"));
      return;
    }

    state.ready = true;
    runSearch(ui.search.value);
  }

  document.addEventListener("DOMContentLoaded", init, { once: true });
})();
