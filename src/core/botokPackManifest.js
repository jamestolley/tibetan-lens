(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});

  extension.botokPackManifest = {
    profile: "botok_general",
    resources: {
      sylComponents: "data/resources/SylComponents.json"
    },
    dictionaryCatalog: {
      "botok-core": {
        id: "botok-core",
        label: "Botok Core Wordlist",
        description: "Core Tibetan word segmentation dictionary from botok-data (~31K entries). Provides word boundaries for tokenization."
      },
      "hopkins": {
        id: "hopkins",
        label: "Hopkins Tibetan-English",
        description: "Jeffrey Hopkins' Tibetan-English dictionary (~18K entries). Buddhist philosophy and general vocabulary."
      },
      "jim-valby": {
        id: "jim-valby",
        label: "Jim Valby Tibetan-English",
        description: "Jim Valby's Tibetan-English dictionary (~64K entries). Broad general vocabulary coverage."
      },
      "ives-waldo": {
        id: "ives-waldo",
        label: "Ives Waldo Tibetan-English",
        description: "Ives Waldo's Tibetan-English dictionary (~121K entries). The largest open-source Tibetan-English dictionary."
      },
      "tsepak-rigdzin": {
        id: "tsepak-rigdzin",
        label: "Tsepak Rigdzin",
        description: "Tsepak Rigdzin's Tibetan-English dictionary (~2.7K entries). Concise, authoritative definitions."
      },
      "84000": {
        id: "84000",
        label: "84000 Dictionary",
        description: "Glossary from 84000: Translating the Words of the Buddha (~25K entries). Buddhist canonical terminology."
      }
    },
    files: {
      dictionary: {
        words: [
          {
            path: "data/dialect_packs/botok_general/dictionary/words/tsikchen.tsv",
            dictionaryId: "botok-core"
          },
          {
            path: "data/dialect_packs/botok_general/dictionary/words/uncompound_lexicon.tsv",
            dictionaryId: "botok-core"
          },
          {
            path: "data/dialect_packs/botok_general/dictionary/words/ancient.tsv",
            dictionaryId: "botok-core"
          },
          {
            path: "data/dialect_packs/botok_general/dictionary/words/exceptions.tsv",
            dictionaryId: "botok-core"
          },
          {
            path: "data/dialect_packs/botok_general/dictionary/words/dagdra.tsv",
            dictionaryId: "botok-core"
          },
          {
            path: "data/dialect_packs/botok_general/dictionary/words/hopkins.tsv",
            dictionaryId: "hopkins"
          },
          {
            path: "data/dialect_packs/botok_general/dictionary/words/jim-valby.tsv",
            dictionaryId: "jim-valby"
          },
          {
            path: "data/dialect_packs/botok_general/dictionary/words/ives-waldo.tsv",
            dictionaryId: "ives-waldo"
          },
          {
            path: "data/dialect_packs/botok_general/dictionary/words/tsepak-rigdzin.tsv",
            dictionaryId: "tsepak-rigdzin"
          },
          {
            path: "data/dialect_packs/botok_general/dictionary/words/84000.tsv",
            dictionaryId: "84000"
          }
        ],
        words_non_inflected: [
          {
            path: "data/dialect_packs/botok_general/dictionary/words_non_inflected/particles.tsv",
            dictionaryLabel: "Grammar Particles"
          }
        ]
      },
      adjustments: {}
    }
  };
})();
