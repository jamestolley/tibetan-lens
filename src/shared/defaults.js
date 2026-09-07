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
      targetLanguage: "en",
      enabledDictionaries: ["botok-core", "hopkins", "jim-valby", "ives-waldo", "tsepak-rigdzin", "84000"],
      tokenizerMode: "botok-general"
    }
  };
})();
