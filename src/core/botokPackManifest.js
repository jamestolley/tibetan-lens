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
        description: "Jeffrey Hopkins' Tibetan-Sanskrit-English dictionary (Dharma Drum Buddhist College digital edition, ~18.5K entries). Buddhist philosophy and general vocabulary. CC BY-SA 3.0."
      },
      "84000": {
        id: "84000",
        label: "84000 Dictionary",
        description: "Glossary from 84000: Translating the Words of the Buddha (~25K entries). Buddhist canonical terminology. CC BY 4.0."
      },
      "curated": {
        id: "curated",
        label: "Teahouse Curated",
        description: "Hand-curated Teahouse entries for compounds and common words missing from the bundled dictionaries."
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
            path: "data/dialect_packs/botok_general/dictionary/words/84000.tsv",
            dictionaryId: "84000"
          },
          {
            path: "data/dialect_packs/botok_general/dictionary/words/curated_glosses.tsv",
            dictionaryId: "curated"
          },
          {
            path: "data/dialect_packs/botok_general/dictionary/words/pos_overrides.tsv",
            dictionaryLabel: "Curated POS overrides",
            posOnly: true,
            posSource: "override"
          },
          {
            path: "data/dialect_packs/botok_general/dictionary/words/gloss_pos_inferred.tsv",
            dictionaryLabel: "Gloss-inferred POS",
            posOnly: true,
            posSource: "gloss"
          },
          {
            path: "data/dialect_packs/botok_general/dictionary/words/soas_pos.tsv",
            dictionaryLabel: "SOAS POS lexicon",
            posOnly: true,
            posSource: "soas"
          },
          {
            path: "data/dialect_packs/botok_general/dictionary/words/actib_pos.tsv",
            dictionaryLabel: "ACTib POS lexicon",
            posOnly: true,
            posSource: "corpus"
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
