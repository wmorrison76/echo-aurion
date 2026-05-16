import { useEffect } from 'react';
import { EchoAI3Config, validateEchoAI3Config } from './config';

/**
 * Initialize Echo AI³ global configuration
 * Call this once at app startup
 */
export function useEchoAI3Init(): void {
  useEffect(() => {
    // Validate configuration
    const { valid, errors } = validateEchoAI3Config();
    
    if (!valid) {
      console.warn('[Echo AI³] Configuration validation failed:', errors);
    } else {
      console.info('[Echo AI³] Configuration loaded successfully');
      console.debug('[Echo AI³] Proxy URL:', EchoAI3Config.proxyUrl);
    }

    // Set global window variables for backward compatibility
    if (typeof window !== 'undefined') {
      (window as any).ECHO_PROXY_URL = EchoAI3Config.proxyUrl;
      (window as any).ECHO_API_TOKEN = EchoAI3Config.apiToken;
    }

    // Log initialization
    if (EchoAI3Config.debug) {
      console.log('[Echo AI³] Initialized with config:', {
        proxyUrl: EchoAI3Config.proxyUrl,
        apiToken: '***' + EchoAI3Config.apiToken.slice(-4),
        features: EchoAI3Config.features,
      });
    }
  }, []);
}

/**
 * Simple hook to access Echo AI³ config
 */
export function useEchoConfig() {
  return EchoAI3Config;
}

/**
 * Hook to test Echo AI³ connectivity
 */
export function useEchoHealthCheck() {
  const [isHealthy, setIsHealthy] = React.useState<boolean | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const checkHealth = React.useCallback(async () => {
    try {
      const response = await fetch(`${EchoAI3Config.proxyUrl}/health`, {
        method: 'GET',
        timeout: EchoAI3Config.timeouts.telemetry,
      });
      setIsHealthy(response.ok);
      setError(null);
    } catch (err) {
      setIsHealthy(false);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [checkHealth]);

  return { isHealthy, error, checkHealth };
}

// Re-export React for the hook
import * as React from 'react';
