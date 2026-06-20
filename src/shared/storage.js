(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});

  function normalizeSettings(raw) {
    const defaults = extension.defaults.settings;
    const merged = { ...defaults, ...raw };

    if (!Array.isArray(merged.enabledDictionaries) || !merged.enabledDictionaries.length) {
      merged.enabledDictionaries = [...defaults.enabledDictionaries];
    }

    if (merged.tokenizerMode !== defaults.tokenizerMode) {
      merged.tokenizerMode = defaults.tokenizerMode;
    }

    return merged;
  }

  extension.storage = {
    async getSettings() {
      const raw = await chrome.storage.sync.get(extension.defaults.settings);
      return normalizeSettings(raw);
    },

    async setSettings(partial) {
      const current = await this.getSettings();
      const next = normalizeSettings({ ...current, ...partial });
      await chrome.storage.sync.set(next);
      return next;
    },

    onSettingsChanged(listener) {
      const handler = async (_changes, areaName) => {
        if (areaName !== "sync") {
          return;
        }

        listener(await this.getSettings());
      };

      chrome.storage.onChanged.addListener(handler);
      return () => chrome.storage.onChanged.removeListener(handler);
    }
  };
})();
