(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});

  const ui = {};

  function getControls() {
    ui.insertSpaces = document.getElementById("insertSpaces");
    ui.colorByPos = document.getElementById("colorByPos");
    ui.tooltipMode = document.getElementById("tooltipMode");
    ui.showWylie = document.getElementById("showWylie");
    ui.showPhonetic = document.getElementById("showPhonetic");
    ui.minTibetanFontSize = document.getElementById("minTibetanFontSize");
    ui.refreshPage = document.getElementById("refreshPage");
    ui.insertTestText = document.getElementById("insertTestText");
    ui.samplePage = document.getElementById("samplePage");
    ui.openOptions = document.getElementById("openOptions");
    ui.openDictionary = document.getElementById("openDictionary");
    ui.openWords = document.getElementById("openWords");
    ui.wordsDueBadge = document.getElementById("wordsDueBadge");
    ui.popupStatus = document.getElementById("popupStatus");
  }

  function readSettingsFromControls() {
    return {
      insertSpaces: ui.insertSpaces.checked,
      colorByPos: ui.colorByPos.checked,
      tooltipMode: ui.tooltipMode.value,
      showWylie: ui.showWylie.checked,
      showPhonetic: ui.showPhonetic.checked,
      minTibetanFontSize: Number(ui.minTibetanFontSize.value) || 16
    };
  }

  function showStatus(message) {
    if (ui.popupStatus) {
      ui.popupStatus.textContent = message;
    }
  }

  function clearStatus() {
    if (ui.popupStatus) {
      ui.popupStatus.textContent = "";
    }
  }

  async function getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
  }

  async function sendPageMessage(type) {
    clearStatus();

    try {
      const tab = await getActiveTab();
      if (!tab?.id) {
        showStatus(extension.i18n.getMessage("pageNotReachable"));
        return false;
      }

      const result = await chrome.tabs.sendMessage(tab.id, { type });
      if (!result) {
        showStatus(extension.i18n.getMessage("pageNotReachable"));
        return false;
      }

      return true;
    } catch (_error) {
      showStatus(extension.i18n.getMessage("pageNotReachable"));
      return false;
    }
  }

  async function loadSettings() {
    const settings = await extension.storage.getSettings();
    ui.insertSpaces.checked = settings.insertSpaces;
    ui.colorByPos.checked = settings.colorByPos;
    ui.tooltipMode.value = settings.tooltipMode === "hover" ? "hover" : "click";
    ui.showWylie.checked = settings.showWylie;
    ui.showPhonetic.checked = settings.showPhonetic;
    ui.minTibetanFontSize.value = settings.minTibetanFontSize;
  }

  async function saveSettingsAndRefresh() {
    await extension.storage.setSettings(readSettingsFromControls());
    await sendPageMessage(extension.constants.messages.refreshAnnotations);
  }

  function bindEvents() {
    ui.insertSpaces.addEventListener("change", saveSettingsAndRefresh);
    ui.colorByPos.addEventListener("change", saveSettingsAndRefresh);
    ui.tooltipMode.addEventListener("change", saveSettingsAndRefresh);
    ui.showWylie.addEventListener("change", saveSettingsAndRefresh);
    ui.showPhonetic.addEventListener("change", saveSettingsAndRefresh);
    ui.minTibetanFontSize.addEventListener("change", saveSettingsAndRefresh);

    ui.refreshPage.addEventListener("click", async () => {
      await sendPageMessage(extension.constants.messages.refreshAnnotations);
    });

    ui.insertTestText.addEventListener("click", async () => {
      await sendPageMessage(extension.constants.messages.insertTestText);
    });

    ui.samplePage.addEventListener("click", () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("demo/index.html") });
    });

    ui.openDictionary.addEventListener("click", () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("pages/dictionary.html") });
    });

    ui.openWords.addEventListener("click", () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("pages/words.html") });
    });

    ui.openOptions.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });

    chrome.storage.onChanged.addListener((_changes, areaName) => {
      if (areaName === "sync") {
        loadSettings();
      }
    });
  }

  async function showDueCount() {
    const due = await extension.wordList.getDue();
    ui.wordsDueBadge.textContent = String(due.length);
    ui.wordsDueBadge.hidden = due.length === 0;
  }

  async function init() {
    getControls();
    extension.i18n.localizePage();
    bindEvents();
    await loadSettings();
    await showDueCount();
  }

  document.addEventListener("DOMContentLoaded", init, { once: true });
})();
