import db from "./db-client.js";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.ECHO_OPENAI_API_KEY,
});

/**
 * Generate AI-assisted flashcards for any region or varietal
 * @param {string} topic - Wine region or varietal (e.g., "Burgundy", "Cabernet Sauvignon")
 * @param {number} count - Number of flashcards to generate
 * @returns {array} flashcards
 */
export async function generateFlashcards(topic = "Global", count = 5) {
  try {
    let wines = [];
    const query =
      topic === "Global"
        ? "SELECT id, name, region, varietals, style, winemaker_notes FROM wines LIMIT $1"
        : "SELECT id, name, region, varietals, style, winemaker_notes FROM wines WHERE region ILIKE $1 OR varietals::text ILIKE $1 LIMIT $2";

    const params = topic === "Global" ? [count] : [`%${topic}%`, count];
    const result = await db.query(query, params);
    wines = result.rows || [];

    const cards = [];

    for (const wine of wines) {
      try {
        const prompt = `Create a Master Sommelier training flashcard for wine education.

Wine: ${wine.name}
Region: ${wine.region}
Varietals: ${wine.varietals?.join(", ") || "unknown"}
Style: ${wine.style || "unknown"}

Generate a Q&A flashcard format:
QUESTION: [A tasting/identification question a sommelier should know]
ANSWER: [A concise, educational answer covering aroma, structure, pairing, and key characteristics]

Keep the question focused and the answer under 200 words.`;

        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 300,
          temperature: 0.8,
        });

        const content = response.choices[0].message.content;
        const questionMatch = content.match(/QUESTION:\s*([^\n]+)/);
        const answerMatch = content.match(/ANSWER:\s*([\s\S]+)/);

        if (questionMatch && answerMatch) {
          cards.push({
            wine_id: wine.id,
            topic,
            question: questionMatch[1].trim(),
            answer: answerMatch[1].trim(),
          });
        }
      } catch (error) {
        console.error(`Error generating flashcard for ${wine.name}:`, error);
      }
    }

    return cards;
  } catch (error) {
    console.error("Error in generateFlashcards:", error);
    throw error;
  }
}

/**
 * Simulate blind-tasting exam questions for training
 * @param {string} region - Wine region to focus on
 * @param {number} difficulty - 1 (beginner) to 3 (master)
 * @returns {object} blind tasting scenario
 */
export async function generateBlindExam(region = "Bordeaux", difficulty = 2) {
  try {
    const difficultyText =
      difficulty === 1
        ? "Level 1 (Beginner)"
        : difficulty === 2
          ? "Level 2 (Advanced)"
          : "Level 3 (Master Sommelier)";

    const prompt = `You are a Master Sommelier exam proctor. Create a blind tasting scenario for a sommelier student.

Region Focus: ${region}
Difficulty: ${difficultyText}

Provide:
1. APPEARANCE: [Color, clarity, intensity observations]
2. AROMA: [First nose and development aromas]
3. PALATE: [Taste, structure, finish]
4. ANALYSIS: [Clues to varietal, region, age]
5. REVEAL: [Actual wine name, region, vintage - at the end]

Format clearly with headers. Make it challenging but fair for the difficulty level.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.9,
    });

    return {
      region,
      difficulty: difficultyText,
      scenario: response.choices[0].message.content,
    };
  } catch (error) {
    console.error("Error generating blind exam:", error);
    throw error;
  }
}

/**
 * Record a training exam attempt and score
 * @param {string} userId - User ID
 * @param {string} examType - Type of exam (flashcard, blind-tasting, etc.)
 * @param {number} score - Score (0-100)
 * @param {object} answers - User's answers JSON
 * @returns {object} result
 */
export async function logExamAttempt(userId, examType, score, answers) {
  try {
    const result = await db.query(
      `INSERT INTO training_exams (user_id, exam_type, score, answers, taken_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, taken_at`,
      [userId, examType, score, JSON.stringify(answers)],
    );

    return {
      status: "recorded",
      exam_id: result.rows[0].id,
      taken_at: result.rows[0].taken_at,
    };
  } catch (error) {
    console.error("Error logging exam attempt:", error);
    throw error;
  }
}

/**
 * Get training progress for a user
 * @param {string} userId - User ID
 * @returns {object} training stats
 */
export async function getTrainingProgress(userId) {
  try {
    const result = await db.query(
      `SELECT 
        COUNT(*) AS total_exams,
        AVG(score) AS avg_score,
        MAX(score) AS best_score,
        MIN(score) AS worst_score,
        exam_type,
        taken_at
       FROM training_exams
       WHERE user_id = $1
       GROUP BY exam_type, taken_at
       ORDER BY taken_at DESC
       LIMIT 20`,
      [userId],
    );

    const exams = result.rows || [];
    const totalAttempts = exams.reduce(
      (sum, row) => sum + parseInt(row.total_exams || 0),
      0,
    );
    const avgScore =
      exams.length > 0
        ? (
            exams.reduce(
              (sum, row) => sum + parseFloat(row.avg_score || 0),
              0,
            ) / exams.length
          ).toFixed(1)
        : 0;

    return {
      userId,
      totalAttempts,
      avgScore: parseFloat(avgScore),
      exams: exams.map((row) => ({
        examType: row.exam_type,
        avgScore: parseFloat(row.avg_score || 0),
        bestScore: parseFloat(row.best_score || 0),
        worstScore: parseFloat(row.worst_score || 0),
        attemptCount: parseInt(row.total_exams || 0),
      })),
    };
  } catch (error) {
    console.error("Error getting training progress:", error);
    throw error;
  }
}

/**
 * Get a specific training exam
 * @param {string} examId - Exam ID
 * @returns {object} exam details
 */
export async function getExamAttempt(examId) {
  try {
    const result = await db.query(
      "SELECT * FROM training_exams WHERE id = $1",
      [examId],
    );

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const exam = result.rows[0];
    return {
      id: exam.id,
      userId: exam.user_id,
      examType: exam.exam_type,
      score: parseFloat(exam.score),
      answers: exam.answers,
      takenAt: exam.taken_at,
    };
  } catch (error) {
    console.error("Error getting exam attempt:", error);
    throw error;
  }
}

/**
 * Get leaderboard / top performers
 * @param {number} limit - Number of top users
 * @param {string} examType - Filter by exam type (optional)
 * @returns {array} top performers
 */
export async function getLeaderboard(limit = 10, examType = null) {
  try {
    const query = examType
      ? `SELECT 
          user_id,
          COUNT(*) AS attempts,
          AVG(score) AS avg_score,
          MAX(score) AS best_score
         FROM training_exams
         WHERE exam_type = $1
         GROUP BY user_id
         ORDER BY best_score DESC, avg_score DESC
         LIMIT $2`
      : `SELECT 
          user_id,
          COUNT(*) AS attempts,
          AVG(score) AS avg_score,
          MAX(score) AS best_score
         FROM training_exams
         GROUP BY user_id
         ORDER BY best_score DESC, avg_score DESC
         LIMIT $1`;

    const params = examType ? [examType, limit] : [limit];
    const result = await db.query(query, params);

    return (result.rows || []).map((row, index) => ({
      rank: index + 1,
      userId: row.user_id,
      bestScore: parseFloat(row.best_score),
      avgScore: parseFloat(row.avg_score || 0),
      attempts: parseInt(row.attempts),
    }));
  } catch (error) {
    console.error("Error getting leaderboard:", error);
    return [];
  }
}
