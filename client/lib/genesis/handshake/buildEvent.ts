/**
 * Event Builder for Genesis Handshake Contract
 * Wraps orchestrator outputs into GenesisEventBase compliant events
 */

import type { GenesisEventBase } from "@/../shared/types/genesis-events";
import type { CombinedProcurementPlan } from "@/../shared/types/genesis-orchestrator";
import type { ProcurementPlan } from "@/../shared/types/genesis-procurement";
import { generateIdempotencyKey, generateCausationId } from "./idempotency";

interface EventActor {
  userId?: string;
  role?: string;
  system?: string;
}

/**
 * Build a genesis procurement plan generated event
 */
export function buildProcurementPlanEvent(
  plan: ProcurementPlan,
  actor: EventActor,
  explainText: string,
): any {
  const idemKey = generateIdempotencyKey("PROCUREMENT_PLAN_GENERATED");

  return {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    eventType: "genesis:procurement_plan_generated",
    idempotencyKey: idemKey.key,
    correlationId: idemKey.correlationId,
    causationId: generateCausationId(),
    timestamp: new Date().toISOString(),
    actor,
    propertyId: plan.propertyId,
    outletScope: [], // Will be set by caller if needed
    explain: explainText,
    payload: {
      planId: plan.planId,
      totalLines: plan.totalLineCount,
      totalValue: plan.totalValue,
      vendorCount: plan.vendorCount,
      idempotencyChecksum: plan.idempotencyChecksum,
    },
  };
}

/**
 * Build a vendor drops updated event
 */
export function buildVendorDropsEvent(
  planId: string,
  dropCount: number,
  vendorCount: number,
  actor: EventActor,
  explainText: string,
  propertyId: string,
): any {
  const idemKey = generateIdempotencyKey("VENDOR_DROPS_UPDATED");

  return {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    eventType: "genesis:vendor_drops_updated",
    idempotencyKey: idemKey.key,
    correlationId: idemKey.correlationId,
    causationId: generateCausationId(),
    timestamp: new Date().toISOString(),
    actor,
    propertyId,
    outletScope: [],
    explain: explainText,
    payload: {
      planId,
      dropCount,
      vendorCount,
    },
  };
}

/**
 * Build an Aurum journal draft created event
 */
export function buildAurumDraftEvent(
  draftCount: number,
  totalValue: number,
  actor: EventActor,
  explainText: string,
  propertyId: string,
  planId?: string,
): any {
  const idemKey = generateIdempotencyKey("AURUM_DRAFT_CREATED");

  return {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    eventType: "aurum:journal_draft_created",
    idempotencyKey: idemKey.key,
    correlationId: idemKey.correlationId,
    causationId: generateCausationId(),
    timestamp: new Date().toISOString(),
    actor,
    propertyId,
    outletScope: [],
    explain: explainText,
    payload: {
      planId: planId || "",
      draftCount,
      totalValue,
    },
  };
}

/**
 * Build a config updated event
 */
export function buildConfigUpdatedEvent(
  propertyId: string,
  changeCount: number,
  affectedOutlets: string[],
  actor: EventActor,
  explainText: string,
): any {
  const idemKey = generateIdempotencyKey("CONFIG_UPDATED");

  return {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    eventType: "genesis:config_updated",
    idempotencyKey: idemKey.key,
    correlationId: idemKey.correlationId,
    causationId: generateCausationId(),
    timestamp: new Date().toISOString(),
    actor,
    propertyId,
    outletScope: affectedOutlets,
    explain: explainText,
    payload: {
      changeCount,
      affectedOutlets,
    },
  };
}

/**
 * Build a reward issued event
 */
export function buildRewardIssuedEvent(
  userId: string,
  points: number,
  kind: string,
  actor: EventActor,
  explainText: string,
  propertyId: string,
): any {
  const idemKey = generateIdempotencyKey("REWARD_ISSUED");

  return {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    eventType: "genesis:reward_issued",
    idempotencyKey: idemKey.key,
    correlationId: idemKey.correlationId,
    causationId: generateCausationId(),
    timestamp: new Date().toISOString(),
    actor,
    propertyId,
    outletScope: [],
    explain: explainText,
    payload: {
      userId,
      points,
      kind,
    },
  };
}

/**
 * Build a generic Genesis event
 */
export function buildGenesisEvent(
  eventType: string,
  propertyId: string,
  payload: any,
  actor: EventActor,
  explainText: string,
  outletScope: string[] = [],
): any {
  const idemKey = generateIdempotencyKey(eventType.toUpperCase());

  return {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    eventType,
    idempotencyKey: idemKey.key,
    correlationId: idemKey.correlationId,
    causationId: generateCausationId(),
    timestamp: new Date().toISOString(),
    actor,
    propertyId,
    outletScope,
    explain: explainText,
    payload,
  };
}
