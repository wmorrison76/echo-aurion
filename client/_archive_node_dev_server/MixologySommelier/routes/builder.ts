import type { RequestHandler } from "express";

/** Builder.io removed app-wide. Returns ok with no content (no network call). */
export const handleBuilderContent: RequestHandler = async (req, res) => {
  const model = String(req.query.model || "panel");
  const urlAttr = String(req.query.url || "/generated");
  return res.json({
    ok: true,
    content: null,
    meta: { model, url: urlAttr, id: null, entryName: null, preview: false },
  });
};
