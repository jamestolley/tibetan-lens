(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});

  // The sample text is annotated by the content-script files this page
  // loads; this script only localizes the page and wires the buttons.
  function init() {
    extension.i18n.localizePage();
    document.getElementById("welcomeOptions").addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });
  }

  document.addEventListener("DOMContentLoaded", init, { once: true });
})();
