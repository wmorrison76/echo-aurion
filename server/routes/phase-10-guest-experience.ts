import { Router, Request, Response } from "express";
import {
  guestExperienceManager,
  Guest,
  FeedbackCategory,
} from "../../cognition/phases/phase-10-guest-experience";
import { requireRole } from "../middleware/auth";
import { validateOrgContext } from "../middleware/org-context";

const router = Router();

router.use(validateOrgContext);

/**
 * Get Guest by ID
 * GET /api/guest-experience/guests/:guestId
 */
router.get("/guests/:guestId", async (req: Request, res: Response) => {
  try {
    const { guestId } = req.params;
    const guest = await guestExperienceManager.getGuest(guestId);
    if (!guest) {
      return res.status(404).json({ error: "Guest not found" });
    }
    res.json(guest);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch guest" });
  }
});

/**
 * Create Guest
 * POST /api/guest-experience/guests
 */
router.post("/guests", async (req: Request, res: Response) => {
  try {
    const guestData = req.body as Omit<Guest, "id">;
    const guestId = await guestExperienceManager.createGuest(guestData);
    res.status(201).json({ guestId, message: "Guest created" });
  } catch (error) {
    res.status(400).json({ error: "Failed to create guest" });
  }
});

/**
 * Create Reservation
 * POST /api/guest-experience/reservations
 */
router.post("/reservations", async (req: Request, res: Response) => {
  try {
    const { guestId, outletId, date, time, partySize, specialRequests } =
      req.body;
    const reservationId = await guestExperienceManager.createReservation(
      guestId,
      outletId,
      new Date(date),
      time,
      partySize,
      specialRequests,
    );
    res.status(201).json({ reservationId, message: "Reservation created" });
  } catch (error) {
    res.status(400).json({ error: "Failed to create reservation" });
  }
});

/**
 * Confirm Reservation
 * POST /api/guest-experience/reservations/:reservationId/confirm
 */
router.post(
  "/reservations/:reservationId/confirm",
  async (req: Request, res: Response) => {
    try {
      const { reservationId } = req.params;
      await guestExperienceManager.confirmReservation(reservationId);
      res.json({ message: "Reservation confirmed" });
    } catch (error) {
      res.status(400).json({ error: "Failed to confirm reservation" });
    }
  },
);

/**
 * Seat Reservation
 * POST /api/guest-experience/reservations/:reservationId/seat
 */
router.post(
  "/reservations/:reservationId/seat",
  requireRole("staff", "manager", "admin"),
  async (req: Request, res: Response) => {
    try {
      const { reservationId } = req.params;
      const { tableNumber } = req.body;
      await guestExperienceManager.seatReservation(reservationId, tableNumber);
      res.json({ message: "Guest seated" });
    } catch (error) {
      res.status(400).json({ error: "Failed to seat guest" });
    }
  },
);

/**
 * Complete Reservation
 * POST /api/guest-experience/reservations/:reservationId/complete
 */
router.post(
  "/reservations/:reservationId/complete",
  requireRole("staff", "manager", "admin"),
  async (req: Request, res: Response) => {
    try {
      const { reservationId } = req.params;
      await guestExperienceManager.completeReservation(reservationId);
      res.json({ message: "Reservation completed" });
    } catch (error) {
      res.status(400).json({ error: "Failed to complete reservation" });
    }
  },
);

/**
 * Get Reservations
 * GET /api/guest-experience/reservations?outletId=outlet-1&date=2024-01-15
 */
router.get("/reservations", async (req: Request, res: Response) => {
  try {
    const outletId = req.query.outletId as string | undefined;
    const date = req.query.date
      ? new Date(req.query.date as string)
      : undefined;
    const reservations = await guestExperienceManager.getReservations(
      outletId,
      date,
    );
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reservations" });
  }
});

/**
 * Submit Guest Feedback
 * POST /api/guest-experience/feedback
 */
