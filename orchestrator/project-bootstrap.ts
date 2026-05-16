import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "yaml";

export interface ModuleManifest {
  slug: string;
  description?: string;
  enabled?: boolean;
}

export interface BootstrapOptions {
  name: string;
  modules?: ModuleManifest[];
  owner?: string;
  metadata?: Record<string, unknown>;
}

export interface BootstrapResult {
  ok: boolean;
  dir: string;
  manifestPath: string;
}

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function ensureDir(target: string) {
  await mkdir(target, { recursive: true });
}

async function copyPolicyModel(targetDir: string) {
  const src = path.join(PACKAGE_ROOT, "policies", "authz.model.yaml");
  const dest = path.join(targetDir, "policies", "authz.model.yaml");
  await ensureDir(path.dirname(dest));
  const contents = await readFile(src, "utf8");
  await writeFile(dest, contents);
}

async function writeManifest(targetDir: string, options: BootstrapOptions) {
  const manifest = {
    name: options.name,
    owner: options.owner ?? "operations",
    createdAt: new Date().toISOString(),
    modules: (options.modules ?? []).map((module) => ({
      slug: module.slug,
      description: module.description ?? "",
      enabled: module.enabled ?? true,
    })),
    metadata: options.metadata ?? {},
  };

  const manifestPath = path.join(targetDir, "orchestrator", "manifest.yaml");
  await ensureDir(path.dirname(manifestPath));
  await writeFile(manifestPath, yaml.stringify(manifest));
  return manifestPath;
}

export async function bootstrapProject(targetRoot: string, options: BootstrapOptions): Promise<BootstrapResult> {
  if (!options?.name?.trim()) {
    throw new Error("Project name is required");
  }

  const projectDir = path.resolve(targetRoot, options.name.replace(/\s+/g, "-").toLowerCase());
  await ensureDir(projectDir);
  await ensureDir(path.join(projectDir, "docs"));
  await ensureDir(path.join(projectDir, "schemas"));
  await ensureDir(path.join(projectDir, "policies"));

  await copyPolicyModel(projectDir);
  const manifestPath = await writeManifest(projectDir, options);

  return {
    ok: true,
    dir: projectDir,
    manifestPath,
  };
}
