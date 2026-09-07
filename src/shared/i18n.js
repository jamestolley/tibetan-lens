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