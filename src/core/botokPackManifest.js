(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});

  extension.botokPackManifest = {
    profile: "extension_demo",
    resources: {
      sylComponents: "data/resources/SylComponents.json"
    },
    dictionaryCatalog: {
      "buddhist-terms": {
        id: "buddhist-terms",
        label: "Buddhist Terms",
        description: "Botok-style demo entries for classical and Buddhist vocabulary."
      },
      "common-words": {
        id: "common-words",
        label: "Common Words",
        description: "Botok-style demo entries for everyday Tibetan and common page text."
      }
    },
    files: {
      dictionary: {
        words: [
          {
            path: "data/dialect_packs/extension_demo/dictionary/words/common.tsv",
            dictionaryId: "common-words"
          },
          {
            path: "data/dialect_packs/extension_demo/dictionary/words/buddhist.tsv",
            dictionaryId: "buddhist-terms"
          }
        ],
        words_non_inflected: [
          {
            path: "data/dialect_packs/extension_demo/dictionary/words_non_inflected/particles.tsv",
            dictionaryLabel: "Grammar Particles"
          }
        ]
      },
      adjustments: {}
    }
  };
})();
