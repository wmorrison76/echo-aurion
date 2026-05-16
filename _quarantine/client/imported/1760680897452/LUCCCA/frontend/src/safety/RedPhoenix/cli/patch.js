#!/usr/bin/env node
/**
 * SafePatch CLI command — runs a patch function from a JS file on a JSON target file.
 */
import fs from "fs";
import { run } from "../SafePatch.js";

const [,,targetFile, patchFile] = process.argv;
if (!targetFile || !patchFile){
  console.error("Usage: safe-patch <target.json> <patch.js>");
  process.exit(1);
}
const target = JSON.parse(fs.readFileSync(targetFile,"utf8"));
const patchFn = (await import(patchFile)).default;
const res = run(patchFn, target);
if (res.ok){
  fs.writeFileSync(targetFile, JSON.stringify(target,null,2));
  console.log("Patched OK");
} else {
  console.error("Patch failed", res.error);
}
