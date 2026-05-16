/**
 * echoCritiqueService.ts
 * ----------------------------------------------------------------------------
 * Drives the CRITIQUE mode. Combines the deterministic Pkg 3 signals
 * (already structured) with an LLM-augmented narrative pass that adds
 * "why this matters" prose and detects more nuanced issues (flavor
 * monotony, ingredient redundancy, structural balance).
 *
 * Two-pass design:
 *   Pass 1 (deterministic, instant):
 *     Translate the snapshot's existing signals into CritiqueFinding[].
 *     This guarantees baseline output even if the LLM call fails.
 *
 *   Pass 2 (LLM, async):
 *     Send the snapshot to the proxy with critique-specific system prompt.
 *     Merge any new findings, dedupe by id.
 *
 *   We currently do them in parallel and await both. If the LLM call
 *   times out (>15s), we return the deterministic findings alone.
 * ----------------------------------------------------------------------------
 */

import type { CompositionSnapshot } from '../hooks/useMenuComposition';
import { getEchoProxyConfig } from './echoProxyConfig';
import { detectCostVariance } from './costVarianceService';
import { predictWaste } from './wastePredictionService';
import { runContinuousAudit } from './continuousAuditService';

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export interface CritiqueFinding {
  id: string;
  category: 'pricing' | 'dietary' | 'operational' | 'balance' | 'other';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  body: string;
  /** Affected item names (for display) */
  affectedItemNames?: string[];
  /** Whether this finding can route to compose mode for a fix */
  canSuggestFix?: boolean;
  /** Source: deterministic signal pass-through, or LLM-generated */
  source: 'signal' | 'llm';
}

export interface CritiqueResult {
  headline: string;
  findings: CritiqueFinding[];
}

interface CritiqueRequest {
  composition: CompositionSnapshot;
}

const LLM_TIMEOUT_MS = 15_000;

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

export async function runEchoCritique(req: CritiqueRequest): Promise<CritiqueResult> {
  // Pass 1a — synchronous deterministic findings (instant)
  const deterministicFindings = buildDeterministicFindings(req.composition);

  // Pass 1b — AI enhancement signals (cost variance, waste, continuous audit)
  // Each is rules-based and runs locally; total budget < 50ms.
  const enhancementFindings = await buildEnhancementFindings(req.composition).catch(
    (err) => {
      console.warn('[echoCritique] enhancement pass failed; skipping', err);
      return [] as CritiqueFinding[];
    },
  );

  // Pass 2 — LLM augmentation (with timeout)
  const llmFindings = await runLlmCritiqueWithTimeout(req).catch((err) => {
    console.warn('[echoCritique] LLM pass failed; using deterministic only', err);
    return { headline: '', findings: [] as CritiqueFinding[] };
  });

  // Merge + dedupe
  const merged = dedupeFindings([
    ...deterministicFindings,
    ...enhancementFindings,
    ...llmFindings.findings,
  ]);

  const headline =
    llmFindings.headline ||
    summarizeFindings(merged, req.composition);

  return {
    headline,
    findings: merged,
  };
}

// ----------------------------------------------------------------------------
// AI Enhancement Layer integration
// ----------------------------------------------------------------------------

async function buildEnhancementFindings(
  snap: CompositionSnapshot,
): Promise<CritiqueFinding[]> {
  const out: CritiqueFinding[] = [];

  // Cost variance — top 3 by financial impact
  const variance = await detectCostVariance(snap);
  for (const v of variance.slice(0, 3)) {
    out.push({
      id: v.id,
      category: 'pricing',
      severity: v.severity === 'info' ? 'info' : v.severity,
      title: v.title,
      body: v.body,
      affectedItemNames: [v.itemName],
      canSuggestFix: true,
      source: 'signal',
    });
  }

  // Waste prediction — top 3 by estimated cost impact
  const waste = predictWaste(snap);
  for (const w of waste.slice(0, 3)) {
    out.push({
      id: w.id,
      category: 'operational',
      severity: w.severity,
      title: `Predicted ${w.predictedWastePct.toFixed(0)}% waste on ${w.itemName}`,
      body: `${w.reason}. Estimated cost impact: $${w.estimatedCostImpact.toFixed(0)}. ${w.recommendation}.`,
      affectedItemNames: [w.itemName],
      canSuggestFix: true,
      source: 'signal',
    });
  }

  // Continuous audit — surface critical + warning audit signals
  const audit = await runContinuousAudit(snap);
  for (const sig of audit.signals) {
    if (sig.status === 'passing') continue;
    out.push({
      id: sig.id,
      category: sig.category === 'compliance' ? 'dietary' : 'other',
      severity: sig.status === 'critical' ? 'critical' : 'warning',
      title: sig.title,
      body: sig.body + (sig.remediation ? ` — ${sig.remediation}` : ''),
      affectedItemNames: sig.affectedItems,
      canSuggestFix: false,
      source: 'signal',
    });
  }

  return out;
}

