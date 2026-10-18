(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});

  // Fallback strings used when the browser's i18n API is unavailable
  // (for example, during tests or in content contexts without _locales loaded).
  const FALLBACK_MESSAGES = {
    extensionName: "Teahouse Tibetan",
    extensionDescription: "Segments Tibetan text on web pages, inserts spacing, and shows dictionary popups.",
    settingsTitle: "Teahouse Tibetan",
    settingsIntro: "Control how Tibetan text is segmented, displayed, and translated.",
    popupTitle: "Teahouse Tibetan",
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
    definitionsInEnglish: "Definitions are currently available in English only.",
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
    brandTibetan: "བོད་ཡིག་ཇ་ཁང་།",
    followLink: "Follow link",
    showTranslation: "Show translation",
    pageNotReachable: "Couldn't reach this page — reload the tab or open the Sample page.",
    samplePage: "Sample page",
    loadingAria: "Teahouse Tibetan is loading",
    testTextHeading: "Teahouse Tibetan test text",
    dictionaryButton: "Dictionary",
    dictionaryPageTitle: "Teahouse Tibetan Dictionary",
    dictionaryHeading: "Dictionary",
    dictionaryIntro: "Look up a word in Tibetan script, Wylie, or English.",
    dictionarySearchLabel: "Search the dictionary",
    dictionaryResultsTibetan: "Tibetan words",
    dictionaryResultsWylie: "Tibetan words from Wylie",
    dictionaryResultsEnglish: "English meanings",
    dictionaryNoResults: "No matches. Try another spelling, fewer syllables, or Wylie.",
    dictionaryEmpty: "Type a word to look it up.",
    dictionaryLoadError: "Couldn't load the dictionaries. Reload this page to try again.",
    dictionaryLookUpWord: "Look up this word"
  };

  extension.i18n = {
    getMessage(key, fallback) {
      if (typeof chrome !== "undefined" && chrome.i18n && typeof chrome.i18n.getMessage === "function") {
        const value = chrome.i18n.getMessage(key);
        if (value) {
          return value;
        }
      }
      return FALLBACK_MESSAGES[key] || fallback || key;
    },

    localizePage(root = document) {
      if (root === document && typeof chrome !== "undefined" && chrome.i18n?.getUILanguage) {
        document.documentElement.lang = chrome.i18n.getUILanguage();
      }
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
