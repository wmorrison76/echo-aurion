/**
 * Banquet Menu Builder — server routes.
 *
 * Surfaces the BMB MongoDB repositories as REST endpoints. Each handler
 * dynamically imports the client-side repository module so the route file
 * doesn't need its own MongoDB plumbing — the same singleton client is
 * shared with the verifier scripts.
 *
 * Auth: every route requires a hydrated req.user (via requireAuth). The
 * authenticated user's id is recorded on writes so the audit trail
 * actually reflects who saved/published.
 *
 * Routes:
 *   GET    /items                       — list active items for a property
 *   GET    /items/search                — text search
 *   POST   /items/filter                — structured filter
 *   GET    /items/:itemId               — single item
 *   GET    /drafts                      — list drafts for a property
 *   GET    /drafts/:draftId             — fetch one draft
 *   PUT    /drafts/:draftId             — upsert a draft (autosave)
 *   DELETE /drafts/:draftId             — soft-delete
 */

import { Router, type Request, type Response, type NextFunction, json } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { logger } from '../lib/logger';

const router = Router();

router.use(requireAuth);

// ----------------------------------------------------------------------------
// Lazy-imported repositories. Each handler awaits the import on first call
// so MongoDB isn't touched at server boot. Cached after first import.
// ----------------------------------------------------------------------------

let repos:
  | typeof import('../../client/modules/BanquetMenuBuilder/data/repositories')
  | null = null;
async function getRepos() {
  if (!repos) {
    repos = await import('../../client/modules/BanquetMenuBuilder/data/repositories');
  }
  return repos;
}

// ----------------------------------------------------------------------------
// Validation schemas + tunables
// ----------------------------------------------------------------------------

const MAX_LIST_LIMIT = 500;
const MAX_SEARCH_LIMIT = 100;
const MAX_DRAFT_BODY_BYTES = 1_048_576; // 1 MB — drafts shouldn't be larger

// Property / item / draft IDs follow `${prefix}-${slug}-${suffix}` style
// (see client/modules/BanquetMenuBuilder/utils/idGeneration.ts). Restrict to
// safe characters so they cannot be smuggled into Mongo filters.
const SafeId = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9._-]+$/u, 'id must be alphanumeric with . _ -');

const ListQuery = z.object({
  propertyId: SafeId,
  limit: z.coerce.number().int().min(1).max(MAX_LIST_LIMIT).optional(),
});

const SearchQuery = z.object({
  propertyId: SafeId,
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(MAX_SEARCH_LIMIT).optional(),
});

const FilterBody = z.object({
  propertyId: SafeId,
  filters: z.record(z.string(), z.unknown()).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIST_LIMIT).optional(),
  skip: z.coerce.number().int().min(0).max(100_000).optional(),
});

const DraftListQuery = z.object({
  propertyId: SafeId,
  limit: z.coerce.number().int().min(1).max(MAX_LIST_LIMIT).optional(),
});

const DraftPathParams = z.object({ draftId: SafeId });

const DraftPutBody = z.object({
  propertyId: SafeId,
  draft: z.unknown(),
});

const DraftDeleteQuery = z.object({ propertyId: SafeId });

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function fail(res: Response, status: number, error: string, detail?: unknown) {
  return res.status(status).json({ error, ...(detail ? { detail } : {}) });
}

function reqUser(req: Request): { id: string; orgId?: string } {
  const u = (req as Request & { user?: { id?: string; org_id?: string } }).user ?? {};
  return { id: String(u.id ?? 'unknown'), orgId: u.org_id };
}

function logServerError(route: string, err: unknown, req: Request) {
  logger.error(`[bmb] ${route} failed`, {
    requestId: (req as Request & { id?: string }).id,
    user: reqUser(req).id,
    error: err instanceof Error ? err.message : String(err),
  });
}

// ----------------------------------------------------------------------------
// Items
// ----------------------------------------------------------------------------

