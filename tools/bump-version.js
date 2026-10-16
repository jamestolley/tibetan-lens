#!/usr/bin/env node
/**
 * Increment the patch component of the extension version in
 * package.json, package-lock.json, and manifest.json, and keep the
 * publish:stores zip paths in package.json in sync.
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const pkgPath = path.join(root, "package.json");
const lockPath = path.join(root, "package-lock.json");
const manifestPath = path.join(root, "manifest.json");

function bump(version) {
  const parts = String(version || "0.0.0").split(".");
  while (parts.length < 3) parts.push("0");
  parts[2] = String(parseInt(parts[2], 10) + 1);
  return parts.slice(0, 3).join(".");
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const next = bump(pkg.version);

pkg.version = next;
if (pkg.scripts && pkg.scripts["publish:stores"]) {
  pkg.scripts["publish:stores"] = pkg.scripts["publish:stores"].replace(
    /marginalia-tibetan-\d+\.\d+\.\d+\.zip/g,
    `marginalia-tibetan-${next}.zip`
  );
}
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

if (fs.existsSync(lockPath)) {
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  lock.version = next;
  if (lock.packages && lock.packages[""]) {
    lock.packages[""].version = next;
  }
  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.version = next;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

console.log(`Bumped version to ${next}`);
