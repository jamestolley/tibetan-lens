# POS Color Coding Implementation Report

## Overview
This report summarizes the edits made to implement optional part-of-speech (POS) color coding in the Tibetan Lens extension.

## Changes Made

### 1. Update Defaults
- **File:** `src/shared/defaults.js`
- **Change:** Added `colorByPos: false` after `tokenizerMode`.
- **Code Snippet:**
  ```javascript
      tokenizerMode: "botok-general",
      colorByPos: false
  ```

### 2. Update Options UI
- **File:** `src/options/index.html`
- **Change:** Added a checkbox "Color words by part of speech" before the "Show phonetic" toggle.
- **Code Snippet:**
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

### 3. Update Options Logic
- **File:** `src/options/index.js`
- **Change:** Added `colorByPos` to `getControls`, `readSettingsFromControls`, `loadSettings`, and `bindEvents`.
- **Code Snippet:**
  ```javascript
      showPhonetic: ui.showPhonetic.checked,
      colorByPos: ui.colorByPos.checked,
  ```

### 4. Update Word Element Creation
- **File:** `src/content/content-script.js`
- **Change:** Added POS class when `state.settings?.colorByPos` and `token.pos` are truthy.
- **Code Snippet:**
  ```javascript
    const posClass = state.settings?.colorByPos && token.pos ? `tibetan-extension-word--${token.pos}` : '';
  ```

### 5. Update CSS for POS Classes
- **File:** `src/content/content.css`
- **Change:** Appended color CSS rules for POS classes.
- **Code Snippet:**
  ```css
.tibetan-extension-word--PROPN {
  background-color: rgba(255, 223, 186, 0.5);
}
.tibetan-extension-word--NOUN {
  background-color: rgba(186, 255, 223, 0.5);
}
.tibetan-extension-word--VERB {
  background-color: rgba(186, 223, 255, 0.5);
}
.tibetan-extension-word--ADJ {
  background-color: rgba(223, 186, 255, 0.5);
}
.tibetan-extension-word--ADV {
  background-color: rgba(255, 186, 223, 0.5);
}
.tibetan-extension-word--PRON {
  background-color: rgba(255, 255, 186, 0.5);
}
.tibetan-extension-word--DET {
  background-color: rgba(186, 255, 255, 0.5);
}
.tibetan-extension-word--ADP {
  background-color: rgba(255, 186, 255, 0.5);
}
.tibetan-extension-word--PART {
  background-color: rgba(223, 255, 186, 0.5);
}
.tibetan-extension-word--NUM {
  background-color: rgba(186, 223, 255, 0.5);
}
.tibetan-extension-word--CONJ {
  background-color: rgba(255, 223, 223, 0.5);
}
.tibetan-extension-word--INTJ {
  background-color: rgba(223, 255, 223, 0.5);
}
.tibetan-extension-word--PUNCT {
  background-color: rgba(223, 223, 255, 0.5);
}
  ```

## Conclusion
All required edits have been successfully implemented to enhance the user experience by providing visual cues for part-of-speech tagging.