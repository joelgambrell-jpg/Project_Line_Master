#!/usr/bin/env node
/**
 * Rewrites every local ?v=... cache-buster in the root HTML files to a short
 * hash of the referenced file's contents, so a changed file always gets a new
 * URL and an unchanged file keeps its cached copy. Replaces hand-edited
 * values such as ?v=20261012-popout2.
 *
 *   node scripts/stamp-versions.cjs          rewrite the HTML files
 *   node scripts/stamp-versions.cjs --check  exit 1 if any stamp is stale
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "..");
const checkOnly = process.argv.includes("--check");
const pattern = /((?:src|href)=")([^"?#:]+)\?v=[^"]*(")/g;

let stale = 0;

for (const name of fs.readdirSync(root).filter((f) => f.endsWith(".html"))) {
  const file = path.join(root, name);
  const original = fs.readFileSync(file, "utf8");

  const updated = original.replace(pattern, (match, open, ref, close) => {
    const target = path.join(root, ref);
    if (!fs.existsSync(target)) return match;
    const hash = crypto.createHash("sha1").update(fs.readFileSync(target)).digest("hex").slice(0, 8);
    return `${open}${ref}?v=${hash}${close}`;
  });

  if (updated !== original) {
    stale += 1;
    if (checkOnly) {
      console.error(`stale version stamps: ${name}`);
    } else {
      fs.writeFileSync(file, updated);
      console.log(`stamped ${name}`);
    }
  }
}

if (checkOnly && stale) process.exit(1);
