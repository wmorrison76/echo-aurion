import type { Request, Response, RequestHandler } from "express";
import { appendLog } from "./logs";
import { restore } from "../zaro-lib";
let state: { alert: "none" | "defcon1"; detail?: string; since?: number } = {
  alert: "none",
};
export const handleGuardStatus: RequestHandler = async (
  _req: Request,
  res: Response,
) => {
  res.json({ ok: true, ...state });
};
export const handleGuardEvent: RequestHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const { type = "", detail = "" } = req.body || {};
    if (type === "defcon1") {
      state = {
        alert: "defcon1",
        detail: String(detail || "ALERT"),
        since: Date.now(),
      };
      await appendLog(`[ALERT] DEFCON1 ${detail}`);
      try {
        await restore(process.cwd());
      } catch {}
      return res.json({ ok: true, alert: state.alert });
    }
    if (type === "clear") {
      state = { alert: "none" };
      await appendLog(`[ALERT] CLEARED`);
      return res.json({ ok: true, alert: state.alert });
    }
    res.status(400).json({ ok: false, error: "unknown event type" });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
};
export const handleGuardIp: RequestHandler = async (
  req: Request,
  res: Response,
) => {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "";
  res.json({ ok: true, ip });
};
