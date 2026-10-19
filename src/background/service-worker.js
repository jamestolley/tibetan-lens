// Opens the welcome page once, when the extension is first installed
// (not on updates or browser restarts).
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.tabs.create({ url: chrome.runtime.getURL("pages/welcome.html") });
  }
});
