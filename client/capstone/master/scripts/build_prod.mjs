// Production build script (esbuild).
// Attempts to bundle the app entry if esbuild is present; otherwise logs a hint.
import { existsSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const entry = process.env.BUILD_ENTRY || "src/index.jsx";
const outdir = process.env.BUILD_OUTDIR || "dist";

function run(cmd, args){
  return new Promise((resolve, reject)=>{
    const p = spawn(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
    p.on("close", code => code === 0 ? resolve() : reject(new Error(cmd+" exited "+code)));
  });
}

if (!existsSync("node_modules/esbuild")){
  console.warn("esbuild not installed; install with `npm i -D esbuild` to enable prod bundling.");
  process.exit(0);
}

mkdirSync(outdir, { recursive: true });
const args = [
  entry,
  "--bundle",
  "--format=esm",
  "--platform=browser",
  "--sourcemap",
  "--minify",
  `--outdir=${outdir}`,
  "--loader:.jsx=jsx",
  "--loader:.js=jsx"
];

await run("node", ["node_modules/esbuild/bin/esbuild", ...args]);
console.log("✓ Production bundle created in", outdir);
