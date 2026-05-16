import { promises as fs } from "fs";
import path from "path";
import type { RequestHandler } from "express";
import yaml from "yaml";
const REGISTRY_PATH = path.join(process.cwd(), "secrets", "registry.yaml");
type Registry = Record<string, string[]>;
async function readRegistry(): Promise<Registry> {
  try {
    const raw = await fs.readFile(REGISTRY_PATH, "utf8");
    const data = yaml.parse(raw) as Registry;
    return data || {};
  } catch (error) {
    console.error("Failed to read secrets registry", error);
    return {};
  }
}
function flattenKeys(registry: Registry): Set<string> {
  return Object.values(registry).reduce<Set<string>>((set, group) => {
    group?.forEach((key) => set.add(key));
    return set;
  }, new Set());
}
function isPublicKey(key: string) {
  return key.startsWith("NEXT_PUBLIC_");
}
function roleAllowsMutation(role: string | undefined | null) {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return (
    normalized === "admin" ||
    normalized === "lead" ||
    normalized === "lead dev" ||
    normalized === "lead_dev" ||
    normalized === "lead-dev"
  );
}
export const handleSecretsRegistry: RequestHandler = async (_req, res) => {
  const registry = await readRegistry();
  res.json({ ok: true, registry });
};
export const handleSecretsPreview: RequestHandler = async (req, res) => {
  const registry = await readRegistry();
  const allowedKeys = flattenKeys(registry);
  const requested = Array.isArray(req.body?.keys)
    ? (req.body.keys as string[])
    : typeof req.query.keys === "string"
      ? String(req.query.keys)
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean)
      : [];
  const values: Record<string, string | null> = {};
  for (const key of requested) {
    if (!allowedKeys.has(key) || !isPublicKey(key)) {
      values[key] = null;
      continue;
    }
    values[key] = process.env[key] ?? null;
  }
  res.json({ ok: true, values });
};
export const handleSecretsSet: RequestHandler = async (req, res) => {
  const registry = await readRegistry();
  const allowedKeys = flattenKeys(registry);
  const key = typeof req.body?.key === "string" ? req.body.key : "";
  const value = typeof req.body?.value === "string" ? req.body.value : "";
  const role =
    (req.body?.role as string | undefined) ??
    (req.headers["x-echo-role"] as string | undefined);
  if (!key || !allowedKeys.has(key)) {
    return res.status(400).json({ ok: false, error: "Key not registered" });
  }
  if (!roleAllowsMutation(role)) {
    return res
      .status(403)
      .json({ ok: false, error: "Role not authorized to mutate secrets" });
  }
  process.env[key] = value;
  res.json({ ok: true });
};
