import type { RequestHandler } from "express";
import { indexCodebase, readCodeFile } from "../services/codebaseIndex";

export const handleCodebaseIndex: RequestHandler = async (_req, res) => {
  try {
    const files = await indexCodebase(process.cwd());
    res.json({ success: true, files });
  } catch (error) {
    console.error("Error indexing codebase:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const handleCodebaseFile: RequestHandler = async (req, res) => {
  try {
    const filePath = String(req.query.path || "");
    if (!filePath) {
      return res.status(400).json({ error: "Missing file path" });
    }
    const file = await readCodeFile(process.cwd(), filePath);
    res.json({ success: true, file });
  } catch (error) {
    console.error("Error reading code file:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
