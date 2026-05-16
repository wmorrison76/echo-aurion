/**
 * AI Scheduling Engine
 * Handles smart scheduling suggestions, conflict resolution, and predictive detection
 * Uses OpenAI GPT-4 for intelligent decision making
 */

import { Database } from "../lib/database-client";
import { logger } from "../lib/logger";
import { CalendarEvent, CalendarConflict } from "@/types/calendar";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

interface SuggestedTimeSlot {
  startTime: string;
  endTime: string;
  confidence: number;
  reason: string;
  capacityAvailable: number;
}

interface ConflictResolution {
  strategy: "reschedule" | "consolidate" | "alternate-outlet" | "split";
  recommendedAction: string;
  impactAssessment: string;
  confidence: number;
}

interface PredictiveConflict {
  eventId: string;
  predictedConflictCount: number;
  riskLevel: "low" | "medium" | "high";
  conflicts: Array<{
    eventId: string;
    conflictType: string;
    probability: number;
  }>;
}

/**
 * AI Scheduling Engine
 */
export class AIScheduler {
  constructor(private db: Database) {}

  /**
   * Suggest optimal time slots for an event
   */
  async suggestTimeSlots(
    orgId: string,
    eventData: Partial<CalendarEvent>,
    count: number = 3,
  ): Promise<SuggestedTimeSlot[]> {
    try {
      if (!OPENAI_API_KEY) {
        logger.warn("[AI] OpenAI API key not configured");
        return this.fallbackTimeSuggestions(eventData);
      }

      // Get existing events and constraints
      const constraints = await this.getSchedulingConstraints(orgId, eventData);

      const prompt = `
You are an expert event scheduler. Suggest 3 optimal time slots for this event:

Event Details:
- Title: ${eventData.title}
- Duration: ${this.getEventDuration(eventData)} minutes
- Location: ${eventData.location_room || "Any location"}
- Department: ${eventData.department}
- Expected Guests: ${eventData.guest_count}
- Preferred Date: ${eventData.start_time?.split("T")[0]}

Current Constraints:
${constraints.busyTimes.map((t) => `- ${t.start} to ${t.end}: ${t.reason}`).join("\n")}
- Outlet capacity: ${constraints.outletCapacity}
- Peak hours: ${constraints.peakHours.join(", ")}

Available Capacity by Time:
${constraints.availabilityByHour.map((a) => `- ${a.hour}:00 - ${a.availableSpots} spots`).join("\n")}

Respond in JSON format:
{
  "suggestions": [
    {
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "confidence": 0.95,
      "reason": "Explanation why this is optimal",
      "capacityAvailable": 200
    }
  ],
  "reasoning": "Overall scheduling analysis"
}
      `;

      const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4-turbo",
          messages: [
            {
              role: "system",
              content:
                "You are an expert event scheduler. Always respond with valid JSON.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        logger.warn(
          "[AI] OpenAI API error:",
          response.status,
          await response.text(),
        );
        return this.fallbackTimeSuggestions(eventData);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      const result = JSON.parse(content);

      logger.info("[AI] Generated time slot suggestions", {
        orgId,
        eventTitle: eventData.title,
      });

      return result.suggestions;
    } catch (error) {
      logger.error("[AI] Error suggesting time slots:", error);
      return this.fallbackTimeSuggestions(eventData);
    }
  }

  /**
   * Resolve conflicts using AI
   */
  async resolveConflict(
    conflict: CalendarConflict,
    event1: CalendarEvent,
    event2: CalendarEvent,
  ): Promise<ConflictResolution> {
    try {
      if (!OPENAI_API_KEY) {
        return this.fallbackConflictResolution(conflict, event1, event2);
      }

      const prompt = `
You are an expert event conflict resolution specialist. 
Analyze this scheduling conflict and recommend the best resolution:

Event 1:
- ID: ${event1.id}
- Title: ${event1.title}
- Time: ${event1.start_time} - ${event1.end_time}
- Location: ${event1.location_room}
- Guests: ${event1.guest_count}
- Revenue: $${event1.revenue || 0}
- Status: ${event1.status}

Event 2:
- ID: ${event2.id}
- Title: ${event2.title}
- Time: ${event2.start_time} - ${event2.end_time}
- Location: ${event2.location_room}
- Guests: ${event2.guest_count}
- Revenue: $${event2.revenue || 0}
- Status: ${event2.status}

Conflict Type: ${conflict.conflict_type}
Conflict Severity: ${conflict.severity}

Available Options:
1. Reschedule one event to avoid conflict
2. Consolidate into single larger event
3. Use alternate outlet if available
4. Split event across multiple time slots

Respond in JSON format:
{
  "strategy": "reschedule|consolidate|alternate-outlet|split",
  "recommendedAction": "Specific action to take",
  "impactAssessment": "Likely impact of this resolution",
  "confidence": 0.85,
  "reasoning": "Why this is the best option"
}
      `;

      const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4-turbo",
          messages: [
            {
              role: "system",
              content:
                "You are an expert event conflict resolution specialist. Always respond with valid JSON.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.5, // Lower temperature for consistent decisions
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        logger.warn("[AI] OpenAI API error:", response.status);
        return this.fallbackConflictResolution(conflict, event1, event2);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      const result = JSON.parse(content);

      logger.info("[AI] Generated conflict resolution", {
        strategy: result.strategy,
        confidence: result.confidence,
      });

      return result;
    } catch (error) {
      logger.error("[AI] Error resolving conflict:", error);
      return this.fallbackConflictResolution(conflict, event1, event2);
    }
  }

  /**
   * Predict potential conflicts for an event
   */
  async predictConflicts(
    orgId: string,
    eventData: Partial<CalendarEvent>,
  ): Promise<PredictiveConflict> {
    try {
      // Get similar past events and their conflicts
      const historicalData = await this.getHistoricalConflictData(
        orgId,
        eventData,
      );

      const prompt = `
Based on similar past events, predict the likelihood of scheduling conflicts:

Event Details:
- Title: ${eventData.title}
- Time: ${eventData.start_time}
- Location: ${eventData.location_room || "TBD"}
- Guests: ${eventData.guest_count}
- Department: ${eventData.department}

Historical Similar Events:
${historicalData.similarEvents
  .map(
    (e) =>
      `- ${e.title}: ${e.conflictCount} conflicts, severity ${e.avgSeverity}`,
  )
  .join("\n")}

Prediction Request:
Estimate the probability of conflicts for this event:
1. Time conflicts (% probability)
2. Location conflicts (% probability)
3. Resource conflicts (% probability)

Respond in JSON format:
{
  "riskLevel": "low|medium|high",
  "conflictProbability": {
    "time": 0.2,
    "location": 0.15,
    "resource": 0.1
  },
  "expectedConflictCount": 1,
  "recommendation": "Action to reduce conflict risk"
}
      `;

      const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4-turbo",
          messages: [
            {
              role: "system",
              content:
                "You are an expert in event scheduling prediction. Provide probability estimates as decimals between 0 and 1.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 600,
        }),
      });

      if (!response.ok) {
        logger.warn("[AI] OpenAI API error:", response.status);
        return this.fallbackPredictiveAnalysis(eventData);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      const result = JSON.parse(content);

      const predictedConflictCount = Math.round(
        result.expectedConflictCount || 0,
      );
      const riskLevel = result.riskLevel || "low";

      return {
        eventId: eventData.id || "pending",
        predictedConflictCount,
        riskLevel,
        conflicts: [
          {
            eventId: "predicted-time",
            conflictType: "time",
            probability: result.conflictProbability.time || 0,
          },
          {
            eventId: "predicted-location",
            conflictType: "location",
            probability: result.conflictProbability.location || 0,
          },
          {
            eventId: "predicted-resource",
            conflictType: "resource",
            probability: result.conflictProbability.resource || 0,
          },
        ],
      };
    } catch (error) {
      logger.error("[AI] Error predicting conflicts:", error);
      return this.fallbackPredictiveAnalysis(eventData);
    }
  }

  /**
   * Parse natural language event description
   */
  async parseEventDescription(
    description: string,
  ): Promise<Partial<CalendarEvent>> {
    try {
      if (!OPENAI_API_KEY) {
        logger.warn("[AI] OpenAI API key not configured");
        return { title: description };
      }

      const prompt = `
Extract event details from this natural language description:
"${description}"

Respond in JSON format with these fields (use null if not mentioned):
{
  "title": "Event name",
  "description": "Full description",
  "guestCount": 100,
  "department": "Department name",
  "duration": 120,
  "preferredTime": "HH:MM",
  "locationRoom": "Room name",
  "estimatedRevenue": 5000,
  "priority": "high|medium|low"
}
      `;

      const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4-turbo",
          messages: [
            {
              role: "system",
              content:
                "You are an event details extraction AI. Always respond with valid JSON.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.5,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        return { title: description };
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      const result = JSON.parse(content);

      return {
        title: result.title,
        description: result.description,
        guest_count: result.guestCount || 0,
        department: result.department,
        location_room: result.locationRoom,
        revenue: result.estimatedRevenue,
      };
    } catch (error) {
      logger.error("[AI] Error parsing event description:", error);
      return { title: description };
    }
  }

  // =====================================================
  // FALLBACK METHODS (When AI unavailable)
  // =====================================================

  private fallbackTimeSuggestions(
    eventData: Partial<CalendarEvent>,
  ): SuggestedTimeSlot[] {
    const startDate = new Date(eventData.start_time || new Date());

    return [
      {
        startTime: "09:00",
        endTime: "11:00",
        confidence: 0.7,
        reason: "Morning slot typically has good availability",
        capacityAvailable: 200,
      },
      {
        startTime: "14:00",
        endTime: "16:00",
        confidence: 0.65,
        reason: "Afternoon slot with moderate capacity",
        capacityAvailable: 150,
      },
      {
        startTime: "18:00",
        endTime: "20:00",
        confidence: 0.6,
        reason: "Evening slot if needed",
        capacityAvailable: 120,
      },
    ];
  }

  private fallbackConflictResolution(
    conflict: CalendarConflict,
    event1: CalendarEvent,
    event2: CalendarEvent,
  ): ConflictResolution {
    return {
      strategy: event1.revenue! > event2.revenue! ? "reschedule" : "reschedule",
      recommendedAction: `Reschedule ${event1.revenue! < event2.revenue! ? event1.title : event2.title} to avoid conflict`,
      impactAssessment: "Minimal impact with rescheduling",
      confidence: 0.5,
    };
  }

  private fallbackPredictiveAnalysis(
    eventData: Partial<CalendarEvent>,
  ): PredictiveConflict {
    return {
      eventId: eventData.id || "pending",
      predictedConflictCount: 0,
      riskLevel: "low",
      conflicts: [],
    };
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private async getSchedulingConstraints(
    orgId: string,
    eventData: Partial<CalendarEvent>,
  ): Promise<{
    busyTimes: Array<{ start: string; end: string; reason: string }>;
    outletCapacity: number;
    peakHours: string[];
    availabilityByHour: Array<{ hour: number; availableSpots: number }>;
  }> {
    // TODO: Implement constraint gathering from database
    return {
      busyTimes: [],
      outletCapacity: 500,
      peakHours: ["18:00-20:00", "19:00-21:00"],
      availabilityByHour: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        availableSpots: 200 + Math.random() * 100,
      })),
    };
  }

  private async getHistoricalConflictData(
    orgId: string,
    eventData: Partial<CalendarEvent>,
  ): Promise<{
    similarEvents: Array<{
      title: string;
      conflictCount: number;
      avgSeverity: string;
    }>;
  }> {
    // TODO: Query similar events from database
    return {
      similarEvents: [
        {
          title: "Similar event 1",
          conflictCount: 2,
          avgSeverity: "warning",
        },
        {
          title: "Similar event 2",
          conflictCount: 1,
          avgSeverity: "info",
        },
      ],
    };
  }

  private getEventDuration(eventData: Partial<CalendarEvent>): number {
    if (!eventData.start_time || !eventData.end_time) return 120;
    const start = new Date(eventData.start_time).getTime();
    const end = new Date(eventData.end_time).getTime();
    return Math.round((end - start) / (1000 * 60));
  }
}

export default AIScheduler;
