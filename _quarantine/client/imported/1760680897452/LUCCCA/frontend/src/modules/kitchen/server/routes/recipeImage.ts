import type { Request, Response } from "express";

export async function proxyRecipeImage(req: Request, res: Response) {
  try {
    const src = String((req.query.url as string) || "");
    if (!src || !/^https?:\/\//i.test(src)) {
      return res.status(400).json({ error: "Invalid image url" });
    }
    const r = await fetch(src, {
      headers: { Accept: "image/*,application/octet-stream" },
    });
    if (!r.ok) {
      return res
        .status(400)
        .json({ error: `Image fetch failed (${r.status})` });
    }
    const ct = r.headers.get("content-type") || "application/octet-stream";
    if (!/^image\//i.test(ct)) {
      return res.status(415).json({ error: "Not an image" });
    }
    const ab = await r.arrayBuffer();
    res.setHeader("content-type", ct);
    res.setHeader("cache-control", "public, max-age=31536000, immutable");
    res.end(Buffer.from(ab));
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Proxy failed" });
  }
}
