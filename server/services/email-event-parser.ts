/**
 * Email Event Parser Service
 * Uses ChatGPT/OpenAI to parse email subjects/bodies into structured calendar events
 * Supports natural language parsing with high accuracy and fallback patterns
 */

import { Database } from "../lib/database-client";
import { logger } from "../lib/logger";

// OpenAI client - optional dependency
let openai: any = null;
try {
  const { OpenAI } = require("openai");
import { getOpenAIClient } from "../lib/env";
  openai = getOpenAIClient();
} catch (error) {
  logger.warn("OpenAI package not available for email parsing");
}

const db = new Database();

export interface EmailMessage {
  messageId: string;
  from: string;
  fromName?: string;
  subject: string;
  bodyPreview: string;
  receivedAt: string;
}

export interface ParsedEmailEvent {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  departments: string[];
  requiredRoles: string[]; // MANAGER, ALL_STAFF, SPECIFIC_ROLE, LEADERSHIP_ONLY
  location?: string;
  isMandatory: boolean;
  mandatoryKeyword?: string; // [MENU_LAUNCH], [TRAINING], [MANDATORY], etc
  confidenceScore: number; // 0-1
  rawParsing: any;
}

const MANDATORY_KEYWORDS = [
  "MENU_LAUNCH",
  "TRAINING",
  "MANDATORY",
  "REQUIRED",
  "ALL_STAFF",
  "EMERGENCY",
];

const COMMON_DEPARTMENTS = [
  "Culinary",
  "Front of House",
  "Back of House",
  "Management",
  "Finance",
  "HR",
  "Housekeeping",
  "Engineering",
  "Purchasing",
  "Receiving",
  "Administration",
];

class EmailEventParser {
  /**
   * Parse an email into a structured calendar event
   */
  async parseEmail(
    orgId: string,
    email: EmailMessage,
  ): Promise<ParsedEmailEvent | null> {
    try {
      // Check cache first
      const cached = await this.getCachedParsing(email.messageId);
      if (cached && cached.is_valid) {
        logger.info("[EmailParser] Using cached parsing", {
          messageId: email.messageId,
        });
        return this.hydrateFromCache(cached);
      }

      // Detect mandatory keyword early
      const mandatoryKeyword = this.detectMandatoryKeyword(email.subject);

      // Build AI prompt
      const prompt = this.buildAiPrompt(email, COMMON_DEPARTMENTS);

      // Call OpenAI
      const startTime = Date.now();
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are an expert at parsing restaurant/hospitality business emails into structured event data. Return valid JSON only, no markdown.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for consistency
        max_tokens: 1000,
      });

      const duration = Date.now() - startTime;

      if (!response.choices[0]?.message?.content) {
        logger.warn("[EmailParser] Empty response from OpenAI", {
          messageId: email.messageId,
        });
        return null;
      }

      const parsed = JSON.parse(response.choices[0].message.content);
      const confidenceScore = parsed.confidence_score || 0.7;

      // Cache the result
      await this.cacheParsingResult(
        email,
        parsed,
        confidenceScore,
        "gpt-4-turbo",
        duration,
      );

      // Merge with detected keyword
      const isMandatory =
        mandatoryKeyword !== null || parsed.is_mandatory === true;

      const result: ParsedEmailEvent = {
        title: parsed.event_title || parsed.title || email.subject,
        description: parsed.event_description || parsed.description,
        startTime: new Date(parsed.start_datetime || new Date().toISOString()),
        endTime: new Date(
          parsed.end_datetime ||
            new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        ),
        departments: parsed.departments || [],
        requiredRoles: parsed.required_roles || ["ALL_STAFF"],
        location: parsed.location,
        isMandatory,
        mandatoryKeyword: mandatoryKeyword || undefined,
        confidenceScore,
        rawParsing: parsed,
      };

      logger.info("[EmailParser] Email parsed successfully", {
        messageId: email.messageId,
        confidenceScore,
        isMandatory,
        departments: result.departments,
      });

