(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});

  const ui = {
    saveTimer: null
  };

  function getControls() {
    ui.extensionEnabled = document.getElementById("extensionEnabled");
    ui.insertSpaces = document.getElementById("insertSpaces");
    ui.showTooltips = document.getElementById("showTooltips");
    ui.targetLanguage = document.getElementById("targetLanguage");
    ui.dictionaryList = document.getElementById("dictionaryList");
    ui.statusLine = document.getElementById("statusLine");
  }

  function populateLanguageSelect() {
    extension.constants.supportedLanguages.forEach((language) => {
      const option = document.createElement("option");
      option.value = language.code;
      option.textContent = language.label;
      ui.targetLanguage.appendChild(option);
    });
  }

  function renderDictionaryList(settings) {
    ui.dictionaryList.innerHTML = "";

    extension.dictionary.getDictionaryCatalog().forEach((dictionary) => {
      const label = document.createElement("label");
      label.className = "dictionary-item";

      const copy = document.createElement("div");
      copy.className = "dictionary-copy";

      const name = document.createElement("strong");
      name.textContent = dictionary.label;
      copy.appendChild(name);

      const description = document.createElement("span");
      description.textContent = dictionary.description;
      copy.appendChild(description);

      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = dictionary.id;
      input.checked = settings.enabledDictionaries.includes(dictionary.id);
      input.addEventListener("change", saveSettings);

      label.appendChild(copy);
      label.appendChild(input);
      ui.dictionaryList.appendChild(label);
    });
  }

  function readSettingsFromControls() {
    const enabledDictionaries = Array.from(ui.dictionaryList.querySelectorAll("input:checked")).map(
      (input) => input.value
    );

    return {
      extensionEnabled: ui.extensionEnabled.checked,
      insertSpaces: ui.insertSpaces.checked,
      showTooltips: ui.showTooltips.checked,
      targetLanguage: ui.targetLanguage.value,
      enabledDictionaries:
        enabledDictionaries.length > 0
          ? enabledDictionaries
          : [extension.defaults.settings.enabledDictionaries[0]]
    };
  }

  function flashSavedState() {
    ui.statusLine.textContent = "Saved to Chrome sync storage.";

    if (ui.saveTimer) {
      window.clearTimeout(ui.saveTimer);
    }

    ui.saveTimer = window.setTimeout(() => {
      ui.statusLine.textContent = "Settings sync automatically.";
      ui.saveTimer = null;
    }, 1800);
  }

  async function saveSettings() {
    await extension.storage.setSettings(readSettingsFromControls());
    flashSavedState();
  }

  async function loadSettings() {
    const settings = await extension.storage.getSettings();
    ui.extensionEnabled.checked = settings.extensionEnabled;
    ui.insertSpaces.checked = settings.insertSpaces;
    ui.showTooltips.checked = settings.showTooltips;
    ui.targetLanguage.value = settings.targetLanguage;
    renderDictionaryList(settings);
  }

  function bindEvents() {
    ui.extensionEnabled.addEventListener("change", saveSettings);
    ui.insertSpaces.addEventListener("change", saveSettings);
    ui.showTooltips.addEventListener("change", saveSettings);
    ui.targetLanguage.addEventListener("change", saveSettings);

    extension.storage.onSettingsChanged((settings) => {
      ui.extensionEnabled.checked = settings.extensionEnabled;
      ui.insertSpaces.checked = settings.insertSpaces;
      ui.showTooltips.checked = settings.showTooltips;
      ui.targetLanguage.value = settings.targetLanguage;
      renderDictionaryList(settings);
    });
  }

  async function init() {
    getControls();
    populateLanguageSelect();
    bindEvents();
    await loadSettings();
  }

  document.addEventListener("DOMContentLoaded", init, { once: true });
})();
