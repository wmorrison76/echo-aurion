import type { RequestHandler } from "express";
import { generateEchoAiResponse } from "../../shared/echoAi";
export const handleEchoAiRespond: RequestHandler = (req, res) => {
  const { message } = req.body ?? {};
  if (typeof message !== "string") {
    return res
      .status(400)
      .json({ error: "Message must be provided as a string." });
  }
  const response = generateEchoAiResponse(message);
  res.json({ response, receivedAt: new Date().toISOString() });
};
