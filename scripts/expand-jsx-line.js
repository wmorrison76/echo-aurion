#!/usr/bin/env node
/**
 * Expand a single long JSX line by inserting newlines after "> <", "> {", "} </", " /> ".
 * Use: node scripts/expand-jsx-line.js <file>
 */
const fs = require("fs");
const path = require("path");

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/expand-jsx-line.js <file>");
  process.exit(1);
}

const content = fs.readFileSync(file, "utf8");
const indent = "      ";
const lines = content.split("\n");
const out = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  if (line.length <= 500) {
    out.push(line);
    continue;
  }
  // Break long line: after "> <", "> {", "} </", " /> " (with space)
  line = line
    .replace(/> </g, ">\n" + indent + "<")
    .replace(/> {/g, ">\n" + indent + "{")
    .replace(/} </g, "}\n" + indent + "</")
    .replace(/ \/> /g, " />\n" + indent);
  out.push(line);
}

fs.writeFileSync(file, out.join("\n"), "utf8");
console.log("Expanded", file);
