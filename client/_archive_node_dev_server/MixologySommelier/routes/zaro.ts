import type { Request, Response } from "express";
import express from "express";
import path from "path";
import { integrity, restore, snapshot, listSnapshots } from "../zaro-lib";
export const zaroRouter = express.Router();
zaroRouter.get("/status", async (_req: Request, res: Response) => {
  res.json({ ok: true, cwd: process.cwd() });
});
zaroRouter.post("/snapshot", async (_req: Request, res: Response) => {
  try {
    const info = await snapshot(process.cwd());
    res.json({ ok: true, ...info });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});
zaroRouter.post("/integrity", async (_req: Request, res: Response) => {
  try {
    const result = await integrity(process.cwd());
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});
zaroRouter.get("/snaps", async (_req: Request, res: Response) => {
  try {
    const list = await listSnapshots(process.cwd());
    res.json({ ok: true, list });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});
zaroRouter.post("/label", async (req: Request, res: Response) => {
  try {
    const { name, label } = req.body || {};
    if (typeof name !== "string" || typeof label !== "string")
      return res
        .status(400)
        .json({ ok: false, error: "name and label required" });
    const { setLabel } = await import("../zaro-lib");
    const r = await setLabel(process.cwd(), name, label);
    res.json(r);
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});
zaroRouter.post("/restore", async (req: Request, res: Response) => {
  try {
    const name =
      req.body && typeof req.body.name === "string" ? req.body.name : undefined;
    const result = await restore(process.cwd(), name);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});
export default zaroRouter;
