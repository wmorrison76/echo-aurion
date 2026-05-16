/**
 * Google Calendar API Client
 * Provides methods to interact with Google Calendar API
 */

import { logger } from "../lib/logger";

const GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  recurringEventId?: string;
  recurrence?: string[];
  updated: string;
  created: string;
}

export class GoogleCalendarClient {
  /**
   * Get calendar events
   */
  async getCalendarEvents(accessToken: string): Promise<GoogleCalendarEvent[]> {
    try {
      const response = await fetch(
        `${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events?maxResults=1000`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.statusText}`);
      }

      const data = (await response.json()) as { items?: GoogleCalendarEvent[] };
      return data.items || [];
    } catch (error) {
      logger.error("[Google Calendar] Failed to get events:", error);
      return [];
    }
  }

  /**
   * Get calendar events updated since a certain date
   */
  async getCalendarEventsUpdatedSince(
    accessToken: string,
    since: Date,
  ): Promise<GoogleCalendarEvent[]> {
    try {
      const updatedMin = since.toISOString();
      const response = await fetch(
        `${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events?updatedMin=${encodeURIComponent(updatedMin)}&maxResults=1000`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.statusText}`);
      }

      const data = (await response.json()) as { items?: GoogleCalendarEvent[] };
      return data.items || [];
    } catch (error) {
      logger.error("[Google Calendar] Failed to get updated events:", error);
      return [];
    }
  }

  /**
   * Create a calendar event
   */
  async createEvent(
    accessToken: string,
    event: Partial<GoogleCalendarEvent>,
  ): Promise<GoogleCalendarEvent | null> {
    try {
      const response = await fetch(
        `${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        },
      );

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.statusText}`);
      }

      return (await response.json()) as GoogleCalendarEvent;
    } catch (error) {
      logger.error("[Google Calendar] Failed to create event:", error);
      return null;
    }
  }

  /**
   * Update a calendar event
   */
  async updateEvent(
    accessToken: string,
    eventId: string,
    event: Partial<GoogleCalendarEvent>,
  ): Promise<GoogleCalendarEvent | null> {
    try {
      const response = await fetch(
        `${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events/${eventId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        },
      );

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.statusText}`);
      }

      return (await response.json()) as GoogleCalendarEvent;
    } catch (error) {
      logger.error("[Google Calendar] Failed to update event:", error);
      return null;
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(accessToken: string, eventId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events/${eventId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (!response.ok && response.status !== 204) {
        throw new Error(`Google Calendar API error: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      logger.error("[Google Calendar] Failed to delete event:", error);
      return false;
    }
  }

  /**
   * Watch calendar for changes
   */
  async watchCalendar(
    accessToken: string,
    webhookUrl: string,
  ): Promise<string | null> {
    try {
      const response = await fetch(
        `${GOOGLE_CALENDAR_API_BASE}/calendars/primary/watch`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: `webhook-${Date.now()}`,
            type: "web_hook",
            address: webhookUrl,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.statusText}`);
      }

      const data = (await response.json()) as { resourceId?: string };
      return data.resourceId || null;
    } catch (error) {
      logger.error("[Google Calendar] Failed to watch calendar:", error);
      return null;
    }
  }

  /**
   * Stop watching calendar
   */
  async stopWatchingCalendar(
    accessToken: string,
    resourceId: string,
    channelId: string,
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${GOOGLE_CALENDAR_API_BASE}/channels/stop`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: channelId,
            resourceId,
          }),
        },
      );

      return response.ok || response.status === 204;
    } catch (error) {
      logger.error(
        "[Google Calendar] Failed to stop watching calendar:",
        error,
      );
      return false;
    }
  }
}

// Export singleton instance
export const googleCalendarClient = new GoogleCalendarClient();
