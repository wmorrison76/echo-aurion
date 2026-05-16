import type { RequestHandler } from "express";
import { z } from "zod";
const SceneSchema = z.object({
  sceneId: z.string(),
  items: z.array(z.any()),
  camera: z
    .object({
      position: z.tuple([z.number(), z.number(), z.number()]).optional(),
      target: z.tuple([z.number(), z.number(), z.number()]).optional(),
      fov: z.number().optional(),
    })
    .default({}),
  meta: z
    .object({ eventName: z.string().optional(), ts: z.number().optional() })
    .default({}),
}); // In-memory scene store (persists per function instance)
const SCENES = new Map<string, any>();
function encodeURIComponentBase64(json: string) {
  const b64 = Buffer.from(encodeURIComponent(json)).toString("base64");
  return encodeURIComponent(b64);
}
export const handleSceneUpload: RequestHandler = (req, res) => {
  const parsed = SceneSchema.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: "invalid payload", issues: parsed.error.issues });
  const payload = parsed.data;
  SCENES.set(payload.sceneId, payload);
  const json = JSON.stringify(payload);
  const enc = encodeURIComponentBase64(json);
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol;
  const host = (req.headers["x-forwarded-host"] as string) || req.get("host");
  const base = `${proto}://${host}`;
  const url = `${base}/walkthrough#s=${enc}`;
  res.json({ url, sceneId: payload.sceneId });
};
export const handleGetScene: RequestHandler = (req, res) => {
  const id = String(req.params.id);
  const found = SCENES.get(id);
  if (!found) return res.status(404).json({ error: "not found" });
  return res.json(found);
};
