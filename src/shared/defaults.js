(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});

  extension.defaults = {
    settings: {
      extensionEnabled: true,
      insertSpaces: true,
      showTooltips: true,
      targetLanguage: "en",
      enabledDictionaries: ["common-words", "buddhist-terms"],
      tokenizerMode: "botok-demo-pack"
    }
  };
})();
