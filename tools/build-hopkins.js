#!/usr/bin/env node
/**
 * Convert the Dharma Drum Buddhist College digital edition of
 * Jeffrey Hopkins' Tibetan-Sanskrit-English Dictionary (CC BY-SA 3.0)
 * into a botok-style TSV for Tibetan Lens.
 *
 * Source PDF: https://glossaries.dila.edu.tw/data/hopkins.dila.pdf
 * License of source and derived data: Creative Commons Attribution-ShareAlike 3.0
 *   https://creativecommons.org/licenses/by-sa/3.0/
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const jsewts = require("jsewts");

const OUTPUT_PATH = path.join(__dirname, "..", "public", "data", "dialect_packs", "botok_general", "dictionary", "words", "hopkins.tsv");
const DEFAULT_PDF_URL = "https://glossaries.dila.edu.tw/data/hopkins.dila.pdf";

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function escapeTsvField(text) {
  return (text || "").replace(/\t/g, " ").replace(/\n/g, " ").replace(/\r/g, "").trim();
}

function stripMarkers(text) {
  return text.replace(/\{[^}]*\}/g, " ").replace(/\s+/g, " ").trim();
}

function wylieToUnicode(wylie) {
  if (!wylie) return null;
  try {
    const unicode = jsewts.fromWylie(wylie);
    if (!/[\u0F00-\u0FFF]/.test(unicode)) return null;
    return unicode;
  } catch {
    return null;
  }
}

function getPdfText(pdfArg) {
  let pdfPath = pdfArg;
  if (/^https?:/.test(pdfArg)) {
    const tmp = "/tmp/hopkins.dila.pdf";
    execSync(`curl -sL "${pdfArg}" -o "${tmp}"`);
    pdfPath = tmp;
  }
  return execSync(`pdftotext "${pdfPath}" -`, { maxBuffer: 64 * 1024 * 1024 }).toString("utf8");
}

function parseEntries(text) {
  const lines = text.split(/\r?\n/);
  const entries = [];
  let currentHeadword = null;
  let currentSense = [];
  let currentField = null;

  function flush() {
    if (!currentHeadword || currentSense.length === 0) {
      return;
    }
    const headwords = currentHeadword.split(";").map((s) => s.trim()).filter(Boolean);
    for (const headword of headwords) {
      const unicode = wylieToUnicode(headword);
      if (unicode) {
        entries.push(`${unicode}\t\t\t${escapeTsvField(currentSense.join(" "))}`);
      }
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    const prev = (lines[i - 1] || "").trim();
    const isField = line.startsWith("[");
    const isMarker = /^(example|examples?)$/i.test(line);
    const isHeadword = !isField && !isMarker && prev === "";

    if (isHeadword) {
      flush();
      currentHeadword = line;
      currentSense = [];
      currentField = "headword";
      continue;
    }

    if (isField && currentHeadword) {
      const match = line.match(/^\[translation-eng\]\s*(.*)$/);
      if (match) {
        currentSense.push(stripMarkers(match[1]));
        currentField = "translation-eng";
        continue;
      }
      currentField = "other";
      continue;
    }

    if (!isField && !isMarker && currentField === "translation-eng" && currentSense.length > 0) {
      currentSense[currentSense.length - 1] += " " + stripMarkers(line);
    }
  }

  flush();
  return entries;
}

// Main
const pdfArg = process.argv[2] || DEFAULT_PDF_URL;
console.log(`Reading ${pdfArg} ...`);
const text = getPdfText(pdfArg);
const entries = parseEntries(text);

ensureDir(path.dirname(OUTPUT_PATH));
const header = [
  "# Jeffrey Hopkins' Tibetan-Sanskrit-English Dictionary (Dharma Drum Buddhist College digital edition)",
  "# License: Creative Commons Attribution-ShareAlike 3.0 Unported",
  "# Source: https://glossaries.dila.edu.tw/data/hopkins.dila.pdf",
  "# form\tpos\tlemma\tsense\tfreq",
  ...entries,
].join("\n");

fs.writeFileSync(OUTPUT_PATH, header + "\n");
console.log(`Wrote ${entries.length} entries to ${OUTPUT_PATH}`);