router.post("/feedback", async (req: Request, res: Response) => {
  try {
    const { reservationId, rating, categories, comments, outletId, customerId } = req.body;
    const feedbackId = await guestExperienceManager.submitFeedback(
      reservationId,
      rating,
      categories as FeedbackCategory[],
      comments,
    );

    // Emit Stratus event for decision intelligence
    try {
      const { emitGuestFeedbackLogged } = await import("../lib/module-event-emitters.js");
      const orgContext = (req as any).orgContext || { orgId: "default-org" };
      
      // Get reservation for outlet_id and customer_id
      const reservation = await guestExperienceManager.getReservation(reservationId);

      await emitGuestFeedbackLogged({
        tenant_id: orgContext.orgId || "default-org",
        org_id: orgContext.orgId || "default-org",
        outlet_id: outletId || reservation?.outletId || "default-outlet",
        feedback_id: feedbackId,
        customer_id: customerId || reservation?.guestId,
        rating: rating,
        comment: comments,
        category: categories?.[0]?.name || "general",
        logged_at: new Date().toISOString(),
      });
    } catch (stratusError) {
      console.warn("[Guest Experience] Failed to emit Stratus feedback event:", stratusError);
      // Don't fail if Stratus event emission fails
    }

    res.status(201).json({ feedbackId, message: "Feedback submitted" });
  } catch (error) {
    res.status(400).json({ error: "Failed to submit feedback" });
  }
});

/**
 * Record Loyalty Transaction
 * POST /api/guest-experience/loyalty/transactions
 */
router.post("/loyalty/transactions", async (req: Request, res: Response) => {
  try {
    const { guestId, outletId, type, points, amount, description } = req.body;
    const transactionId = await guestExperienceManager.recordLoyaltyTransaction(
      guestId,
      outletId,
      type,
      points,
      amount,
      description,
    );
    res.status(201).json({ transactionId, message: "Transaction recorded" });
  } catch (error) {
    res.status(400).json({ error: "Failed to record transaction" });
  }
});

/**
 * Get Loyalty Rewards
 * GET /api/guest-experience/loyalty/rewards
 */
router.get("/loyalty/rewards", async (req: Request, res: Response) => {
  try {
    const rewards = await guestExperienceManager.getLoyaltyRewards();
    res.json(rewards);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch loyalty rewards" });
  }
});

/**
 * Create Special Event
 * POST /api/guest-experience/events
 */
router.post(
  "/events",
  requireRole("manager", "admin"),
  async (req: Request, res: Response) => {
    try {
      const { outletId, name, date, maxCapacity } = req.body;
      const eventId = await guestExperienceManager.createSpecialEvent(
        outletId,
        name,
        new Date(date),
        maxCapacity,
      );
      res.status(201).json({ eventId, message: "Event created" });
    } catch (error) {
      res.status(400).json({ error: "Failed to create event" });
    }
  },
);

/**
 * Get Special Events
 * GET /api/guest-experience/events?outletId=outlet-1
 */
