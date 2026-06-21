/**
 * Tests for src/core/botokPackManifest.js
 * Verifies the dialect pack manifest structure and file references.
 */
import { describe, test, expect, beforeEach } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadSharedModules } from "./helpers/load-extension.js";

const ROOT = join(import.meta.dirname, "..");

describe("botokPackManifest.js", () => {
  let manifest;

  beforeEach(() => {
    loadSharedModules();
    manifest = globalThis.TibetanExtension.botokPackManifest;
  });

  test("has a profile string", () => {
    expect(typeof manifest.profile).toBe("string");
    expect(manifest.profile.length).toBeGreaterThan(0);
  });

  test("references SylComponents.json", () => {
    expect(manifest.resources.sylComponents).toBe("data/resources/SylComponents.json");
  });

  test("SylComponents.json file exists on disk", () => {
    expect(existsSync(join(ROOT, manifest.resources.sylComponents))).toBe(true);
  });

  test("has dictionary catalog with entries", () => {
    const ids = Object.keys(manifest.dictionaryCatalog);
    expect(ids.length).toBeGreaterThan(0);
    // Each catalog entry ID should be a non-empty string
    for (const id of ids) {
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    }
  });

  test("each catalog entry has id, label, description", () => {
    for (const entry of Object.values(manifest.dictionaryCatalog)) {
      expect(entry).toHaveProperty("id");
      expect(entry).toHaveProperty("label");
      expect(entry).toHaveProperty("description");
    }
  });

  test("has dictionary files for words category", () => {
    const words = manifest.files.dictionary.words;
    expect(Array.isArray(words)).toBe(true);
    expect(words.length).toBeGreaterThan(0);
  });

  test("each dictionary file descriptor has path", () => {
    for (const file of manifest.files.dictionary.words) {
      expect(file).toHaveProperty("path");
      expect(typeof file.path).toBe("string");
    }
  });

  test("all referenced dictionary files exist on disk", () => {
    const allFiles = [
      ...manifest.files.dictionary.words,
      ...(manifest.files.dictionary.words_non_inflected || [])
    ];

    for (const file of allFiles) {
      const fullPath = join(ROOT, file.path);
      expect(existsSync(fullPath), `Missing file: ${file.path}`).toBe(true);
    }
  });

  test("has words_non_inflected category for particles", () => {
    const particles = manifest.files.dictionary.words_non_inflected;
    expect(Array.isArray(particles)).toBe(true);
    expect(particles.length).toBeGreaterThan(0);
    expect(particles[0].path).toContain("particles");
  });

  test("manifest file paths use consistent base directory", () => {
    const allFiles = manifest.files.dictionary.words;
    for (const file of allFiles) {
      expect(file.path).toMatch(/^data\/dialect_packs\//);
    }
  });
});
