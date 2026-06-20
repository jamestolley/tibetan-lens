#!/usr/bin/env node
/**
 * Build dictionary TSV files from source data for the Tibetan Lens extension.
 *
 * Sources:
 *   1. botok-data general pack — tokenization wordlists (Unicode Tibetan forms, POS, no definitions)
 *   2. Christian Steinert's public dictionaries — pipe-delimited Wylie (tibetan_wylie|english)
 *      Converted from EWTS/Wylie to Unicode Tibetan using jsewts.
 *
 * Output: TSV files in data/dialect_packs/botok_general/dictionary/
 *         matching botok's format: form\tpos\tlemma\tsense\tfreq
 */

const fs = require("fs");
const path = require("path");
const jsewts = require("jsewts");

const BOTOK_DATA_DIR = process.argv[2] || "/tmp/botok-data";
const STEINERT_DIR = process.argv[3] || "/tmp/tibetan-dictionary/_input/dictionaries/public";
const OUTPUT_DIR = path.join(__dirname, "..", "data", "dialect_packs", "botok_general", "dictionary");

const STEINERT_SOURCES = [
  { file: "01-Hopkins2015", id: "hopkins", label: "Hopkins Tibetan-English Dictionary" },
  { file: "07-JimValby", id: "jim-valby", label: "Jim Valby Tibetan-English Dictionary" },
  { file: "08-IvesWaldo", id: "ives-waldo", label: "Ives Waldo Tibetan-English Dictionary" },
  { file: "33-TsepakRigdzin", id: "tsepak-rigdzin", label: "Tsepak Rigdzin Tibetan-English Dictionary" },
  { file: "43-84000Dict", id: "84000", label: "84000 Translating the Words of the Buddha" },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function escapeTsvField(text) {
  return (text || "").replace(/\t/g, " ").replace(/\n/g, " ").replace(/\r/g, "");
}

/**
 * Convert EWTS/Wylie headword to Unicode Tibetan.
 * Returns null if conversion fails or produces non-Tibetan output.
 */
function wylieToUnicode(wylie) {
  if (!wylie) return null;
  try {
    const unicode = jsewts.fromWylie(wylie);
    // Verify result contains Tibetan characters (U+0F00–U+0FFF)
    if (!/[\u0F00-\u0FFF]/.test(unicode)) return null;
    return unicode;
  } catch {
    return null;
  }
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

/**
 * Convert a Steinert pipe-delimited dictionary to botok-style TSV.
 * Input format:  tibetan_wylie|english_definition
 * Output format: form\tpos\tlemma\tsense\tfreq
 */
function convertSteinertDictionary(source) {
  const srcPath = path.join(STEINERT_DIR, source.file);
  if (!fs.existsSync(srcPath)) {
    console.log(`  Skipping ${source.file} (not found)`);
    return 0;
  }

  const raw = fs.readFileSync(srcPath, "utf-8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const entries = [];
  let skipped = 0;

  for (const line of lines) {
    const pipeIndex = line.indexOf("|");
    if (pipeIndex < 0) continue;

    const wylie = line.slice(0, pipeIndex).trim();
    const sense = line.slice(pipeIndex + 1).trim();

    if (!wylie || !sense) continue;

    const unicodeForm = wylieToUnicode(wylie);
    if (!unicodeForm) {
      skipped++;
      continue;
    }

    const cleanSense = escapeTsvField(sense);
    const truncatedSense = cleanSense.length > 300 ? cleanSense.slice(0, 297) + "..." : cleanSense;

    entries.push(`${unicodeForm}\t\t\t${truncatedSense}`);
  }

  const destDir = path.join(OUTPUT_DIR, "words");
  ensureDir(destDir);
  const destPath = path.join(destDir, `${source.id}.tsv`);
  const header = "# form\tpos\tlemma\tsense\tfreq";
  fs.writeFileSync(destPath, [header, ...entries].join("\n") + "\n");

  console.log(`  Converted ${source.file} → words/${source.id}.tsv (${entries.length} entries, ${skipped} skipped)`);
  return entries.length;
}

// Main
console.log("Building dictionary files for Tibetan Lens...\n");

console.log("1. Copying botok-data general pack (tokenization wordlists):");
copyBotokGeneralPack();

console.log("\n2. Converting Steinert public dictionaries (Wylie → Unicode + English definitions):");
let totalDefinitions = 0;
for (const source of STEINERT_SOURCES) {
  totalDefinitions += convertSteinertDictionary(source);
}

console.log(`\nDone. Total definition entries: ${totalDefinitions}`);
console.log(`Output directory: ${OUTPUT_DIR}`);