// ----------------------------------------------------------------------------
// Pass 1 — Deterministic
// ----------------------------------------------------------------------------

function buildDeterministicFindings(snap: CompositionSnapshot): CritiqueFinding[] {
  const out: CritiqueFinding[] = [];

  // Budget
  if (snap.perGuestCost > snap.budgetPerGuest && snap.budgetPerGuest > 0) {
    const over = snap.perGuestCost - snap.budgetPerGuest;
    out.push({
      id: 'pricing.over-budget',
      category: 'pricing',
      severity: over / snap.budgetPerGuest > 0.15 ? 'critical' : 'warning',
      title: 'Over budget',
      body: `Per-guest cost is $${over.toFixed(2)} above target. Consider swapping a high-margin item or reducing portion-priced selections.`,
      canSuggestFix: true,
      source: 'signal',
    });
  } else if (
    snap.budgetPerGuest > 0 &&
    snap.perGuestCost > 0 &&
    snap.perGuestCost / snap.budgetPerGuest < 0.6
  ) {
    out.push({
      id: 'pricing.under-utilized',
      category: 'pricing',
      severity: 'info',
      title: 'Significantly under budget',
      body: `Currently at ${Math.round((snap.perGuestCost / snap.budgetPerGuest) * 100)}% of budget. There's headroom to elevate one or two items.`,
      canSuggestFix: true,
      source: 'signal',
    });
  }

  // Dietary gaps
  for (const gap of snap.dietaryGaps ?? []) {
    out.push({
      id: `dietary.${gap.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      category: 'dietary',
      severity: 'warning',
      title: 'Dietary gap',
      body: gap,
      canSuggestFix: true,
      source: 'signal',
    });
  }

  // Operational
  if (snap.bottleneckStations && snap.bottleneckStations.length > 0) {
    out.push({
      id: 'operational.bottleneck',
      category: 'operational',
      severity: 'warning',
      title: `Station overload: ${snap.bottleneckStations.join(', ')}`,
      body: `These stations are carrying disproportionate load. Consider redistributing items across stations to avoid timing issues during service.`,
      canSuggestFix: false,
      source: 'signal',
    });
  }

  if (snap.loadLevel === 'extreme') {
    out.push({
      id: 'operational.extreme-load',
      category: 'operational',
      severity: 'critical',
      title: 'Extreme prep load',
      body: `Estimated ${snap.estimatedPrepHours.toFixed(0)}h prep — this menu is unusually labor-heavy. Verify staffing or simplify a section.`,
      canSuggestFix: false,
      source: 'signal',
    });
  }

  // Balance — empty sections
  const emptySections = snap.sections.filter((s) => s.items.length === 0);
  if (emptySections.length > 0) {
    out.push({
      id: 'balance.empty-sections',
      category: 'balance',
      severity: 'info',
      title: `${emptySections.length} empty section${emptySections.length === 1 ? '' : 's'}`,
      body: `Sections without items: ${emptySections.map((s) => s.name).join(', ')}. Either populate or remove them before publish.`,
      canSuggestFix: true,
      source: 'signal',
    });
  }

  return out;
}

// ----------------------------------------------------------------------------
// Pass 2 — LLM
// ----------------------------------------------------------------------------

async function runLlmCritiqueWithTimeout(
  req: CritiqueRequest,
): Promise<CritiqueResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    return await runLlmCritique(req, controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

const CRITIQUE_SYSTEM = `You are Echo, a senior chef-consultant reviewing a banquet menu in progress.
Your job is to surface non-obvious concerns: flavor monotony, ingredient
redundancy, textural imbalance, course-pacing issues, plating implications,
sourcing risk. Stay practical — every finding must reference specific items.

Output ONLY a JSON object, no prose outside it. Schema:
{
  "headline": string (one sentence summarizing menu state),
  "findings": [
    {
      "id": string (kebab-case stable),
      "category": "pricing" | "dietary" | "operational" | "balance" | "other",
      "severity": "info" | "warning" | "critical",
      "title": string,
      "body": string (1-3 sentences),
      "affectedItemNames": [string],
      "canSuggestFix": boolean
    }
  ]
}
Limit to 3-5 findings. Skip findings already obvious from price/dietary/load
signals — focus on the nuanced ones a deterministic engine would miss.`;

async function runLlmCritique(
  req: CritiqueRequest,
  signal: AbortSignal,
): Promise<CritiqueResult> {
  const { proxyUrl, propertyApiKey } = await getEchoProxyConfig();
  if (!proxyUrl) return { headline: '', findings: [] };

  const userPrompt = buildCritiquePrompt(req.composition);

  const response = await fetch(`${proxyUrl}/v1/echo/critique`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(propertyApiKey ? { 'X-Property-Key': propertyApiKey } : {}),
    },
    body: JSON.stringify({
      mode: 'critique',
      messages: [
        { role: 'system', content: CRITIQUE_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      intent: 'critique_menu',
    }),
    signal,
  });

  if (!response.ok) return { headline: '', findings: [] };

  const payload = (await response.json()) as { content: string };
  return parseCritiqueResponse(payload.content);
}

function buildCritiquePrompt(c: CompositionSnapshot): string {
  const lines: string[] = [];
  lines.push(`Event: ${c.eventType}, ${c.guestCount} guests`);
  lines.push(`Budget: $${c.budgetPerGuest.toFixed(2)}/guest, current: $${c.perGuestCost.toFixed(2)}/guest`);
  lines.push('');
  lines.push('Menu structure:');
  for (const section of c.sections) {
    lines.push(`  ${section.name} [${section.kind}]:`);
    for (const it of section.items) {
      const tags = (it.dietaryTags ?? []).join(',');
      lines.push(`    - ${it.name}${tags ? ` (${tags})` : ''}`);
    }
  }
  lines.push('');
  lines.push(`Operational load: ${c.loadLevel}, ${c.estimatedPrepHours.toFixed(1)}h prep estimated.`);
  if (c.bottleneckStations?.length) {
    lines.push(`Bottleneck stations: ${c.bottleneckStations.join(', ')}`);
  }
  return lines.join('\n');
}

/** @internal Exported for security/parser tests; not part of the public API. */
export function parseCritiqueResponse(raw: string): CritiqueResult {
  const cleaned = stripCodeFences(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { headline: '', findings: [] };
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return { headline: '', findings: [] };
  }
  const obj = parsed as { headline?: unknown; findings?: unknown };
  const headline = typeof obj.headline === 'string' ? obj.headline : '';
  if (!Array.isArray(obj.findings)) return { headline, findings: [] };

  const findings: CritiqueFinding[] = obj.findings
    .filter((f): f is Record<string, unknown> => typeof f === 'object' && f !== null)
    .map((f, idx) => {
      const cat = String(f.category ?? 'other');
      const validCat: CritiqueFinding['category'] =
        cat === 'pricing' || cat === 'dietary' || cat === 'operational' || cat === 'balance'
          ? cat
          : 'other';
      const sev = String(f.severity ?? 'info');
      const validSev: CritiqueFinding['severity'] =
        sev === 'warning' || sev === 'critical' ? sev : 'info';
      return {
        id: typeof f.id === 'string' ? f.id : `llm-${idx}`,
        category: validCat,
        severity: validSev,
        title: String(f.title ?? 'Observation'),
        body: String(f.body ?? ''),
        affectedItemNames: Array.isArray(f.affectedItemNames)
          ? f.affectedItemNames.filter((x): x is string => typeof x === 'string')
          : undefined,
        canSuggestFix: f.canSuggestFix === true,
        source: 'llm',
      } satisfies CritiqueFinding;
    })
    .filter((f) => f.title);

  return { headline, findings };
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function dedupeFindings(findings: CritiqueFinding[]): CritiqueFinding[] {
  const seen = new Set<string>();
  const out: CritiqueFinding[] = [];
  for (const f of findings) {
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    out.push(f);
  }
  // Order by severity then category
  const sevRank = { critical: 3, warning: 2, info: 1 } as const;
  out.sort((a, b) => sevRank[b.severity] - sevRank[a.severity]);
  return out;
}

function summarizeFindings(
  findings: CritiqueFinding[],
  snap: CompositionSnapshot,
): string {
  if (findings.length === 0) {
    return `Menu of ${snap.itemCount} items across ${snap.sections.length} sections — no issues detected.`;
  }
  const counts = {
    critical: findings.filter((f) => f.severity === 'critical').length,
    warning: findings.filter((f) => f.severity === 'warning').length,
    info: findings.filter((f) => f.severity === 'info').length,
  };
  const parts: string[] = [];
  if (counts.critical) parts.push(`${counts.critical} critical`);
  if (counts.warning) parts.push(`${counts.warning} warning${counts.warning === 1 ? '' : 's'}`);
  if (counts.info) parts.push(`${counts.info} note${counts.info === 1 ? '' : 's'}`);
  return `Menu review: ${parts.join(', ')}.`;
}

function stripCodeFences(raw: string): string {
  return raw
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
}
