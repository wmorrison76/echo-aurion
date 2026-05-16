import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

const router = Router();
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const openaiKey = process.env.ECHO_OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase credentials not configured");
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface RatingSubmission {
  sessionId: string;
  accuracy?: number;
  codeQuality?: number;
  requirementsClarity?: number;
  usefulness?: number;
  comments?: string;
}

interface QuestionTracking {
  question: string;
  domain: string;
  detailLevel: string;
  effectiveness: "helpful" | "neutral" | "unhelpful" | "skipped";
  responseLength?: number;
}

interface DomainLearning {
  domain: string;
  successfulSessions: string[];
}

/**
 * POST /submit-rating - Submit rating feedback for a session
 * Body: { sessionId, accuracy?, codeQuality?, requirementsClarity?, usefulness?, comments? }
 */
router.post("/submit-rating", async (req: Request, res: Response) => {
  try {
    const { sessionId, accuracy, codeQuality, requirementsClarity, usefulness, comments } =
      req.body as RatingSubmission;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: "sessionId is required" });
    }

    // Validate ratings are between 1-5
    const ratings = [accuracy, codeQuality, requirementsClarity, usefulness].filter(
      (r) => r !== undefined,
    );
    for (const rating of ratings) {
      if (rating && (rating < 1 || rating > 5 || !Number.isInteger(rating))) {
        return res
          .status(400)
          .json({ success: false, message: "Ratings must be integers between 1 and 5" });
      }
    }

    // Verify session exists
    const { data: sessionData, error: sessionError } = await supabase
      .from("ai3_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !sessionData) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    // Check if rating already exists for this session
    const { data: existingRating } = await supabase
      .from("ai3_session_ratings")
      .select("id")
      .eq("session_id", sessionId)
      .single();

    let ratingData;
    let ratingError;

    if (existingRating) {
      // Update existing rating
      const { data, error } = await supabase
        .from("ai3_session_ratings")
        .update({
          accuracy_rating: accuracy || null,
          code_quality_rating: codeQuality || null,
          requirements_clarity_rating: requirementsClarity || null,
          usefulness_rating: usefulness || null,
          comments: comments || null,
          updated_at: new Date().toISOString(),
        })
        .eq("session_id", sessionId)
        .select()
        .single();

      ratingData = data;
      ratingError = error;
    } else {
      // Create new rating
      const { data, error } = await supabase
        .from("ai3_session_ratings")
        .insert({
          session_id: sessionId,
          accuracy_rating: accuracy || null,
          code_quality_rating: codeQuality || null,
          requirements_clarity_rating: requirementsClarity || null,
          usefulness_rating: usefulness || null,
          comments: comments || null,
        })
        .select()
        .single();

      ratingData = data;
      ratingError = error;
    }

    if (ratingError) {
      return res.status(500).json({ success: false, message: ratingError.message });
    }

    // Update domain analytics
    if (sessionData.domain) {
      await updateDomainAnalytics(sessionData.domain, {
        accuracy: accuracy,
        codeQuality: codeQuality,
        requirementsClarity: requirementsClarity,
        usefulness: usefulness,
      });
    }

    // Calculate average rating
    const ratings_list = [accuracy, codeQuality, requirementsClarity, usefulness].filter(
      (r) => r !== undefined,
    );
    const avgRating =
      ratings_list.length > 0
        ? (ratings_list.reduce((a: number, b: number) => a + b, 0) / ratings_list.length).toFixed(2)
        : null;

    return res.json({
      success: true,
      data: {
        ratingId: ratingData.id,
        sessionId,
        ratings: {
          accuracy,
          codeQuality,
          requirementsClarity,
          usefulness,
          average: avgRating,
        },
        recorded: true,
      },
      message: "Rating submitted successfully",
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({ success: false, message: error.message || "Failed to submit rating" });
  }
});

/**
 * POST /track-question - Track question effectiveness
 * Body: { question, domain, detailLevel, effectiveness, responseLength? }
 */
