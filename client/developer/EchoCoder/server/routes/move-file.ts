import type { RequestHandler } from "express";
import { promises as fs } from "fs";
import path from "path";

const ROOT = process.cwd();
const ALLOW = [path.join(ROOT, "client"), path.join(ROOT, "shared"), path.join(ROOT, "server")];
const ENGINE_LOCK_DIRS = [
  path.join(ROOT, "styles"),
  path.join(ROOT, "templates", "slots"),
  path.join(ROOT, "schema"),
  path.join(ROOT, "seeds"),
  path.join(ROOT, "lib", "security"),
];
const ENGINE_LOCK_FILES = new Set([path.join(ROOT, "engine.json")]);

function allowed(p: string) {
  const rel = path.normalize(p);
  return ALLOW.some((d) => rel.startsWith(d));
}

function isEngineLocked(p: string) {
  const rel = path.normalize(p);
  if (ENGINE_LOCK_FILES.has(rel)) return true;
  return ENGINE_LOCK_DIRS.some((dir) => rel === dir || rel.startsWith(dir + path.sep));
}

export const handleMoveFile: RequestHandler = async (req, res) => {
  try {
    const {
      srcRelPath,
      destRelPath,
    }: { srcRelPath: string; destRelPath: string } = req.body || {};
    if (!srcRelPath || !destRelPath)
      return res
        .status(400)
        .json({ ok: false, error: "srcRelPath and destRelPath required" });
    const src = path.join(ROOT, srcRelPath);
    const dest = path.join(ROOT, destRelPath);
    if (!allowed(src) || !allowed(dest))
      return res.status(403).json({ ok: false, error: "Path not allowed" });
    if (isEngineLocked(src) || isEngineLocked(dest))
      return res.status(423).json({ ok: false, error: "Engine assets are locked" });
    await fs.mkdir(path.dirname(dest), { recursive: true });
    if (src === dest) {
      return res.json({ ok: true, from: srcRelPath, to: destRelPath, note: "No-op" });
    }
    const exists = await fs
      .stat(dest)
      .then(() => true)
      .catch(() => false);
    if (exists) {
      return res.status(409).json({ ok: false, error: "Destination already exists" });
    }
    await fs.rename(src, dest);
    res.json({ ok: true, from: srcRelPath, to: destRelPath });
  } catch (e) {
    res.status(500).json({ ok: false, error: (e as Error).message });
  }
};
