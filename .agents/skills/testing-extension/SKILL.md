---
name: testing-tibetan-lens
description: Test the tibetan-lens Chrome extension end-to-end. Use when verifying dictionary lookup, tokenization, or tooltip UI changes.
---

# Testing tibetan-lens Extension

## Unit Tests (Vitest)

The repo has a Vitest test suite with 128+ tests. Run with:
```bash
cd /home/ubuntu/repos/tibetan-lens
npm install   # first time only
npm test      # run all tests (~1s)
npm run test:watch   # watch mode
npm run test:coverage  # with coverage report
```

### Test Architecture
- Tests are in `tests/` (not `src/__tests__/`)
- `tests/setup.js` stubs Chrome APIs (`chrome.runtime`, `chrome.storage`, `chrome.action`)
- `tests/helpers/load-extension.js` provides `loadSharedModules()` / `loadTokenizerModule()` to load the IIFE source modules in correct order via `new Function()`
- Tokenizer tests stub `fetch` to return minimal TSV test data (self-contained, no external dictionary files needed)
- jsdom provides DOM environment for testing replacement-engine, tooltip, content-script

### Test Files
| File | What it covers |
|------|---------------|
| `tibetan.test.js` | `containsTibetan`, `splitByTibetanRuns`, `normalizeLookupKey`, `countSyllables`, `isTibetanPunctuation` |
| `tokenizer.test.js` | `ensureReady`/`segment` API, segmentation, punctuation, token shape, lookup |
| `dictionary.test.js` | `getDictionaryCatalog`, `getTokenizationLexicon`, `lookup` |
| `replacement-engine.test.js` | Text node collection, skip-tags, replace/restore |
| `tooltip.test.js` | Show/hide, content rendering, `isTooltipElement` |
| `content-script.test.js` | Word element creation, CSS classes, space insertion |
| `defaults.test.js` | Settings defaults, constants |
| `storage.test.js` | Settings read/write/normalize |
| `pack-manifest.test.js` | Manifest structure, file existence |
| `integration.test.js` | Full pipeline: text \u2192 tokenize \u2192 DOM \u2192 tooltip |

### Mutation Testing
To verify tests are meaningful, try breaking a core function and confirm tests fail:
```bash
# Example: change containsTibetan() to return false
# \u2192 expect 9+ failures across tibetan, replacement-engine, integration tests
```

## Browser Testing (E2E)

### Prerequisites
- Chrome browser with Developer Mode enabled at `chrome://extensions`
- The extension loaded as unpacked from the repo root (the directory containing `manifest.json`)

### Local Setup
1. Start a local HTTP server from the repo root to serve the demo page:
   ```bash
   cd /home/ubuntu/repos/tibetan-lens
   python3 -m http.server 8080
   ```
2. Load the extension at `chrome://extensions` \u2192 \"Load unpacked\" \u2192 select the repo root
3. Navigate to `http://localhost:8080/demo/sample.html`

The demo page contains 3 lines of Tibetan text that exercise common words.

**Note:** The `chrome-extension://` scheme does NOT work for content script injection \u2014 always use `http://` or `file://` URLs.

### What to Test

#### Tokenization
- Tibetan text should be split into clickable `<span>` elements with class `tibetan-extension-word`
- Multi-syllable words (e.g. \u0f56\u0f7c\u0f51\u0f0b\u0f66\u0f90\u0f51 = \"Tibetan language\") should be grouped as single spans
- Punctuation (\u0f0d) should NOT be wrapped in word spans
- Matched words have class `is-matched`

#### Tooltip / Dictionary Lookup
- Hovering a word span should show a tooltip popup with:
  - The Tibetan term as heading
  - \"Translation language: EN\" subheading
  - Dictionary entries from enabled dictionaries
- Each dictionary entry shows a label and English glosses
- Moving the mouse away dismisses the tooltip (with ~200ms delay)
- Clicking also works as a fallback

#### Good Test Words
| Word | Expected | Dictionaries |
|------|----------|-------------|
| \u0f46\u0f7c\u0f66 (chos) | dharma/doctrine/religion | All 6 |
| \u0f56\u0f7c\u0f51\u0f0b\u0f66\u0f90\u0f51 (bod skad) | Tibetan language | Multiple |
| \u0f5e\u0f72\u0f0b\u0f56\u0f51\u0f7a (zhi bde) | peace | Multiple |

### Console Errors
- Check the browser console \u2014 there should be no errors related to `Failed to load extension resource:`
- The extension may load ~20MB of TSV data; expect a brief pause on first page load

### Debugging Tips
- If the tooltip doesn't appear, check that the mouse event handlers in `content-script.js` are firing
- If words are all \"unmatched\", the trie wasn't populated \u2014 check that `loadPack()` successfully fetched all TSV files
- Use the browser console: `document.querySelectorAll('.tibetan-extension-word').length` to count word spans
- To check tooltip: `document.getElementById('tibetan-extension-tooltip')?.innerHTML`

### Options Page
- Navigate to `chrome-extension://<id>/src/options/index.html` to toggle individual dictionaries
- Disabling a dictionary should remove its entries from tooltips

## Devin Secrets Needed
None \u2014 this is a local-only Chrome extension with no external services.