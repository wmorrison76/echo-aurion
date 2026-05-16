import type { RequestHandler } from "express";
import {
  getHistorianEvent,
  listHistorianEvents,
} from "../historian/storage";

export const handleHistorianList: RequestHandler = async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const cursor = (req.query.cursor as string) || null;
    const result = await listHistorianEvents({
      limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : 50,
      cursor,
    });
    res.json({ ok: true, ...result });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error?.message || "Failed" });
  }
};

export const handleHistorianDetail: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ ok: false, error: "id required" });
      return;
    }
    const event = await getHistorianEvent(id);
    if (!event) {
      res.status(404).json({ ok: false, error: "Not found" });
      return;
    }
    res.json({ ok: true, event });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error?.message || "Failed" });
  }
};
