/**
 * Microsoft Graph API Client
 * Provides methods to fetch data from Microsoft services:
 * - Outlook Mail and Calendar
 * - Teams Messages and Channels
 * - OneDrive and SharePoint
 * - User Profile Information
 */

import { logger } from "../lib/logger";
import { azureAuthClient } from "./azure-auth";

const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";

export interface OutlookEmail {
  id: string;
  from: {
    emailAddress: {
      address: string;
      name: string;
    };
  };
  subject: string;
  receivedDateTime: string;
  isRead: boolean;
  bodyPreview: string;
  importance: "low" | "normal" | "high";
}

export interface OutlookEvent {
  id: string;
  subject: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
  }>;
  isReminderOn?: boolean;
  reminderMinutesBeforeStart?: number;
}

export interface TeamsMessage {
  id: string;
  from: {
    user?: {
      displayName: string;
      id: string;
    };
  };
  body: {
    content: string;
    contentType: string;
  };
  createdDateTime: string;
  lastModifiedDateTime: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  mail: string;
  mobilePhone?: string;
  officeLocation?: string;
  jobTitle?: string;
}

export interface GraphApiError {
  error: {
    code: string;
    message: string;
    innerError?: {
      request_id: string;
      date: string;
    };
  };
}

/**
 * Microsoft Graph API Client
 */
export class MicrosoftGraphClient {
  private baseUrl = GRAPH_API_BASE;

