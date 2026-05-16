/**
 * echoGenerateService.ts
 * ----------------------------------------------------------------------------
 * Drives the GENERATE mode. Takes a free-text brief and returns a complete
 * menu draft (sections + items + rationale).
 *
 * Two-stage pipeline:
 *   Stage 1: Extract structured intent from brief
 *     guestCount, budgetPerGuest, eventType, style, constraints, dietary
 *
 *   Stage 2: Compose the menu
 *     Given intent + the property's available items, produce sections
 *     and item selections.
 *
 *   Both stages happen via the same proxy endpoint with different
 *   intents. The proxy is responsible for routing to the model best
 *   suited to each task.
 * ----------------------------------------------------------------------------
 */

import { getEchoProxyConfig } from './echoProxyConfig';
import { fetchPropertyItemsForGenerate } from './echoEmbeddingService';

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export interface GeneratedMenuItem {
  /** Resolved PropertyItem id when matched, undefined when novel */
  itemId?: string;
  name: string;
  shortDescription?: string;
  dietaryTags?: string[];
  estimatedCostPerGuest?: number;
}

export interface GeneratedMenuSection {
  kind: string;
  label: string;
  items: GeneratedMenuItem[];
}

export interface GeneratedMenu {
  title: string;
  rationale?: string;
  eventType: string;
  guestCount: number;
  budgetPerGuest: number;
  estimatedPerGuest: number;
  sections: GeneratedMenuSection[];
}

