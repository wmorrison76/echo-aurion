import { Router } from "express";
import { promises as fs } from "fs";
import path from "path";
import { rateLimit } from "../middleware/rateLimit";

export const notifyRouter = Router();

interface NotifyBody {
  type: string;
  actor?: string;
  message: string;
  data?: Record<string, unknown>;
}

const VAULT_PATH = path.resolve(process.cwd(), "vault", "audit.jsonl");

notifyRouter.post(
  "/event",
  rateLimit({ windowMs: 60_000, max: 30 }),
  async (req, res) => {
    try {
      const b = req.body as NotifyBody;
      const type = String(b?.type || "").slice(0, 40);
      const message = String(b?.message || "").slice(0, 400);
      if (!type || !message)
        return res.status(400).json({ error: "type and message are required" });
      const actor = b?.actor ? String(b.actor).slice(0, 80) : undefined;
      const safe = {
        ts: Date.now(),
        type,
        message,
        actor,
        data: b?.data && typeof b.data === "object" ? b.data : undefined,
      };
      const line = JSON.stringify(safe) + "\n";
      await fs.mkdir(path.dirname(VAULT_PATH), { recursive: true });
      await fs.appendFile(VAULT_PATH, line, { encoding: "utf8" });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: String(err?.message || err) });
    }
  },
);
