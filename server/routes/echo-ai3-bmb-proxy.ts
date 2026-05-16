/**
 * echo-ai3-bmb-proxy.ts
 * ----------------------------------------------------------------------------
 * Echo AI³ proxy routes for the Banquet Menu Builder.
 *
 * The BMB Pkg 4 services (echoComposeService, echoCritiqueService,
 * echoGenerateService) call this proxy at /api/echo-ai3/v1/echo/{compose,
 * critique, generate-intent, generate, lookup-items} expecting
 * `{ content: string }` payloads containing JSON the client parses.
 *
 * Two modes:
 *
 *   1. REAL forwarding mode — active when EITHER auth scheme is configured.
 *      The handler forwards the request body to `${URL}/v1/echo/<route>`
 *      with the matching auth header attached, and forwards the response.
 *
 *      Two coexistent auth schemes (matches the sister /app config):
 *
 *        a. LUCCCA_ECHO_RAILWAY_URL          base URL
 *           LUCCCA_ECHO_RAILWAY_AUTH_HEADER  full header, e.g. "Bearer <token>"
 *           → Authorization: <header value>
 *
 *        b. ECHO_PROXY_URL                   base URL (legacy)
 *           ECHO_API_TOKEN                   token only
 *           → X-Echo-Token: <token>
 *
 *      LUCCCA_* takes precedence when both are set.
 *
 *   2. MOCK fallback mode — active when neither scheme has both vars set.
 *      Returns canned responses whose shapes match what the client parsers
 *      expect, so demo / dev works end-to-end with no external deps. Each
 *      mock response is flagged ({ mocked: true }) so callers and
 *      dashboards can tell.
 *
 * The active mode (and which auth scheme it picked) is logged once at
 * first request.
 * ----------------------------------------------------------------------------
 */

import { Router, type Request, type Response } from 'express';
import { logger } from '../lib/logger';

const router = Router();

interface UpstreamConfig {
  url: string;
  scheme: 'railway-bearer' | 'legacy-echo-token';
  headerName: 'Authorization' | 'X-Echo-Token';
  headerValue: string;
}

function resolveUpstream(): UpstreamConfig | null {
  const railwayUrl = (process.env.LUCCCA_ECHO_RAILWAY_URL ?? '').replace(/\/$/, '');
  const railwayAuth = process.env.LUCCCA_ECHO_RAILWAY_AUTH_HEADER ?? '';
  if (railwayUrl && railwayAuth) {
    return {
      url: railwayUrl,
      scheme: 'railway-bearer',
      headerName: 'Authorization',
      headerValue: railwayAuth,
    };
  }

  const legacyUrl = (process.env.ECHO_PROXY_URL ?? '').replace(/\/$/, '');
  const legacyToken = process.env.ECHO_API_TOKEN ?? '';
  if (legacyUrl && legacyToken) {
    return {
      url: legacyUrl,
      scheme: 'legacy-echo-token',
      headerName: 'X-Echo-Token',
      headerValue: legacyToken,
    };
  }

  return null;
}

const upstream = resolveUpstream();
const FORWARD_TIMEOUT_MS = Number(process.env.LUCCCA_ECHO_PROXY_TIMEOUT_MS ?? 30_000);

const isRealMode = upstream !== null;
let modeLogged = false;

function logModeOnce() {
  if (modeLogged) return;
  modeLogged = true;
  if (upstream) {
    logger.info('[echo-bmb-proxy] forwarding to upstream', {
      url: upstream.url,
      scheme: upstream.scheme,
    });
  } else {
    logger.warn(
      '[echo-bmb-proxy] running in MOCK mode — set ' +
        'LUCCCA_ECHO_RAILWAY_URL + LUCCCA_ECHO_RAILWAY_AUTH_HEADER ' +
        '(or legacy ECHO_PROXY_URL + ECHO_API_TOKEN) to enable real forwarding',
    );
  }
}

async function forward(route: string, req: Request, res: Response): Promise<void> {
  logModeOnce();
  if (!upstream) {
    // Should never happen — caller checks isRealMode first — but typed-narrow safely.
    res.status(500).json({ error: 'upstream not configured' });
    return;
  }
  const target = `${upstream.url}/v1/echo/${route}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FORWARD_TIMEOUT_MS);
  try {
    const upstreamRes = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [upstream.headerName]: upstream.headerValue,
      },
      body: JSON.stringify(req.body ?? {}),
      signal: controller.signal,
    });
    const text = await upstreamRes.text();
    res.status(upstreamRes.status);
    const contentType = upstreamRes.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    res.send(text);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[echo-bmb-proxy] forward to ${route} failed`, { error: message });
    res.status(502).json({ error: 'upstream proxy failed', detail: message });
  } finally {
    clearTimeout(timeout);
  }
}

// ----------------------------------------------------------------------------
// /v1/echo/compose
// ----------------------------------------------------------------------------

