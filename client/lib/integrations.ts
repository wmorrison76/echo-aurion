/**
 * Frontend Integration Utilities
 * Provides helper functions for OAuth 2.0 authentication and API calls
 * Usage: import { useIntegrations } from '@/lib/integrations'
 */

/**
 * Integration API Types
 */
export interface IntegrationEmail {
  id: string;
  from: string;
  subject: string;
  timestamp: number;
  isUnread: boolean;
  bodyPreview?: string;
  importance?: 'low' | 'normal' | 'high';
}

export interface IntegrationEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  attendees?: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
  }>;
}

export interface IntegrationProfile {
  id: string;
  displayName: string;
  mail: string;
  mobilePhone?: string;
  officeLocation?: string;
  jobTitle?: string;
}

export interface IntegrationStatus {
  status: string;
  integrations: {
    outlook: {
      authenticated: boolean;
      configured: boolean;
      expiresAt?: number;
      lastUpdated?: number;
    };
    teams: {
      authenticated: boolean;
      configured: boolean;
    };
    gmail: {
      authenticated: boolean;
      configured: boolean;
    };
  };
}

/**
 * Base URL for API calls
 */
const getApiBase = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.VITE_API_URL || 'http://localhost:8080';
};

/**
 * Get default headers including organization ID
 */
function getHeaders(orgId?: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Org-ID': orgId || localStorage.getItem('orgId') || 'default',
  };
}

/**
 * Integration Service Class
 */
export class IntegrationService {
  private orgId: string;

  constructor(orgId?: string) {
    this.orgId = orgId || localStorage.getItem('orgId') || 'default';
  }

  /**
   * Initiate Outlook authentication
   * Returns authorization URL that user should be redirected to
   */
  async initiateOutlookAuth(userId: string): Promise<string> {
    try {
      const response = await fetch(
        `${getApiBase()}/api/integrations/authorize/outlook?user_id=${userId}`,
        {
          headers: getHeaders(this.orgId),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to initiate auth: ${response.statusText}`);
      }

      const data = await response.json();
      return data.authorization_url;
    } catch (error) {
      console.error('[Integrations] Error initiating Outlook auth:', error);
      throw error;
    }
  }

  /**
   * Redirect user to Outlook authentication
   */
  redirectToOutlookAuth(userId: string): void {
    this.initiateOutlookAuth(userId)
      .then((url) => {
        window.location.href = url;
      })
      .catch((error) => {
        console.error('Failed to redirect to Outlook auth:', error);
        alert('Failed to initiate authentication. Please try again.');
      });
  }

  /**
   * Fetch user's Outlook emails
   */
  async getOutlookEmails(options?: {
    top?: number;
    skip?: number;
  }): Promise<IntegrationEmail[]> {
    try {
      const params = new URLSearchParams();
      if (options?.top) params.append('top', String(options.top));
      if (options?.skip) params.append('skip', String(options.skip));

      const response = await fetch(
        `${getApiBase()}/api/integrations/outlook/emails?${params.toString()}`,
        {
          headers: getHeaders(this.orgId),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch emails: ${response.statusText}`);
      }

      const data = await response.json();
      return data.emails || [];
    } catch (error) {
      console.error('[Integrations] Error fetching Outlook emails:', error);
      return [];
    }
  }

