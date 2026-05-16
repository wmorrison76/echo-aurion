/**
 * ===========================================================================
 * Echo AI² proxy client — upstream LLM + voice connection
 * ===========================================================================
 * Layer:    Substrate (operational glue)
 * Status:   IMPLEMENTED
 * Phase:    3
 *
 * Purpose:  Thin HTTP client for the Echo AI² (Anthropic-side / voice-side)
 *           proxy. Lives in this TypeScript repo; the actual upstream lives
 *           in the sister Python `/app` repo. Auth schemes coexist:
 *             - LUCCCA_ECHO_RAILWAY_URL + LUCCCA_ECHO_RAILWAY_TOKEN
 *               (Bearer, preferred)
 *             - ECHO_PROXY_URL + ECHO_API_TOKEN (X-Echo-Token, legacy)
 *
 *           When neither is configured the client returns a sentinel result
 *           so callers can fall back to deterministic templating without
 *           crashing the demo path.
 *
 *           Phase 3 surface:
 *             - composeText(prompt, options): LLM completion via proxy
 *             - voiceSynth(text, voiceId): TTS URL via proxy (Phase 3+)
 *             - voiceSession(args): bidi audio session bootstrap
 *
 * Tenet alignment:
 *   - Tenet 8 (forbidden uses): proxy calls never carry raw guest PII.
 *     Callers pass abstracted prompts (preferences + occasions, not names
 *     + emails) so the upstream never receives sensitive identifiers.
 *   - Tenet 2 (audio evaporates): voiceSynth returns ephemeral URLs;
 *     the proxy's storage policy holds them ≤ 24h.
 * ===========================================================================
 */

import { logger } from './logger';

export interface EchoAi2Config {
  baseUrl: string;
  authScheme: 'bearer' | 'x-echo-token';
  token: string;
}

export interface EchoAi2ComposeOptions {
  /** Approximate desired length in characters; soft hint to upstream. */
  targetLength?: number;
  /** Voice / tone hint to upstream. Default 'aurion-warm'. */
  voiceTone?: string;
  /** Hard timeout in ms. Default 8000. */
  timeoutMs?: number;
}

export interface EchoAi2VoiceSessionArgs {
  sessionId: string;
  voiceProfileId: string;
  context: string;
}

/**
 * Resolve config from env. Returns null when not configured (caller
 * falls back to deterministic templating).
 */
export function resolveEchoAi2Config(): EchoAi2Config | null {
  if (process.env.LUCCCA_ECHO_RAILWAY_URL && process.env.LUCCCA_ECHO_RAILWAY_TOKEN) {
    return {
      baseUrl: process.env.LUCCCA_ECHO_RAILWAY_URL,
      authScheme: 'bearer',
      token: process.env.LUCCCA_ECHO_RAILWAY_TOKEN,
    };
  }
  if (process.env.ECHO_PROXY_URL && process.env.ECHO_API_TOKEN) {
    return {
      baseUrl: process.env.ECHO_PROXY_URL,
      authScheme: 'x-echo-token',
      token: process.env.ECHO_API_TOKEN,
    };
  }
  return null;
}

function authHeaders(config: EchoAi2Config): Record<string, string> {
  if (config.authScheme === 'bearer') {
    return { authorization: `Bearer ${config.token}` };
  }
  return { 'x-echo-token': config.token };
}

export class EchoAi2Client {
  /**
   * Compose text via upstream LLM. When proxy is unconfigured, returns null
   * so caller can fall back to deterministic templating.
   */
  async composeText(
    prompt: string,
    options: EchoAi2ComposeOptions = {},
  ): Promise<string | null> {
    const config = resolveEchoAi2Config();
    if (!config) {
      logger.debug('[EchoAi2Client] proxy not configured — caller should fall back');
      return null;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 8_000);

    try {
      const res = await fetch(`${config.baseUrl}/v1/compose`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'content-type': 'application/json', ...authHeaders(config) },
        body: JSON.stringify({
          prompt,
          targetLength: options.targetLength ?? 600,
          voiceTone: options.voiceTone ?? 'aurion-warm',
        }),
      });
      if (!res.ok) {
        logger.warn('[EchoAi2Client] composeText non-2xx', { status: res.status });
        return null;
      }
      const body = (await res.json().catch(() => null)) as { text?: string } | null;
      return body?.text ?? null;
    } catch (err) {
      logger.warn('[EchoAi2Client] composeText failed (falling back)', {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Request a TTS URL for a given text + voice profile. Phase 3 ships the
   * shape; production wires the real provider.
   */
  async voiceSynth(text: string, voiceProfileId: string): Promise<string | null> {
    const config = resolveEchoAi2Config();
    if (!config) return null;
    try {
      const res = await fetch(`${config.baseUrl}/v1/voice/synth`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authHeaders(config) },
        body: JSON.stringify({ text, voiceProfileId }),
      });
      if (!res.ok) return null;
      const body = (await res.json().catch(() => null)) as { url?: string } | null;
      return body?.url ?? null;
    } catch (err) {
      logger.warn('[EchoAi2Client] voiceSynth failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  /**
   * Bootstrap a bidi voice session. Returns a connection token that the
   * client uses to open the WebRTC / WebSocket channel directly to the
   * provider. The proxy mediates auth + rate limits.
   */
  async voiceSession(
    args: EchoAi2VoiceSessionArgs,
  ): Promise<{ connectionToken: string; expiresAt: string } | null> {
    const config = resolveEchoAi2Config();
    if (!config) return null;
    try {
      const res = await fetch(`${config.baseUrl}/v1/voice/session`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authHeaders(config) },
        body: JSON.stringify(args),
      });
      if (!res.ok) return null;
      return (await res.json().catch(() => null)) as
        | { connectionToken: string; expiresAt: string }
        | null;
    } catch (err) {
      logger.warn('[EchoAi2Client] voiceSession failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }
}

export const echoAi2Client = new EchoAi2Client();
