(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});

  extension.constants = {
    classes: {
      processedNode: "tibetan-extension-node",
      word: "tibetan-extension-word",
      wordMatched: "is-matched",
      wordUnmatched: "is-unmatched",
      tooltip: "tibetan-extension-tooltip",
      tooltipVisible: "is-visible",
      linkChoice: "tibetan-extension-link-choice",
      sentenceEnd: "tibetan-extension-sentence-end"
    },
    messages: {
      refreshAnnotations: "refresh-annotations",
      insertTestText: "insert-test-text"
    }
  };
})();
