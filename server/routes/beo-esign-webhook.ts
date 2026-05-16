/**
 * BEO E-Sign Webhook (stub for DocuSign/HelloSign/etc.)
 * POST /api/beo/esign-webhook - provider calls when document is signed
 * Best-in-class: contract lifecycle + e-sign integration point
 */

import { Router, Request, Response } from "express";

const router = Router();

router.post("/", (req: Request, res: Response) => {
  const { event, envelope_id, beo_id } = req.body;
  if (event === "envelope_completed" && envelope_id && beo_id) {
    // TODO: Update BEO contractStatus to 'signed', set signedAt, signedBy from provider payload
    console.log("[BEO-Esign] Envelope completed", { envelope_id, beo_id });
  }
  res.status(200).send("OK");
});

export default router;
