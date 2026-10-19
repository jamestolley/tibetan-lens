(() => {
  const extension = globalThis.TibetanExtension || (globalThis.TibetanExtension = {});

  function normalizeSettings(raw) {
    const defaults = extension.defaults.settings;
    const merged = { ...defaults, ...raw };

    if (raw && "showTooltips" in raw && !("tooltipMode" in raw)) {
      merged.tooltipMode = raw.showTooltips ? "click" : "hover";
    }

    if (merged.tooltipMode !== "hover" && merged.tooltipMode !== "click") {
      merged.tooltipMode = defaults.tooltipMode;
    }

    if (!Array.isArray(merged.enabledDictionaries) || !merged.enabledDictionaries.length) {
      merged.enabledDictionaries = [...defaults.enabledDictionaries];
    } else {
      const catalog = extension.botokPackManifest?.dictionaryCatalog;
      if (catalog) {
        merged.enabledDictionaries = merged.enabledDictionaries.filter((id) => id in catalog);
        if (!merged.enabledDictionaries.length) {
          merged.enabledDictionaries = [...defaults.enabledDictionaries];
        }
      }
    }

    if (merged.tokenizerMode !== defaults.tokenizerMode) {
      merged.tokenizerMode = defaults.tokenizerMode;
    }

    if (!["vivid", "soft", "underline"].includes(merged.posColorTheme)) {
      merged.posColorTheme = defaults.posColorTheme;
    }

    const newWordsPerDay = Math.round(Number(merged.newWordsPerDay));
    merged.newWordsPerDay = Number.isFinite(newWordsPerDay)
      ? Math.min(50, Math.max(1, newWordsPerDay))
      : defaults.newWordsPerDay;

    if (![0.85, 0.9, 0.95].includes(Number(merged.targetRetention))) {
      merged.targetRetention = defaults.targetRetention;
    }
    merged.targetRetention = Number(merged.targetRetention);

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

        try {
          if (!chrome?.runtime?.id) {
            return;
          }
        } catch (_error) {
          return;
        }

        listener(await this.getSettings());
      };

      chrome.storage.onChanged.addListener(handler);
      return () => chrome.storage.onChanged.removeListener(handler);
    }
  };
})();
