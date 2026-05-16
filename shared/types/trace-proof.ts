/**
 * Phase 7.4 - System-Wide Proof View Types
 * Extended trace types for investor-proof causality reconstruction
 */

import { TraceLedgerEntry } from "./trace-ledger";

/**
 * Business Action: A single atomic operation in the system
 */
export interface BusinessAction {
  id: string;
  timestamp: string;
  entityType: string;
  entityId: string;
  actionType: string; // "create", "update", "delete", "approve", "reject", etc.
  source: string; // Module/system that initiated the action
  summary: string;
  
  // Role eligibility and enforcement
  roleEligibility: {
    requiredRoles: string[];
    requiredPermissions: string[];
    eligibleUsers: Array<{
      userId: string;
      userName: string;
      roles: string[];
      permissions: string[];
    }>;
    actualActor: {
      userId: string;
      userName: string;
      roles: string[];
      permissions: string[];
      timestamp: string;
    } | null;
    enforcementResult: {
      allowed: boolean;
      reason?: string;
      checkedAt: string;
    };
  };
  
  // Causality chain
  causality: {
    upstream: CausalityLink[]; // What led to this action
    downstream: CausalityLink[]; // What this action caused
  };
  
  // Downstream effects and deltas
  effects: {
    system: string;
    entityType: string;
    entityId: string;
    delta: Record<string, {
      before: unknown;
      after: unknown;
      changeType: "created" | "updated" | "deleted" | "linked";
    }>;
    timestamp: string;
  }[];
  
  // Original trace ledger entry
  traceEntry: TraceLedgerEntry;
}

/**
 * Causality Link: Connection between actions in the causality chain
 */
export interface CausalityLink {
  actionId: string;
  entityType: string;
  entityId: string;
  relationship: "triggers" | "enables" | "requires" | "validates" | "depends_on";
  timestamp: string;
  summary: string;
}

/**
 * Proof View Query: Request for causality chain reconstruction
 */
export interface ProofViewQuery {
  actionId?: string;
  entityType?: string;
  entityId?: string;
  includeUpstream?: boolean;
  includeDownstream?: boolean;
  includeRoleInfo?: boolean;
  includeEffects?: boolean;
  maxDepth?: number;
}

/**
 * Proof View Response: Complete causality reconstruction
 */
export interface ProofViewResponse {
  rootAction: BusinessAction;
  causalityChain: {
    upstream: BusinessAction[];
    downstream: BusinessAction[];
  };
  roleEnforcement: {
    actionId: string;
    eligibility: BusinessAction["roleEligibility"];
  }[];
  downstreamEffects: BusinessAction["effects"][];
  reconstructedAt: string;
}
