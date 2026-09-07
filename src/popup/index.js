(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});

  const ui = {};
  const TEST_PAGE_URL = "file:///C:/Users/james/sites/tibetan/tibetan-lens/demo/sample.html";

  function getControls() {
    ui.insertSpaces = document.getElementById("insertSpaces");
    ui.tooltipMode = document.getElementById("tooltipMode");
    ui.showWylie = document.getElementById("showWylie");
    ui.showPhonetic = document.getElementById("showPhonetic");
    ui.minTibetanFontSize = document.getElementById("minTibetanFontSize");
    ui.refreshPage = document.getElementById("refreshPage");
    ui.openTestPage = document.getElementById("openTestPage");
    ui.openOptions = document.getElementById("openOptions");
  }

  function readSettingsFromControls() {
    return {
      insertSpaces: ui.insertSpaces.checked,
      tooltipMode: ui.tooltipMode.value,
      showWylie: ui.showWylie.checked,
      showPhonetic: ui.showPhonetic.checked,
      minTibetanFontSize: Number(ui.minTibetanFontSize.value) || 16
    };
  }

  async function getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
  }

  async function sendPageMessage(type) {
    try {
      const tab = await getActiveTab();
      if (!tab?.id) {
        return null;
      }

      return await chrome.tabs.sendMessage(tab.id, { type });
    } catch (_error) {
      return null;
    }
  }

  async function loadSettings() {
    const settings = await extension.storage.getSettings();
    ui.insertSpaces.checked = settings.insertSpaces;
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
    ui.tooltipMode.addEventListener("change", saveSettingsAndRefresh);
    ui.showWylie.addEventListener("change", saveSettingsAndRefresh);
    ui.showPhonetic.addEventListener("change", saveSettingsAndRefresh);
    ui.minTibetanFontSize.addEventListener("change", saveSettingsAndRefresh);

    ui.refreshPage.addEventListener("click", async () => {
      await sendPageMessage(extension.constants.messages.refreshAnnotations);
    });

    ui.openTestPage.addEventListener("click", async () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("demo/sample.html"), active: true });
      const allowed = await new Promise((resolve) => chrome.extension.isAllowedFileSchemeAccess(resolve));
      if (!allowed) {
        return;
      }
      chrome.tabs.create({ url: TEST_PAGE_URL, active: true });
    });

    ui.openOptions.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });
  }

  async function init() {
    getControls();
    bindEvents();
    await loadSettings();
  }

  document.addEventListener("DOMContentLoaded", init, { once: true });
})();
