(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});

  const ui = {};

  function getControls() {
    ui.extensionEnabled = document.getElementById("extensionEnabled");
    ui.insertSpaces = document.getElementById("insertSpaces");
    ui.showTooltips = document.getElementById("showTooltips");
    ui.targetLanguage = document.getElementById("targetLanguage");
    ui.processedNodes = document.getElementById("processedNodes");
    ui.annotatedWords = document.getElementById("annotatedWords");
    ui.pageMessage = document.getElementById("pageMessage");
    ui.refreshPage = document.getElementById("refreshPage");
    ui.openOptions = document.getElementById("openOptions");
  }

  function populateLanguageSelect() {
    extension.constants.supportedLanguages.forEach((language) => {
      const option = document.createElement("option");
      option.value = language.code;
      option.textContent = language.label;
      ui.targetLanguage.appendChild(option);
    });
  }

  function readSettingsFromControls() {
    return {
      extensionEnabled: ui.extensionEnabled.checked,
      insertSpaces: ui.insertSpaces.checked,
      showTooltips: ui.showTooltips.checked,
      targetLanguage: ui.targetLanguage.value
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

  function updateStats(response) {
    const stats = response?.stats;
    ui.processedNodes.textContent = String(stats?.processedNodes || 0);
    ui.annotatedWords.textContent = String(stats?.annotatedWords || 0);

    if (!response?.ok) {
      ui.pageMessage.textContent =
        "This tab does not expose content scripts. Try a regular website instead of a browser-internal page.";
      return;
    }

    ui.pageMessage.textContent = `Tokenizer: ${response.settings?.tokenizerMode || "mock-lexicon"}. Click a Tibetan token on the page to inspect its entries.`;
  }

  async function loadSettings() {
    const settings = await extension.storage.getSettings();
    ui.extensionEnabled.checked = settings.extensionEnabled;
    ui.insertSpaces.checked = settings.insertSpaces;
    ui.showTooltips.checked = settings.showTooltips;
    ui.targetLanguage.value = settings.targetLanguage;
  }

  async function saveSettingsAndRefresh() {
    await extension.storage.setSettings(readSettingsFromControls());
    updateStats(await sendPageMessage(extension.constants.messages.refreshAnnotations));
  }

  function bindEvents() {
    ui.extensionEnabled.addEventListener("change", saveSettingsAndRefresh);
    ui.insertSpaces.addEventListener("change", saveSettingsAndRefresh);
    ui.showTooltips.addEventListener("change", saveSettingsAndRefresh);
    ui.targetLanguage.addEventListener("change", saveSettingsAndRefresh);

    ui.refreshPage.addEventListener("click", async () => {
      updateStats(await sendPageMessage(extension.constants.messages.refreshAnnotations));
    });

    ui.openOptions.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });
  }

  async function init() {
    getControls();
    populateLanguageSelect();
    bindEvents();
    await loadSettings();
    updateStats(await sendPageMessage(extension.constants.messages.getAnnotationStats));
  }

  document.addEventListener("DOMContentLoaded", init, { once: true });
})();
