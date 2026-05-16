/**
 * echoComposeService.ts
 * ----------------------------------------------------------------------------
 * Drives the COMPOSE mode. Posts the current composition snapshot + an
 * optional refinement to the Anthropic API via the property's secure
 * Railway proxy (the proxy from William's Echo AI³ prior work).
 *
 * Why a proxy:
 *   The Anthropic API key MUST NOT live in the browser bundle. The
 *   proxy server holds the key and applies per-property rate limits +
 *   audit logging. The proxy URL is read from the LUCCCA app config.
 *
 * Output contract:
 *   The model is instructed to emit a strict JSON object matching
 *   ComposeResponseSchema. We validate before passing back. On schema
 *   mismatch we throw — the UI surfaces a "couldn't parse" error and
 *   offers Retry.
 * ----------------------------------------------------------------------------
 */

import type { PropertyItem } from '../BanquetMenuBuilder.types';
import type { CompositionSnapshot } from '../hooks/useMenuComposition';
import { lookupItemsByIds } from './echoEmbeddingService';
import { getEchoProxyConfig } from './echoProxyConfig';

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export interface ComposeSuggestion {
  id: string;
  item: PropertyItem;
  targetSectionId: string;
  targetSectionLabel: string;
  reasoning: string;
  expectedImpact?: {
    priceDeltaPerGuest?: number;
    fillsGap?: string;
  };
}

export interface ComposeResult {
  suggestions: ComposeSuggestion[];
  summary: string;
}

