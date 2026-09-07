# Dictionary Language Availability Report

## 1. Tibetan-to-Other-Language Dictionaries Bundled or Referenced
The following Tibetan-to-other-language dictionaries are currently bundled or referenced in the Tibetan Lens repo:

- **Hopkins Tibetan-English Dictionary**
  - File: `words/hopkins.tsv`
  - Entries: ~18K
  - Notes: Buddhist philosophy and general vocabulary.

- **Jim Valby Tibetan-English Dictionary**
  - File: `words/jim-valby.tsv`
  - Entries: ~64K
  - Notes: Broad general Tibetan-English vocabulary.

- **Ives Waldo Tibetan-English Dictionary**
  - File: `words/ives-waldo.tsv`
  - Entries: ~121K
  - Notes: The largest open-source Tibetan-English dictionary.

- **Tsepak Rigdzin Tibetan-English Dictionary**
  - File: `words/tsepak-rigdzin.tsv`
  - Entries: ~2.7K
  - Notes: Concise, authoritative definitions.

- **84000 Glossary**
  - File: `words/84000.tsv`
  - Entries: ~25K
  - Notes: Glossary from 84000: Translating the Words of the Buddha.

## 2. Other Target Languages Available
The repo does not explicitly mention any other target languages (besides English) that are realistically available from the same open-source collections. Therefore, this information is unknown from the available data.

## 3. Sanskrit-to-Other-Language Dictionaries
There are no Sanskrit-to-other-language dictionaries referenced or available in the Tibetan Lens repo.

## 4. Summary of Findings
- Tibetan-to-other-language dictionaries available: Yes (Tibetan-English dictionaries listed above).
- Other target languages available: Unknown.
- Sanskrit-to-other-language dictionaries available: None.

## Plan for Removing the Translation-Language Feature
1. Remove `targetLanguage` from `src/shared/defaults.js`.
2. Remove `supportedLanguages` and `getAnnotationStats` from `src/shared/constants.js`.
3. Remove `targetLanguage` UI and code from `src/options/index.html` and `src/options/index.js`.
4. Remove any Botok JS handoff section from `src/options/index.html` if present.
5. Update `src/core/mockDictionary.js` so it does not depend on `settings.targetLanguage`.
6. Verify `src/popup/index.html` and `src/popup/index.js` no longer reference `targetLanguage`.