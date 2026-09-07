# Dictionary Sources

The `botok_general` dialect pack contains dictionaries from the following open-source projects:

## Tokenization Wordlists (botok-data)

Source: [Esukhia/botok-data](https://github.com/Esukhia/botok-data) — general dialect pack  
License: Public domain (unless indicated otherwise per file)

Files:
- `words/tsikchen.tsv` — Main Tibetan wordlist (~31K entries)
- `words/uncompound_lexicon.tsv` — Compound word components
- `words/ancient.tsv` — Classical/archaic forms
- `words/exceptions.tsv` — Proper nouns and exceptions
- `words/dagdra.tsv` — Homophone disambiguation entries
- `words_non_inflected/particles.tsv` — Grammatical particles (not inflected)

## Definition Dictionaries (Steinert collection)

Source: [christiansteinert/tibetan-dictionary](https://github.com/christiansteinert/tibetan-dictionary)  
Original format: Pipe-delimited EWTS (Wylie) with English definitions  
Conversion: EWTS → Unicode Tibetan via [jsewts](https://github.com/buda-base/jsewts)

| File | Source | Entries | Notes |
|------|--------|---------|-------|
| `words/hopkins.tsv` | Hopkins 2015 | ~18K | Jeffrey Hopkins' Tibetan-English dictionary. Buddhist philosophy and general vocabulary. |
| `words/jim-valby.tsv` | Jim Valby | ~64K | Broad general Tibetan-English vocabulary. |
| `words/ives-waldo.tsv` | Ives Waldo | ~121K | The largest open-source Tibetan-English dictionary. |
| `words/tsepak-rigdzin.tsv` | Tsepak Rigdzin | ~2.7K | Concise, authoritative definitions. |
| `words/84000.tsv` | 84000 | ~25K | Glossary from 84000: Translating the Words of the Buddha. |

## Rebuilding

To rebuild these files from source:

```bash
# Clone source repositories
git clone https://github.com/Esukhia/botok-data.git /tmp/botok-data
git clone --depth 1 https://github.com/christiansteinert/tibetan-dictionary.git /tmp/tibetan-dictionary

# Install build dependencies and run
npm install
npm run build:dictionaries
```

The build script is at `scripts/build-dictionaries.js`.
