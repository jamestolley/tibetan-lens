/**
 * Tests for src/shared/storage.js — settings read/write/normalize
 */
import { describe, test, expect, beforeEach, vi } from "vitest";
import { loadSharedModules } from "./helpers/load-extension.js";

describe("storage.js", () => {
  let storage;

  beforeEach(() => {
    loadSharedModules();
    storage = globalThis.TibetanExtension.storage;
  });

  test("getSettings returns defaults when storage is empty", async () => {
    const settings = await storage.getSettings();
    expect(settings.extensionEnabled).toBe(true);
    expect(settings.insertSpaces).toBe(true);
    expect(settings.showTooltips).toBe(true);
    expect(settings.targetLanguage).toBe("en");
  });

  test("getSettings merges partial overrides with defaults", async () => {
    globalThis.chrome.storage.sync.get = async (defaults) => ({
      ...defaults,
      insertSpaces: false
    });

    const settings = await storage.getSettings();
    expect(settings.insertSpaces).toBe(false);
    expect(settings.extensionEnabled).toBe(true);
  });

  test("normalizes empty enabledDictionaries to defaults", async () => {
    globalThis.chrome.storage.sync.get = async (defaults) => ({
      ...defaults,
      enabledDictionaries: []
    });

    const settings = await storage.getSettings();
    const defaults = globalThis.TibetanExtension.defaults.settings;
    expect(settings.enabledDictionaries).toEqual(defaults.enabledDictionaries);
  });

  test("preserves custom enabledDictionaries", async () => {
    globalThis.chrome.storage.sync.get = async (defaults) => ({
      ...defaults,
      enabledDictionaries: ["hopkins"]
    });

    const settings = await storage.getSettings();
    expect(settings.enabledDictionaries).toEqual(["hopkins"]);
  });

  test("forces tokenizerMode to default", async () => {
    globalThis.chrome.storage.sync.get = async (defaults) => ({
      ...defaults,
      tokenizerMode: "custom-mode"
    });

    const settings = await storage.getSettings();
    const defaults = globalThis.TibetanExtension.defaults.settings;
    expect(settings.tokenizerMode).toBe(defaults.tokenizerMode);
  });

  test("setSettings merges with current and writes", async () => {
    const written = {};
    globalThis.chrome.storage.sync.set = async (data) => {
      Object.assign(written, data);
    };

    await storage.setSettings({ insertSpaces: false });
    expect(written.insertSpaces).toBe(false);
    expect(written.extensionEnabled).toBe(true);
  });

  test("onSettingsChanged registers a listener", () => {
    const listeners = [];
    globalThis.chrome.storage.onChanged.addListener = (fn) => listeners.push(fn);

    const unsub = storage.onSettingsChanged(() => {});
    expect(listeners).toHaveLength(1);
    expect(typeof unsub).toBe("function");
  });

  test("onSettingsChanged ignores non-sync changes", async () => {
    const listeners = [];
    globalThis.chrome.storage.onChanged.addListener = (fn) => listeners.push(fn);

    const spy = vi.fn();
    storage.onSettingsChanged(spy);

    // Trigger with "local" area — should be ignored
    await listeners[0]({}, "local");
    expect(spy).not.toHaveBeenCalled();
  });
});
