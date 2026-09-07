# Part-of-Speech Color Coding Implementation Plan

## Overview
This document outlines the steps required to implement optional part-of-speech (POS) color coding in the Tibetan Lens extension. The feature will allow users to visually distinguish words based on their grammatical categories.

## Changes Required

### 1. Update `defaults.js`
Add a new setting `colorByPos: false` to the default settings.

**Old String:**
```javascript
      tokenizerMode: "botok-general"
```
**New String:**
```javascript
      tokenizerMode: "botok-general",
      colorByPos: false
```

### 2. Update `index.html`
Add a checkbox for "Color words by part of speech" in the options page.

**Old String:**
```html
          <label class="toggle-row" for="showPhonetic">
            <span>Show phonetic</span>
            <input id="showPhonetic" type="checkbox" />
          </label>
```
**New String:**
```html
          <label class="toggle-row" for="colorByPos">
            <span>Color words by part of speech</span>
            <input id="colorByPos" type="checkbox" />
          </label>
          <label class="toggle-row" for="showPhonetic">
            <span>Show phonetic</span>
            <input id="showPhonetic" type="checkbox" />
          </label>
```

### 3. Update `content-script.js`
Modify the `createWordElement` function to add a BEM-style class based on the part of speech.

**Old String:**
```javascript
    element.className = [
      extension.constants.classes.word,
      token.matched ? extension.constants.classes.wordMatched : extension.constants.classes.wordUnmatched
    ].join(" ");
```
**New String:**
```javascript
    element.className = [
      extension.constants.classes.word,
      token.matched ? extension.constants.classes.wordMatched : extension.constants.classes.wordUnmatched,
      state.settings?.colorByPos && token.pos ? `tibetan-extension-word--${token.pos}` : ''
    ].join(" ");
```

### 4. Update `content.css`
Add soft background colors for each POS class while ensuring existing styles remain intact.

**Add the following CSS rules:**
```css
.tibetan-extension-word--PROPN {
  background-color: rgba(255, 223, 186, 0.5);
}
.tibetan-extension-word--NOUN {
  background-color: rgba(186, 255, 186, 0.5);
}
.tibetan-extension-word--VERB {
  background-color: rgba(186, 223, 255, 0.5);
}
.tibetan-extension-word--ADJ {
  background-color: rgba(255, 186, 255, 0.5);
}
.tibetan-extension-word--ADV {
  background-color: rgba(255, 255, 186, 0.5);
}
.tibetan-extension-word--PRON {
  background-color: rgba(223, 186, 255, 0.5);
}
.tibetan-extension-word--DET {
  background-color: rgba(186, 255, 223, 0.5);
}
.tibetan-extension-word--ADP {
  background-color: rgba(255, 186, 223, 0.5);
}
.tibetan-extension-word--PART {
  background-color: rgba(223, 255, 186, 0.5);
}
.tibetan-extension-word--NUM {
  background-color: rgba(186, 223, 255, 0.5);
}
.tibetan-extension-word--CONJ {
  background-color: rgba(255, 186, 186, 0.5);
}
.tibetan-extension-word--INTJ {
  background-color: rgba(186, 186, 255, 0.5);
}
.tibetan-extension-word--PUNCT {
  background-color: rgba(255, 255, 255, 0.5);
}
```

### 5. Ensure Surgical Changes
Ensure that all changes are surgical, preferring to add CSS rules over rewriting existing ones. Review existing styles to confirm that hover/focus and matched/unmatched styles still function as intended.