/**
 * Tests for src/core/mockDictionary.js
 * Covers: getDictionaryCatalog, getTokenizationLexicon, lookup
 */
import { describe, test, expect, beforeEach } from "vitest";
import { loadSharedModules } from "./helpers/load-extension.js";

describe("mockDictionary.js", () => {
  let dictionary;

  beforeEach(() => {
    loadSharedModules();
    dictionary = globalThis.TibetanExtension.dictionary;
  });

  describe("getDictionaryCatalog", () => {
    test("returns array of dictionary entries", () => {
      const catalog = dictionary.getDictionaryCatalog();
      expect(Array.isArray(catalog)).toBe(true);
      expect(catalog.length).toBeGreaterThan(0);
    });

    test("each catalog entry has id, label, description", () => {
      const catalog = dictionary.getDictionaryCatalog();
      for (const entry of catalog) {
        expect(entry).toHaveProperty("id");
        expect(entry).toHaveProperty("label");
        expect(entry).toHaveProperty("description");
        expect(typeof entry.id).toBe("string");
        expect(typeof entry.label).toBe("string");
      }
    });

    test("catalog is sorted by label", () => {
      const catalog = dictionary.getDictionaryCatalog();
      const labels = catalog.map((e) => e.label);
      const sorted = [...labels].sort((a, b) => a.localeCompare(b));
      expect(labels).toEqual(sorted);
    });

    test("catalog IDs match defaults enabledDictionaries", () => {
      const catalog = dictionary.getDictionaryCatalog();
      const ids = catalog.map((e) => e.id);
      const defaults = globalThis.TibetanExtension.defaults.settings.enabledDictionaries;
      // Every default-enabled dictionary should appear in the catalog
      for (const id of defaults) {
        expect(ids).toContain(id);
      }
    });
  });

  describe("getTokenizationLexicon", () => {
    test("returns a Set", () => {
      const lexicon = dictionary.getTokenizationLexicon(["botok-core"]);
      expect(lexicon).toBeInstanceOf(Set);
    });

    test("returns empty set when no entries match enabled dictionaries", () => {
      // mockDictionary.js has an empty `entries` object by default
      const lexicon = dictionary.getTokenizationLexicon(["nonexistent-dict"]);
      expect(lexicon.size).toBe(0);
    });
  });

  describe("lookup", () => {
    test("returns empty array for unknown term", () => {
      const results = dictionary.lookup("nonexistent", {});
      expect(results).toHaveLength(0);
    });

    test("returns empty array with empty settings", () => {
      const results = dictionary.lookup("ཆོས", {});
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
