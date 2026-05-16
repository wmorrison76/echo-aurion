#!/usr/bin/env node
/**
 * RedPhoenix CLI — developer recovery suite.
 * Commands: checksum, verify, wrap
 */
import { createVault } from "../ChecksumVault.js";
import fs from "fs";
import path from "path";

const [,,cmd,...args] = process.argv;
const vault = createVault();

if (cmd==="checksum"){
  const file = args[0];
  const data = fs.readFileSync(file,"utf8");
  const snap = vault.snapshot(file, data);
  console.log("checksum", snap);
} else if (cmd==="verify"){
  const file = args[0];
  const data = fs.readFileSync(file,"utf8");
  console.log(vault.verify(file, data));
} else {
  console.log("Usage: redphoenix <checksum|verify> <file>");
}
