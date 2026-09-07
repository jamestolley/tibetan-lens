# i18n Sync Demo Plan

## Feature 1: Browser-driven i18n (UI strings only)

### 1. Create _locales/en/messages.json
```json
{
  "extensionName": "Tibetan Lens",
  "extensionDescription": "Segments Tibetan text on web pages, inserts spacing, and shows dictionary popups.",
  "settingsSyncMessage": "Settings sync automatically.",
  "loadingDictionaries": "Loading dictionaries…",
  "noEnabledDictionary": "No enabled dictionary has a definition for this term yet."
}
```

### 2. Create src/shared/i18n.js
```javascript
(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});

  extension.i18n = {
    getMessage(key) {
      return (chrome.i18n && chrome.i18n.getMessage(key)) || (messages[key] || key);
    },

    localizePage(root = document) {
      const elements = root.querySelectorAll('[data-i18n]');
      elements.forEach((el) => {
        const key = el.getAttribute('data-i18n');
        el.textContent = this.getMessage(key);
        if (el.hasAttribute('data-i18n-title')) {
          el.title = this.getMessage(el.getAttribute('data-i18n-title'));
        }
      });
    }
  };
})();
```

### 3. Add "default_locale": "en" to manifest.json
```json
{
  "manifest_version": 3,
  "name": "Tibetan Lens",
  "version": "0.50",
  "description": "Segments Tibetan text on web pages, inserts spacing, and shows dictionary popups.",
  "default_locale": "en",
  "permissions": ["storage", "activeTab"],
  "action": {"default_title": "Tibetan Lens", "default_popup": "src/popup/index.html"},
  "options_page": "src/options/index.html",
  "web_accessible_resources": [{"resources": ["data/resources/SylComponents.json", ...], "matches": ["<all_urls>"]}],
  "content_scripts": [{"matches": ["<all_urls>"], "js": ["src/shared/constants.js", ...], "css": ["src/content/content.css"], "run_at": "document_idle"}]
}
```

### 4. Add <script src="../shared/i18n.js"></script> in src/options/index.html and src/popup/index.html
**src/options/index.html**
```html
<script src="../shared/constants.js"></script>
<script src="../shared/defaults.js"></script>
<script src="../shared/storage.js"></script>
<script src="../shared/i18n.js"></script>
<script src="./index.js"></script>
```

**src/popup/index.html**
```html
<script src="../shared/constants.js"></script>
<script src="../shared/defaults.js"></script>
<script src="../shared/storage.js"></script>
<script src="../shared/i18n.js"></script>
<script src="./index.js"></script>
```

### 5. Add data-i18n attributes to user-visible text in src/options/index.html and src/popup/index.html
**src/options/index.html**
```html
<span data-i18n="extensionName">Tibetan Lens</span>
<p data-i18n="extensionDescription">Control how Tibetan text is segmented, displayed, and translated.</p>
```

**src/popup/index.html**
```html
<span data-i18n="extensionName">Tibetan Lens</span>
<p data-i18n="extensionDescription">Segment Tibetan text and click or hover tokens for definitions.</p>
```

### 6. In src/options/index.js and src/popup/index.js, call extension.i18n.localizePage() after getControls() or in init()
**src/options/index.js**
```javascript
async function init() {
  getControls();
  await loadSettings();
  extension.i18n.localizePage();
}
```

**src/popup/index.js**
```javascript
async function init() {
  getControls();
  await loadSettings();
  extension.i18n.localizePage();
}
```

### 7. Replace hardcoded dynamic strings in src/content/content-script.js and src/content/tooltip.js
**src/content/content-script.js**
```javascript
showSpinner(extension.i18n.getMessage('loadingDictionaries'));
```

**src/content/tooltip.js**
```javascript
const noEnabledDictionaryMessage = extension.i18n.getMessage('noEnabledDictionary');
```

### 8. Ensure src/shared/i18n.js does not break if chrome.i18n is unavailable
```javascript
if (typeof chrome.i18n === 'undefined') {
  console.warn('chrome.i18n is not available.');
}
```

## Feature 2: Options → popup sync

### 1. In src/popup/index.js, add a chrome.storage.onChanged listener
```javascript
extension.storage.onSettingsChanged((settings) => {
  loadSettings();
});
```

### 2. In src/options/index.js, saveSettings already writes to chrome.storage.sync
```javascript
async function saveSettings() {
  await extension.storage.setSettings(readSettingsFromControls());
}
```

## Feature 3: Demo / test page

### 1. Create demo/sample.html
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sample Page for Tibetan Lens</title>
  </head>
  <body>
    <h1>Sample Page for Tibetan Lens</h1>
    <p>This is a sample page for the extension.</p>
    <p>བོད་ཡིག་མིག་ཤེལ།</p>
    <p>བོད་ཡིག་མིག་ཤེལ།</p>
  </body>
</html>
```

### 2. In src/popup/index.js, change the openTestPage click handler
```javascript
ui.openTestPage.addEventListener("click", async () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("demo/sample.html"), active: true });
});
```