router.post('/v1/echo/compose', async (req: Request, res: Response) => {
  if (isRealMode) return forward('compose', req, res);
  logModeOnce();
  const content = JSON.stringify({
    mocked: true,
    summary:
      'Mocked Echo compose: three suggestions based on the partial menu and event type.',
    suggestions: [
      {
        itemId: 'mock-suggestion-1',
        rationale: 'Pairs well with the existing cold selection; keeps station load even.',
        sectionHint: 'cold-selection',
      },
      {
        itemId: 'mock-suggestion-2',
        rationale: 'Adds a vegetarian-friendly entrée to balance the dietary distribution.',
        sectionHint: 'plated-entree',
      },
      {
        itemId: 'mock-suggestion-3',
        rationale: 'Strong margin contributor; lifts the weighted margin without cost spike.',
        sectionHint: 'station',
      },
    ],
  });
  res.json({ content });
});

// ----------------------------------------------------------------------------
// /v1/echo/critique
// ----------------------------------------------------------------------------

router.post('/v1/echo/critique', async (req: Request, res: Response) => {
  if (isRealMode) return forward('critique', req, res);
  logModeOnce();
  const content = JSON.stringify({
    mocked: true,
    headline: 'Solid foundation with two areas to tighten before review.',
    findings: [
      {
        severity: 'warning',
        category: 'pricing',
        message:
          'Per-guest cost is 12% above the budgetPerGuest target. Consider swapping the carving station for a less-expensive entrée.',
        affectsInstanceIds: [],
      },
      {
        severity: 'info',
        category: 'dietary',
        message:
          'No keto-friendly entrée detected. If your guest list includes keto requests, add at least one.',
        affectsInstanceIds: [],
      },
      {
        severity: 'info',
        category: 'operational',
        message:
          'Sauté and grill stations are evenly loaded. No bottleneck risk at current guest count.',
        affectsInstanceIds: [],
      },
    ],
  });
  res.json({ content });
});

// ----------------------------------------------------------------------------
// /v1/echo/generate-intent
// ----------------------------------------------------------------------------

router.post('/v1/echo/generate-intent', async (req: Request, res: Response) => {
  if (isRealMode) return forward('generate-intent', req, res);
  logModeOnce();
  const content = JSON.stringify({
    mocked: true,
    eventType: 'wedding-reception',
    guestCount: 150,
    serviceStyle: 'plated',
    budgetPerGuest: 95,
    dietaryConstraints: ['vegetarian', 'gluten-free'],
    cuisineHints: ['mediterranean', 'modern-american'],
    notes: 'Mock intent — set LUCCCA_ECHO_RAILWAY_URL to enable real generation.',
  });
  res.json({ content });
});

// ----------------------------------------------------------------------------
// /v1/echo/generate
// ----------------------------------------------------------------------------

router.post('/v1/echo/generate', async (req: Request, res: Response) => {
  if (isRealMode) return forward('generate', req, res);
  logModeOnce();
  const content = JSON.stringify({
    mocked: true,
    summary: 'Mocked menu generation: 4 sections sized for 150 guests, plated service.',
    sections: [
      {
        kind: 'cold-selection',
        name: 'Cold Selection',
        items: [
          {
            itemId: 'mock-gen-cold-1',
            name: 'Heirloom Tomato & Burrata',
            rationale: 'Light starter; vegetarian-friendly.',
          },
        ],
      },
      {
        kind: 'salad',
        name: 'Salad',
        items: [
          {
            itemId: 'mock-gen-salad-1',
            name: 'Citrus Fennel Salad',
            rationale: 'Bright palate cleanser before the entrée.',
          },
        ],
      },
      {
        kind: 'plated-entree',
        name: 'Entrée',
        items: [
          {
            itemId: 'mock-gen-entree-1',
            name: 'Pan-Seared Branzino',
            rationale: 'Pescatarian-safe; pairs with the Mediterranean direction.',
          },
          {
            itemId: 'mock-gen-entree-2',
            name: 'Cauliflower Steak (GF, V)',
            rationale: 'Covers the gluten-free + vegetarian constraints.',
          },
        ],
      },
      {
        kind: 'dessert',
        name: 'Dessert',
        items: [
          {
            itemId: 'mock-gen-dessert-1',
            name: 'Olive Oil Cake',
            rationale: 'Modern; ties the Mediterranean theme together.',
          },
        ],
      },
    ],
  });
  res.json({ content });
});

// ----------------------------------------------------------------------------
// /v1/echo/lookup-items
// ----------------------------------------------------------------------------

router.post('/v1/echo/lookup-items', async (req: Request, res: Response) => {
  if (isRealMode) return forward('lookup-items', req, res);
  logModeOnce();
  const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
  // Mock: return empty snapshots for unknown ids. The real proxy would
  // return PropertyItem snapshots from the property's library.
  const items = ids.map((id) => ({ itemId: id, found: false }));
  res.json({ items, mocked: true });
});

export default router;
