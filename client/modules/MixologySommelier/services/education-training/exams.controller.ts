import express from "express";
import {
  generateBlindExam,
  logExamAttempt,
  getExamAttempt,
  getLeaderboard,
} from "./training.service.js";
const router =
  express.Router(); /** * GET /training/exam/blind * Generate a blind-tasting exam scenario * Query params: ?region=Bordeaux&difficulty=2 */
router.get("/exam/blind", async (req, res) => {
  try {
    const { region = "Bordeaux", difficulty = 2 } = req.query;
    const exam = await generateBlindExam(region, parseInt(difficulty));
    res.json({ status: "ok", data: exam });
  } catch (error) {
    console.error("Error generating blind exam:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to generate exam",
    });
  }
}); /** * POST /training/exam/submit * Submit an exam attempt and record score */
router.post("/exam/submit", async (req, res) => {
  try {
    const { userId, examType, score, answers } = req.body;
    if (!userId || !examType || score === undefined) {
      return res
        .status(400)
        .json({ error: "userId, examType, and score are required" });
    }
    const result = await logExamAttempt(userId, examType, score, answers || {});
    res.json(result);
  } catch (error) {
    console.error("Error submitting exam:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to submit exam",
    });
  }
}); /** * GET /training/exam/:examId * Get details of a specific exam attempt */
router.get("/exam/:examId", async (req, res) => {
  try {
    const exam = await getExamAttempt(req.params.examId);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }
    res.json({ status: "ok", data: exam });
  } catch (error) {
    console.error("Error fetching exam:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch exam",
    });
  }
}); /** * GET /training/leaderboard * Get top performers * Query params: ?limit=10&examType=blind-tasting */
router.get("/leaderboard", async (req, res) => {
  try {
    const { limit = 10, examType } = req.query;
    const leaders = await getLeaderboard(parseInt(limit), examType || null);
    res.json({ status: "ok", count: leaders.length, data: leaders });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to fetch leaderboard",
    });
  }
});
export default router;
