# Part-of-Speech Color Coding Implementation Plan

## Overview
This document outlines the implementation plan for adding optional part-of-speech (POS) color coding to the Tibetan Lens extension. The feature will allow users to visualize the grammatical role of words in the text.

## Changes to be Made

### 1. Update Defaults
- **File:** `src/shared/defaults.js`
- **Change:** Add `colorByPos: false` after `tokenizerMode`.
- **Old String:**
  ```javascript
      tokenizerMode: "botok-general"
    }
  };
  ```
- **New String:**
  ```javascript
      tokenizerMode: "botok-general",
      colorByPos: false
    }
  };
  ```

### 2. Update Options UI
- **File:** `src/options/index.html`
- **Change:** Add a checkbox "Color words by part of speech" before the "Show phonetic" toggle.
- **Old String:**
  ```html
          <label class="toggle-row" for="showPhonetic">
            <span>Show phonetic</span>
            <input id="showPhonetic" type="checkbox" />
          </label>
  ```
- **New String:**
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

- **File:** `src/options/index.js`
- **Change:** Implement loading, saving, and syncing for the new checkbox.
- **Old String:**
  ```javascript
      showPhonetic: ui.showPhonetic.checked,
  ```
- **New String:**
  ```javascript
      showPhonetic: ui.showPhonetic.checked,
      colorByPos: ui.colorByPos.checked,
  ```

### 3. Update Word Element Creation
- **File:** `src/content/content-script.js`
- **Change:** Append a BEM class `tibetan-extension-word--<pos>` when `state.settings?.colorByPos` is true and `token.pos` exists.
- **Old String:**
  ```javascript
    const element = document.createElement("span");
    element.className = [
      extension.constants.classes.word,
      token.matched ? extension.constants.classes.wordMatched : extension.constants.classes.wordUnmatched
    ].join(" ");
  ```
- **New String:**
  ```javascript
    const element = document.createElement("span");
    const posClass = state.settings?.colorByPos && token.pos ? `tibetan-extension-word--${token.pos}` : '';
    element.className = [
      extension.constants.classes.word,
      posClass,
      token.matched ? extension.constants.classes.wordMatched : extension.constants.classes.wordUnmatched
    ].join(" ");
  ```

### 4. Update CSS for POS Classes
- **File:** `src/content/content.css`
- **Change:** Append color CSS rules for POS classes with soft background colors (0.5 alpha).
- **New CSS Rules:**
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
All edits should be made carefully to ensure existing functionality is not disrupted. The implementation will enhance the user experience by providing visual cues for part-of-speech tagging.