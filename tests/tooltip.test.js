/**
 * Tests for src/content/tooltip.js
 * Covers: showTooltip, hideTooltip, isTooltipElement
 */
import { describe, test, expect, beforeEach } from "vitest";
import { loadSharedModules, loadModule } from "./helpers/load-extension.js";

describe("tooltip.js", () => {
  let tooltip;

  beforeEach(() => {
    loadSharedModules();
    loadModule("src/content/tooltip.js");
    tooltip = globalThis.TibetanExtension.tooltip;
    document.body.innerHTML = "";
  });

  describe("showTooltip", () => {
    test("creates tooltip element in DOM", () => {
      const anchor = document.createElement("span");
      anchor.textContent = "test";
      document.body.appendChild(anchor);

      tooltip.showTooltip(anchor, {
        term: "ཆོས",
        entries: [],
        language: "en"
      });

      const tooltipEl = document.getElementById("tibetan-extension-tooltip");
      expect(tooltipEl).not.toBeNull();
    });

    test("shows heading with the term", () => {
      const anchor = document.createElement("span");
      document.body.appendChild(anchor);

      tooltip.showTooltip(anchor, {
        term: "ཆོས",
        entries: [],
        language: "en"
      });

      const tooltipEl = document.getElementById("tibetan-extension-tooltip");
      const heading = tooltipEl.querySelector(".tibetan-extension-tooltip-heading");
      expect(heading.textContent).toBe("ཆོས");
    });

    test("shows empty state when no entries", () => {
      const anchor = document.createElement("span");
      document.body.appendChild(anchor);

      tooltip.showTooltip(anchor, {
        term: "ཆོས",
        entries: [],
        language: "en"
      });

      const tooltipEl = document.getElementById("tibetan-extension-tooltip");
      const empty = tooltipEl.querySelector(".tibetan-extension-tooltip-empty");
      expect(empty).not.toBeNull();
      expect(empty.textContent).toContain("No enabled dictionary");
    });

    test("renders dictionary entries", () => {
      const anchor = document.createElement("span");
      document.body.appendChild(anchor);

      tooltip.showTooltip(anchor, {
        term: "ཆོས",
        entries: [
          {
            dictionaryLabel: "Hopkins",
            glosses: ["dharma", "religion"],
            notes: "POS: NOUN"
          },
          {
            dictionaryLabel: "Jim Valby",
            glosses: ["doctrine"],
            notes: ""
          }
        ],
        language: "en"
      });

      const tooltipEl = document.getElementById("tibetan-extension-tooltip");
      const entries = tooltipEl.querySelectorAll(".tibetan-extension-tooltip-entry");
      expect(entries.length).toBe(2);

      const labels = tooltipEl.querySelectorAll(".tibetan-extension-tooltip-label");
      expect(labels[0].textContent).toBe("Hopkins");
      expect(labels[1].textContent).toBe("Jim Valby");

      const glosses = tooltipEl.querySelectorAll(".tibetan-extension-tooltip-gloss");
      expect(glosses[0].textContent).toBe("dharma; religion");
    });

    test("shows notes when present", () => {
      const anchor = document.createElement("span");
      document.body.appendChild(anchor);

      tooltip.showTooltip(anchor, {
        term: "ཆོས",
        entries: [
          {
            dictionaryLabel: "Test",
            glosses: ["test"],
            notes: "POS: NOUN"
          }
        ],
        language: "en"
      });

      const notes = document.querySelector(".tibetan-extension-tooltip-notes");
      expect(notes).not.toBeNull();
      expect(notes.textContent).toBe("POS: NOUN");
    });

    test("omits notes element when notes empty", () => {
      const anchor = document.createElement("span");
      document.body.appendChild(anchor);

      tooltip.showTooltip(anchor, {
        term: "ཆོས",
        entries: [
          {
            dictionaryLabel: "Test",
            glosses: ["test"],
            notes: ""
          }
        ],
        language: "en"
      });

      const notes = document.querySelector(".tibetan-extension-tooltip-notes");
      expect(notes).toBeNull();
    });

    test("adds visible class", () => {
      const anchor = document.createElement("span");
      document.body.appendChild(anchor);

      tooltip.showTooltip(anchor, {
        term: "x",
        entries: [],
        language: "en"
      });

      const tooltipEl = document.getElementById("tibetan-extension-tooltip");
      expect(tooltipEl.classList.contains("is-visible")).toBe(true);
    });

    test("replaces content on second call", () => {
      const anchor = document.createElement("span");
      document.body.appendChild(anchor);

      tooltip.showTooltip(anchor, {
        term: "first",
        entries: [],
        language: "en"
      });

      tooltip.showTooltip(anchor, {
        term: "second",
        entries: [],
        language: "en"
      });

      const headings = document.querySelectorAll(".tibetan-extension-tooltip-heading");
      expect(headings.length).toBe(1);
      expect(headings[0].textContent).toBe("second");
    });
  });

  describe("hideTooltip", () => {
    test("removes visible class", () => {
      const anchor = document.createElement("span");
      document.body.appendChild(anchor);

      tooltip.showTooltip(anchor, { term: "x", entries: [], language: "en" });
      tooltip.hideTooltip();

      const tooltipEl = document.getElementById("tibetan-extension-tooltip");
      expect(tooltipEl.classList.contains("is-visible")).toBe(false);
    });

    test("does not throw when tooltip does not exist", () => {
      expect(() => tooltip.hideTooltip()).not.toThrow();
    });
  });

  describe("isTooltipElement", () => {
    test("returns true for tooltip element", () => {
      const anchor = document.createElement("span");
      document.body.appendChild(anchor);

      tooltip.showTooltip(anchor, { term: "x", entries: [], language: "en" });

      const tooltipEl = document.getElementById("tibetan-extension-tooltip");
      expect(tooltip.isTooltipElement(tooltipEl)).toBe(true);
    });

    test("returns true for child of tooltip", () => {
      const anchor = document.createElement("span");
      document.body.appendChild(anchor);

      tooltip.showTooltip(anchor, {
        term: "x",
        entries: [{ dictionaryLabel: "T", glosses: ["g"], notes: "" }],
        language: "en"
      });

      const label = document.querySelector(".tibetan-extension-tooltip-label");
      expect(tooltip.isTooltipElement(label)).toBe(true);
    });

    test("returns false for non-tooltip element", () => {
      const div = document.createElement("div");
      document.body.appendChild(div);
      expect(tooltip.isTooltipElement(div)).toBe(false);
    });

    test("returns false for text node", () => {
      const text = document.createTextNode("hello");
      expect(tooltip.isTooltipElement(text)).toBe(false);
    });
  });
});