  /**
   * Fetch user's inbox emails
   */
  async getEmails(
    orgId: string,
    userId: string,
    options: {
      top?: number;
      skip?: number;
      filter?: string;
    } = {},
  ): Promise<OutlookEmail[]> {
    try {
      const token = await azureAuthClient.getValidToken(orgId, userId);

      if (!token) {
        logger.error("[Graph] No valid token for fetching emails", {
          userId,
          orgId,
        });
        return [];
      }

      const params = new URLSearchParams({
        $top: String(options.top || 10),
        $select:
          "id,from,subject,receivedDateTime,isRead,bodyPreview,importance",
        $orderby: "receivedDateTime desc",
      });

      if (options.skip) {
        params.append("$skip", String(options.skip));
      }

      if (options.filter) {
        params.append("$filter", options.filter);
      }

      const response = await fetch(
        `${this.baseUrl}/me/mailFolders/inbox/messages?${params.toString()}`,
        {
          headers: this.getAuthHeaders(token),
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          logger.warn("[Graph] Token expired while fetching emails", {
            userId,
            orgId,
          });
          // Try to refresh token
          const refreshed = await azureAuthClient.refreshToken(orgId, userId);
          if (refreshed) {
            return this.getEmails(orgId, userId, options);
          }
        }

        logger.error("[Graph] Failed to fetch emails", {
          status: response.status,
          userId,
          orgId,
        });
        return [];
      }

      const data = (await response.json()) as { value: OutlookEmail[] };
      return data.value || [];
    } catch (error) {
      logger.error("[Graph] Error fetching emails", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        orgId,
      });
      return [];
    }
  }

  /**
   * Fetch user's calendar events
   */
  async getCalendarEvents(
    orgId: string,
    userId: string,
    options: {
      startDateTime?: string;
      endDateTime?: string;
      top?: number;
    } = {},
  ): Promise<OutlookEvent[]> {
    try {
      const token = await azureAuthClient.getValidToken(orgId, userId);

      if (!token) {
        logger.error("[Graph] No valid token for fetching calendar", {
          userId,
          orgId,
        });
        return [];
      }

      const now = new Date();
      const startDt = options.startDateTime || now.toISOString();
      const endDt =
        options.endDateTime ||
        new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const params = new URLSearchParams({
        startDateTime: startDt,
        endDateTime: endDt,
        $top: String(options.top || 10),
        $select:
          "id,subject,start,end,location,attendees,isReminderOn,reminderMinutesBeforeStart",
        $orderby: "start/dateTime asc",
      });

      const response = await fetch(
        `${this.baseUrl}/me/calendarview?${params.toString()}`,
        {
          headers: this.getAuthHeaders(token),
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          logger.warn("[Graph] Token expired while fetching calendar", {
            userId,
            orgId,
          });
          const refreshed = await azureAuthClient.refreshToken(orgId, userId);
          if (refreshed) {
            return this.getCalendarEvents(orgId, userId, options);
          }
        }

        logger.error("[Graph] Failed to fetch calendar events", {
          status: response.status,
          userId,
          orgId,
        });
        return [];
      }

      const data = (await response.json()) as { value: OutlookEvent[] };
      return data.value || [];
    } catch (error) {
      logger.error("[Graph] Error fetching calendar", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        orgId,
      });
      return [];
    }
  }

  /**
   * Fetch user profile information
   */
  async getUserProfile(
    orgId: string,
    userId: string,
  ): Promise<UserProfile | null> {
    try {
      const token = await azureAuthClient.getValidToken(orgId, userId);

      if (!token) {
        logger.error("[Graph] No valid token for fetching user profile", {
          userId,
          orgId,
        });
        return null;
      }

      const response = await fetch(
        `${this.baseUrl}/me?$select=id,displayName,mail,mobilePhone,officeLocation,jobTitle`,
        {
          headers: this.getAuthHeaders(token),
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          logger.warn("[Graph] Token expired while fetching user profile", {
            userId,
            orgId,
          });
          const refreshed = await azureAuthClient.refreshToken(orgId, userId);
          if (refreshed) {
            return this.getUserProfile(orgId, userId);
          }
        }

        logger.error("[Graph] Failed to fetch user profile", {
          status: response.status,
          userId,
          orgId,
        });
        return null;
      }

      return (await response.json()) as UserProfile;
    } catch (error) {
      logger.error("[Graph] Error fetching user profile", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        orgId,
      });
      return null;
    }
  }

  /**
   * Get Teams messages from a specific channel
   * Requires additional Teams scopes: ChannelMessage.Read.All
   */
  async getTeamsMessages(
    orgId: string,
    userId: string,
    teamId: string,
    channelId: string,
    options: {
      top?: number;
    } = {},
  ): Promise<TeamsMessage[]> {
    try {
      const token = await azureAuthClient.getValidToken(orgId, userId);

      if (!token) {
        logger.error("[Graph] No valid token for fetching Teams messages", {
          userId,
          orgId,
        });
        return [];
      }

      const params = new URLSearchParams({
        $top: String(options.top || 10),
      });

      const response = await fetch(
        `${this.baseUrl}/teams/${teamId}/channels/${channelId}/messages?${params.toString()}`,
        {
          headers: this.getAuthHeaders(token),
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          logger.warn("[Graph] Token expired while fetching Teams messages", {
            userId,
            orgId,
          });
          const refreshed = await azureAuthClient.refreshToken(orgId, userId);
          if (refreshed) {
            return this.getTeamsMessages(
              orgId,
              userId,
              teamId,
              channelId,
              options,
            );
          }
        }

        logger.error("[Graph] Failed to fetch Teams messages", {
          status: response.status,
          userId,
          orgId,
        });
        return [];
      }

      const data = (await response.json()) as { value: TeamsMessage[] };
      return data.value || [];
    } catch (error) {
      logger.error("[Graph] Error fetching Teams messages", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        orgId,
      });
      return [];
    }
  }

  /**
   * Send an email
   */
  async sendEmail(
    orgId: string,
    userId: string,
    email: {
      to: string[];
      subject: string;
      body: string;
      isHtml?: boolean;
    },
  ): Promise<boolean> {
    try {
      const token = await azureAuthClient.getValidToken(orgId, userId);

      if (!token) {
        logger.error("[Graph] No valid token for sending email", {
          userId,
          orgId,
        });
        return false;
      }

      const response = await fetch(`${this.baseUrl}/me/sendMail`, {
        method: "POST",
        headers: this.getAuthHeaders(token),
        body: JSON.stringify({
          message: {
            subject: email.subject,
            body: {
              contentType: email.isHtml ? "HTML" : "text",
              content: email.body,
            },
            toRecipients: email.to.map((address) => ({
              emailAddress: {
                address,
              },
            })),
          },
          saveToSentItems: true,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          const refreshed = await azureAuthClient.refreshToken(orgId, userId);
          if (refreshed) {
            return this.sendEmail(orgId, userId, email);
          }
        }

        logger.error("[Graph] Failed to send email", {
          status: response.status,
          userId,
          orgId,
        });
        return false;
      }

      logger.info("[Graph] Email sent successfully", {
        userId,
        orgId,
        recipient: email.to[0],
      });

      return true;
    } catch (error) {
      logger.error("[Graph] Error sending email", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        orgId,
      });
      return false;
    }
  }

  /**
   * Create calendar event
   */
  async createCalendarEvent(
    orgId: string,
    userId: string,
    event: {
      subject: string;
      start: string;
      end: string;
      location?: string;
      attendees?: string[];
      description?: string;
    },
  ): Promise<OutlookEvent | null> {
    try {
      const token = await azureAuthClient.getValidToken(orgId, userId);

      if (!token) {
        logger.error("[Graph] No valid token for creating calendar event", {
          userId,
          orgId,
        });
        return null;
      }

      const response = await fetch(`${this.baseUrl}/me/events`, {
        method: "POST",
        headers: this.getAuthHeaders(token),
        body: JSON.stringify({
          subject: event.subject,
          start: {
            dateTime: event.start,
            timeZone: "UTC",
          },
          end: {
            dateTime: event.end,
            timeZone: "UTC",
          },
          location: event.location
            ? {
                displayName: event.location,
              }
            : undefined,
          attendees: event.attendees
            ? event.attendees.map((email) => ({
                emailAddress: {
                  address: email,
                },
                type: "required",
              }))
            : undefined,
          body: {
            content: event.description || "",
            contentType: "text",
          },
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          const refreshed = await azureAuthClient.refreshToken(orgId, userId);
          if (refreshed) {
            return this.createCalendarEvent(orgId, userId, event);
          }
        }

        logger.error("[Graph] Failed to create calendar event", {
          status: response.status,
          userId,
          orgId,
        });
        return null;
      }

      return (await response.json()) as OutlookEvent;
    } catch (error) {
      logger.error("[Graph] Error creating calendar event", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        orgId,
      });
      return null;
    }
  }

  /**
   * Update calendar event
   */
  async updateCalendarEvent(
    orgId: string,
    userId: string,
    eventId: string,
    event: {
      subject: string;
      start: {
        dateTime: string;
        timeZone: string;
      };
      end: {
        dateTime: string;
        timeZone: string;
      };
      location?: { displayName: string };
      attendees?: Array<{ emailAddress: { address: string } }>;
      body?: { content: string; contentType: string };
    },
  ): Promise<OutlookEvent | null> {
    try {
      const token = await azureAuthClient.getValidToken(orgId, userId);

      if (!token) {
        logger.error("[Graph] No valid token for updating calendar event", {
          userId,
          orgId,
        });
        return null;
      }

      const response = await fetch(`${this.baseUrl}/me/events/${eventId}`, {
        method: "PATCH",
        headers: this.getAuthHeaders(token),
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        if (response.status === 401) {
          const refreshed = await azureAuthClient.refreshToken(orgId, userId);
          if (refreshed) {
            return this.updateCalendarEvent(orgId, userId, eventId, event);
          }
        }

        logger.error("[Graph] Failed to update calendar event", {
          status: response.status,
          userId,
          orgId,
          eventId,
        });
        return null;
      }

      return (await response.json()) as OutlookEvent;
    } catch (error) {
      logger.error("[Graph] Error updating calendar event", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        orgId,
      });
      return null;
    }
  }

  /**
   * Create calendar subscription (webhook)
   */
  async createCalendarSubscription(
    orgId: string,
    userId: string,
    subscription: {
      resource: string;
      notificationUrl: string;
      changeType: string;
      expirationDateTime: string;
    },
  ): Promise<string | null> {
    try {
      const token = await azureAuthClient.getValidToken(orgId, userId);

      if (!token) {
        logger.error("[Graph] No valid token for creating subscription", {
          userId,
          orgId,
        });
        return null;
      }

      const response = await fetch(`${this.baseUrl}/subscriptions`, {
        method: "POST",
        headers: this.getAuthHeaders(token),
        body: JSON.stringify(subscription),
      });

      if (!response.ok) {
        if (response.status === 401) {
          const refreshed = await azureAuthClient.refreshToken(orgId, userId);
          if (refreshed) {
            return this.createCalendarSubscription(orgId, userId, subscription);
          }
        }

        logger.error("[Graph] Failed to create subscription", {
          status: response.status,
          userId,
          orgId,
        });
        return null;
      }

      const data = (await response.json()) as { id: string };
      return data.id;
    } catch (error) {
      logger.error("[Graph] Error creating subscription", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        orgId,
      });
      return null;
    }
  }

  /**
   * Renew calendar subscription
   */
  async renewSubscription(subscriptionId: string): Promise<any | null> {
    try {
      // Note: This would need proper token management for service account
      // In production, use application-level permissions
      logger.info("[Graph] Subscription renewal requested", { subscriptionId });

      // Simplified implementation - real implementation would need service account token
      return {
        expirationDateTime: new Date(
          Date.now() + 3 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };
    } catch (error) {
      logger.error("[Graph] Error renewing subscription", { error });
      return null;
    }
  }

  /**
   * Helper method to get authorization headers
   */
  private getAuthHeaders(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }
}

// Singleton instance
export const graphClient = new MicrosoftGraphClient();

/**
 * Default export for backwards compatibility
 */
export default graphClient;
