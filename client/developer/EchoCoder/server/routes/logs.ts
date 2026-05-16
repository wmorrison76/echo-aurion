import type { Request, Response } from "express";
import type { RequestHandler } from "express";
import { promises as fs } from "fs";
import path from "path";

const ROOT = process.cwd();
const LOG_DIR = path.join(ROOT, "server", "logs");
const LOG_FILE = path.join(LOG_DIR, "app.log");

async function ensure() {
  await fs.mkdir(LOG_DIR, { recursive: true });
}

export async function appendLog(line: string) {
  await ensure();
  await fs.appendFile(LOG_FILE, line + "\n", "utf8");
}

export const handleLogAppend: RequestHandler = async (req, res) => {
  try {
    const { line } = req.body || {};
    if (typeof line !== "string") {
      res.status(400).json({ ok: false, error: "line required" });
      return;
    }
    await appendLog(`${new Date().toISOString()} ${line}`);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
};

export const handleLogSearch: RequestHandler = async (req, res) => {
  try {
    const q = String((req.query.q as string) || "").toLowerCase();
    await ensure();
    const s = await fs.readFile(LOG_FILE, "utf8").catch(() => "");
    const lines = s.split(/\r?\n/).filter(Boolean);
    const results = q
      ? lines.filter((l) => l.toLowerCase().includes(q)).slice(-200)
      : lines.slice(-200);
    res.json({ ok: true, results });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
};
