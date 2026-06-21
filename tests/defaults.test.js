/**
 * Tests for src/shared/defaults.js and src/shared/constants.js
 */
import { describe, test, expect, beforeEach } from "vitest";
import { loadSharedModules } from "./helpers/load-extension.js";

describe("defaults.js", () => {
  let ext;

  beforeEach(() => {
    loadSharedModules();
    ext = globalThis.TibetanExtension;
  });

  test("provides default settings", () => {
    const s = ext.defaults.settings;
    expect(s).toBeDefined();
    expect(s.extensionEnabled).toBe(true);
    expect(s.insertSpaces).toBe(true);
    expect(s.showTooltips).toBe(true);
    expect(s.targetLanguage).toBe("en");
    expect(typeof s.tokenizerMode).toBe("string");
    expect(s.tokenizerMode.length).toBeGreaterThan(0);
  });

  test("enabledDictionaries is a non-empty array of string IDs", () => {
    const dicts = ext.defaults.settings.enabledDictionaries;
    expect(Array.isArray(dicts)).toBe(true);
    expect(dicts.length).toBeGreaterThan(0);
    for (const id of dicts) {
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    }
  });
});

describe("constants.js", () => {
  let ext;

  beforeEach(() => {
    loadSharedModules();
    ext = globalThis.TibetanExtension;
  });

  test("defines CSS class names", () => {
    const c = ext.constants.classes;
    expect(c.processedNode).toBe("tibetan-extension-node");
    expect(c.word).toBe("tibetan-extension-word");
    expect(c.wordMatched).toBe("is-matched");
    expect(c.wordUnmatched).toBe("is-unmatched");
    expect(c.tooltip).toBe("tibetan-extension-tooltip");
    expect(c.tooltipVisible).toBe("is-visible");
  });

  test("defines message types", () => {
    expect(ext.constants.messages.refreshAnnotations).toBe("refresh-annotations");
    expect(ext.constants.messages.getAnnotationStats).toBe("get-annotation-stats");
  });

  test("defines supported languages", () => {
    const langs = ext.constants.supportedLanguages;
    expect(langs).toHaveLength(3);
    expect(langs.map((l) => l.code)).toEqual(["en", "es", "fr"]);
  });
});
