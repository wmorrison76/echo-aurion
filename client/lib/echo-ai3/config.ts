/**
 * Echo AI³ Configuration
 * Centralized configuration for the Echo AI³ sentient core
 */

export const EchoAI3Config = {
  // Proxy server configuration
  proxyUrl: import.meta.env.VITE_ECHO_PROXY_URL || process.env.ECHO_PROXY_URL || 'http://localhost:4000',
  apiToken: import.meta.env.VITE_ECHO_API_TOKEN || process.env.ECHO_API_TOKEN || 'local-dev-token',

  // Feature flags
  features: {
    voiceRecognition: true,
    textToSpeech: true,
    realTimeTelemetry: true,
    customCursor: true,
  },

  // Timeouts (in milliseconds)
  timeouts: {
    chat: 30000,          // Chat response timeout
    awareness: 20000,     // Awareness polling timeout
    telemetry: 15000,    // Telemetry fetch timeout
  },

  // Polling intervals
  polling: {
    awareness: 20000,     // Poll for awareness signals every 20s if WebSocket unavailable
    telemetry: 15000,    // Push telemetry every 15s via WebSocket
  },

  // API endpoints (relative to proxyUrl)
  endpoints: {
    chat: '/api/echo-ai3/chat',
    awareness: '/api/echo-ai3/awareness',
    action: '/api/echo-ai3/action',
    health: '/health',
  },

  // Authentication
  auth: {
    headerName: 'X-Echo-Token',
    tokenValue: () => EchoAI3Config.apiToken,
  },

  // Logging
  debug: process.env.NODE_ENV === 'development',
};

/**
 * Validate Echo AI³ configuration
 */
export function validateEchoAI3Config(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!EchoAI3Config.proxyUrl) {
    errors.push('VITE_ECHO_PROXY_URL or ECHO_PROXY_URL is not set');
  }

  if (!EchoAI3Config.apiToken || EchoAI3Config.apiToken === 'local-dev-token') {
    if (process.env.NODE_ENV === 'production') {
      errors.push('ECHO_API_TOKEN must be set in production');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get full proxy URL
 */
export function getProxyUrl(endpoint: string): string {
  const base = EchoAI3Config.proxyUrl.replace(/\/$/, '');
  return `${base}${endpoint}`;
}

/**
 * Get auth headers for proxy requests
 */
export function getEchoAuthHeaders(): Record<string, string> {
  return {
    [EchoAI3Config.auth.headerName]: EchoAI3Config.auth.tokenValue(),
  };
}
