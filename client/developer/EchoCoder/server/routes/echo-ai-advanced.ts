import express, { Router, Request, Response } from "express";
import { echoFinancialForecastingService } from "../services/echoFinancialForecastingService";
import { echoTeachingModeService } from "../services/echoTeachingModeService";

const router = express.Router();

/**
 * POST /api/echo-ai/financial/analyze-pnl
 * Analyze P&L statement with detailed breakdown and recommendations
 * Body: { revenue, cogs, operatingExpenses, laborCosts, rent, utilities, otherExpenses, historicalData? }
 */
router.post("/financial/analyze-pnl", async (req: Request, res: Response) => {
  try {
    const {
      revenue,
      cogs,
      operatingExpenses,
      laborCosts,
      rent,
      utilities,
      otherExpenses,
      historicalData,
    } = req.body;

    if (!revenue) {
      return res.status(400).json({
        success: false,
        error: "Revenue required",
      });
    }

    const result = await echoFinancialForecastingService.analyzePnL({
      revenue,
      cogs: cogs || 0,
      operatingExpenses: operatingExpenses || 0,
      laborCosts: laborCosts || 0,
      rent: rent || 0,
      utilities: utilities || 0,
      otherExpenses: otherExpenses || 0,
      period: "monthly",
      historicalData: historicalData || [],
    });

    res.json({
      success: true,
      analysis: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "P&L analysis failed",
    });
  }
});

/**
 * POST /api/echo-ai/financial/forecast-demand
 * Forecast demand for specific dishes
 * Body: { dishName, historicalOrders: [], currentMonth, eventInfo? }
 */
router.post(
  "/financial/forecast-demand",
  async (req: Request, res: Response) => {
    try {
      const { dishName, historicalOrders, currentMonth, eventInfo } = req.body;

      if (!dishName || !historicalOrders || !currentMonth) {
        return res.status(400).json({
          success: false,
          error: "dishName, historicalOrders, and currentMonth required",
        });
      }

      const forecast = await echoFinancialForecastingService.forecastDishDemand(
        dishName,
        historicalOrders,
        currentMonth,
        eventInfo,
      );

      res.json({
        success: true,
        forecast: {
          dish: forecast.dish,
          currentMonthlyOrders: forecast.currentMonthlyOrders,
          forecastedOrders: forecast.forecastedOrders,
          confidence: Math.round(forecast.confidence * 100) + "%",
          reasoning: forecast.reasoning,
          message: `You should prep approximately ${forecast.forecastedOrders} orders of ${dishName}`,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || "Demand forecast failed",
      });
    }
  },
);

/**
 * POST /api/echo-ai/financial/break-even
 * Calculate break-even point
 * Body: { fixedCosts, variableCostPercent, averageDishPrice }
 */
router.post("/financial/break-even", async (req: Request, res: Response) => {
  try {
    const { fixedCosts, variableCostPercent, averageDishPrice } = req.body;

    if (!fixedCosts || !variableCostPercent || !averageDishPrice) {
      return res.status(400).json({
        success: false,
        error: "All parameters required",
      });
    }

    const breakEven = echoFinancialForecastingService.calculateBreakEven(
      fixedCosts,
      variableCostPercent,
      averageDishPrice,
    );

    res.json({
      success: true,
      breakEven: {
        dishesPerMonth: breakEven.breakEvenDishes,
        revenueNeeded: breakEven.breakEvenRevenue,
        dailyTarget: breakEven.dailyTarget,
        message: `You need to sell ${breakEven.dailyTarget} items daily to break even`,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Break-even calculation failed",
    });
  }
});

/**
 * POST /api/echo-ai/financial/menu-profitability
 * Analyze menu profitability
 * Body: { menuItems: [{name, price, cogs, monthlySales}] }
 */
router.post(
  "/financial/menu-profitability",
  async (req: Request, res: Response) => {
    try {
      const { menuItems } = req.body;

      if (!menuItems || !Array.isArray(menuItems)) {
        return res.status(400).json({
          success: false,
          error: "menuItems array required",
        });
      }

      const analysis =
        echoFinancialForecastingService.analyzeMenuProfitability(menuItems);

      res.json({
        success: true,
        analysis: analysis.map((item) => ({
          name: item.name,
          price: item.price,
          margin: item.margin,
          marginPercent: Math.round(item.marginPercent) + "%",
          totalMonthlyContribution: item.totalContribution,
          recommendation: item.recommendation,
        })),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || "Menu analysis failed",
      });
    }
  },
);

/**
 * POST /api/echo-ai/teaching/create-plan
 * Create an interactive teaching plan
 * Body: { topic, userLevel, learningStyle, duration }
 */
router.post("/teaching/create-plan", async (req: Request, res: Response) => {
  try {
    const {
      topic,
      userLevel = "beginner",
      learningStyle = "visual",
      duration = 30,
    } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        error: "Topic required",
      });
    }

    const plan = await echoTeachingModeService.createTeachingPlan(topic, {
      topic,
      userExpertiseLevel: userLevel,
      learningStyle,
      duration,
    });

    res.json({
      success: true,
      plan: {
        topic: plan.topic,
        objective: plan.objective,
        estimatedMinutes: plan.estimatedDuration,
        stepCount: plan.steps.length,
        steps: plan.steps,
        checkpoints: plan.checkpoints,
        resources: plan.resources,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Teaching plan creation failed",
    });
  }
});

