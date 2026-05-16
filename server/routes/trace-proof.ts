/**
 * Phase 7.4 - Trace Proof API
 * Endpoints for investor-proof causality chain reconstruction
 */

import { Router, Request, Response } from "express";
import type {
  ProofViewQuery,
  ProofViewResponse,
  BusinessAction,
  CausalityLink,
} from "@shared/types/trace-proof";
import { TraceLedgerEntry } from "@shared/types/trace-ledger";
import { jwtAuthMiddleware, requireRole } from "../middleware/auth-jwt";
import { TraceLedgerService } from "../services/trace-ledger-service";

const router = Router();
const traceLedgerService = new TraceLedgerService();
const TRACE_PROOF_ROLES = [
  "admin",
  "superadmin",
  "owner",
  "co-owner",
  "board-chair",
  "board-member",
  "investor",
  "ceo",
  "coo",
  "cfo",
  "cio",
  "cto",
  "cro",
  "vp-operations",
  "vp-food-beverage",
];

/**
 * Reconstruct causality chain for a business action
 * This is a proof view - all data must be trace-backed
 */
router.get(
  "/api/trace-proof",
  jwtAuthMiddleware,
  requireRole(TRACE_PROOF_ROLES),
  async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    if (!orgId) {
      return res.status(400).json({
        error: "Missing org context",
      });
    }

    const query: ProofViewQuery = {
      actionId: req.query.actionId as string | undefined,
      entityType: req.query.entityType as string | undefined,
      entityId: req.query.entityId as string | undefined,
      includeUpstream: req.query.includeUpstream !== "false",
      includeDownstream: req.query.includeDownstream !== "false",
      includeRoleInfo: req.query.includeRoleInfo !== "false",
      includeEffects: req.query.includeEffects !== "false",
      maxDepth: req.query.maxDepth ? parseInt(req.query.maxDepth as string, 10) : 10,
    };

    if (!query.actionId && !query.entityId) {
      return res.status(400).json({
        error: "Either actionId or entityId must be provided",
      });
    }

    // In a real implementation, this would query the TraceLedger database
    // For now, we'll reconstruct from available trace data
    const proofView = await reconstructProofView(orgId, query);

    res.json(proofView);
  } catch (error) {
    console.error("[TRACE-PROOF] Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to reconstruct proof view",
    });
  }
  }
);

/**
 * Get all business actions for an entity
 */
router.get(
  "/api/trace-proof/actions",
  jwtAuthMiddleware,
  requireRole(TRACE_PROOF_ROLES),
  async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    if (!orgId) {
      return res.status(400).json({
        error: "Missing org context",
      });
    }

    const entityType = req.query.entityType as string;
    const entityId = req.query.entityId as string;

    if (!entityType || !entityId) {
      return res.status(400).json({
        error: "entityType and entityId are required",
      });
    }

    // Query trace ledger for all actions related to this entity
    const actions = await getBusinessActionsForEntity(orgId, entityType, entityId);

    res.json({ actions });
  } catch (error) {
    console.error("[TRACE-PROOF] Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to get business actions",
    });
  }
  }
);

/**
 * Reconstruct proof view from trace data
 * This function builds the complete causality chain
 */
async function reconstructProofView(
  orgId: string,
  query: ProofViewQuery,
): Promise<ProofViewResponse> {
  // Find the root action
  let rootAction: BusinessAction;
  
  if (query.actionId) {
    const action = await getBusinessActionById(orgId, query.actionId);
    if (!action) {
      throw new Error(`Action not found: ${query.actionId}`);
    }
    rootAction = action;
  } else if (query.entityType && query.entityId) {
    // Get the most recent action for this entity
    const actions = await getBusinessActionsForEntity(orgId, query.entityType, query.entityId);
    if (actions.length === 0) {
      throw new Error(`No actions found for ${query.entityType}:${query.entityId}`);
    }
    rootAction = actions[0]; // Most recent
  } else {
    throw new Error("Cannot determine root action");
  }

  // Reconstruct causality chain
  const causalityChain = {
    upstream: query.includeUpstream
      ? await reconstructUpstreamChain(orgId, rootAction, query.maxDepth || 10)
      : [],
    downstream: query.includeDownstream
      ? await reconstructDownstreamChain(orgId, rootAction, query.maxDepth || 10)
      : [],
  };

  // Collect role enforcement info
  const roleEnforcement = query.includeRoleInfo
    ? await collectRoleEnforcement([rootAction, ...causalityChain.upstream, ...causalityChain.downstream])
    : [];

  // Collect downstream effects
  const downstreamEffects = query.includeEffects
    ? await collectDownstreamEffects([rootAction, ...causalityChain.downstream])
    : [];

  return {
    rootAction,
    causalityChain,
    roleEnforcement,
    downstreamEffects,
    reconstructedAt: new Date().toISOString(),
  };
}

/**
 * Get a business action by ID
 * In production, this would query the TraceLedger
 */
async function getBusinessActionById(
  orgId: string,
  actionId: string,
): Promise<BusinessAction | null> {
  const entry = await traceLedgerService.getById(orgId, actionId);
  if (!entry) {
    return null;
  }

  return mapTraceEntryToBusinessAction(entry);
}

/**
 * Get all business actions for an entity
 */
async function getBusinessActionsForEntity(
  orgId: string,
  entityType: string,
  entityId: string,
): Promise<BusinessAction[]> {
  const entries = await traceLedgerService.listByEntity(orgId, entityType, entityId, 100);
  return entries.map(mapTraceEntryToBusinessAction);
}

