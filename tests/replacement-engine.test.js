/**
 * Tests for src/content/replacement-engine.js
 * Covers: collectTextNodes, replaceTextNode, restoreProcessedNodes
 */
import { describe, test, expect, beforeEach } from "vitest";
import { loadSharedModules, loadModule } from "./helpers/load-extension.js";

describe("replacement-engine.js", () => {
  let engine;

  beforeEach(() => {
    loadSharedModules();
    loadModule("src/content/replacement-engine.js");
    engine = globalThis.TibetanExtension.replacementEngine;
    document.body.innerHTML = "";
  });

  describe("collectTextNodes", () => {
    test("finds text nodes containing Tibetan", () => {
      document.body.innerHTML = "<p>བཀྲ་ཤིས་བདེ་ལེགས།</p>";
      const nodes = engine.collectTextNodes(document.body);
      expect(nodes.length).toBe(1);
      expect(nodes[0].textContent).toBe("བཀྲ་ཤིས་བདེ་ལེགས།");
    });

    test("ignores text nodes without Tibetan", () => {
      document.body.innerHTML = "<p>Hello world</p>";
      const nodes = engine.collectTextNodes(document.body);
      expect(nodes.length).toBe(0);
    });

    test("skips SCRIPT tags", () => {
      document.body.innerHTML = "<script>var x = 'བཀྲ';</script>";
      const nodes = engine.collectTextNodes(document.body);
      expect(nodes.length).toBe(0);
    });

    test("skips STYLE tags", () => {
      document.body.innerHTML = "<style>.བཀྲ { color: red; }</style>";
      const nodes = engine.collectTextNodes(document.body);
      expect(nodes.length).toBe(0);
    });

    test("skips TEXTAREA tags", () => {
      document.body.innerHTML = "<textarea>བཀྲ</textarea>";
      const nodes = engine.collectTextNodes(document.body);
      expect(nodes.length).toBe(0);
    });

    test("skips INPUT tags", () => {
      document.body.innerHTML = '<div><input value="བཀྲ" /></div>';
      const nodes = engine.collectTextNodes(document.body);
      expect(nodes.length).toBe(0);
    });

    test("skips contenteditable elements", () => {
      document.body.innerHTML = '<div contenteditable="true">བཀྲ</div>';
      const nodes = engine.collectTextNodes(document.body);
      expect(nodes.length).toBe(0);
    });

    test("skips already-processed nodes", () => {
      document.body.innerHTML = `<span class="tibetan-extension-node">བཀྲ</span>`;
      const nodes = engine.collectTextNodes(document.body);
      expect(nodes.length).toBe(0);
    });

    test("skips tooltip nodes", () => {
      document.body.innerHTML = `<aside id="tibetan-extension-tooltip">བཀྲ</aside>`;
      const nodes = engine.collectTextNodes(document.body);
      expect(nodes.length).toBe(0);
    });

    test("returns empty array for null root", () => {
      const nodes = engine.collectTextNodes(null);
      expect(nodes).toHaveLength(0);
    });

    test("collects multiple text nodes", () => {
      document.body.innerHTML = "<p>བཀྲ་</p><p>ཤིས་</p>";
      const nodes = engine.collectTextNodes(document.body);
      expect(nodes.length).toBe(2);
    });

    test("collects nested text nodes", () => {
      document.body.innerHTML = "<div><span><em>བཀྲ་ཤིས</em></span></div>";
      const nodes = engine.collectTextNodes(document.body);
      expect(nodes.length).toBe(1);
    });
  });

  describe("replaceTextNode", () => {
    test("replaces text node with processed wrapper", () => {
      document.body.innerHTML = "<p>བཀྲ་ཤིས</p>";
      const textNode = document.body.querySelector("p").firstChild;
      const fragment = document.createDocumentFragment();
      fragment.appendChild(document.createTextNode("replaced"));

      const wrapper = engine.replaceTextNode(textNode, fragment);
      expect(wrapper.className).toBe("tibetan-extension-node");
      expect(wrapper.dataset.originalText).toBe("བཀྲ་ཤིས");
      expect(wrapper.textContent).toBe("replaced");
    });

    test("wrapper is inserted into the DOM", () => {
      document.body.innerHTML = "<p>བཀྲ་</p>";
      const textNode = document.body.querySelector("p").firstChild;
      const fragment = document.createDocumentFragment();
      fragment.appendChild(document.createTextNode("new content"));

      engine.replaceTextNode(textNode, fragment);
      expect(document.body.querySelector(".tibetan-extension-node")).not.toBeNull();
    });
  });

  describe("restoreProcessedNodes", () => {
    test("restores processed nodes to original text", () => {
      document.body.innerHTML =
        '<p><span class="tibetan-extension-node" data-original-text="བཀྲ་ཤིས">processed</span></p>';
      engine.restoreProcessedNodes(document);
      expect(document.body.querySelector(".tibetan-extension-node")).toBeNull();
      expect(document.body.querySelector("p").textContent).toBe("བཀྲ་ཤིས");
    });

    test("handles multiple processed nodes", () => {
      document.body.innerHTML = [
        '<span class="tibetan-extension-node" data-original-text="first">a</span>',
        '<span class="tibetan-extension-node" data-original-text="second">b</span>'
      ].join("");

      engine.restoreProcessedNodes(document);
      expect(document.body.querySelectorAll(".tibetan-extension-node").length).toBe(0);
    });

    test("is idempotent on clean DOM", () => {
      document.body.innerHTML = "<p>clean text</p>";
      engine.restoreProcessedNodes(document);
      expect(document.body.querySelector("p").textContent).toBe("clean text");
    });
  });
});
