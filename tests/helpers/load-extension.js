/**
 * Loads extension source modules in the correct order (same as manifest.json).
 * Each module is an IIFE that attaches to globalThis.TibetanExtension.
 *
 * Usage:
 *   import { loadSharedModules, loadAllModules } from './helpers/load-extension.js';
 *   beforeEach(() => { loadSharedModules(); });
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach } from "vitest";

const HERE = typeof import.meta.dirname === "string" ? import.meta.dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../..");

function loadModule(relativePath) {
  const code = readFileSync(join(ROOT, relativePath), "utf-8");
  // eslint-disable-next-line no-eval
  const fn = new Function(code);
  fn();
}

/**
 * Load only the shared + core modules (no DOM-dependent content scripts).
 * Useful for testing pure logic: tibetan utils, tokenizer, dictionary, etc.
 */
export function loadSharedModules() {
  globalThis.TibetanExtension = {};
  loadModule("src/shared/constants.js");
  loadModule("src/shared/defaults.js");
  loadModule("src/shared/storage.js");
  loadModule("src/shared/tibetan.js");
  loadModule("src/core/botokPackManifest.js");
  loadModule("src/core/mockDictionary.js");
}

/**
 * Load shared + core + the tokenizer module.
 * The tokenizer needs special handling because it calls chrome.runtime.getURL / fetch.
 */
export function loadTokenizerModule() {
  loadModule("src/core/botokTokenizer.js");
}

/**
 * Load content-script DOM modules (replacement engine, tooltip, content script).
 * Call loadSharedModules() first.
 */
export function loadContentModules() {
  loadModule("src/content/replacement-engine.js");
  loadModule("src/content/tooltip.js");
  loadModule("src/content/content-script.js");
}

/**
 * Load everything except the main content-script bootstrap
 * (which immediately triggers async bootstrap/DOM mutation observer).
 */
export function loadAllExceptBootstrap() {
  loadSharedModules();
  loadTokenizerModule();
  loadModule("src/content/replacement-engine.js");
  loadModule("src/content/tooltip.js");
}

/**
 * Convenience: sets up beforeEach to reload shared modules fresh.
 */
export function useSharedModules() {
  beforeEach(() => {
    loadSharedModules();
  });
}

export { loadModule };
