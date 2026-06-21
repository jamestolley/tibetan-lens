const ICONS_READY = {
  16: "icons/icon16.png",
  48: "icons/icon48.png",
  128: "icons/icon128.png"
};

const ICONS_LOADING = {
  16: "icons/icon16-loading.png",
  48: "icons/icon48-loading.png",
  128: "icons/icon128-loading.png"
};

chrome.runtime.onMessage.addListener((message, sender) => {
  if (!message?.type) {
    return;
  }

  const tabId = sender.tab?.id;

  if (message.type === "set-icon-loading" && tabId) {
    chrome.action.setIcon({ path: ICONS_LOADING, tabId });
    chrome.action.setTitle({ title: "Tibetan Lens (loading dictionaries...)", tabId });
  }

  if (message.type === "set-icon-ready" && tabId) {
    chrome.action.setIcon({ path: ICONS_READY, tabId });
    chrome.action.setTitle({ title: "Tibetan Lens", tabId });
  }
});
