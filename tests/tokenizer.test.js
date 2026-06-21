/**
 * Tests for src/core/botokTokenizer.js
 *
 * The tokenizer IIFE attaches to globalThis.TibetanExtension as:
 *   extension.tokenizer  — { ensureReady, segment }
 *   extension.botokLookup — { ensureReady, lookup }
 *
 * Internal classes (TokChunks, BasicTrie, BrowserTrie, BoSyl, etc.) are
 * private to the IIFE but are exercised via the public surface.
 *
 * Since the real loadPack() calls chrome.runtime.getURL + fetch for TSV files,
 * we stub fetch to return minimal test data so we can test the full pipeline.
 */
import { describe, test, expect, beforeEach, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadSharedModules, loadTokenizerModule } from "./helpers/load-extension.js";

const ROOT = join(import.meta.dirname, "..");

// Minimal SylComponents JSON for affix/inflection testing
const MINIMAL_SYL_COMPONENTS = {
  dadrag: [],
  roots: {
    "\u0f56\u0f40\u0fb2": "C",
    "\u0f64\u0f72\u0f66": "C",
    "\u0f56\u0f51\u0f7a": "C",
    "\u0f63\u0f7a\u0f42\u0f66": "C",
    "\u0f46\u0f7c\u0f66": "C",
    "\u0f62\u0f72\u0f42": "C",
    "\u0f56\u0f7c\u0f51": "C",
    "\u0f66\u0f90\u0f51": "C"
  },
  suffixes: [],
  Csuffixes: [],
  special: [],
  wazurs: [],
  ambiguous: {},
  m_roots: {},
  m_exceptions: {},
  m_wazurs: {}
};

// Minimal TSV data: "form\tpos\tlemma\tsense\tfreq"
const MINIMAL_WORDS_TSV = [
  "བཀྲ་ཤིས\tNOUN\tབཀྲ་ཤིས\tauspiciousness\t1000",
  "བདེ་ལེགས\tNOUN\tབདེ་ལེགས\thappiness\t900",
  "ཆོས\tNOUN\tཆོས\tdharma; religion\t5000",
  "རིག\tNOUN\tརིག\tknowledge\t800",
  "བོད\tNOUN\tབོད\tTibet\t3000",
  "སྐད\tNOUN\tསྐད\tlanguage\t2000",
  "བོད་སྐད\tNOUN\tབོད་སྐད\tTibetan language\t1500"
].join("\n");

const MINIMAL_PARTICLES_TSV = [
  "གི\tPART",
  "ཀྱི\tPART",
  "གིས\tPART"
].join("\n");

function setupFetchMock() {
  const fetchMock = vi.fn(async (url) => {
    // Route based on URL
    if (url.includes("SylComponents.json")) {
      return {
        ok: true,
        json: async () => MINIMAL_SYL_COMPONENTS,
        text: async () => JSON.stringify(MINIMAL_SYL_COMPONENTS)
      };
    }
    if (url.includes("particles.tsv")) {
      return { ok: true, text: async () => MINIMAL_PARTICLES_TSV };
    }
    if (url.includes(".tsv")) {
      return { ok: true, text: async () => MINIMAL_WORDS_TSV };
    }
    return { ok: false, status: 404 };
  });

  globalThis.fetch = fetchMock;
  return fetchMock;
}

