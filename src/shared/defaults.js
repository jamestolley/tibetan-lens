(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});

  extension.defaults = {
    settings: {
      extensionEnabled: true,
      insertSpaces: true,
      tooltipMode: "click",
      showWylie: true,
      showPhonetic: false,
      minTibetanFontSize: 16,
      enabledDictionaries: ["botok-core", "curated", "84000", "hopkins"],
      tokenizerMode: "botok-general",
      colorByPos: false,
      posColorTheme: "vivid",
      linkClickPrompt: true,
      highlightKnowledge: true,
      newWordsPerDay: 10,
      targetRetention: 0.9
    }
  };
})();
