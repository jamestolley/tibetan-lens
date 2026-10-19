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
    dictionaryLookUpWord: "Look up this word",
    saveWord: "Save to my words",
    savedWord: "Saved to my words — click to remove",
    myWordsButton: "My words",
    wordsDueBadgeTitle: "Words due for review",
    wordsPageTitle: "My words — Teahouse Tibetan",
    wordsHeading: "My words",
    wordsIntro: "Words you've starred while reading or in the dictionary.",
    wordsFilterLabel: "Filter my words",
    wordsSort: "Sort",
    wordsSortNewest: "Newest first",
    wordsSortOldest: "Oldest first",
    wordsSortDue: "Next review",
    wordsExport: "Export CSV",
    pauseOnSite: "Pause on this site",
    pausedSitesHeading: "Paused sites",
    pausedSitesHint: "Teahouse stays off on these sites. To pause a site, click the extension icon while you're on it.",
    pausedSitesEmpty: "No paused sites.",
    resumeSite: "Resume",
    helpHeading: "Help & feedback",
    helpIntro: "Questions, ideas or something not working? We read every message.",
    helpLink: "Help & FAQ",
    reportBug: "Report a bug",
    suggestDefinition: "Suggest a definition",
    privacyPolicy: "Privacy policy",
    versionLabel: "Version",
    backupHeading: "Backup & import",
    backupIntro: "Your words are stored only in this browser. Download a backup now and then, and before changing computers, so you never lose your progress.",
    backupDownload: "Download backup",
    importButton: "Import a file…",
    backupLast: "Last backup:",
    backupNever: "never",
    importHint: "Import accepts Teahouse backups (.json), our CSV export, Anki text exports and plain lists of Tibetan words. Words you already have keep their progress.",
    importDone: "Import complete",
    importAdded: "Added:",
    importUpdated: "Updated:",
    importUnchanged: "Already saved:",
    importSkipped: "Skipped:",
    importInvalid: "That backup file couldn't be read. Is it a Teahouse backup?",
    importNoWords: "No Tibetan words were found in that file.",
    wordsCount: "Saved words:",
    wordsEmpty: "No saved words yet. Click the ☆ in a word's pop-up or in the dictionary to save it here.",
    wordsNoMatches: "No saved words match this filter.",
    wordsRemove: "Remove",
    wordsRemoved: "Word removed.",
    wordsUndo: "Undo",
    wordsSavedOn: "Saved:",
    wordsNextReview: "Next review:",
    wordsDueNow: "due now",
    wordsFrom: "From:",
    wordsReview: "Review",
    wordsPractice: "Practice all",
    reviewShowAnswer: "Show answer",
    reviewAgain: "Again",
    reviewHard: "Hard",
    reviewGood: "Good",
    reviewEasy: "Easy",
    reviewEnd: "End review",
    reviewDone: "All caught up for now.",
    reviewPracticeDone: "Practice round complete.",
    reviewKeyboardHint: "Keyboard: Space shows the answer, 1–4 grade it.",
    reviewPracticeNote: "Practice mode — your review schedule won't change.",
    reviewBack: "Back to my words",
    stageAll: "All",
    stageNew: "New",
    stageLearning: "Learning",
    stageReviewing: "Reviewing",
    stageMastered: "Mastered",
    studySettings: "Study settings",
    newWordsPerDay: "New words per day",
    workloadEstimate: "Estimated daily reviews once settled:",
    targetRetention: "Target memory",
    retention85: "85% — fewer reviews",
    retention90: "90% — recommended",
    retention95: "95% — more reviews",
    newWordsHint: "Saved words wait in New until there's room, so you can save as many as you like. Mastered words free up room.",
    inProgress: "In progress:",
    limitDaily: "You've started today's new words. More start tomorrow; the rest wait in New.",
    limitBacklog: "New words are paused until you catch up on your reviews.",
    limitActive: "New words are paused while many words are still in progress. Mastering words frees up room.",
    stageKnown: "Known",
    markKnown: "I know this word",
    unmarkKnown: "Marked as known — click to study it again",
    highlightKnowledge: "Fade words I know, so new words stand out",
    translateSentence: "Translate this sentence",
    openInGoogleTranslate: "Open in Google Translate"
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
      const elements = root.querySelectorAll("[data-i18n], [data-i18n-title], [data-i18n-placeholder]");
      elements.forEach((el) => {
        const key = el.getAttribute("data-i18n");
        if (key) {
          el.textContent = this.getMessage(key);
        }
        const titleKey = el.getAttribute("data-i18n-title");
        if (titleKey) {
          el.title = this.getMessage(titleKey);
        }
        const placeholderKey = el.getAttribute("data-i18n-placeholder");
        if (placeholderKey) {
          el.placeholder = this.getMessage(placeholderKey);
        }
      });
    }
  };
})();
