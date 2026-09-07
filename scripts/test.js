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

if (errors.length) {
  console.error("Tests failed:");
  for (const error of errors) {
    console.error(`\n${error}`);
  }
  process.exit(1);
}

console.log(`All ${jsFiles.length} JavaScript files passed syntax check and UI IDs are consistent.`);
