import type { RequestHandler } from "express";
import { promises as fs } from "fs";
import path from "path";
const ROOT = process.cwd();
const ALLOWLIST = [
  path.join(ROOT, "client"),
  path.join(ROOT, "shared"),
  path.join(ROOT, "server"),
];
const ENGINE_LOCK_DIRS = [
  path.join(ROOT, "styles"),
  path.join(ROOT, "templates", "slots"),
  path.join(ROOT, "schema"),
  path.join(ROOT, "seeds"),
  path.join(ROOT, "lib", "security"),
];
const ENGINE_LOCK_FILES = new Set([path.join(ROOT, "engine.json")]);
function isAllowed(target: string) {
  const rel = path.normalize(target);
  return ALLOWLIST.some((dir) => rel.startsWith(dir));
}
function isEngineLocked(target: string) {
  const rel = path.normalize(target);
  if (ENGINE_LOCK_FILES.has(rel)) return true;
  return ENGINE_LOCK_DIRS.some(
    (dir) => rel === dir || rel.startsWith(dir + path.sep),
  );
}
export const handleWriteFile: RequestHandler = async (req, res) => {
  try {
    const { relPath, contents }: { relPath: string; contents: string } =
      req.body || {};
    if (!relPath || typeof contents !== "string") {
      return res
        .status(400)
        .json({ ok: false, error: "relPath and contents required" });
    }
    const full = path.join(ROOT, relPath);
    if (!isAllowed(full))
      return res.status(403).json({ ok: false, error: "Path not allowed" });
    if (isEngineLocked(full))
      return res
        .status(423)
        .json({ ok: false, error: "Engine assets are locked" });
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, contents, "utf8");
    res.json({ ok: true, path: relPath });
  } catch (e) {
    res.status(500).json({ ok: false, error: (e as Error).message });
  }
};
