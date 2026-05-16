import type { Request, Response } from "express";
import type { RequestHandler } from "express";
import { gunzipSync } from "zlib";
import { parseTar as parseTarBuf } from "../zaro-lib";
export const handleTarRemote: RequestHandler = async (req, res) => {
  try {
    const { url } = req.body || {};
    if (typeof url !== "string" || !/^https?:\/\//i.test(url))
      return res.status(400).json({ ok: false, error: "Invalid url" });
    const r = await fetch(url);
    if (!r.ok)
      return res
        .status(400)
        .json({ ok: false, error: `Download failed (${r.status})` });
    const ab = await r.arrayBuffer();
    let buf = Buffer.from(new Uint8Array(ab) as any) as unknown as Buffer;
    const enc = (r.headers.get("content-encoding") || "").toLowerCase();
    const gzLike = /\.tar\.gz$|\.tgz$/i.test(url) || enc.includes("gzip");
    if (gzLike) {
      try {
        buf = gunzipSync(buf);
      } catch {
        return res.status(400).json({ ok: false, error: "Gunzip failed" });
      }
    }
    const entries = parseTarBuf(buf);
    const files: Record<string, string> = {};
    for (const e of entries) {
      const name = "/" + e.name.replace(/^\/+/, "");
      try {
        files[name] = e.data.toString("utf8");
      } catch {}
    }
    const name = (url.split("/").pop() || "module")
      .replace(/\?.*$/, "")
      .replace(/\.(tar\.gz|tgz|tar)$/i, "");
    return res.json({ ok: true, name, files });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
};