router.post("/track-question", async (req: Request, res: Response) => {
  try {
    const { question, domain, detailLevel, effectiveness, responseLength } =
      req.body as QuestionTracking;

    if (!question || !domain || !detailLevel) {
      return res.status(400).json({
        success: false,
        message: "question, domain, and detailLevel are required",
      });
    }

    if (!["helpful", "neutral", "unhelpful", "skipped"].includes(effectiveness)) {
      return res.status(400).json({
        success: false,
        message: "effectiveness must be one of: helpful, neutral, unhelpful, skipped",
      });
    }

    // Get or create question record
    const { data: existingQuestion } = await supabase
      .from("ai3_question_analytics")
      .select("*")
      .eq("question_text", question)
      .eq("domain", domain)
      .eq("detail_level", detailLevel)
      .single();

    let questionData;
    let questionError;

    if (existingQuestion) {
      // Update metrics for existing question
      const updates: any = {
        times_asked: (existingQuestion.times_asked || 0) + 1,
      };

      if (effectiveness === "helpful") {
        updates.times_helpful = (existingQuestion.times_helpful || 0) + 1;
      } else if (effectiveness === "skipped") {
        updates.times_skipped = (existingQuestion.times_skipped || 0) + 1;
      }

      if (responseLength) {
        const newAvgLength =
          ((existingQuestion.average_response_length || 0) * (existingQuestion.times_asked || 1) +
            responseLength) /
          (updates.times_asked || 1);
        updates.average_response_length = Math.round(newAvgLength);
      }

      // Calculate effectiveness score
      updates.effectiveness_score = calculateEffectivenessScore(updates);
      updates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("ai3_question_analytics")
        .update(updates)
        .eq("id", existingQuestion.id)
        .select()
        .single();

      questionData = data;
      questionError = error;
    } else {
      // Create new question record
      const helpfulCount = effectiveness === "helpful" ? 1 : 0;
      const skippedCount = effectiveness === "skipped" ? 1 : 0;

      const { data, error } = await supabase
        .from("ai3_question_analytics")
        .insert({
          question_text: question,
          domain,
          detail_level: detailLevel,
          times_asked: 1,
          times_skipped: skippedCount,
          times_helpful: helpfulCount,
          average_response_length: responseLength || null,
          effectiveness_score: helpfulCount > 0 ? 1.0 : 0.5,
        })
        .select()
        .single();

      questionData = data;
      questionError = error;
    }

    if (questionError) {
      return res.status(500).json({ success: false, message: questionError.message });
    }

    return res.json({
      success: true,
      data: {
        questionId: questionData.id,
        question,
        domain,
        effectiveness,
        timesAsked: questionData.times_asked,
        timesHelpful: questionData.times_helpful,
        timesSkipped: questionData.times_skipped,
        effectivenessScore: questionData.effectiveness_score,
      },
      message: "Question tracking recorded successfully",
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({ success: false, message: error.message || "Failed to track question" });
  }
});

/**
 * POST /learn-domain - Learn from successful sessions in a domain
 * Body: { domain, successfulSessions: [sessionId] }
 */
router.post("/learn-domain", async (req: Request, res: Response) => {
  try {
    const { domain, successfulSessions } = req.body as DomainLearning;

    if (!domain || !successfulSessions || successfulSessions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "domain and successfulSessions array are required",
      });
    }

    // Get successful sessions data
    const { data: sessions, error: sessionsError } = await supabase
      .from("ai3_sessions")
      .select(
        `
        *,
        conversations:ai3_conversations(*),
        ratings:ai3_session_ratings(*),
        artifacts:ai3_artifacts(*)
      `,
      )
      .in("id", successfulSessions)
      .eq("status", "completed");

    if (sessionsError) {
      return res.status(500).json({ success: false, message: sessionsError.message });
    }

    if (!sessions || sessions.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No successful sessions found for this domain" });
    }

    // Analyze patterns from successful sessions with GPT-4
    let templateKey = null;
    let templateContent = null;

    if (openaiKey) {
      try {
        const sessionSummaries = sessions
          .map((s: any) => ({
            problem: s.initial_problem,
            detailLevel: s.detail_level,
            conversationTurns: s.conversation_turns,
            rating:
              s.ratings && s.ratings.length > 0
                ? (
                    (s.ratings[0].accuracy_rating +
                      s.ratings[0].code_quality_rating +
                      s.ratings[0].requirements_clarity_rating) /
                    3
                  ).toFixed(2)
                : "Not rated",
          }))
          .slice(0, 3); // Use top 3 sessions

        const analysisPrompt = `Analyze these successful AI³ sessions in the "${domain}" domain and identify the pattern/template that made them successful:

${JSON.stringify(sessionSummaries, null, 2)}

Provide a JSON response with:
{
  "templateName": "Name of the pattern",
  "keyCharacteristics": ["list of key traits"],
  "bestPractices": ["recommended approaches"],
  "commonProblemPatterns": ["typical problems this template solves"],
  "suggestedDetailLevel": "concise/detailed/comprehensive",
  "estimatedSuccessRate": "percentage"
}`;

        const aiResponse = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-4",
            messages: [
              {
                role: "system",
                content:
                  "You are an expert at analyzing development patterns and creating reusable templates. Respond only with valid JSON.",
              },
              {
                role: "user",
                content: analysisPrompt,
              },
            ],
            temperature: 0.7,
            max_tokens: 1000,
          },
          {
            headers: {
              Authorization: `Bearer ${openaiKey}`,
              "Content-Type": "application/json",
            },
          },
        );

        const analysisResult = JSON.parse(aiResponse.data.choices[0].message.content);

        templateKey = `tmpl_${domain.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`;
        templateContent = analysisResult;
      } catch (aiError) {
        console.error("Failed to analyze with GPT-4:", aiError);
        // Continue without AI analysis
      }
    }

    // If no AI analysis, create basic template
    if (!templateContent) {
      templateContent = {
        templateName: `${domain} Standard Template`,
        keyCharacteristics: ["Derived from successful sessions"],
        bestPractices: sessions
          .filter((s: any) => s.ratings && s.ratings[0]?.accuracy_rating >= 4)
          .slice(0, 3)
          .map((s: any) => s.initial_problem.substring(0, 50) + "..."),
        commonProblemPatterns: ["General", "Specific"],
        suggestedDetailLevel: "detailed",
        estimatedSuccessRate: `${(
          ((sessions.filter((s: any) => s.ratings?.length > 0) || []).length / sessions.length) *
          100
        ).toFixed(0)}%`,
      };
      templateKey = `tmpl_${domain.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`;
    }

    // Store the learned template
    const { data: templateData, error: templateError } = await supabase
      .from("ai3_domain_templates")
      .insert({
        domain,
        template_key: templateKey,
        template_content: templateContent,
        success_count: sessions.length,
        avg_effectiveness: (sessions.length > 0 ? 0.85 : 0).toFixed(2),
        is_active: true,
      })
      .select()
      .single();

    if (templateError) {
      return res.status(500).json({ success: false, message: templateError.message });
    }

    // Update domain analytics with learning status
    await updateDomainAnalytics(domain, {
      totalSessions: sessions.length,
      completedSessions: sessions.length,
    });

    return res.json({
      success: true,
      data: {
        templateId: templateData.id,
        templateKey: templateData.template_key,
        domain,
        sessionsAnalyzed: sessions.length,
        template: templateContent,
        status: "learning_complete",
      },
      message: `Domain template created for ${domain}`,
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({ success: false, message: error.message || "Failed to learn domain" });
  }
});

