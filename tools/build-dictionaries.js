#!/usr/bin/env node
/**
 * Build dictionary TSV files from source data for the Marginalia Tibetan extension.
 *
 * This script only copies the botok-data general pack (tokenization wordlists).
 * Definition dictionaries from individual authors require explicit redistribution
 * permission or an open license before they can be bundled. See DICTIONARIES.md.
 *
 * Sources:
 *   - botok-data general pack — tokenization wordlists (Unicode Tibetan forms, POS, no definitions)
 *
 * Output: public/data/dialect_packs/botok_general/dictionary/
 *         matching botok's format: form\tpos\tlemma\tsense\tfreq
 */

const fs = require("fs");
const path = require("path");

const BOTOK_DATA_DIR = process.argv[2] || "/tmp/botok-data";
const OUTPUT_DIR = path.join(__dirname, "..", "public", "data", "dialect_packs", "botok_general", "dictionary");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Copy botok-data general pack TSV files (tokenization wordlists).
 * These populate the trie for word segmentation.
 */
function copyBotokGeneralPack() {
  const srcBase = path.join(BOTOK_DATA_DIR, "dialect_packs", "general", "dictionary");
  const categories = ["words", "words_non_inflected"];

  for (const category of categories) {
    const srcDir = path.join(srcBase, category);
    const destDir = path.join(OUTPUT_DIR, category);
    ensureDir(destDir);

    if (!fs.existsSync(srcDir)) {
      console.log(`  Skipping ${category} (not found)`);
      continue;
    }

    const files = fs.readdirSync(srcDir).filter((f) => f.endsWith(".tsv"));
    for (const file of files) {
      const src = path.join(srcDir, file);
      const dest = path.join(destDir, file);
      fs.copyFileSync(src, dest);
      const lineCount = fs.readFileSync(src, "utf-8").split("\n").filter(Boolean).length;
      console.log(`  Copied ${category}/${file} (${lineCount} lines)`);
    }
  }
}

// Main
console.log("Building dictionary files for Marginalia Tibetan...\n");
console.log("Copying botok-data general pack (tokenization wordlists):");
copyBotokGeneralPack();
console.log(`\nDone. Output directory: ${OUTPUT_DIR}`);