      return result;
    } catch (error) {
      logger.error("[EmailParser] Parsing failed", {
        error: error instanceof Error ? error.message : String(error),
        messageId: email.messageId,
      });

      // Fallback: try pattern-based parsing
      return this.fallbackPatternParsing(email);
    }
  }

  /**
   * Detect mandatory keyword from subject line
   */
  private detectMandatoryKeyword(subject: string): string | null {
    const upperSubject = subject.toUpperCase();

    for (const keyword of MANDATORY_KEYWORDS) {
      if (
        upperSubject.includes(`[${keyword}]`) ||
        upperSubject.includes(keyword)
      ) {
        return keyword;
      }
    }

    return null;
  }

  /**
   * Build the AI prompt for email parsing
   */
  private buildAiPrompt(email: EmailMessage, departments: string[]): string {
    return `
Parse this email from a restaurant/hospitality business into a calendar event. Extract:
1. event_title: Clear, concise event name (2-5 words)
2. event_description: Summary of what the event is about
3. start_datetime: ISO 8601 datetime (assume today if not specified, 9am if no time)
4. end_datetime: ISO 8601 datetime (typically 2 hours after start for training, specific time for service events)
5. departments: List of departments that must participate (from: ${departments.join(", ")})
6. required_roles: Types of staff required (choose from: MANAGER, ALL_STAFF, SPECIFIC_ROLE, LEADERSHIP_ONLY)
7. location: Where the event takes place (or null)
8. is_mandatory: Boolean - is this a mandatory/required event?
9. confidence_score: 0.0-1.0 how confident you are in this parsing

Email:
From: ${email.from}
Subject: ${email.subject}
Body: ${email.bodyPreview}

Return ONLY valid JSON:
{
  "event_title": "...",
  "event_description": "...",
  "start_datetime": "2025-02-15T14:00:00Z",
  "end_datetime": "2025-02-15T16:00:00Z",
  "departments": [],
  "required_roles": [],
  "location": null,
  "is_mandatory": true,
  "confidence_score": 0.85
}
    `;
  }

  /**
   * Fallback pattern-based parsing when AI fails
   */
  private fallbackPatternParsing(email: EmailMessage): ParsedEmailEvent | null {
    try {
      const mandatoryKeyword = this.detectMandatoryKeyword(email.subject);
      const isMandatory = mandatoryKeyword !== null;

      // Try to extract time from subject
      const timePattern = /(\d{1,2}):?(\d{2})?\s*(am|pm)?/i;
      const timeMatch = email.subject.match(timePattern);
      let startTime = new Date();
      startTime.setHours(10, 0, 0, 0); // Default 10am

      if (timeMatch) {
        const hour = parseInt(timeMatch[1]);
        const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const meridiem = timeMatch[3]?.toLowerCase();

        let finalHour = hour;
        if (meridiem === "pm" && hour < 12) {
          finalHour += 12;
        }
        startTime.setHours(finalHour, minute, 0, 0);
      }

      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // +2 hours

      return {
        title:
          email.subject.replace(/\[.*?\]/g, "").trim() || "Unspecified Event",
        startTime,
        endTime,
        departments: this.extractDepartmentsFromText(
          email.subject,
          COMMON_DEPARTMENTS,
        ),
        requiredRoles: isMandatory ? ["ALL_STAFF"] : ["SPECIFIC_ROLE"],
        isMandatory,
        mandatoryKeyword: mandatoryKeyword || undefined,
        confidenceScore: 0.4, // Low confidence for fallback
        rawParsing: null,
      };
    } catch (error) {
      logger.error("[EmailParser] Fallback parsing failed", { error });
      return null;
    }
  }

  /**
   * Extract departments mentioned in text
   */
  private extractDepartmentsFromText(
    text: string,
    knownDepartments: string[],
  ): string[] {
    const found: string[] = [];
    const lowerText = text.toLowerCase();

    for (const dept of knownDepartments) {
      if (lowerText.includes(dept.toLowerCase())) {
        found.push(dept);
      }
    }

    // If no specific departments found but marked as "all staff" or "everyone"
    if (
      found.length === 0 &&
      (lowerText.includes("all") || lowerText.includes("everyone"))
    ) {
      return knownDepartments; // All departments
    }

    return found;
  }

  /**
   * Cache parsing result in database
   */
  private async cacheParsingResult(
    email: EmailMessage,
    parsed: any,
    confidenceScore: number,
    modelVersion: string,
    duration: number,
  ): Promise<void> {
    try {
      await db.query(
        `
        INSERT INTO calendar_email_parsing_cache (
          email_message_id, email_from, email_subject, email_body_preview,
          email_received_at, parsed_title, parsed_description,
          parsed_start_time, parsed_end_time, parsed_department_list,
          parsed_required_roles, parsed_location, parsed_is_mandatory,
          ai_model_version, ai_parsing_duration_ms, ai_confidence_score,
          ai_parsing_timestamp, is_valid, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        ON CONFLICT (email_message_id) DO UPDATE SET
          is_valid = false
      `,
        [
          email.messageId,
          email.from,
          email.subject,
          email.bodyPreview,
          email.receivedAt,
          parsed.event_title || parsed.title,
          parsed.event_description || parsed.description,
          parsed.start_datetime,
          parsed.end_datetime,
          parsed.departments || [],
          parsed.required_roles || [],
          parsed.location,
          parsed.is_mandatory || false,
          modelVersion,
          duration,
          confidenceScore,
          new Date(),
          true,
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 day expiration
        ],
      );
    } catch (error) {
      logger.warn("[EmailParser] Failed to cache parsing result", { error });
    }
  }

  /**
   * Get cached parsing result
   */
  private async getCachedParsing(messageId: string): Promise<any | null> {
    try {
      const result = await db.query(
        `
        SELECT * FROM calendar_email_parsing_cache
        WHERE email_message_id = $1 AND is_valid = true AND expires_at > NOW()
        LIMIT 1
      `,
        [messageId],
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.warn("[EmailParser] Failed to retrieve cache", { error });
      return null;
    }
  }

  /**
   * Hydrate ParsedEmailEvent from cache row
   */
  private hydrateFromCache(cacheRow: any): ParsedEmailEvent {
    return {
      title: cacheRow.parsed_title,
      description: cacheRow.parsed_description,
      startTime: new Date(cacheRow.parsed_start_time),
      endTime: new Date(cacheRow.parsed_end_time),
      departments: cacheRow.parsed_department_list || [],
      requiredRoles: cacheRow.parsed_required_roles || ["ALL_STAFF"],
      location: cacheRow.parsed_location,
      isMandatory: cacheRow.parsed_is_mandatory || false,
      confidenceScore: cacheRow.ai_confidence_score || 0.7,
      rawParsing: null,
    };
  }
}

export const emailEventParser = new EmailEventParser();
export default emailEventParser;