interface GenerateRequest {
  brief: string;
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

export async function runEchoGenerate(req: GenerateRequest): Promise<GeneratedMenu> {
  // Stage 1: extract intent
  const intent = await extractIntent(req.brief);

  // Stage 2: compose menu
  const items = await fetchPropertyItemsForGenerate({
    eventType: intent.eventType,
    dietaryConstraints: intent.dietaryConstraints,
  });

  const composed = await composeMenuFromIntent(intent, items, req.brief);
  return composed;
}

// ----------------------------------------------------------------------------
// Stage 1 — Intent extraction
// ----------------------------------------------------------------------------

interface ParsedIntent {
  guestCount: number;
  budgetPerGuest: number;
  eventType: string;
  style: string;
  constraints: string[];
  dietaryConstraints: string[];
}

const INTENT_SYSTEM = `Extract structured event details from a chef's brief.
Output ONLY a JSON object:
{
  "guestCount": number,
  "budgetPerGuest": number,
  "eventType": string (one of: wedding, corporate_event, cocktail_reception, plated_dinner, buffet_dinner, gala, retreat, other),
  "style": string,
  "constraints": [string],
  "dietaryConstraints": [string]
}
If a field is unspecified in the brief, use sensible defaults: guestCount 100, budgetPerGuest 75, eventType "other".`;

async function extractIntent(brief: string): Promise<ParsedIntent> {
  const { proxyUrl, propertyApiKey } = await getEchoProxyConfig();
  if (!proxyUrl) {
    throw new Error('Echo proxy URL is not configured for this property.');
  }

  const response = await fetch(`${proxyUrl}/v1/echo/generate-intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(propertyApiKey ? { 'X-Property-Key': propertyApiKey } : {}),
    },
    body: JSON.stringify({
      mode: 'extract_intent',
      messages: [
        { role: 'system', content: INTENT_SYSTEM },
        { role: 'user', content: brief },
      ],
      intent: 'extract_intent',
    }),
  });

  if (!response.ok) {
    throw new Error(`Echo intent extraction failed (${response.status})`);
  }

  const payload = (await response.json()) as { content: string };
  return parseIntent(payload.content);
}

function parseIntent(raw: string): ParsedIntent {
  const cleaned = stripCodeFences(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Couldn't parse Echo's response. Try rephrasing the brief.");
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Unexpected response shape from Echo.');
  }
  const o = parsed as Record<string, unknown>;
  return {
    guestCount: typeof o.guestCount === 'number' ? o.guestCount : 100,
    budgetPerGuest: typeof o.budgetPerGuest === 'number' ? o.budgetPerGuest : 75,
    eventType: typeof o.eventType === 'string' ? o.eventType : 'other',
    style: typeof o.style === 'string' ? o.style : '',
    constraints: Array.isArray(o.constraints)
      ? o.constraints.filter((x): x is string => typeof x === 'string')
      : [],
    dietaryConstraints: Array.isArray(o.dietaryConstraints)
      ? o.dietaryConstraints.filter((x): x is string => typeof x === 'string')
      : [],
  };
}

// ----------------------------------------------------------------------------
// Stage 2 — Menu composition
// ----------------------------------------------------------------------------

const COMPOSE_SYSTEM = `You are Echo, composing a complete banquet menu from a chef's brief.
You have access to the property's item library — prefer those items when they
fit the brief. If a needed item type isn't in the library, you may propose a
novel item by name (omitting itemId).

Output ONLY a JSON object matching this schema:
{
  "title": string,
  "rationale": string (2-4 sentences explaining the menu's logic),
  "estimatedPerGuest": number,
  "sections": [
    {
      "kind": string (one of: canape, cold, hot, soup, salad, appetizer, entree, side, carving, station, dessert, bakery, beverage, other),
      "label": string,
      "items": [
        {
          "itemId": string | null,
          "name": string,
          "shortDescription": string,
          "dietaryTags": [string],
          "estimatedCostPerGuest": number
        }
      ]
    }
  ]
}
Honor the budget. Cover dietary constraints. Match the style. Keep section
counts appropriate to event type — a plated dinner has 4-5 sections, a
cocktail reception has 3-4 station sections.`;

async function composeMenuFromIntent(
  intent: ParsedIntent,
  availableItems: Array<{ id: string; name: string; dietaryTags?: string[]; perGuestCost?: number }>,
  originalBrief: string,
): Promise<GeneratedMenu> {
  const { proxyUrl, propertyApiKey } = await getEchoProxyConfig();
  if (!proxyUrl) {
    throw new Error('Echo proxy URL is not configured for this property.');
  }

  const userPrompt = buildComposeMenuPrompt(intent, availableItems, originalBrief);

  const response = await fetch(`${proxyUrl}/v1/echo/generate-menu`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(propertyApiKey ? { 'X-Property-Key': propertyApiKey } : {}),
    },
    body: JSON.stringify({
      mode: 'compose_menu',
      messages: [
        { role: 'system', content: COMPOSE_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      intent: 'compose_full_menu',
    }),
  });

  if (!response.ok) {
    throw new Error(`Echo menu composition failed (${response.status})`);
  }

  const payload = (await response.json()) as { content: string };
  return parseGeneratedMenu(payload.content, intent);
}

function buildComposeMenuPrompt(
  intent: ParsedIntent,
  items: Array<{ id: string; name: string; dietaryTags?: string[]; perGuestCost?: number }>,
  originalBrief: string,
): string {
  const lines: string[] = [];
  lines.push(`Original brief: ${originalBrief}`);
  lines.push('');
  lines.push('Extracted intent:');
  lines.push(`  Event type: ${intent.eventType}`);
  lines.push(`  Guest count: ${intent.guestCount}`);
  lines.push(`  Budget per guest: $${intent.budgetPerGuest.toFixed(2)}`);
  lines.push(`  Style: ${intent.style || '(unspecified)'}`);
  if (intent.constraints.length) {
    lines.push(`  Constraints: ${intent.constraints.join(', ')}`);
  }
  if (intent.dietaryConstraints.length) {
    lines.push(`  Dietary requirements: ${intent.dietaryConstraints.join(', ')}`);
  }
  lines.push('');
  lines.push(`Available items (${items.length}):`);
  for (const it of items.slice(0, 250)) {
    const tags = (it.dietaryTags ?? []).join(',');
    lines.push(`  ${it.id} :: ${it.name} [${tags}] (~$${(it.perGuestCost ?? 0).toFixed(2)}/g)`);
  }
  return lines.join('\n');
}

function parseGeneratedMenu(raw: string, intent: ParsedIntent): GeneratedMenu {
  const cleaned = stripCodeFences(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Echo returned a non-JSON menu. Try regenerating.");
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Unexpected menu shape from Echo.');
  }
  const o = parsed as Record<string, unknown>;
  const sectionsRaw = Array.isArray(o.sections) ? o.sections : [];

  const sections: GeneratedMenuSection[] = sectionsRaw
    .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
    .map((s) => {
      const itemsRaw = Array.isArray(s.items) ? s.items : [];
      return {
        kind: typeof s.kind === 'string' ? s.kind : 'other',
        label: typeof s.label === 'string' ? s.label : 'Section',
        items: itemsRaw
          .filter((i): i is Record<string, unknown> => typeof i === 'object' && i !== null)
          .map((i) => ({
            itemId: typeof i.itemId === 'string' && i.itemId ? i.itemId : undefined,
            name: typeof i.name === 'string' ? i.name : 'Untitled',
            shortDescription:
              typeof i.shortDescription === 'string' ? i.shortDescription : undefined,
            dietaryTags: Array.isArray(i.dietaryTags)
              ? i.dietaryTags.filter((x): x is string => typeof x === 'string')
              : undefined,
            estimatedCostPerGuest:
              typeof i.estimatedCostPerGuest === 'number' ? i.estimatedCostPerGuest : undefined,
          })),
      };
    });

  return {
    title: typeof o.title === 'string' ? o.title : 'Generated Menu',
    rationale: typeof o.rationale === 'string' ? o.rationale : undefined,
    eventType: intent.eventType,
    guestCount: intent.guestCount,
    budgetPerGuest: intent.budgetPerGuest,
    estimatedPerGuest:
      typeof o.estimatedPerGuest === 'number' ? o.estimatedPerGuest : intent.budgetPerGuest,
    sections,
  };
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function stripCodeFences(raw: string): string {
  return raw
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
}
