#!/usr/bin/env node
/**
 * Convert the SOAS multi-tag POS lexicon (from Esukhia/bo-pos, derived from the
 * SOAS POS-tagged corpus of Classical Tibetan, CC BY 4.0) into a botok-format
 * TSV used as a POS fallback dictionary.
 *
 * Unlike the ACTib layer, SOAS is human-annotated and stores EVERY tag recorded
 * for a token, so a single form can legitimately carry several parts of speech
 * (compound tags like "n.v.past" mean "attested as noun and past-tense verb").
 * One output row is emitted per (form, UD tag) pair; the tokenizer keeps them
 * as multiple POS-bearing senses so tooltips can show every attested tag.
 *
 * Source: tools/.cache/soas-lexicon.txt (downloaded from
 *   https://raw.githubusercontent.com/Esukhia/bo-pos/master/rc/SOAS-lexicon.txt
 *   — data derived from https://doi.org/10.5281/zenodo.574878, CC BY 4.0)
 *
 * Output: public/data/dialect_packs/botok_general/dictionary/words/soas_pos.tsv
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const CACHE = path.join(ROOT, "tools", ".cache");
const SRC = path.join(CACHE, "soas-lexicon.txt");
const OUT = path.join(
  ROOT,
  "public/data/dialect_packs/botok_general/dictionary/words/soas_pos.tsv"
);
const RAW_URL =
  "https://raw.githubusercontent.com/Esukhia/bo-pos/master/rc/SOAS-lexicon.txt";

/**
 * Map a SOAS tag string to Universal Dependencies POS tags.
 * Returns null when the tag carries no usable POS information.
 */
function mapSoasTag(tag) {
  if (!tag || tag === "dunno" || tag === "non-word" || tag === "no-upasarga") {
    return null;
  }
  if (tag === "numeral" || tag.startsWith("num.")) {
    return ["NUM"];
  }
  if (tag === "punc") {
    return ["PUNCT"];
  }
  if (tag === "interj") {
    return ["INTJ"];
  }
  if (tag === "skt") {
    return ["OTHER"];
  }
  if (tag === "neg") {
    return ["PART"];
  }
  if (tag.startsWith("n.v.")) {
    // Attested as both noun and verb (e.g. n.v.past = noun / past-tense verb).
    const verbPart = tag.slice(4);
    return verbPart === "aux" || verbPart === "cop" ? ["NOUN", "AUX"] : ["NOUN", "VERB"];
  }
  if (tag.startsWith("n.")) {
    return [tag === "n.prop" ? "PROPN" : "NOUN"];
  }
  if (tag.startsWith("v.")) {
    // v.aux, v.cop, v.cop.neg are auxiliaries; everything else is a lexical verb.
    return /^v\.(aux|cop)/u.test(tag) ? ["AUX"] : ["VERB"];
  }
  if (tag === "adj") {
    return ["ADJ"];
  }
  if (tag.startsWith("adv.")) {
    return ["ADV"];
  }
  if (tag.startsWith("p.")) {
    return ["PRON"];
  }
  if (tag.startsWith("d.")) {
    return tag === "d.emph" || tag === "d.tsam" ? ["PART"] : ["DET"];
  }
  if (tag.startsWith("cv.")) {
    return ["SCONJ"];
  }
  if (tag.startsWith("case.")) {
    return ["ADP"];
  }
  if (tag.startsWith("cl.")) {
    return ["PART"];
  }
  return ["OTHER"];
}

function normalizeForm(word) {
  return word.replace(/་/gu, "").trim();
}

function main() {
  if (!fs.existsSync(SRC)) {
    fs.mkdirSync(CACHE, { recursive: true });
    console.log("Downloading SOAS multi-tag lexicon...");
    execSync(`curl -sL "${RAW_URL}" -o "${SRC}"`, { stdio: "inherit" });
  }

  const kept = new Map(); // normalized form -> { word, tags: Set }
  let seen = 0;
  let skipped = 0;

  for (const line of fs.readFileSync(SRC, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [word, ...rawTags] = trimmed.split("\t");
    if (!word) continue;
    seen += 1;

    // Keep only clean Tibetan letter forms (letters + tseg + namche),
    // matching the ACTib filter.
    if (!/^[ \u0f0b\u0f40-\u0f7c\u0f7f]+$/u.test(word)) continue;
    if (!/^[\u0f40-\u0f7f]/u.test(word)) continue;
    if (!/[\u0f40-\u0f69]/u.test(word)) {
      skipped += 1;
      continue;
    }

    const tags = new Set();
    for (const raw of rawTags) {
      const tag = raw.replace(/\s*-\s*$/u, "").trim();
      for (const ud of mapSoasTag(tag) || []) {
        tags.add(ud);
      }
    }
    if (!tags.size) {
      skipped += 1;
      continue;
    }

    const key = normalizeForm(word);
    if (!kept.has(key)) {
      kept.set(key, { word: word.endsWith("\u0f0b") ? word : `${word}\u0f0b`, tags: new Set() });
    }
    for (const tag of tags) {
      kept.get(key).tags.add(tag);
    }
  }

  const header = [
    "# SOAS multi-tag POS lexicon (human-annotated Classical Tibetan corpus)",
    "# Source: https://doi.org/10.5281/zenodo.574878 via https://github.com/Esukhia/bo-pos",
    "# License: Creative Commons Attribution 4.0 International (CC BY 4.0)",
    "# Note: POS fallback layer — no definitions; used only to fill in missing",
    "#       part-of-speech tags. SOAS tags were mapped to UD tags; compound",
    "#       tags such as n.v.past produce one row per attested category.",
    "# form\tpos\tlemma\tsense\tfreq"
  ];

  const body = [];
  for (const { word, tags } of [...kept.values()].sort((a, b) =>
    a.word.localeCompare(b.word)
  )) {
    for (const tag of [...tags].sort()) {
      body.push(`${word}\t${tag}\t\t\t`);
    }
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, header.join("\n") + "\n" + body.join("\n") + "\n");

  console.log(
    `Scanned ${seen} entries; skipped ${skipped}; kept ${kept.size} forms ` +
      `(${body.length} form/tag rows) -> ${path.relative(ROOT, OUT)}`
  );
}

main();
