/**
 * Tests for src/shared/tibetan.js
 * Covers: containsTibetan, splitByTibetanRuns, normalizeLookupKey,
 *         countSyllables, isTibetanPunctuation
 */
import { describe, test, expect, beforeEach } from "vitest";
import { loadSharedModules } from "./helpers/load-extension.js";

describe("tibetan.js", () => {
  let tibetan;

  beforeEach(() => {
    loadSharedModules();
    tibetan = globalThis.TibetanExtension.tibetan;
  });

  describe("containsTibetan", () => {
    test("returns true for Tibetan text", () => {
      expect(tibetan.containsTibetan("བཀྲ་ཤིས་བདེ་ལེགས།")).toBe(true);
    });

    test("returns true for mixed Tibetan+Latin", () => {
      expect(tibetan.containsTibetan("hello བཀྲ world")).toBe(true);
    });

    test("returns false for pure Latin text", () => {
      expect(tibetan.containsTibetan("hello world")).toBe(false);
    });

    test("returns false for empty string", () => {
      expect(tibetan.containsTibetan("")).toBe(false);
    });

    test("returns true for single Tibetan character", () => {
      expect(tibetan.containsTibetan("ཀ")).toBe(true);
    });

    test("returns false for numbers and symbols", () => {
      expect(tibetan.containsTibetan("12345 !@#$")).toBe(false);
    });
  });

  describe("splitByTibetanRuns", () => {
    test("splits pure Tibetan into one run", () => {
      const segments = tibetan.splitByTibetanRuns("བཀྲ་ཤིས་བདེ་ལེགས།");
      expect(segments).toHaveLength(1);
      expect(segments[0].type).toBe("tibetan");
      expect(segments[0].text).toBe("བཀྲ་ཤིས་བདེ་ལེགས།");
    });

    test("splits mixed text into tibetan and text segments", () => {
      const segments = tibetan.splitByTibetanRuns("hello བཀྲ་ world");
      expect(segments).toHaveLength(3);
      expect(segments[0]).toEqual({ type: "text", text: "hello " });
      expect(segments[1]).toEqual({ type: "tibetan", text: "བཀྲ་" });
      expect(segments[2]).toEqual({ type: "text", text: " world" });
    });

    test("handles pure Latin text", () => {
      const segments = tibetan.splitByTibetanRuns("hello world");
      expect(segments).toHaveLength(1);
      expect(segments[0].type).toBe("text");
    });

    test("handles empty string", () => {
      const segments = tibetan.splitByTibetanRuns("");
      expect(segments).toHaveLength(0);
    });

    test("handles multiple Tibetan runs", () => {
      const segments = tibetan.splitByTibetanRuns("A བཀྲ B ཤིས C");
      expect(segments).toHaveLength(5);
      expect(segments[0].type).toBe("text");
      expect(segments[1].type).toBe("tibetan");
      expect(segments[2].type).toBe("text");
      expect(segments[3].type).toBe("tibetan");
      expect(segments[4].type).toBe("text");
    });
  });

  describe("normalizeLookupKey", () => {
    test("removes trailing tsek", () => {
      expect(tibetan.normalizeLookupKey("བཀྲ་")).toBe("བཀྲ");
    });

    test("collapses multiple tseks", () => {
      expect(tibetan.normalizeLookupKey("བཀྲ་་ཤིས")).toBe("བཀྲ་ཤིས");
    });

    test("trims whitespace", () => {
      expect(tibetan.normalizeLookupKey("  བཀྲ  ")).toBe("བཀྲ");
    });

    test("removes edge punctuation marks", () => {
      expect(tibetan.normalizeLookupKey("།བཀྲ།")).toBe("བཀྲ");
    });

    test("handles empty string", () => {
      expect(tibetan.normalizeLookupKey("")).toBe("");
    });

    test("preserves internal tseks between syllables", () => {
      expect(tibetan.normalizeLookupKey("བཀྲ་ཤིས")).toBe("བཀྲ་ཤིས");
    });
  });

  describe("countSyllables", () => {
    test("counts single syllable", () => {
      expect(tibetan.countSyllables("བཀྲ་")).toBe(1);
    });

    test("counts multiple syllables", () => {
      expect(tibetan.countSyllables("བཀྲ་ཤིས་བདེ་ལེགས")).toBe(4);
    });

    test("returns 0 for empty string", () => {
      expect(tibetan.countSyllables("")).toBe(0);
    });

    test("counts two syllables", () => {
      expect(tibetan.countSyllables("བཀྲ་ཤིས")).toBe(2);
    });
  });

  describe("isTibetanPunctuation", () => {
    test("returns true for shad །", () => {
      expect(tibetan.isTibetanPunctuation("།")).toBe(true);
    });

    test("returns true for nyis-shad ༎", () => {
      expect(tibetan.isTibetanPunctuation("༎")).toBe(true);
    });

    test("returns false for tsek ་", () => {
      expect(tibetan.isTibetanPunctuation("་")).toBe(false);
    });

    test("returns false for Latin punctuation", () => {
      expect(tibetan.isTibetanPunctuation(".")).toBe(false);
    });

    test("returns false for consonant", () => {
      expect(tibetan.isTibetanPunctuation("ཀ")).toBe(false);
    });
  });
});
