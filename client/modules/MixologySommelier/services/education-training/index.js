import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import flashcardRouter from "./flashcards.controller.ts";
import examRouter from "./exams.controller.ts";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (_, res) => {
  res.json({
    service: "EchoAI³ Education & Training Module",
    version: "1.0.0",
    status: "active",
  });
});

app.use("/training", flashcardRouter);
app.use("/training", examRouter);

const PORT = process.env.TRAINING_PORT || process.env.PORT || 8150;
app.listen(PORT, () => {
  console.log(`🎓 Education & Training Service running on port ${PORT}`);
  console.log(`   GET /training/flashcards — generate AI flashcards`);
  console.log(`   GET /training/progress/:userId — user training progress`);
  console.log(`   GET /training/exam/blind — blind-tasting scenarios`);
  console.log(`   POST /training/exam/submit — submit exam score`);
  console.log(`   GET /training/exam/:examId — view exam details`);
  console.log(`   GET /training/leaderboard — top performers`);
});
