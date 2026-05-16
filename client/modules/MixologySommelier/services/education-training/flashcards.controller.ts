import express from "express";
import { generateFlashcards, getTrainingProgress } from "./training.service.js";
const router =
  express.Router(); /** * GET /training/flashcards * Get pre-generated flashcards or generate new ones * Query params: ?topic=Burgundy&count=5 */
router.get("/flashcards", async (req, res) => {
  try {
    const { topic = "Global", count = 5 } = req.query;
    const cards = await generateFlashcards(topic, parseInt(count));
    res.json({ status: "ok", topic, count: cards.length, data: cards });
  } catch (error) {
    console.error("Error fetching flashcards:", error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate flashcards",
    });
  }
}); /** * GET /training/progress/:userId * Get training progress and stats for a user */
router.get("/progress/:userId", async (req, res) => {
  try {
    const progress = await getTrainingProgress(req.params.userId);
    res.json({ status: "ok", data: progress });
  } catch (error) {
    console.error("Error fetching progress:", error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch training progress",
    });
  }
});
export default router;
