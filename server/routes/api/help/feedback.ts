import { Router, Request, Response } from "express";
import { logHelpEvent } from "../../../../shared/echo/help/echo-help-telemetry";

const router = Router();

router.post("/feedback", async (req: Request, res: Response) => {
  try {
    const {
      userId,
      role,
      module,
      route,
      question,
      answerConfidence,
      helpful,
      articleIds,
      contextId,
    } = req.body || {};

    await logHelpEvent({
      type: "help.feedback",
      userId,
      role,
      module,
      route,
      payload: {
        question,
        answerConfidence,
        helpful,
        articleIds,
        contextId,
      },
      createdAt: new Date().toISOString(),
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[EchoHelp] /help/feedback error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
