/**
 * Calendar AI REST API
 * Endpoints for smart scheduling, conflict resolution, and predictions
 */

import { Router, Request, Response } from "express";
import { AIScheduler } from "../services/ai-scheduler";
import { Database } from "../lib/database-client";
import { logger } from "../lib/logger";
import { CalendarEvent, CalendarConflict } from "@/types/calendar";

const router = Router();
const db = new Database();
const aiScheduler = new AIScheduler(db);

// =====================================================
// AI SCHEDULING ENDPOINTS
// =====================================================

/**
 * POST /api/calendar/ai/suggest-time
 * Get AI-suggested time slots for an event
 *
 * Body:
 * {
 *   title: string,
 *   location_room?: string,
 *   guest_count: number,
 *   department: string,
 *   start_time: ISO string,
 *   duration_minutes?: number,
 *   count?: number (default: 3)
 * }
 */
router.post("/suggest-time", async (req: Request, res: Response) => {
  try {
    const orgId = res.locals.orgId;
    const userId = res.locals.userId;
    const {
      title,
      location_room,
      guest_count,
      department,
      start_time,
      count = 3,
    } = req.body;

    if (!title || !guest_count || !department) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: title, guest_count, department",
      });
    }

    logger.info("[AI] Requesting time slot suggestions", {
      userId,
      orgId,
      title,
    });

    const suggestions = await aiScheduler.suggestTimeSlots(
      orgId,
      {
        title,
        location_room,
        guest_count,
        department,
        start_time: start_time || new Date().toISOString(),
      },
      count,
    );

    return res.json({
      success: true,
      data: suggestions,
      count: suggestions.length,
    });
  } catch (error) {
    logger.error("[AI] Error suggesting times:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate time suggestions",
    });
  }
});

/**
 * POST /api/calendar/ai/resolve-conflict
 * Get AI-recommended conflict resolution
 *
 * Body:
 * {
 *   conflictId: string,
 *   event1: CalendarEvent,
 *   event2: CalendarEvent
 * }
 */
router.post("/resolve-conflict", async (req: Request, res: Response) => {
  try {
    const { conflictId, event1, event2 } = req.body;
    const userId = res.locals.userId;

    if (!event1 || !event2) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: event1, event2",
      });
    }

    logger.info("[AI] Requesting conflict resolution", {
      userId,
      conflictId,
      event1Id: event1.id,
      event2Id: event2.id,
    });

    // Create minimal conflict object for resolution
    const conflict: Partial<CalendarConflict> = {
      id: conflictId,
      event_id_1: event1.id,
      event_id_2: event2.id,
      conflict_type: "location",
      severity: "warning",
      message: "Conflict detected",
      detected_at: new Date().toISOString(),
    };

    const resolution = await aiScheduler.resolveConflict(
      conflict as CalendarConflict,
      event1,
      event2,
    );

    return res.json({
      success: true,
      data: resolution,
    });
  } catch (error) {
    logger.error("[AI] Error resolving conflict:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to resolve conflict",
    });
  }
});

/**
 * POST /api/calendar/ai/predict-conflicts
 * Predict potential conflicts for an event
 *
 * Body:
 * {
 *   title: string,
 *   location_room?: string,
 *   guest_count: number,
 *   department: string,
 *   start_time: ISO string,
 *   end_time: ISO string
 * }
 */
router.post("/predict-conflicts", async (req: Request, res: Response) => {
  try {
    const orgId = res.locals.orgId;
    const userId = res.locals.userId;
    const eventData = req.body;

    if (!eventData.title || !eventData.guest_count || !eventData.start_time) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: title, guest_count, start_time",
      });
    }

    logger.info("[AI] Requesting conflict prediction", {
      userId,
      orgId,
      eventTitle: eventData.title,
    });

    const prediction = await aiScheduler.predictConflicts(orgId, eventData);

    return res.json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    logger.error("[AI] Error predicting conflicts:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to predict conflicts",
    });
  }
});

/**
 * POST /api/calendar/ai/parse-description
 * Parse natural language event description
 *
 * Body:
 * {
 *   description: string
 * }
 */
router.post("/parse-description", async (req: Request, res: Response) => {
  try {
    const { description } = req.body;
    const userId = res.locals.userId;

    if (!description) {
      return res.status(400).json({
        success: false,
        error: "description is required",
      });
    }

    logger.info("[AI] Parsing event description", {
      userId,
      descriptionLength: description.length,
    });

    const eventData = await aiScheduler.parseEventDescription(description);

    return res.json({
      success: true,
      data: eventData,
      message: "Event details extracted from description",
    });
  } catch (error) {
    logger.error("[AI] Error parsing description:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to parse event description",
    });
  }
});

/**
 * POST /api/calendar/ai/create-from-text
 * Create event from natural language input
 *
 * Body:
 * {
 *   text: string,
 *   outlet_id: string,
 *   auto_suggest_time?: boolean
 * }
 */
router.post("/create-from-text", async (req: Request, res: Response) => {
  try {
    const { text, outlet_id, auto_suggest_time = true } = req.body;
    const orgId = res.locals.orgId;
    const userId = res.locals.userId;

    if (!text || !outlet_id) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: text, outlet_id",
      });
    }

    logger.info("[AI] Creating event from text", {
      userId,
      orgId,
      textLength: text.length,
    });

    // Parse description
    const eventData = await aiScheduler.parseEventDescription(text);

    // Optionally suggest times
    let timeSuggestions = [];
    if (auto_suggest_time && eventData.title) {
      timeSuggestions = await aiScheduler.suggestTimeSlots(
        orgId,
        {
          ...eventData,
          outlet_id,
        },
        3,
      );
    }

    return res.json({
      success: true,
      data: {
        eventData,
        timeSuggestions,
        message: "Event details extracted, ready for confirmation",
      },
    });
  } catch (error) {
    logger.error("[AI] Error creating event from text:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create event from text",
    });
  }
});

export default router;
