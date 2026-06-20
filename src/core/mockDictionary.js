(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});

  const catalog = {
    "botok-core": {
      id: "botok-core",
      label: "Botok Core Wordlist",
      description: "Core Tibetan word segmentation dictionary from botok-data (~31K entries)."
    },
    "hopkins": {
      id: "hopkins",
      label: "Hopkins Tibetan-English",
      description: "Jeffrey Hopkins' Tibetan-English dictionary (~18K entries)."
    },
    "jim-valby": {
      id: "jim-valby",
      label: "Jim Valby Tibetan-English",
      description: "Jim Valby's Tibetan-English dictionary (~64K entries)."
    },
    "ives-waldo": {
      id: "ives-waldo",
      label: "Ives Waldo Tibetan-English",
      description: "Ives Waldo's Tibetan-English dictionary (~121K entries)."
    },
    "tsepak-rigdzin": {
      id: "tsepak-rigdzin",
      label: "Tsepak Rigdzin",
      description: "Tsepak Rigdzin's Tibetan-English dictionary (~2.7K entries)."
    },
    "84000": {
      id: "84000",
      label: "84000 Dictionary",
      description: "Glossary from 84000: Translating the Words of the Buddha (~25K entries)."
    }
  };

  const entries = {};

  function getEnabledDictionaryIds(settings) {
    if (settings && Array.isArray(settings.enabledDictionaries) && settings.enabledDictionaries.length) {
      return settings.enabledDictionaries;
    }

    return extension.defaults.settings.enabledDictionaries;
  }

  function getGlosses(entry, language) {
    if (entry.glosses[language] && entry.glosses[language].length) {
      return entry.glosses[language];
    }

    return entry.glosses.en || [];
  }

  extension.dictionary = {
    getDictionaryCatalog() {
      return Object.values(catalog).sort((left, right) => left.label.localeCompare(right.label));
    },

    getTokenizationLexicon(enabledDictionaryIds) {
      const enabled = new Set(
        Array.isArray(enabledDictionaryIds) && enabledDictionaryIds.length
          ? enabledDictionaryIds
          : extension.defaults.settings.enabledDictionaries
      );

      return new Set(
        Object.keys(entries).filter((headword) =>
          entries[headword].some((entry) => enabled.has(entry.dictionaryId))
        )
      );
    },

    lookup(term, settings) {
      const headword = extension.tibetan.normalizeLookupKey(term);
      const language = settings?.targetLanguage || extension.defaults.settings.targetLanguage;
      const enabled = new Set(getEnabledDictionaryIds(settings));
      const matches = entries[headword] || [];

      return matches
        .filter((entry) => enabled.has(entry.dictionaryId))
        .map((entry) => ({
          dictionaryId: entry.dictionaryId,
          dictionaryLabel: catalog[entry.dictionaryId]?.label || entry.dictionaryId,
          headword,
          glosses: getGlosses(entry, language),
          notes: entry.notes || ""
        }));
    }
  };
})();
