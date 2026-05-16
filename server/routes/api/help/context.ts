import { Router, Request, Response } from "express";
import { getContextHelp } from "../../../../shared/echo/help/echo-help-core";

const router = Router();

router.get("/context", async (req: Request, res: Response) => {
  try {
    const { contextId, module, route, userId, role } = req.query;

    if (!contextId || typeof contextId !== "string") {
      return res.status(400).json({ error: "Missing 'contextId' query parameter" });
    }

    const binding = await getContextHelp({
      contextId,
      module: typeof module === "string" ? module : undefined,
      route: typeof route === "string" ? route : undefined,
      userId: typeof userId === "string" ? userId : undefined,
      role: typeof role === "string" ? role : undefined,
    });

    return res.status(200).json(binding ?? null);
  } catch (err) {
    console.error("[EchoHelp] /help/context error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
