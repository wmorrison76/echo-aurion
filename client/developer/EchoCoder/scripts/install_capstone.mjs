#!/usr/bin/env node
import { createWriteStream } from "node:fs";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import https from "node:https";
import { spawn } from "node:child_process";

const bundles = [
  {
    name: "Capstone_Batch13_FeatureControl_2025-09-22.tar",
    url: "https://cdn.builder.io/o/assets%2F8b8d61942d1d4680bbfcbe7aa6b127f4%2F8e37d8e030344a8496ea9461bf7e9d67?alt=media&token=echo-ai-framework&apiKey=8b8d61942d1d4680bbfcbe7aa6b127f4",
    targetDir: "client/capstone/batch13",
  },
  {
    name: "Capstone_Master_Batch01-12_2025-09-22.tar",
    url: "https://cdn.builder.io/o/assets%2F8b8d61942d1d4680bbfcbe7aa6b127f4%2Fba64c79c03594992a133f9c91893998e?alt=media&token=echo-ai-framework&apiKey=8b8d61942d1d4680bbfcbe7aa6b127f4",
    targetDir: "client/capstone/master",
  },
];

async function downloadFile(url, destination) {
  await fs.mkdir(dirname(destination), { recursive: true });
  return new Promise((resolvePromise, rejectPromise) => {
    const fileStream = createWriteStream(destination);
    https
      .get(url, (response) => {
        if (response.statusCode && response.statusCode >= 400) {
          rejectPromise(new Error(`Failed to download ${url} (status ${response.statusCode})`));
          response.resume();
          return;
        }
        response.pipe(fileStream);
        fileStream.on("finish", () => {
          fileStream.close(() => resolvePromise(destination));
        });
      })
      .on("error", (error) => {
        rejectPromise(error);
      });
  });
}

async function extractTar(archivePath, targetDirectory) {
  await fs.mkdir(targetDirectory, { recursive: true });
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("tar", ["-xf", archivePath, "-C", targetDirectory], {
      stdio: "inherit",
    });
    child.on("error", (error) => rejectPromise(error));
    child.on("close", (code) => {
      if (code === 0) resolvePromise(undefined);
      else rejectPromise(new Error(`tar exited with code ${code}`));
    });
  });
}

async function installBundle(bundle) {
  const tmpArchivePath = join(tmpdir(), bundle.name);
  console.log(`Downloading ${bundle.name}…`);
  await downloadFile(bundle.url, tmpArchivePath);
  console.log(`Extracting to ${bundle.targetDir}…`);
  await extractTar(tmpArchivePath, bundle.targetDir);
  console.log(`Installed ${bundle.name}`);
}

async function main() {
  for (const bundle of bundles) {
    await installBundle(bundle);
  }
  console.log("Capstone bundles installed. Review extracted contents under client/capstone.");
}

main().catch((error) => {
  console.error("Failed to install Capstone bundles:", error?.message || error);
  process.exit(1);
});
