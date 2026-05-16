#!/usr/bin/env node
/** Undo expand-jsx-line: merge lines back. Use: node scripts/revert-expand.cjs <file> */
const fs = require("fs");
const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/revert-expand.cjs <file>");
  process.exit(1);
}
let content = fs.readFileSync(file, "utf8");
content = content
  .replace(/>\n      </g, "> </")
  .replace(/>\n      \{/g, "> {")
  .replace(/\}\n      <\//g, "} </")
  .replace(/ \/>\n      /g, " /> ");
fs.writeFileSync(file, content, "utf8");
console.log("Reverted expand in", file);
