const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const errors = [];

function collectJsFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) {
    return results;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectJsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      results.push(full);
    }
  }
  return results;
}

const jsFiles = ["src", "data"].flatMap((subdir) => collectJsFiles(path.join(root, subdir)));

for (const file of jsFiles) {
  try {
    execSync(`node --check "${file}"`, { stdio: "pipe" });
  } catch (error) {
    errors.push(`Syntax error in ${path.relative(root, file)}:\n${error.stderr?.toString() || error.message}`);
  }
}

function extractHtmlIds(html) {
  const ids = new Set();
  const regex = /id=["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    ids.add(match[1]);
  }
  return ids;
}

function extractReferencedIds(js) {
  const ids = new Set();
  const regex = /getElementById\s*\(\s*["']([^"']+)["']\s*\)/g;
  let match;
  while ((match = regex.exec(js)) !== null) {
    ids.add(match[1]);
  }
  return ids;
}

for (const subdir of ["options", "popup"]) {
  const htmlPath = path.join(root, "src", subdir, "index.html");
  const jsPath = path.join(root, "src", subdir, "index.js");
  if (!fs.existsSync(htmlPath) || !fs.existsSync(jsPath)) {
    continue;
  }
  const html = fs.readFileSync(htmlPath, "utf8");
  const js = fs.readFileSync(jsPath, "utf8");
  const htmlIds = extractHtmlIds(html);
  const referencedIds = extractReferencedIds(js);
  const missing = [...referencedIds].filter((id) => !htmlIds.has(id));
  if (missing.length) {
    errors.push(`${subdir}/index.js references IDs missing from ${subdir}/index.html: ${missing.join(", ")}`);
  }
}

function extractI18nKeysFromHtml(html) {
  const keys = new Set();
  const regex = /data-i18n=["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    keys.add(match[1]);
  }
  return keys;
}

function extractI18nKeysFromJs(js) {
  const keys = new Set();
  const regex = /(?:extension\.i18n|i18n)\.getMessage\s*\(\s*["']([^"']+)["']\s*\)/g;
  let match;
  while ((match = regex.exec(js)) !== null) {
    keys.add(match[1]);
  }
  return keys;
}

const messagesPath = path.join(root, "_locales", "en", "messages.json");
let messageKeys = new Set();
if (fs.existsSync(messagesPath)) {
  try {
    const messages = JSON.parse(fs.readFileSync(messagesPath, "utf8"));
    messageKeys = new Set(Object.keys(messages));
  } catch (error) {
    errors.push(`Could not parse _locales/en/messages.json: ${error.message}`);
  }
} else {
  errors.push("Missing _locales/en/messages.json");
}

for (const subdir of ["options", "popup"]) {
  const htmlPath = path.join(root, "src", subdir, "index.html");
  if (!fs.existsSync(htmlPath)) {
    continue;
  }
  const html = fs.readFileSync(htmlPath, "utf8");
  const htmlKeys = extractI18nKeysFromHtml(html);
  const missing = [...htmlKeys].filter((key) => !messageKeys.has(key));
  if (missing.length) {
    errors.push(`Missing i18n message keys for ${subdir}/index.html [data-i18n]: ${missing.join(", ")}`);
  }
  if (!html.includes("src=\"../shared/i18n.js\"")) {
    errors.push(`${subdir}/index.html does not load ../shared/i18n.js`);
  }
}

for (const file of jsFiles) {
  if (path.basename(file) === "i18n.js") {
    continue;
  }
  const js = fs.readFileSync(file, "utf8");
  const jsKeys = extractI18nKeysFromJs(js);
  const missing = [...jsKeys].filter((key) => !messageKeys.has(key));
  if (missing.length) {
    errors.push(`Missing i18n message keys in ${path.relative(root, file)}: ${missing.join(", ")}`);
  }
}

// Every locale must define exactly the English keys, with non-empty messages
// that fit Chrome Web Store limits for the localized name and description.
const localesDir = path.join(root, "_locales");
for (const locale of fs.readdirSync(localesDir)) {
  const file = path.join(localesDir, locale, "messages.json");
  let messages;
  try {
    messages = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    errors.push(`Could not parse _locales/${locale}/messages.json: ${error.message}`);
    continue;
  }
  const keys = new Set(Object.keys(messages));
  const missing = [...messageKeys].filter((key) => !keys.has(key));
  const extra = [...keys].filter((key) => !messageKeys.has(key));
  const empty = [...keys].filter((key) => !messages[key]?.message?.trim());
  if (missing.length) errors.push(`_locales/${locale} is missing keys: ${missing.join(", ")}`);
  if (extra.length) errors.push(`_locales/${locale} has keys not in en: ${extra.join(", ")}`);
  if (empty.length) errors.push(`_locales/${locale} has empty messages: ${empty.join(", ")}`);
  if ((messages.extensionName?.message || "").length > 75) {
    errors.push(`_locales/${locale} extensionName exceeds 75 characters`);
  }
  if ((messages.extensionDescription?.message || "").length > 132) {
    errors.push(`_locales/${locale} extensionDescription exceeds 132 characters`);
  }
}

const manifestPath = path.join(root, "manifest.json");
if (fs.existsSync(manifestPath)) {
  const manifest = fs.readFileSync(manifestPath, "utf8");
  if (!manifest.includes('"src/shared/i18n.js"')) {
    errors.push("manifest.json content_scripts does not include src/shared/i18n.js");
  }
} else {
  errors.push("Missing manifest.json");
}

if (errors.length) {
  console.error("Tests failed:");
  for (const error of errors) {
    console.error(`\n${error}`);
  }
  process.exit(1);
}

console.log(`All ${jsFiles.length} JavaScript files passed syntax check, UI IDs and i18n keys are consistent.`);
