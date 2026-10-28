# Tibetan Lens Extension Research Report

## 1. Summary of Tokenization and Dictionary Lookup
The Tibetan Lens extension segments Tibetan text on web pages and provides dictionary popups for individual tokens. Tokenization is achieved through a tokenizer that processes Tibetan text, breaking it into syllables and words. The extension uses a trie structure to efficiently look up words and their definitions from various dictionaries. The dictionary lookup functionality relies on a combination of local dictionary files and external sources, allowing users to access translations and definitions.

## 2. Missing Files and Data for Real Dictionary Lookups
The following files and data are required for real dictionary lookups but are currently missing or not clearly defined:
- The botok-data general pack, which includes tokenization wordlists.
- Specific dictionary files from Christian Steinert's public dictionaries that are necessary for comprehensive lookup functionality.

## 3. Accessibility of Dictionary Sources from build-dictionaries.js
The sources for the dictionaries are partially clear from the `build-dictionaries.js` file. The script mentions:
- **botok-data general pack**: This pack is expected to provide tokenization wordlists but requires a specific directory structure and files that are not included in the extension.
- **Christian Steinert's public dictionaries**: The script outlines the conversion process from Wylie to Unicode Tibetan but does not provide direct URLs or commands to obtain these dictionaries. Therefore, while the sources are mentioned, they are not easily accessible or clearly defined, making it difficult to obtain them without further investigation.

## 4. UI/UX Files Needing Changes for Requested Features
To implement the requested features related to dictionary lookups, the following UI/UX files would need to be modified:
- `src/popup/index.html`: To add new UI elements for selecting and managing dictionaries.
- `src/popup/index.js`: To handle the logic for enabling/disabling dictionaries and updating the UI based on user selections.
- `src/popup/index.css`: To style any new UI components added for dictionary management.
- `src/content/content-script.js`: To ensure that the content script can access and utilize the selected dictionaries for lookups.

This report outlines the current state of the Tibetan Lens extension regarding tokenization and dictionary lookups, highlighting areas for improvement and further development.