describe("tokenizer — public API", () => {
  let ext;

  beforeEach(() => {
    loadSharedModules();
    setupFetchMock();
    loadTokenizerModule();
    ext = globalThis.TibetanExtension;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("exposes tokenizer.ensureReady and tokenizer.segment", () => {
    expect(typeof ext.tokenizer.ensureReady).toBe("function");
    expect(typeof ext.tokenizer.segment).toBe("function");
  });

  test("exposes botokLookup.ensureReady and botokLookup.lookup", () => {
    expect(typeof ext.botokLookup.ensureReady).toBe("function");
    expect(typeof ext.botokLookup.lookup).toBe("function");
  });

  test("segment throws before ensureReady", () => {
    expect(() => ext.tokenizer.segment("བཀྲ", {})).toThrow("Botok tokenizer used before it was ready");
  });

  test("ensureReady loads the pack and enables segment", async () => {
    await ext.tokenizer.ensureReady();
    const tokens = ext.tokenizer.segment("བཀྲ་ཤིས", {});
    expect(tokens.length).toBeGreaterThan(0);
  });

  test("ensureReady is idempotent", async () => {
    const p1 = ext.tokenizer.ensureReady();
    const p2 = ext.tokenizer.ensureReady();
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe(r2);
  });
});

describe("tokenizer — segmentation", () => {
  let segment;

  beforeEach(async () => {
    loadSharedModules();
    setupFetchMock();
    loadTokenizerModule();
    await globalThis.TibetanExtension.tokenizer.ensureReady();
    segment = (text) => globalThis.TibetanExtension.tokenizer.segment(text, {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("segments single-syllable word", () => {
    const tokens = segment("ཆོས");
    const words = tokens.filter((t) => t.type === "word");
    expect(words.length).toBeGreaterThan(0);
    expect(words[0].text).toBe("ཆོས");
  });

  test("segments multi-syllable word", () => {
    const tokens = segment("བཀྲ་ཤིས་");
    const words = tokens.filter((t) => t.type === "word");
    expect(words.length).toBeGreaterThan(0);
  });

  test("separates punctuation from words", () => {
    const tokens = segment("ཆོས།");
    const words = tokens.filter((t) => t.type === "word");
    const puncts = tokens.filter((t) => t.type === "punctuation");
    expect(words.length).toBeGreaterThan(0);
    expect(puncts.length).toBeGreaterThan(0);
    expect(puncts[0].text).toBe("།");
  });

  test("handles spaces between words", () => {
    const tokens = segment("ཆོས་ རིག");
    const spaces = tokens.filter((t) => t.type === "space");
    expect(spaces.length).toBe(1);
  });

  test("handles multiple punctuation marks", () => {
    const tokens = segment("ཆོས།།");
    const puncts = tokens.filter((t) => t.type === "punctuation");
    expect(puncts.length).toBe(2);
  });

  test("word tokens have expected shape", () => {
    const tokens = segment("ཆོས་");
    const word = tokens.find((t) => t.type === "word");
    expect(word).toBeDefined();
    expect(word).toHaveProperty("text");
    expect(word).toHaveProperty("surfaceText");
    expect(word).toHaveProperty("lookupKey");
    expect(word).toHaveProperty("matched");
    expect(word).toHaveProperty("start");
    expect(word).toHaveProperty("end");
    expect(word).toHaveProperty("senses");
  });

  test("matched word has senses array", () => {
    const tokens = segment("ཆོས་");
    const word = tokens.find((t) => t.type === "word" && t.matched);
    if (word) {
      expect(Array.isArray(word.senses)).toBe(true);
      expect(word.senses.length).toBeGreaterThan(0);
    }
  });

  test("unmatched syllable has matched=false", () => {
    const tokens = segment("ཟྱཀ་"); // unlikely to be in dictionary
    const words = tokens.filter((t) => t.type === "word");
    expect(words.length).toBeGreaterThan(0);
    // All should be unmatched since it's gibberish
    expect(words.every((w) => !w.matched)).toBe(true);
  });

  test("handles empty string", () => {
    const tokens = segment("");
    expect(tokens).toHaveLength(0);
  });

  test("handles string with only punctuation", () => {
    const tokens = segment("།།།");
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens.every((t) => t.type === "punctuation")).toBe(true);
  });

  test("handles string with only spaces", () => {
    const tokens = segment("   ");
    expect(tokens.length).toBe(3);
    expect(tokens.every((t) => t.type === "space")).toBe(true);
  });
});

describe("tokenizer — lookup", () => {
  let lookup;

  beforeEach(async () => {
    loadSharedModules();
    setupFetchMock();
    loadTokenizerModule();
    await globalThis.TibetanExtension.tokenizer.ensureReady();
    lookup = (term) => globalThis.TibetanExtension.botokLookup.lookup(term, {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("looks up known word by form", () => {
    const results = lookup("ཆོས");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].headword).toBe("ཆོས");
  });

  test("returns empty for unknown term", () => {
    const results = lookup("ཟྱཀ");
    expect(results).toHaveLength(0);
  });

  test("lookup entries have expected shape", () => {
    const results = lookup("ཆོས");
    if (results.length > 0) {
      const entry = results[0];
      expect(entry).toHaveProperty("dictionaryId");
      expect(entry).toHaveProperty("dictionaryLabel");
      expect(entry).toHaveProperty("headword");
      expect(entry).toHaveProperty("glosses");
      expect(Array.isArray(entry.glosses)).toBe(true);
    }
  });

  test("returns empty before ensureReady", () => {
    // Reset and reload without calling ensureReady
    loadSharedModules();
    setupFetchMock();
    loadTokenizerModule();
    const results = globalThis.TibetanExtension.botokLookup.lookup("ཆོས", {});
    expect(results).toHaveLength(0);
  });
});
