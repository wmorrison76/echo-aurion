import { Router } from "express";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { rateLimit } from "../middleware/rateLimit";

export const filesRouter = Router();

interface UploadBody {
  name: string;
  type?: string;
  dataUrl: string;
}
const UPLOAD_DIR = path.resolve(process.cwd(), "vault", "uploads");

filesRouter.post(
  "/upload",
  rateLimit({ windowMs: 60_000, max: 20 }),
  async (req, res) => {
    try {
      const b = req.body as UploadBody;
      if (!b?.dataUrl || !b?.name)
        return res.status(400).json({ error: "name and dataUrl required" });
      const m = b.dataUrl.match(/^data:([^;,]+)?;base64,(.+)$/);
      if (!m) return res.status(400).json({ error: "invalid dataUrl" });
      const [, mime = "application/octet-stream", base64] = m;
      const buf = Buffer.from(base64, "base64");
      const hash = crypto
        .createHash("sha256")
        .update(buf)
        .digest("hex")
        .slice(0, 16);
      const safeName = b.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fname = `${Date.now()}_${hash}_${safeName}`;
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      await fs.writeFile(path.join(UPLOAD_DIR, fname), buf);
      res.json({ ok: true, url: `/vault/uploads/${fname}`, mime });
    } catch (err: any) {
      res.status(500).json({ error: String(err?.message || err) });
    }
  },
);
