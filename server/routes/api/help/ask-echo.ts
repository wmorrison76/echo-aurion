import { Router, Request, Response } from "express";
import { askEchoHelp } from "../../../../shared/echo/help/echo-help-core";

const router = Router();

router.post("/ask-echo", async (req: Request, res: Response) => {
  try {
    const { question, module, role, route, userId, contextId } = req.body || {};

    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "Missing 'question' in body" });
    }

    const answer = await askEchoHelp({
      question,
      module,
      role,
      route,
      userId,
      contextId,
    });

    return res.status(200).json(answer);
  } catch (err) {
    console.error("[EchoHelp] /help/ask-echo error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
