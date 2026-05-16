/**
 * echoProxyConfig.ts
 * ----------------------------------------------------------------------------
 * Resolves the Anthropic proxy configuration for the active property.
 *
 * Why this is its own file:
 *   - Some properties run their own self-hosted proxy
 *   - Some use the LUCCCA-managed shared proxy
 *   - All properties have a per-property API key the proxy validates
 *
 * Resolution order:
 *   1. window.LUCCA_ECHO_PROXY (runtime injection — set by host app)
 *   2. Property settings document (loaded at app boot)
 *   3. Environment fallback (Railway-deployed default)
 *
 * Security note:
 *   The "propertyApiKey" here is NOT the Anthropic API key. It's a
 *   property-scoped token the proxy uses to authenticate the request
 *   and apply per-property rate limits. The actual Anthropic key never
 *   leaves the proxy.
 * ----------------------------------------------------------------------------
 */

interface EchoProxyConfig {
  proxyUrl: string;
  propertyApiKey: string | null;
}

declare global {
  interface Window {
    LUCCA_ECHO_PROXY?: {
      proxyUrl?: string;
      propertyApiKey?: string;
    };
  }
}

let cached: EchoProxyConfig | null = null;

export async function getEchoProxyConfig(): Promise<EchoProxyConfig> {
  if (cached) return cached;

  // Layer 1 — runtime injection
  if (typeof window !== 'undefined' && window.LUCCA_ECHO_PROXY?.proxyUrl) {
    cached = {
      proxyUrl: window.LUCCA_ECHO_PROXY.proxyUrl,
      propertyApiKey: window.LUCCA_ECHO_PROXY.propertyApiKey ?? null,
    };
    return cached;
  }

  // Layer 2 — property settings (lazy import to avoid early load cost)
  try {
    const { propertySettingsRepository } = await import('../data/repositories');
    const settings = await propertySettingsRepository.getCurrent();
    const proxy = settings?.echoProxy;
    if (proxy?.proxyUrl) {
      cached = {
        proxyUrl: proxy.proxyUrl,
        propertyApiKey: proxy.propertyApiKey ?? null,
      };
      return cached;
    }
  } catch (err) {
    console.warn('[echoProxyConfig] property settings load failed', err);
  }

  // Layer 3 — environment fallback (set at build time)
  // Default to the in-repo proxy at /api/echo-ai3 so demo + dev work
  // without external config. The in-repo proxy currently mocks responses
  // (server/routes/echo-ai3-bmb-proxy.ts); it forwards to Railway once
  // the proxy contract is wired (Phase 2 in BACKLOG).
  const envUrl =
    typeof process !== 'undefined' && process.env
      ? process.env.VITE_ECHO_PROXY_URL ||
        process.env.NEXT_PUBLIC_ECHO_PROXY_URL ||
        '/api/echo-ai3'
      : '/api/echo-ai3';

  cached = {
    proxyUrl: envUrl,
    propertyApiKey: null,
  };
  return cached;
}

/**
 * Force a re-read of config — call when property switches or settings update.
 */
export function invalidateEchoProxyConfigCache(): void {
  cached = null;
}
