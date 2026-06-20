# Botok JS integration notes

This file is the handoff contract between the browser-extension repo and the separate Botok-to-JS repo.

## Why keep the tokenizer separate

- Botok porting work will have its own risks, benchmarks, fixtures, and release cadence.
- The browser extension should stay focused on page scanning, DOM replacement, tooltip UX, settings, and dictionary presentation.
- A narrow integration contract makes it easier to test each layer in isolation.

## What is integrated now

- The extension now ships a small Botok-style demo dialect pack under `data/dialect_packs/extension_demo/`.
- The content script loads that pack at runtime and uses a browser-safe trie tokenizer in [src/core/botokTokenizer.js](../src/core/botokTokenizer.js).
- Translation popups still keep the existing mock dictionary overlay, and they also fall back to the demo pack's `sense` column when no richer entry exists.

## Proposed tokenizer adapter shape

The extension currently expects a tokenizer object with a single `segment(run, settings)` method. The current browser adapter keeps that shape, and future syncs from the separate repo should preserve it.

Input:

- `run`: a Tibetan text run from the DOM.
- `settings.enabledDictionaries`: optional dictionary ids for lexicon-aware matching.
- `settings.targetLanguage`: optional translation language.

Output:

```js
[
  { type: "word", text: "བོད་སྐད", lookupKey: "བོད་སྐད", matched: true },
  { type: "word", text: "ཡིག", lookupKey: "ཡིག", matched: true },
  { type: "punctuation", text: "།" }
]
```

## Integration sequence

1. Keep the current content script and tooltip behavior stable.
2. Treat [src/core/botokTokenizer.js](../src/core/botokTokenizer.js) as a browser runtime snapshot of the separate repo's tokenizer logic.
3. Preserve output compatibility with the structure above.
4. Replace the demo pack with a generated artifact or synced pack once the separate repo's browser export is ready.
5. Add fixtures that compare the separate repo's output against the extension adapter on representative Tibetan passages.

## DOM replacement note

The current extension uses a small local text-node walker so the project is runnable without external dependencies. If you prefer `findAndReplaceDOMText.js`, we can move the replacement logic in [src/content/replacement-engine.js](../src/content/replacement-engine.js) behind a compatible adapter and leave the rest of the content script alone.
