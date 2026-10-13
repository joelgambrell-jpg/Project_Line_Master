#!/usr/bin/env node
// Syntax-checks every root-level .js file and the test files with `node --check`.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const files = [
  ...fs.readdirSync(root).filter((f) => f.endsWith(".js")).map((f) => path.join(root, f)),
  ...fs.readdirSync(path.join(root, "tests")).filter((f) => /\.(c?js)$/.test(f)).map((f) => path.join(root, "tests", f)),
];

let failed = 0;
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) {
    failed += 1;
    console.error(`FAIL ${path.relative(root, file)}\n${result.stderr}`);
  }
}
console.log(`${files.length - failed}/${files.length} files OK`);
process.exit(failed ? 1 : 0);
