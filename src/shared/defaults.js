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
      enabledDictionaries: ["84000"],
      tokenizerMode: "botok-general",
      colorByPos: false
    }
  };
})();
