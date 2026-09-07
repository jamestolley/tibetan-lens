(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});

  // Fallback strings used when the browser's i18n API is unavailable
  // (for example, during tests or in content contexts without _locales loaded).
  const FALLBACK_MESSAGES = {
    extensionName: "Tibetan Lens",
    extensionDescription: "Segments Tibetan text on web pages, inserts spacing, and shows dictionary popups.",
    settingsTitle: "Tibetan Lens",
    settingsIntro: "Control how Tibetan text is segmented, displayed, and translated.",
    popupTitle: "Tibetan Lens",
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
    minTibetanFontSize: "Minimum Tibetan font size",
    dictionaries: "Dictionaries",
    dictionariesHint: "Enabled dictionaries drive tooltip results and the tokenizer lexicon.",
    settingsSyncMessage: "Settings sync automatically.",
    settingsSaved: "Saved to Chrome sync storage.",
    loadingDictionaries: "Loading dictionaries…",
    loadingDefault: "Loading…",
    noEnabledDictionary: "No enabled dictionary has a definition for this term yet.",
    refreshPage: "Refresh page",
    insertTestText: "Insert sample text",
    options: "Options",
    brandTibetan: "བོད་ཡིག་མིག་ཤེལ།"
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