router.get('/items', async (req: Request, res: Response) => {
  const parsed = ListQuery.safeParse(req.query);
  if (!parsed.success) return fail(res, 400, 'invalid query', parsed.error.flatten());
  const { propertyId, limit = 200 } = parsed.data;
  try {
    const { propertyItemRepository } = await getRepos();
    const items = await propertyItemRepository.listActive(propertyId, limit);
    res.json({ items, total: items.length });
  } catch (err) {
    logServerError('/items', err, req);
    fail(res, 500, 'item list failed');
  }
});

router.get('/items/search', async (req: Request, res: Response) => {
  const parsed = SearchQuery.safeParse(req.query);
  if (!parsed.success) return fail(res, 400, 'invalid query', parsed.error.flatten());
  const { propertyId, q, limit = 20 } = parsed.data;
  try {
    const { propertyItemRepository } = await getRepos();
    const items = await propertyItemRepository.searchByText(propertyId, q, limit);
    res.json({ items, total: items.length });
  } catch (err) {
    logServerError('/items/search', err, req);
    fail(res, 500, 'item search failed');
  }
});

router.post('/items/filter', async (req: Request, res: Response) => {
  const parsed = FilterBody.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, 'invalid body', parsed.error.flatten());
  const { propertyId, filters = {}, limit, skip } = parsed.data;
  try {
    const { propertyItemRepository } = await getRepos();
    const items = await propertyItemRepository.search(propertyId, filters, { limit, skip });
    const total = await propertyItemRepository.count(propertyId, filters);
    res.json({ items, total });
  } catch (err) {
    logServerError('/items/filter', err, req);
    fail(res, 500, 'item filter failed');
  }
});

router.get('/items/:itemId', async (req: Request, res: Response) => {
  const parsedQuery = z.object({ propertyId: SafeId }).safeParse(req.query);
  const parsedParams = z.object({ itemId: SafeId }).safeParse(req.params);
  if (!parsedQuery.success) return fail(res, 400, 'invalid query', parsedQuery.error.flatten());
  if (!parsedParams.success) return fail(res, 400, 'invalid path', parsedParams.error.flatten());
  const { propertyId } = parsedQuery.data;
  const { itemId } = parsedParams.data;
  try {
    const { propertyItemRepository } = await getRepos();
    const item = await propertyItemRepository.findById(propertyId, itemId);
    if (!item) return fail(res, 404, 'not found');
    res.json({ item });
  } catch (err) {
    logServerError('/items/:itemId', err, req);
    fail(res, 500, 'item fetch failed');
  }
});

// ----------------------------------------------------------------------------
// Drafts
// ----------------------------------------------------------------------------

router.get('/drafts', async (req: Request, res: Response) => {
  const parsed = DraftListQuery.safeParse(req.query);
  if (!parsed.success) return fail(res, 400, 'invalid query', parsed.error.flatten());
  const { propertyId, limit = 50 } = parsed.data;
  try {
    const { menuDraftRepository } = await getRepos();
    const drafts = await menuDraftRepository.listForProperty(propertyId, limit);
    res.json({ drafts, total: drafts.length });
  } catch (err) {
    logServerError('/drafts', err, req);
    fail(res, 500, 'draft list failed');
  }
});

router.get('/drafts/:draftId', async (req: Request, res: Response) => {
  const parsedQuery = z.object({ propertyId: SafeId }).safeParse(req.query);
  const parsedParams = DraftPathParams.safeParse(req.params);
  if (!parsedQuery.success) return fail(res, 400, 'invalid query', parsedQuery.error.flatten());
  if (!parsedParams.success) return fail(res, 400, 'invalid path', parsedParams.error.flatten());
  const { propertyId } = parsedQuery.data;
  const { draftId } = parsedParams.data;
  try {
    const { menuDraftRepository } = await getRepos();
    const draft = await menuDraftRepository.findById(propertyId, draftId);
    if (!draft) return fail(res, 404, 'not found');
    res.json({ draft });
  } catch (err) {
    logServerError('/drafts/:draftId GET', err, req);
    fail(res, 500, 'draft fetch failed');
  }
});

