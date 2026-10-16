#!/usr/bin/env node
/**
 * Convert the ACTib one-tag POS lexicon (from Esukhia/bo-pos, derived from the
 * ACTib II corpus, CC BY 4.0) into a botok-format TSV used as a POS fallback
 * dictionary.
 *
 * Source: tools/.cache/actib-one-tag.txt (downloaded from
 *   https://raw.githubusercontent.com/Esukhia/bo-pos/master/rc/ACTib-one-tag.txt
 *   — data derived from https://doi.org/10.5281/zenodo.822537, CC BY 4.0)
 *
 * Output: public/data/dialect_packs/botok_general/dictionary/words/actib_pos.tsv
 *
 * Filtering: keep only clean Tibetan forms (letters + tseg) of <= 2 syllables,
 * plus any form that already appears in our bundled wordlists (those are the
 * forms the tokenizer can actually produce). Everything else is OCR noise or
 * rare long forms that would only bloat the package.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const CACHE = path.join(ROOT, "tools", ".cache");
const SRC = path.join(CACHE, "actib-one-tag.txt");
const OUT = path.join(
  ROOT,
  "public/data/dialect_packs/botok_general/dictionary/words/actib_pos.tsv"
);
const RAW_URL =
  "https://raw.githubusercontent.com/Esukhia/bo-pos/master/rc/ACTib-one-tag.txt";

const VALID_TAGS = new Set([
  "NOUN", "PROPN", "VERB", "ADJ", "ADV", "PRON", "DET", "ADP",
  "PART", "NUM", "CONJ", "INTJ", "PUNCT", "AUX", "SCONJ", "OTHER", "X"
]);

function normalizeForm(word) {
  return word.replace(/་/gu, "").trim();
}

function main() {
  if (!fs.existsSync(SRC)) {
    fs.mkdirSync(CACHE, { recursive: true });
    console.log("Downloading ACTib one-tag lexicon...");
    execSync(`curl -sL "${RAW_URL}" -o "${SRC}"`, { stdio: "inherit" });
  }

  // Collect forms already present in our bundled wordlists.
  const ours = new Set();
  for (const dir of ["words", "words_non_inflected"]) {
    const dirPath = path.join(
      ROOT,
      "public/data/dialect_packs/botok_general/dictionary",
      dir
    );
    if (!fs.existsSync(dirPath)) continue;
    for (const file of fs.readdirSync(dirPath)) {
      if (!file.endsWith(".tsv")) continue;
      for (const line of fs
        .readFileSync(path.join(dirPath, file), "utf8")
        .split("\n")) {
        if (!line || line.startsWith("#")) continue;
        const form = line.split("\t")[0].trim().replace(/^\uFEFF/, "");
        if (form) ours.add(normalizeForm(form));
      }
    }
  }

  const kept = new Map();
  let seen = 0;
  for (const line of fs.readFileSync(SRC, "utf8").split("\n")) {
    const trimmed = line.trim();
    const splitAt = trimmed.lastIndexOf(" ");
    if (splitAt < 0) continue;
    const word = trimmed.slice(0, splitAt);
    const tag = trimmed.slice(splitAt + 1);
    seen += 1;

    if (!VALID_TAGS.has(tag)) continue;
    if (!/^[\u0f40-\u0f7c\u0f7f\u0f0b]+$/u.test(word)) continue;
    if (!/^[\u0f40-\u0f7f]/u.test(word)) continue;
    if (!/[\u0f40-\u0f69]/u.test(word)) continue;

    const syllables = word.split("་").length;
    if (syllables <= 2 || ours.has(normalizeForm(word))) {
      kept.set(word, tag);
    }
  }

  const header = [
    "# ACTib one-tag POS lexicon (derived from the ACTib II corpus)",
    "# Source: https://doi.org/10.5281/zenodo.822537 via https://github.com/Esukhia/bo-pos",
    "# License: Creative Commons Attribution 4.0 International (CC BY 4.0)",
    "# Note: POS fallback layer — no definitions; used only to fill in missing",
    "#       part-of-speech tags. Filtered to <=2-syllable forms and forms",
    "#       already present in the bundled wordlists.",
    "# form\tpos\tlemma\tsense\tfreq"
  ];

  const body = [...kept.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([word, tag]) => `${word}\t${tag}\t\t\t`);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, header.join("\n") + "\n" + body.join("\n") + "\n");

  console.log(
    `Scanned ${seen} entries; kept ${kept.size} -> ${path.relative(ROOT, OUT)}`
  );
}

main();
