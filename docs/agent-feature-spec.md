# Tibetan Lens Extension Feature Implementation Specification

## Feature List and Implementation Details

### 1. Optional Color-Coding of Parts of Speech
- **Files to Modify**: `src/content/content-script.js`, `src/content/styles.css`
- **Minimal Code Change Needed**: Add logic to the content script to apply color-coding based on parts of speech. Update CSS to define color styles for different parts of speech.
- **Acceptance Criteria**: Parts of speech in the annotated text are visually distinct through color-coding, and users can toggle this feature on/off in settings.

### 2. Show Wylie Transliteration for Each Token
- **Files to Modify**: `src/content/content-script.js`, `src/popup/index.html`, `src/popup/index.js`
- **Minimal Code Change Needed**: Modify the content script to include Wylie transliteration in the token data structure. Update the popup to display this transliteration alongside definitions.
- **Acceptance Criteria**: Each token displayed in the popup includes its Wylie transliteration.

### 3. Preserve Existing Sentence-Ending Punctuation and Line Structure
- **Files to Modify**: `src/content/content-script.js`
- **Minimal Code Change Needed**: Update the tokenizer logic to retain sentence-ending punctuation and line breaks when processing text.
- **Acceptance Criteria**: The annotated text retains its original punctuation and line structure without any stripping.

### 4. Make Dictionary Lookups Return Definitions
- **Files to Modify**: `src/content/content-script.js`, `src/popup/index.js`
- **Minimal Code Change Needed**: Ensure that the dictionary lookup function retrieves and returns definitions from the available dictionaries.
- **Acceptance Criteria**: When a token is clicked, the popup shows the correct definition from the selected dictionary.

### 5. Optional Dictionaries Per User
- **Files to Modify**: `src/popup/index.html`, `src/popup/index.js`
- **Minimal Code Change Needed**: Add checkboxes in the popup for each dictionary, and implement logic to enable/disable them based on user selection.
- **Acceptance Criteria**: Users can check/uncheck dictionaries, and the extension respects these settings during lookups.

### 6. Single Clean Definition in Popups
- **Files to Modify**: `src/popup/index.html`, `src/popup/index.js`
- **Minimal Code Change Needed**: Modify the popup to display a single, clean definition instead of a list of dictionary names.
- **Acceptance Criteria**: The popup shows a single definition clearly without clutter from multiple dictionary sources.

### 7. Minimum Font Size Setting for Tibetan Script
- **Files to Modify**: `src/popup/index.html`, `src/popup/index.js`, `src/content/styles.css`
- **Minimal Code Change Needed**: Add a setting in the popup for minimum font size and apply this setting to the rendered Tibetan text in the content script.
- **Acceptance Criteria**: Users can set a minimum font size for Tibetan script, which is applied to all rendered text.

## Dictionary Data Plan
The missing TSV data required for dictionary lookups is intended to be obtained from the following sources:
- **botok-data general pack**: This pack is essential for tokenization wordlists. Users will need to provide this data as it is not included in the extension.
- **Christian Steinert's public dictionaries**: The specific dictionary files necessary for comprehensive lookup functionality are currently unknown. Users will need to provide these files as the extension does not include direct access to them.

This specification outlines the necessary changes and acceptance criteria for implementing the requested features in the Tibetan Lens extension.