// PUT /drafts/:draftId carries a full draft payload. Cap at 1MB locally so a
// pathological client can't push 50MB through the global json() limit and
// blow up the menu_drafts collection.
router.put(
  '/drafts/:draftId',
  json({ limit: MAX_DRAFT_BODY_BYTES }),
  (err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err && (err as { type?: string }).type === 'entity.too.large') {
      return fail(res, 413, 'draft body exceeds 1MB');
    }
    return next(err);
  },
  async (req: Request, res: Response) => {
    const parsedParams = DraftPathParams.safeParse(req.params);
    if (!parsedParams.success) return fail(res, 400, 'invalid path', parsedParams.error.flatten());
    const parsedBody = DraftPutBody.safeParse(req.body);
    if (!parsedBody.success) return fail(res, 400, 'invalid body', parsedBody.error.flatten());
    const { draftId } = parsedParams.data;
    const { propertyId, draft } = parsedBody.data;
    const user = reqUser(req);
    try {
      const { menuDraftRepository } = await getRepos();
      const incoming =
        typeof draft === 'object' && draft !== null
          ? (draft as Record<string, unknown>)
          : {};
      const incomingSource =
        (incoming.sourceContext as Record<string, unknown> | undefined) ?? {};
      const saved = await menuDraftRepository.upsert(propertyId, draftId, {
        ...incoming,
        propertyId,
        draftId,
        // Always record the authenticated user — the client may still send
        // a placeholder userId, but the server is authoritative.
        sourceContext: { ...incomingSource, userId: user.id },
      } as Record<string, unknown>);
      res.json({ draft: saved });
    } catch (err) {
      logServerError('/drafts/:draftId PUT', err, req);
      fail(res, 500, 'draft save failed');
    }
  },
);

// ----------------------------------------------------------------------------
// Event history — recent comparable events for the cost-variance detector.
//
// Returns an empty list until the event-orchestration data layer is wired
// to BMB items (i.e. each completed event records per-item per-guest cost
// keyed by PropertyItem.itemId). Returning 200 + empty is intentional —
// the client treats that as "real source online, no comparables yet" and
// suppresses fake variance warnings, which is the production-correct
// behavior. Wire the real query when the schema bridge lands.
// ----------------------------------------------------------------------------

const EventHistoryQuery = z.object({
  propertyId: SafeId,
  eventType: z.string().min(1).max(100),
  guestCount: z.coerce.number().int().min(1).max(100_000),
  guestCountTolerance: z.coerce.number().min(0).max(1).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIST_LIMIT).optional(),
});

router.get('/event-history', async (req: Request, res: Response) => {
  const parsed = EventHistoryQuery.safeParse(req.query);
  if (!parsed.success) return fail(res, 400, 'invalid query', parsed.error.flatten());
  // No-data path. Returning [] is the right answer until the schema
  // bridge between event-orchestration completed events and PropertyItem
  // cost rows is implemented.
  res.json({ entries: [] });
});

router.delete('/drafts/:draftId', async (req: Request, res: Response) => {
  const parsedQuery = DraftDeleteQuery.safeParse(req.query);
  const parsedParams = DraftPathParams.safeParse(req.params);
  if (!parsedQuery.success) return fail(res, 400, 'invalid query', parsedQuery.error.flatten());
  if (!parsedParams.success) return fail(res, 400, 'invalid path', parsedParams.error.flatten());
  const { propertyId } = parsedQuery.data;
  const { draftId } = parsedParams.data;
  try {
    const { menuDraftRepository } = await getRepos();
    await menuDraftRepository.softDelete(propertyId, draftId);
    res.json({ ok: true });
  } catch (err) {
    logServerError('/drafts/:draftId DELETE', err, req);
    fail(res, 500, 'draft delete failed');
  }
});

export default router;