/**
 * Reconstruct upstream causality chain
 */
async function reconstructUpstreamChain(
  orgId: string,
  action: BusinessAction,
  maxDepth: number,
): Promise<BusinessAction[]> {
  const sourceRef = action.traceEntry.sourceRef;
  if (!sourceRef) {
    return [];
  }

  const entries = await traceLedgerService.listBySourceRef(orgId, sourceRef, 500);
  const sorted = entries
    .filter((entry) => entry.id !== action.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const upstream = sorted.filter(
    (entry) => new Date(entry.createdAt).getTime() <= new Date(action.timestamp).getTime(),
  );

  return upstream.slice(-maxDepth).map(mapTraceEntryToBusinessAction);
}

/**
 * Reconstruct downstream causality chain
 */
async function reconstructDownstreamChain(
  orgId: string,
  action: BusinessAction,
  maxDepth: number,
): Promise<BusinessAction[]> {
  const sourceRef = action.traceEntry.sourceRef;
  const downstreamFromSourceRef = sourceRef
    ? await traceLedgerService.listBySourceRef(orgId, sourceRef, 500)
    : [];

  const impliedEntities = extractDownstreamEntities(action.traceEntry);
  const impliedEntries = await loadDownstreamImpliedEntries(orgId, impliedEntities);

  const combined = [...downstreamFromSourceRef, ...impliedEntries]
    .filter((entry) => entry.id !== action.id)
    .filter(
      (entry, index, arr) =>
        arr.findIndex((candidate) => candidate.id === entry.id) === index,
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const downstream = combined.filter(
    (entry) => new Date(entry.createdAt).getTime() >= new Date(action.timestamp).getTime(),
  );

  return downstream.slice(0, maxDepth).map(mapTraceEntryToBusinessAction);
}

/**
 * Collect role enforcement information for actions
 */
async function collectRoleEnforcement(
  actions: BusinessAction[],
): Promise<ProofViewResponse["roleEnforcement"]> {
  return actions.map((action) => ({
    actionId: action.id,
    eligibility: action.roleEligibility,
  }));
}

/**
 * Collect downstream effects for actions
 */
async function collectDownstreamEffects(
  actions: BusinessAction[],
): Promise<BusinessAction["effects"][]> {
  return actions.map((action) => action.effects).filter((effects) => effects.length > 0);
}

function mapTraceEntryToBusinessAction(entry: TraceLedgerEntry): BusinessAction {
  const payload = entry.payload as Record<string, any>;
  const actor = payload.actor || null;

  return {
    id: entry.id,
    timestamp: entry.createdAt,
    entityType: entry.entityType,
    entityId: entry.entityId,
    actionType: payload.actionType || payload.action || "unknown",
    source: payload.sourcePanel || payload.source || "unknown",
    summary:
      payload.summary ||
      `${entry.entityType} ${entry.entityId} action (${payload.actionType || payload.action || "unknown"})`,
    roleEligibility: {
      requiredRoles: payload.requiredRoles || [],
      requiredPermissions: payload.requiredPermissions || [],
      eligibleUsers: payload.eligibleUsers || [],
      actualActor: actor
        ? {
            userId: actor.userId,
            userName: actor.userName || actor.userId,
            roles: actor.roles || [actor.role].filter(Boolean),
            permissions: actor.permissions || [],
            timestamp: payload.timestamp || entry.createdAt,
          }
        : null,
      enforcementResult: {
        allowed: payload.enforcement?.allowed ?? true,
        reason: payload.enforcement?.reason || "Trace-backed action",
        checkedAt: payload.enforcement?.checkedAt || payload.timestamp || entry.createdAt,
      },
    },
    causality: {
      upstream: [],
      downstream: [],
    },
    effects: mapDownstreamImplicationsToEffects(payload.downstreamImplications, payload),
    traceEntry: entry,
  };
}

function mapDownstreamImplicationsToEffects(
  implications: Array<any> | undefined,
  payload: Record<string, any>,
): BusinessAction["effects"] {
  if (!implications || implications.length === 0) {
    return [];
  }

  return implications.map((implication) => ({
    system: payload.domain || "unknown",
    entityType: implication.entityType || "unknown",
    entityId: implication.entityId || "unknown",
    delta: {
      impact: {
        before: null,
        after: implication.impact || implication,
        changeType: "linked",
      },
    },
    timestamp: payload.timestamp || new Date().toISOString(),
  }));
}

function extractDownstreamEntities(entry: TraceLedgerEntry): Array<{
  entityType: string;
  entityId: string;
}> {
  const payload = entry.payload as Record<string, any>;
  const downstream = payload.downstreamImplications || [];
  return downstream
    .map((implication: any) => ({
      entityType: implication.entityType,
      entityId: implication.entityId,
    }))
    .filter((implication: any) => implication.entityType && implication.entityId);
}

async function loadDownstreamImpliedEntries(
  orgId: string,
  implications: Array<{ entityType: string; entityId: string }>,
): Promise<TraceLedgerEntry[]> {
  if (implications.length === 0) {
    return [];
  }

  const entries: TraceLedgerEntry[] = [];
  for (const implication of implications) {
    const implied = await traceLedgerService.listByEntity(
      orgId,
      implication.entityType,
      implication.entityId,
      25,
    );
    entries.push(...implied);
  }

  return entries;
}

export default router;