  /**
   * Fetch user's Outlook calendar events
   */
  async getOutlookCalendar(options?: {
    top?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<IntegrationEvent[]> {
    try {
      const params = new URLSearchParams();
      if (options?.top) params.append('top', String(options.top));
      if (options?.startDate) params.append('start_date', options.startDate);
      if (options?.endDate) params.append('end_date', options.endDate);

      const response = await fetch(
        `${getApiBase()}/api/integrations/outlook/calendar?${params.toString()}`,
        {
          headers: getHeaders(this.orgId),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch calendar: ${response.statusText}`,
        );
      }

      const data = await response.json();
      return data.events || [];
    } catch (error) {
      console.error('[Integrations] Error fetching Outlook calendar:', error);
      return [];
    }
  }

  /**
   * Fetch user profile from Outlook
   */
  async getOutlookProfile(): Promise<IntegrationProfile | null> {
    try {
      const response = await fetch(
        `${getApiBase()}/api/integrations/outlook/profile`,
        {
          headers: getHeaders(this.orgId),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${response.statusText}`);
      }

      const data = await response.json();
      return data.profile || null;
    } catch (error) {
      console.error('[Integrations] Error fetching profile:', error);
      return null;
    }
  }

  /**
   * Send email via Outlook
   */
  async sendOutlookEmail(email: {
    to: string | string[];
    subject: string;
    body: string;
    isHtml?: boolean;
  }): Promise<boolean> {
    try {
      const response = await fetch(
        `${getApiBase()}/api/integrations/outlook/send-email`,
        {
          method: 'POST',
          headers: getHeaders(this.orgId),
          body: JSON.stringify({
            to: Array.isArray(email.to) ? email.to : [email.to],
            subject: email.subject,
            body: email.body,
            isHtml: email.isHtml || false,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to send email: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('[Integrations] Error sending email:', error);
      return false;
    }
  }

  /**
   * Create calendar event in Outlook
   */
  async createOutlookEvent(event: {
    subject: string;
    start: string;
    end: string;
    location?: string;
    attendees?: string[];
    description?: string;
  }): Promise<IntegrationEvent | null> {
    try {
      const response = await fetch(
        `${getApiBase()}/api/integrations/outlook/create-event`,
        {
          method: 'POST',
          headers: getHeaders(this.orgId),
          body: JSON.stringify(event),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to create event: ${response.statusText}`);
      }

      const data = await response.json();
      return data.event || null;
    } catch (error) {
      console.error('[Integrations] Error creating event:', error);
      return null;
    }
  }

  /**
   * Fetch Teams messages from a channel
   */
  async getTeamsMessages(
    teamId: string,
    channelId: string,
    options?: { top?: number },
  ): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        team_id: teamId,
        channel_id: channelId,
      });

      if (options?.top) params.append('top', String(options.top));

      const response = await fetch(
        `${getApiBase()}/api/integrations/teams/messages?${params.toString()}`,
        {
          headers: getHeaders(this.orgId),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch Teams messages: ${response.statusText}`,
        );
      }

      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('[Integrations] Error fetching Teams messages:', error);
      return [];
    }
  }

  /**
   * Get integration status
   */
  async getStatus(userId?: string): Promise<IntegrationStatus | null> {
    try {
      const params = new URLSearchParams();
      if (userId) params.append('user_id', userId);

      const response = await fetch(
        `${getApiBase()}/api/integrations/status?${params.toString()}`,
        {
          headers: getHeaders(this.orgId),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to get status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[Integrations] Error getting status:', error);
      return null;
    }
  }

  /**
   * Logout from integrations
   */
  async logout(userId?: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${getApiBase()}/api/integrations/logout`,
        {
          method: 'POST',
          headers: getHeaders(this.orgId),
          body: JSON.stringify({ user_id: userId }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to logout: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('[Integrations] Error during logout:', error);
      return false;
    }
  }

  /**
   * Check if Outlook is configured
   */
  async isConfigured(): Promise<boolean> {
    try {
      const response = await fetch(
        `${getApiBase()}/api/integrations/test`,
        {
          headers: getHeaders(this.orgId),
        },
      );

      const data = await response.json();
      return data.azure_configured === true;
    } catch {
      return false;
    }
  }
}

/**
 * Create a singleton instance (default)
 */
let defaultService: IntegrationService;

export function getIntegrationService(
  orgId?: string,
): IntegrationService {
  if (!defaultService) {
    defaultService = new IntegrationService(orgId);
  }
  return defaultService;
}

/**
 * React Hook for using integration service
 * Usage in component:
 * const { emails, loading, error } = useIntegrationEmails();
 */
export function useIntegrationService(orgId?: string) {
  return getIntegrationService(orgId);
}

/**
 * React Hook for Outlook emails
 */
export async function useOutlookEmails(
  options?: { top?: number; skip?: number },
) {
  const service = getIntegrationService();

  try {
    const emails = await service.getOutlookEmails(options);
    return {
      emails,
      loading: false,
      error: null,
    };
  } catch (error) {
    return {
      emails: [],
      loading: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * React Hook for Outlook calendar
 */
export async function useOutlookCalendar(options?: {
  top?: number;
  startDate?: string;
  endDate?: string;
}) {
  const service = getIntegrationService();

  try {
    const events = await service.getOutlookCalendar(options);
    return {
      events,
      loading: false,
      error: null,
    };
  } catch (error) {
    return {
      events: [],
      loading: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Export all utilities
 */
export default {
  IntegrationService,
  getIntegrationService,
  useIntegrationService,
  useOutlookEmails,
  useOutlookCalendar,
};
