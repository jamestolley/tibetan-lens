(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});

  const catalog = {
    "buddhist-terms": {
      id: "buddhist-terms",
      label: "Buddhist Terms",
      description: "Seed entries for classical and Buddhist vocabulary."
    },
    "common-words": {
      id: "common-words",
      label: "Common Words",
      description: "Everyday Tibetan words and phrases for the MVP."
    }
  };

  const entries = {
    "གལ་ཆེན": [
      {
        dictionaryId: "common-words",
        glosses: {
          en: ["important", "significant"],
          es: ["importante", "significativo"],
          fr: ["important", "significatif"]
        },
        notes: "Often used in modern prose."
      }
    ],
    "དགའ་པོ": [
      {
        dictionaryId: "common-words",
        glosses: {
          en: ["happy", "pleased"],
          es: ["feliz", "contento"],
          fr: ["heureux", "content"]
        }
      }
    ],
    "དགེ་རྒན": [
      {
        dictionaryId: "common-words",
        glosses: {
          en: ["teacher"],
          es: ["maestro", "profesor"],
          fr: ["professeur", "enseignant"]
        }
      }
    ],
    "དགེ་འདུན": [
      {
        dictionaryId: "buddhist-terms",
        glosses: {
          en: ["sangha", "monastic community"],
          es: ["sangha", "comunidad monastica"],
          fr: ["sangha", "communaute monastique"]
        }
      }
    ],
    "བོད": [
      {
        dictionaryId: "common-words",
        glosses: {
          en: ["Tibet"],
          es: ["Tibet"],
          fr: ["Tibet"]
        },
        notes: "Place name."
      }
    ],
    "བོད་སྐད": [
      {
        dictionaryId: "common-words",
        glosses: {
          en: ["Tibetan language"],
          es: ["idioma tibetano"],
          fr: ["langue tibetaine"]
        }
      }
    ],
    "བོད་སྐད་ཡིག": [
      {
        dictionaryId: "common-words",
        glosses: {
          en: ["Tibetan language and script"],
          es: ["lengua y escritura tibetanas"],
          fr: ["langue et ecriture tibetaines"]
        }
      }
    ],
    "མི": [
      {
        dictionaryId: "common-words",
        glosses: {
          en: ["person", "people"],
          es: ["persona", "gente"],
          fr: ["personne", "gens"]
        }
      }
    ],
    "མེ": [
      {
        dictionaryId: "common-words",
        glosses: {
          en: ["fire"],
          es: ["fuego"],
          fr: ["feu"]
        }
      }
    ],
    "ཞི་བདེ": [
      {
        dictionaryId: "buddhist-terms",
        glosses: {
          en: ["peace"],
          es: ["paz"],
          fr: ["paix"]
        }
      }
    ],
    "ཡིག": [
      {
        dictionaryId: "common-words",
        glosses: {
          en: ["writing", "script", "letter"],
          es: ["escritura", "guion", "letra"],
          fr: ["ecriture", "script", "lettre"]
        }
      }
    ],
    "ཆུ": [
      {
        dictionaryId: "common-words",
        glosses: {
          en: ["water"],
          es: ["agua"],
          fr: ["eau"]
        }
      }
    ],
    "ཆོས": [
      {
        dictionaryId: "buddhist-terms",
        glosses: {
          en: ["dharma", "religion"],
          es: ["dharma", "religion"],
          fr: ["dharma", "religion"]
        },
        notes: "Meaning depends on context."
      }
    ]
  };

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
