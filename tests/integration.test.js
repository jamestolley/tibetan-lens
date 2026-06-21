/**
 * Integration tests — full pipeline from text input through tokenization
 * to DOM rendering with tooltip display.
 *
 * These tests load all modules (with stubbed fetch/chrome) and exercise
 * the end-to-end flow that the content script performs.
 */
import { describe, test, expect, beforeEach, vi, afterEach } from "vitest";
import { loadSharedModules, loadTokenizerModule, loadModule } from "./helpers/load-extension.js";

const MINIMAL_SYL_COMPONENTS = {
  dadrag: [],
  roots: {
    "\u0f56\u0f40\u0fb2": "C",
    "\u0f64\u0f72\u0f66": "C",
    "\u0f56\u0f51\u0f7a": "C",
    "\u0f63\u0f7a\u0f42\u0f66": "C",
    "\u0f46\u0f7c\u0f66": "C"
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

const WORDS_TSV = [
  "ཆོས\tNOUN\tཆོས\tdharma; religion\t5000",
  "བཀྲ་ཤིས\tNOUN\tབཀྲ་ཤིས\tauspiciousness\t1000"
].join("\n");

function setupFetchMock() {
  globalThis.fetch = vi.fn(async (url) => {
    if (url.includes("SylComponents.json")) {
      return { ok: true, json: async () => MINIMAL_SYL_COMPONENTS, text: async () => JSON.stringify(MINIMAL_SYL_COMPONENTS) };
    }
    if (url.includes(".tsv")) {
      return { ok: true, text: async () => WORDS_TSV };
    }
    return { ok: false, status: 404 };
  });
}

describe("integration — text-to-DOM pipeline", () => {
  let ext;

  beforeEach(async () => {
    loadSharedModules();
    setupFetchMock();
    loadTokenizerModule();
    loadModule("src/content/replacement-engine.js");
    loadModule("src/content/tooltip.js");
    ext = globalThis.TibetanExtension;
    await ext.tokenizer.ensureReady();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("tokenizes Tibetan text and renders word spans", () => {
    document.body.innerHTML = "<p>ཆོས།</p>";
    const nodes = ext.replacementEngine.collectTextNodes(document.body);
    expect(nodes.length).toBe(1);

    const segments = ext.tibetan.splitByTibetanRuns(nodes[0].textContent);
    const tibetanSegment = segments.find((s) => s.type === "tibetan");
    const tokens = ext.tokenizer.segment(tibetanSegment.text, {});

    const fragment = document.createDocumentFragment();
    tokens.forEach((token) => {
      if (token.type === "word") {
        const span = document.createElement("span");
        span.className = "tibetan-extension-word";
        span.textContent = token.surfaceText || token.text;
        fragment.appendChild(span);
      } else {
        fragment.appendChild(document.createTextNode(token.text));
      }
    });

    ext.replacementEngine.replaceTextNode(nodes[0], fragment);

    const processed = document.querySelector(".tibetan-extension-node");
    expect(processed).not.toBeNull();
    const wordSpans = processed.querySelectorAll(".tibetan-extension-word");
    expect(wordSpans.length).toBeGreaterThan(0);
  });

  test("tooltip shows dictionary entries for tokenized word", () => {
    const anchor = document.createElement("span");
    anchor.className = "tibetan-extension-word";
    anchor.dataset.lookupKey = "ཆོས";
    anchor.dataset.term = "ཆོས";
    document.body.appendChild(anchor);

    const lookupResults = ext.botokLookup.lookup("ཆོས", {});

    ext.tooltip.showTooltip(anchor, {
      term: "ཆོས",
      entries: lookupResults,
      language: "en"
    });

    const tooltipEl = document.getElementById("tibetan-extension-tooltip");
    expect(tooltipEl).not.toBeNull();
    expect(tooltipEl.classList.contains("is-visible")).toBe(true);

    if (lookupResults.length > 0) {
      const glossEl = tooltipEl.querySelector(".tibetan-extension-tooltip-gloss");
      expect(glossEl).not.toBeNull();
    }
  });

  test("restoreProcessedNodes reverts DOM to original text", () => {
    document.body.innerHTML = "<p>ཆོས</p>";
    const nodes = ext.replacementEngine.collectTextNodes(document.body);
    const fragment = document.createDocumentFragment();
    fragment.appendChild(document.createTextNode("processed"));
    ext.replacementEngine.replaceTextNode(nodes[0], fragment);

    expect(document.querySelector(".tibetan-extension-node")).not.toBeNull();

    ext.replacementEngine.restoreProcessedNodes(document);
    expect(document.querySelector(".tibetan-extension-node")).toBeNull();
    expect(document.querySelector("p").textContent).toBe("ཆོས");
  });

  test("splitByTibetanRuns + segment pipeline handles mixed text", () => {
    const input = "Hello བཀྲ་ཤིས་བདེ་ལེགས། World";
    const segments = ext.tibetan.splitByTibetanRuns(input);

    expect(segments.length).toBe(3);
    expect(segments[0].type).toBe("text");
    expect(segments[1].type).toBe("tibetan");
    expect(segments[2].type).toBe("text");

    const tokens = ext.tokenizer.segment(segments[1].text, {});
    expect(tokens.length).toBeGreaterThan(0);

    const words = tokens.filter((t) => t.type === "word");
    const puncts = tokens.filter((t) => t.type === "punctuation");
    expect(words.length).toBeGreaterThan(0);
    expect(puncts.length).toBeGreaterThan(0);
  });

  test("full pipeline preserves non-Tibetan text unchanged", () => {
    document.body.innerHTML = "<p>Hello བཀྲ World</p>";
    const nodes = ext.replacementEngine.collectTextNodes(document.body);
    expect(nodes.length).toBe(1);

    const segments = ext.tibetan.splitByTibetanRuns(nodes[0].textContent);
    const fragment = document.createDocumentFragment();

    segments.forEach((seg) => {
      if (seg.type === "text") {
        fragment.appendChild(document.createTextNode(seg.text));
      } else {
        const tokens = ext.tokenizer.segment(seg.text, {});
        tokens.forEach((token) => {
          if (token.type === "word") {
            const span = document.createElement("span");
            span.className = "tibetan-extension-word";
            span.textContent = token.surfaceText || token.text;
            fragment.appendChild(span);
          } else {
            fragment.appendChild(document.createTextNode(token.text));
          }
        });
      }
    });

    ext.replacementEngine.replaceTextNode(nodes[0], fragment);

    const processed = document.querySelector(".tibetan-extension-node");
    // The text content should include all parts
    expect(processed.textContent).toContain("Hello");
    expect(processed.textContent).toContain("World");
  });
});