/**
 * GET /domain-stats/:domain - Get analytics for a domain
 */
router.get("/domain-stats/:domain", async (req: Request, res: Response) => {
  try {
    const { domain } = req.params;

    if (!domain) {
      return res.status(400).json({ success: false, message: "domain is required" });
    }

    const { data: stats, error } = await supabase
      .from("ai3_domain_analytics")
      .select("*")
      .eq("domain", domain)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found
      return res.status(500).json({ success: false, message: error.message });
    }

    // Get question analytics for domain
    const { data: questions } = await supabase
      .from("ai3_question_analytics")
      .select("*")
      .eq("domain", domain)
      .order("effectiveness_score", { ascending: false });

    // Get templates for domain
    const { data: templates } = await supabase
      .from("ai3_domain_templates")
      .select("*")
      .eq("domain", domain)
      .eq("is_active", true);

    return res.json({
      success: true,
      data: {
        domain,
        stats: stats || {
          domain,
          total_sessions: 0,
          avg_accuracy_rating: 0,
          avg_code_quality: 0,
          trending: "stable",
        },
        topQuestions: questions?.slice(0, 5) || [],
        templates: templates || [],
      },
      message: "Domain statistics retrieved successfully",
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({ success: false, message: error.message || "Failed to get domain stats" });
  }
});

/**
 * Helper: Update domain analytics with session data
 */
async function updateDomainAnalytics(
  domain: string,
  data: {
    accuracy?: number;
    codeQuality?: number;
    requirementsClarity?: number;
    usefulness?: number;
    totalSessions?: number;
    completedSessions?: number;
  },
) {
  try {
    const { data: existing } = await supabase
      .from("ai3_domain_analytics")
      .select("*")
      .eq("domain", domain)
      .single();

    if (existing) {
      // Update existing
      const ratings = [
        data.accuracy,
        data.codeQuality,
        data.requirementsClarity,
        data.usefulness,
      ].filter((r) => r !== undefined);
      const newAvgAccuracy =
        ratings.length > 0
          ? (
              ((existing.avg_accuracy_rating || 0) * (existing.total_sessions || 1) +
                (data.accuracy || 0)) /
              (existing.total_sessions || 1)
            ).toFixed(2)
          : existing.avg_accuracy_rating;

      await supabase
        .from("ai3_domain_analytics")
        .update({
          total_sessions: (existing.total_sessions || 0) + (data.totalSessions || 0),
          completed_sessions: (existing.completed_sessions || 0) + (data.completedSessions || 0),
          avg_accuracy_rating: newAvgAccuracy,
          updated_at: new Date().toISOString(),
        })
        .eq("domain", domain);
    } else {
      // Create new
      await supabase.from("ai3_domain_analytics").insert({
        domain,
        total_sessions: data.totalSessions || 1,
        completed_sessions: data.completedSessions || 0,
        avg_accuracy_rating: data.accuracy || 0,
        avg_code_quality: data.codeQuality || 0,
        avg_requirements_clarity: data.requirementsClarity || 0,
        completion_rate: 0,
        trending: "stable",
        is_recommended: false,
      });
    }
  } catch (error: any) {
    console.error("Failed to update domain analytics:", error.message);
  }
}

/**
 * Helper: Calculate effectiveness score
 */
function calculateEffectivenessScore(data: {
  times_helpful?: number;
  times_skipped?: number;
  times_asked?: number;
}): number {
  if (!data.times_asked || data.times_asked === 0) return 0.5;

  const helpfulRate = (data.times_helpful || 0) / data.times_asked;
  const skippedRate = (data.times_skipped || 0) / data.times_asked;

  return Math.round((helpfulRate * 1.0 - skippedRate * 0.5) * 100) / 100;
}

export default router;
