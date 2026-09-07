# Dictionary Sources

The `botok_general` dialect pack bundled with Tibetan Lens contains only data
whose redistribution is explicitly permitted. Please do not re-add material
from commercial or all-rights-reserved dictionaries without written permission.

## Tokenization Wordlists (botok-data)

Source: [Esukhia/botok-data](https://github.com/Esukhia/botok-data) — general dialect pack  
License: [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/) for the
curated pack; individual files are public domain unless marked otherwise.

Files:
- `words/tsikchen.tsv` — main Tibetan wordlist (~31K entries)
- `words/uncompound_lexicon.tsv` — compound word components
- `words/ancient.tsv` — classical/archaic forms
- `words/exceptions.tsv` — proper nouns and exceptions
- `words/dagdra.tsv` — homophone disambiguation entries
- `words_non_inflected/particles.tsv` — grammatical particles

These files provide Tibetan word forms, part-of-speech tags, and lemmas.
They do **not** contain English definitions.

## Definition Dictionary (84000 glossary)

Source: [84000: Translating the Words of the Buddha](https://read.84000.co/glossary/downloads.html)  
License: [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)

File:
- `words/84000.tsv` — canonical Buddhist terminology (~25K entries)

The bundled copy is derived from the 84000 public glossary data. Attribution is
provided in the extension's options page and NOTICE file.

## Dictionaries that are NOT bundled

Tibetan Lens does **not** ship the following popular dictionaries unless and
until their authors or publishers grant explicit redistribution permission or
release them under an open license:

- Jeffrey Hopkins' Tibetan-Sanskrit-English dictionary
- Jim Valby's Tibetan-English dictionary
- Ives Waldo's Tibetan-English glossary compilation
- Tsepak Rigdzin's *Tibetan-English Dictionary of Buddhist Terms*

These works are copyrighted by their respective authors. Several existing apps
have obtained individual permission; Tibetan Lens must do the same before
including them.

## Rebuilding

To rebuild the tokenization wordlists from upstream botok-data:

```bash
# Clone source repository
git clone https://github.com/Esukhia/botok-data.git /tmp/botok-data

# Install build dependencies and run
npm install
npm run build:dictionaries /tmp/botok-data
```

The build script is at `tools/build-dictionaries.js`.