interface ComposeRequest {
  composition: CompositionSnapshot;
  refinement?: string;
  context?: unknown;
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

export async function runEchoCompose(req: ComposeRequest): Promise<ComposeResult> {
  const { proxyUrl, propertyApiKey } = await getEchoProxyConfig();
  if (!proxyUrl) {
    throw new Error('Echo proxy URL is not configured for this property.');
  }

  const prompt = buildComposePrompt(req);

  const response = await fetch(`${proxyUrl}/v1/echo/compose`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(propertyApiKey ? { 'X-Property-Key': propertyApiKey } : {}),
    },
    body: JSON.stringify({
      mode: 'compose',
      messages: [
        { role: 'system', content: COMPOSE_SYSTEM },
        { role: 'user', content: prompt },
      ],
      // Proxy will inject model selection; client only signals intent.
      intent: 'compose_suggestions',
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Echo compose failed (${response.status}): ${text || response.statusText}`);
  }

  const payload = (await response.json()) as { content: string };
  const parsed = parseComposeResponse(payload.content);

  // Resolve item ids to full PropertyItem snapshots
  const itemIds = parsed.suggestions.map((s) => s.itemId);
  const itemsById = await lookupItemsByIds(itemIds);

  const suggestions: ComposeSuggestion[] = parsed.suggestions
    .map((s, idx) => {
      const item = itemsById[s.itemId];
      if (!item) return null;
      const sectionRef = resolveSection(req.composition, s.sectionKindOrId);
      return {
        id: `compose-${Date.now()}-${idx}`,
        item,
        targetSectionId: sectionRef.id,
        targetSectionLabel: sectionRef.label,
        reasoning: s.reasoning,
        expectedImpact: s.expectedImpact,
      } satisfies ComposeSuggestion;
    })
    .filter((x): x is ComposeSuggestion => x !== null);

  return {
    suggestions,
    summary: parsed.summary,
  };
}

// ----------------------------------------------------------------------------
// Prompt construction
// ----------------------------------------------------------------------------

const COMPOSE_SYSTEM = `You are Echo, an operational intelligence companion to a working chef.
You help compose banquet menus. You have decades of culinary judgment encoded
in your responses. Your suggestions are grounded, specific, and respect the
chef's constraints. You do not invent items — you select from the property's
existing item library, identifying each by its itemId.

Output ONLY a JSON object. No prose outside the JSON. The schema is:
{
  "summary": string,
  "suggestions": [
    {
      "itemId": string,
      "sectionKindOrId": string,
      "reasoning": string (1-2 sentences),
      "expectedImpact": {
        "priceDeltaPerGuest": number | null,
        "fillsGap": string | null
      }
    }
  ]
}
Limit to 4 suggestions. Order by impact, highest first.`;

function buildComposePrompt(req: ComposeRequest): string {
  const c = req.composition;
  const lines: string[] = [];
  lines.push(`Event: ${c.eventType}, ${c.guestCount} guests`);
  lines.push(`Budget: ${c.budgetPerGuest.toFixed(2)}/guest (currency: ${c.currency})`);
  lines.push(`Current per-guest cost: ${c.perGuestCost.toFixed(2)}`);
  lines.push('');

  lines.push('Current sections and items:');
  for (const section of c.sections) {
    lines.push(`  [${section.kind}] ${section.name} (${section.items.length} items)`);
    for (const it of section.items.slice(0, 8)) {
      lines.push(`    - ${it.itemId} :: ${it.name}`);
    }
    if (section.items.length > 8) {
      lines.push(`    ...and ${section.items.length - 8} more`);
    }
  }
  lines.push('');

  if (c.dietaryGaps && c.dietaryGaps.length > 0) {
    lines.push('Dietary gaps detected:');
    for (const g of c.dietaryGaps) lines.push(`  - ${g}`);
    lines.push('');
  }

  lines.push('Available items in library (you may suggest only from these):');
  for (const it of c.libraryItems.slice(0, 200)) {
    const tags = (it.dietaryTags ?? []).join(',');
    lines.push(`  ${it.id} :: ${it.name} [${tags}] (~$${it.indicativePerGuest?.toFixed(2) ?? '?'}/g)`);
  }
  lines.push('');

  if (req.refinement) {
    lines.push(`Chef's refinement: ${req.refinement}`);
  } else {
    lines.push(
      'No refinement — propose the highest-impact additions for this event right now.',
    );
  }

  // Optional context (e.g., a critique finding being fixed)
  if (req.context && typeof req.context === 'object') {
    const ctx = req.context as { fixForFinding?: { title?: string; body?: string } };
    if (ctx.fixForFinding) {
      lines.push('');
      lines.push(`This compose request is to address: ${ctx.fixForFinding.title}`);
      if (ctx.fixForFinding.body) lines.push(`  Detail: ${ctx.fixForFinding.body}`);
    }
  }

  return lines.join('\n');
}

// ----------------------------------------------------------------------------
// Response parsing
// ----------------------------------------------------------------------------

interface RawSuggestion {
  itemId: string;
  sectionKindOrId: string;
  reasoning: string;
  expectedImpact?: {
    priceDeltaPerGuest?: number | null;
    fillsGap?: string | null;
  };
}

interface ParsedComposeResponse {
  summary: string;
  suggestions: RawSuggestion[];
}

function parseComposeResponse(raw: string): ParsedComposeResponse {
  const cleaned = stripCodeFences(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Echo returned non-JSON content. Try refining your request.');
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('suggestions' in parsed) ||
    !Array.isArray((parsed as { suggestions: unknown }).suggestions)
  ) {
    throw new Error('Echo response did not match expected schema.');
  }

  const obj = parsed as { summary?: string; suggestions: unknown[] };
  const summary = typeof obj.summary === 'string' ? obj.summary : '';
  const suggestions = obj.suggestions
    .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
    .map((s) => ({
      itemId: String(s.itemId ?? ''),
      sectionKindOrId: String(s.sectionKindOrId ?? 'other'),
      reasoning: String(s.reasoning ?? ''),
      expectedImpact: normalizeImpact(s.expectedImpact),
    }))
    .filter((s) => s.itemId);

  return { summary, suggestions };
}

function normalizeImpact(raw: unknown): RawSuggestion['expectedImpact'] {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as { priceDeltaPerGuest?: unknown; fillsGap?: unknown };
  const out: NonNullable<RawSuggestion['expectedImpact']> = {};
  if (typeof r.priceDeltaPerGuest === 'number') {
    out.priceDeltaPerGuest = r.priceDeltaPerGuest;
  }
  if (typeof r.fillsGap === 'string') {
    out.fillsGap = r.fillsGap;
  }
  return Object.keys(out).length ? out : undefined;
}

function stripCodeFences(raw: string): string {
  return raw
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
}

// ----------------------------------------------------------------------------
// Section resolution
// ----------------------------------------------------------------------------

function resolveSection(
  composition: CompositionSnapshot,
  kindOrId: string,
): { id: string; label: string } {
  // Try exact id match first
  const byId = composition.sections.find((s) => s.id === kindOrId);
  if (byId) return { id: byId.id, label: byId.name };

  // Try kind match
  const byKind = composition.sections.find((s) => s.kind === kindOrId);
  if (byKind) return { id: byKind.id, label: byKind.name };

  // Fallback: first section
  const fallback = composition.sections[0];
  return fallback
    ? { id: fallback.id, label: fallback.name }
    : { id: '', label: kindOrId };
}
