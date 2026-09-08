(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});

  const ui = {
    saveTimer: null
  };

  function getControls() {
    ui.extensionEnabled = document.getElementById("extensionEnabled");
    ui.insertSpaces = document.getElementById("insertSpaces");
    ui.tooltipMode = document.getElementById("tooltipMode");
    ui.showWylie = document.getElementById("showWylie");
    ui.showPhonetic = document.getElementById("showPhonetic");
    ui.colorByPos = document.getElementById("colorByPos");
    ui.posColorTheme = document.getElementById("posColorTheme");
    ui.linkClickPrompt = document.getElementById("linkClickPrompt");
    ui.minTibetanFontSize = document.getElementById("minTibetanFontSize");
    ui.dictionaryList = document.getElementById("dictionaryList");
    ui.statusLine = document.getElementById("statusLine");
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
      tooltipMode: ui.tooltipMode.value,
      showWylie: ui.showWylie.checked,
      showPhonetic: ui.showPhonetic.checked,
      colorByPos: ui.colorByPos.checked,
      posColorTheme: ui.posColorTheme.value,
      linkClickPrompt: ui.linkClickPrompt.checked,
      minTibetanFontSize: Number(ui.minTibetanFontSize.value) || 16,
      enabledDictionaries:
        enabledDictionaries.length > 0
          ? enabledDictionaries
          : [extension.defaults.settings.enabledDictionaries[0]]
    };
  }

  function flashSavedState() {
    ui.statusLine.textContent = extension.i18n.getMessage("settingsSaved");

    if (ui.saveTimer) {
      window.clearTimeout(ui.saveTimer);
    }

    ui.saveTimer = window.setTimeout(() => {
      ui.statusLine.textContent = extension.i18n.getMessage("settingsSyncMessage");
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
    ui.tooltipMode.value = settings.tooltipMode === "hover" ? "hover" : "click";
    ui.showWylie.checked = settings.showWylie;
    ui.showPhonetic.checked = settings.showPhonetic;
    ui.colorByPos.checked = settings.colorByPos;
    ui.posColorTheme.value = settings.posColorTheme;
    ui.linkClickPrompt.checked = settings.linkClickPrompt;
    ui.minTibetanFontSize.value = settings.minTibetanFontSize;
    renderDictionaryList(settings);
  }

  function bindEvents() {
    ui.extensionEnabled.addEventListener("change", saveSettings);
    ui.insertSpaces.addEventListener("change", saveSettings);
    ui.tooltipMode.addEventListener("change", saveSettings);
    ui.showWylie.addEventListener("change", saveSettings);
    ui.showPhonetic.addEventListener("change", saveSettings);
    ui.colorByPos.addEventListener("change", saveSettings);
    ui.posColorTheme.addEventListener("change", saveSettings);
    ui.linkClickPrompt.addEventListener("change", saveSettings);
    ui.minTibetanFontSize.addEventListener("change", saveSettings);

    extension.storage.onSettingsChanged((settings) => {
      ui.extensionEnabled.checked = settings.extensionEnabled;
      ui.insertSpaces.checked = settings.insertSpaces;
      ui.tooltipMode.value = settings.tooltipMode === "hover" ? "hover" : "click";
      ui.showWylie.checked = settings.showWylie;
      ui.showPhonetic.checked = settings.showPhonetic;
      ui.colorByPos.checked = settings.colorByPos;
      ui.posColorTheme.value = settings.posColorTheme;
      ui.linkClickPrompt.checked = settings.linkClickPrompt;
      ui.minTibetanFontSize.value = settings.minTibetanFontSize;
      renderDictionaryList(settings);
    });
  }

  async function init() {
    getControls();
    extension.i18n.localizePage();
    bindEvents();
    await loadSettings();
  }

  document.addEventListener("DOMContentLoaded", init, { once: true });
})();