router.get("/events", async (req: Request, res: Response) => {
  try {
    const outletId = req.query.outletId as string | undefined;
    const events = await guestExperienceManager.getSpecialEvents(outletId);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

/**
 * Get Guest Analytics
 * GET /api/guest-experience/guests/:guestId/analytics
 */
router.get(
  "/guests/:guestId/analytics",
  async (req: Request, res: Response) => {
    try {
      const { guestId } = req.params;
      const analytics = await guestExperienceManager.getGuestAnalytics(guestId);
      if (!analytics) {
        return res.status(404).json({ error: "Guest not found" });
      }
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch guest analytics" });
    }
  },
);

/**
 * Get Guest Experience Metrics
 * GET /api/guest-experience/metrics?outletId=outlet-1
 */
router.get("/metrics", async (req: Request, res: Response) => {
  try {
    const outletId = req.query.outletId as string | undefined;
    const metrics =
      await guestExperienceManager.getGuestExperienceMetrics(outletId);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

type AnalyzeReservation = {
  id: string;
  date?: string;
  time?: string;
  partySize?: number;
  status?: string;
};

type AnalyzeFeedback = {
  id: string;
  rating?: number;
  category?: string;
  sentiment?: "positive" | "neutral" | "negative";
  willReturn?: boolean;
  comment?: string;
};

type AnalyzePreference = {
  id: string;
  preferences?: string[];
  allergies?: string[];
  diningFrequency?: number;
  lifetime?: number;
  visits?: number;
};

type GuestExperienceAnalysis = {
  summary: {
    averageRating: number;
    totalFeedback: number;
    retentionRate: number;
    activeReservations: number;
  };
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  categories: {
    name: string;
    averageRating: number;
    count: number;
  }[];
  topPreferences: {
    value: string;
    count: number;
  }[];
  recommendedActions: string[];
};

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function safeNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSentiment(
  f: AnalyzeFeedback,
): "positive" | "neutral" | "negative" {
  if (
    f.sentiment === "positive" ||
    f.sentiment === "neutral" ||
    f.sentiment === "negative"
  ) {
    return f.sentiment;
  }
  const rating = safeNumber(f.rating, 0);
  if (rating >= 4) return "positive";
  if (rating >= 3) return "neutral";
  return "negative";
}

/**
 * Analyze Guest Experience
 * POST /api/guest-experience/analyze
 */
router.post("/analyze", async (req: Request, res: Response) => {
  try {
    const reservations = safeArray<AnalyzeReservation>(req.body?.reservations);
    const feedback = safeArray<AnalyzeFeedback>(req.body?.feedback);
    const preferences = safeArray<AnalyzePreference>(req.body?.preferences);

    const totalFeedback = feedback.length;
    const avgRating =
      totalFeedback > 0
        ? feedback.reduce((sum, f) => sum + safeNumber(f.rating, 0), 0) /
          totalFeedback
        : 0;

    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
    for (const f of feedback) {
      const s = normalizeSentiment(f);
      sentimentCounts[s] += 1;
    }

    const willReturnCount = feedback.filter((f) => !!f.willReturn).length;
    const retentionRate =
      totalFeedback > 0 ? (willReturnCount / totalFeedback) * 100 : 0;

    const activeReservations = reservations.filter(
      (r) => r.status !== "completed" && r.status !== "cancelled",
    ).length;

    const categoryAgg = new Map<string, { total: number; count: number }>();
    for (const f of feedback) {
      const name = (f.category || "Uncategorized").trim() || "Uncategorized";
      const agg = categoryAgg.get(name) || { total: 0, count: 0 };
      agg.total += safeNumber(f.rating, 0);
      agg.count += 1;
      categoryAgg.set(name, agg);
    }

    const categories = Array.from(categoryAgg.entries())
      .map(([name, agg]) => ({
        name,
        averageRating: agg.count > 0 ? agg.total / agg.count : 0,
        count: agg.count,
      }))
      .sort((a, b) => b.count - a.count);

    const prefAgg = new Map<string, number>();
    for (const p of preferences) {
      for (const v of safeArray<string>(p.preferences)) {
        const key = String(v).trim();
        if (!key) continue;
        prefAgg.set(key, (prefAgg.get(key) || 0) + 1);
      }
    }

    const topPreferences = Array.from(prefAgg.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const recommendedActions: string[] = [];

    if (sentimentCounts.negative > 0) {
      recommendedActions.push(
        "Review negative feedback and follow up with guests within 24 hours.",
      );
    }

    const lowCategory = categories
      .filter((c) => c.count >= 2)
      .sort((a, b) => a.averageRating - b.averageRating)[0];

    if (lowCategory && lowCategory.averageRating < 3.5) {
      recommendedActions.push(
        `Prioritize improvements in “${lowCategory.name}” (avg ${lowCategory.averageRating.toFixed(
          1,
        )}⭐).`,
      );
    }

    if (retentionRate < 70 && totalFeedback > 0) {
      recommendedActions.push(
        "Launch a win-back offer for guests who indicated they may not return.",
      );
    }

    if (activeReservations > 10) {
      recommendedActions.push(
        "Confirm upcoming reservations and proactively note allergies/preferences.",
      );
    }

    if (recommendedActions.length === 0) {
      recommendedActions.push(
        "Maintain current service levels and monitor trends.",
      );
    }

    const result: GuestExperienceAnalysis = {
      summary: {
        averageRating: Math.round(avgRating * 10) / 10,
        totalFeedback,
        retentionRate: Math.round(retentionRate * 10) / 10,
        activeReservations,
      },
      sentiment: sentimentCounts,
      categories: categories.map((c) => ({
        ...c,
        averageRating: Math.round(c.averageRating * 10) / 10,
      })),
      topPreferences,
      recommendedActions,
    };

    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: "FAILED_ANALYSIS",
      message: "Failed to analyze guest experience",
    });
  }
});

export default router;