/**
 * POST /api/echo-ai/teaching/explain-concept
 * Get detailed explanation of a concept
 * Body: { concept, userLevel, context? }
 */
router.post(
  "/teaching/explain-concept",
  async (req: Request, res: Response) => {
    try {
      const { concept, userLevel = "beginner", context } = req.body;

      if (!concept) {
        return res.status(400).json({
          success: false,
          error: "Concept required",
        });
      }

      const explanation = await echoTeachingModeService.explainConcept(
        concept,
        userLevel,
        context,
      );

      res.json({
        success: true,
        explanation: {
          concept,
          explanation: explanation.explanation,
          analogy: explanation.analogy,
          keyPoints: explanation.keyPoints,
          commonMisunderstandings: explanation.commonMisunderstandings,
          relatedConcepts: explanation.relatedConcepts,
          screenTeachingApproach: explanation.howToTeach,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || "Concept explanation failed",
      });
    }
  },
);

/**
 * POST /api/echo-ai/teaching/create-quiz
 * Generate quiz questions
 * Body: { topic, numberOfQuestions?, difficulty? }
 */
router.post("/teaching/create-quiz", async (req: Request, res: Response) => {
  try {
    const { topic, numberOfQuestions = 5, difficulty = "medium" } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        error: "Topic required",
      });
    }

    const quiz = await echoTeachingModeService.createQuiz(
      topic,
      numberOfQuestions,
      difficulty,
    );

    res.json({
      success: true,
      quiz: {
        topic,
        difficulty,
        questions: quiz,
        totalQuestions: quiz.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Quiz creation failed",
    });
  }
});

/**
 * POST /api/echo-ai/teaching/assess
 * Assess student understanding
 * Body: { topic, studentResponses: [{question, answer, isCorrect}] }
 */
router.post("/teaching/assess", async (req: Request, res: Response) => {
  try {
    const { topic, studentResponses } = req.body;

    if (!topic || !studentResponses) {
      return res.status(400).json({
        success: false,
        error: "Topic and studentResponses required",
      });
    }

    const assessment = await echoTeachingModeService.assessUnderstanding(
      topic,
      studentResponses,
    );

    res.json({
      success: true,
      assessment: {
        topic,
        score: assessment.overallScore + "%",
        strengths: assessment.strengths,
        areasToImprove: assessment.areasToImprove,
        recommendations: assessment.recommendations,
        readyForAdvanced: assessment.readyForAdvanced,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Assessment failed",
    });
  }
});

/**
 * POST /api/echo-ai/teaching/tutorial
 * Create step-by-step tutorial
 * Body: { systemComponent, userGoal }
 */
router.post("/teaching/tutorial", async (req: Request, res: Response) => {
  try {
    const { systemComponent, userGoal } = req.body;

    if (!systemComponent || !userGoal) {
      return res.status(400).json({
        success: false,
        error: "systemComponent and userGoal required",
      });
    }

    const tutorial = await echoTeachingModeService.createTutorial(
      systemComponent,
      userGoal,
    );

    res.json({
      success: true,
      tutorial: {
        component: systemComponent,
        goal: userGoal,
        estimatedMinutes: tutorial.estimatedTime,
        stepCount: tutorial.steps.length,
        steps: tutorial.steps,
        commonIssues: tutorial.commonIssues,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Tutorial creation failed",
    });
  }
});

/**
 * POST /api/echo-ai/code/voice-edit
 * Process voice-based code edit request
 * Body: { command, currentCode, selectedCode?, language }
 */
router.post("/code/voice-edit", async (req: Request, res: Response) => {
  try {
    const {
      command,
      currentCode,
      selectedCode,
      language = "typescript",
    } = req.body;

    if (!command || !currentCode) {
      return res.status(400).json({
        success: false,
        error: "Command and currentCode required",
      });
    }

    // This endpoint would call echoVoiceCodeEditorService
    // For now, return a placeholder response
    res.json({
      success: true,
      edit: {
        command: command.type,
        status: "Proposed",
        requiresConfirmation: true,
        diff: [],
        explanation: "Code edit proposed via voice",
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Voice edit failed",
    });
  }
});

export default router;
