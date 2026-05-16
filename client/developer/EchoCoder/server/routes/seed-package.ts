import type { Request, Response, RequestHandler } from "express";
import path from "path";
import { promises as fs } from "fs";
import { createTarGzFromMap, sha256 } from "../zaro-lib";

const ROOT = process.cwd();

function sanitizeName(name: string) {
  return String(name || "package")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(0, 120);
}

export const handleSeedPackage: RequestHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const body = req.body || {};
    const name = sanitizeName(body.name || "package");
    const channel = String(body.channel || "custom");
    const files = body.files as Record<string, string> | undefined;
    const manifest = body.manifest as any | undefined;

    if (
      !files ||
      typeof files !== "object" ||
      Object.keys(files).length === 0
    ) {
      return res.status(400).json({ ok: false, error: "files map required" });
    }

    // Add manifest if provided
    const toPack: Record<string, string> = {};
    for (const [k, v] of Object.entries(files)) {
      const rel = String(k).replace(/^\/+/, "");
      toPack[rel] = typeof v === "string" ? v : String(v);
    }

    // Auto-build a manifest when not provided
    let finalManifest = manifest;
    if (!finalManifest) {
      const items: { path: string; size: number; sha256: string }[] = [];
      for (const [p, s] of Object.entries(toPack)) {
        const buf = Buffer.from(s, "utf8");
        items.push({ path: p, size: buf.length, sha256: await sha256(buf) });
      }
      finalManifest = {
        module: name,
        channel,
        createdAt: new Date().toISOString(),
        files: items,
      };
    }
    toPack["manifest.json"] = JSON.stringify(finalManifest, null, 2);

    const gz = await createTarGzFromMap(toPack);
    const pdir = path.join(ROOT, ".zaro", "packages");
    await fs.mkdir(pdir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `${name}-${channel}-${stamp}.tar.gz`;
    const fpath = path.join(pdir, fileName);
    await fs.writeFile(fpath, gz);

    res.json({
      ok: true,
      path: fpath,
      fileName,
      size: gz.length,
      files: Object.keys(toPack).length,
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
};
