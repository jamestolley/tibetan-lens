(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});

  extension.constants = {
    classes: {
      processedNode: "tibetan-extension-node",
      word: "tibetan-extension-word",
      wordMatched: "is-matched",
      wordUnmatched: "is-unmatched",
      tooltip: "tibetan-extension-tooltip",
      tooltipVisible: "is-visible"
    },
    messages: {
      refreshAnnotations: "refresh-annotations",
      getAnnotationStats: "get-annotation-stats"
    },
    supportedLanguages: [
      { code: "en", label: "English" },
      { code: "es", label: "Spanish" },
      { code: "fr", label: "French" }
    ]
  };
})();
