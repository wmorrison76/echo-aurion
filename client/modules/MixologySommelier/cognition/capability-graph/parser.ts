import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import yaml from "yaml";
export interface CapabilityManifest {
  id: string;
  name: string;
  description?: string;
  owner?: string;
  tags: string[];
  inputs: string[];
  outputs: string[];
  dependsOn: string[];
  rawPath: string;
}
const MANIFEST_EXTENSIONS = new Set([".json", ".yaml", ".yml"]);
async function loadManifestFile(
  filePath: string,
): Promise<CapabilityManifest | null> {
  const ext = path.extname(filePath).toLowerCase();
  if (!MANIFEST_EXTENSIONS.has(ext)) {
    return null;
  }
  const contents = await readFile(filePath, "utf8");
  let data: any;
  try {
    data = ext === ".json" ? JSON.parse(contents) : yaml.parse(contents);
  } catch (error) {
    throw new Error(
      `Failed to parse capability manifest ${filePath}: ${(error as Error).message}`,
    );
  }
  if (!data?.id || !data?.name) {
    throw new Error(
      `Manifest ${filePath} is missing required fields 'id' or 'name'`,
    );
  }
  return {
    id: String(data.id),
    name: String(data.name),
    description: data.description ? String(data.description) : undefined,
    owner: data.owner ? String(data.owner) : undefined,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    inputs: Array.isArray(data.inputs) ? data.inputs.map(String) : [],
    outputs: Array.isArray(data.outputs) ? data.outputs.map(String) : [],
    dependsOn: Array.isArray(data.dependsOn) ? data.dependsOn.map(String) : [],
    rawPath: filePath,
  };
}
export interface LoadOptions {
  excludeDirs?: string[];
}
export async function loadCapabilityManifests(
  root: string,
  options: LoadOptions = {},
): Promise<CapabilityManifest[]> {
  const results: string[] = [];
  const ignore = new Set(
    (options.excludeDirs ?? []).map((dir) => path.resolve(root, dir)),
  );
  async function walkWithFilter(dir: string) {
    if (ignore.has(path.resolve(dir))) {
      return;
    }
    const entries = await readdir(dir, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walkWithFilter(entryPath);
          return;
        }
        if (MANIFEST_EXTENSIONS.has(path.extname(entry.name))) {
          results.push(entryPath);
        }
      }),
    );
  }
  await walkWithFilter(root);
  const manifests: CapabilityManifest[] = [];
  for (const filePath of results) {
    const info = await stat(filePath);
    if (!info.isFile()) continue;
    const manifest = await loadManifestFile(filePath);
    if (manifest) {
      manifests.push(manifest);
    }
  }
  return manifests;
}
