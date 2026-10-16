(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});

  // Fallback strings used when the browser's i18n API is unavailable
  // (for example, during tests or in content contexts without _locales loaded).
  const FALLBACK_MESSAGES = {
    extensionName: "Marginalia Tibetan",
    extensionDescription: "Segments Tibetan text on web pages, inserts spacing, and shows dictionary popups.",
    settingsTitle: "Marginalia Tibetan",
    settingsIntro: "Control how Tibetan text is segmented, displayed, and translated.",
    popupTitle: "Marginalia Tibetan",
    popupIntro: "Segment Tibetan text and click or hover tokens for definitions.",
    readingExperience: "Reading experience",
    readingExperienceHint: "Control what happens when Tibetan text is detected on a page.",
    extensionEnabled: "Extension enabled",
    insertSpaces: "Insert spaces between tokens",
    showTranslationsOn: "Show translations on",
    tooltipModeHover: "Hover",
    tooltipModeClick: "Click",
    showWylie: "Show Wylie",
    showPhonetic: "Show phonetic",
    colorByPos: "Color words by part of speech",
    colorCoding: "Color coding",
    colorCodingHint: "Highlight words by part of speech and choose a color theme.",
    posColorTheme: "Part-of-speech color theme",
    posThemeVivid: "Vivid",
    posThemeSoft: "Soft",
    posThemeUnderline: "Underline only",
    linkClickPrompt: "When clicking a linked Tibetan word, ask: follow link or show translation",
    minTibetanFontSize: "Minimum Tibetan font size",
    dictionaries: "Dictionaries",
    dictionariesHint: "Enabled dictionaries drive tooltip results and the tokenizer lexicon.",
    dictionarySources: "Dictionary sources",
    dictionarySourcesNote: "Bundled data remains under its original license. See the included NOTICE file for full attribution.",
    settingsSyncMessage: "Settings sync automatically.",
    settingsSaved: "Saved to Chrome sync storage.",
    loadingDictionaries: "Loading dictionaries…",
    loadingDefault: "Loading…",
    noEnabledDictionary: "No enabled dictionary has a definition for this term yet.",
    noDefinitionWithPos: "No definition yet — this word isn't in the bundled dictionaries.",
    posInferred: "likely (corpus-derived)",
    posUnknown: "Unknown",
    wordParts: "Word parts",
    refreshPage: "Refresh page",
    insertTestText: "Insert sample text",
    options: "Options",
    brandTibetan: "བོད་ཡིག་མཆན་བུ།",
    followLink: "Follow link",
    showTranslation: "Show translation",
    pageNotReachable: "Couldn't reach this page — reload the tab or open the Sample page.",
    samplePage: "Sample page"
  };

  extension.i18n = {
    getMessage(key) {
      if (typeof chrome !== "undefined" && chrome.i18n && typeof chrome.i18n.getMessage === "function") {
        const value = chrome.i18n.getMessage(key);
        if (value) {
          return value;
        }
      }
      return FALLBACK_MESSAGES[key] || key;
    },

    localizePage(root = document) {
      const elements = root.querySelectorAll("[data-i18n]");
      elements.forEach((el) => {
        const key = el.getAttribute("data-i18n");
        if (key) {
          el.textContent = this.getMessage(key);
        }
        const titleKey = el.getAttribute("data-i18n-title");
        if (titleKey) {
          el.title = this.getMessage(titleKey);
        }
      });
    }
  };
})();
