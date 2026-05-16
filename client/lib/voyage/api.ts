/**
 * ===========================================================================
 * Voyage API client
 * ===========================================================================
 * Layer:    Voyage
 * Status:   STUB
 * Phase:    2
 *
 * Purpose:  Typed fetch wrappers for /api/echo-resonance/voyage/*.
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import type { Trip, TripBrief, LivingPlan, PlanBlock, MapView } from '../../../shared/types/voyage';

const BASE = '/api/echo-resonance/voyage';

export async function getTrip(tripId: string): Promise<Trip> {
  throw new Error('Not implemented (Phase 2)');
}

export async function getCurrentBrief(tripId: string): Promise<TripBrief | null> {
  throw new Error('Not implemented (Phase 2)');
}

export async function getPlan(tripId: string): Promise<LivingPlan> {
  throw new Error('Not implemented (Phase 2)');
}

export async function addBlock(tripId: string, block: Omit<PlanBlock, 'id' | 'proposedAt'>): Promise<PlanBlock> {
  throw new Error('Not implemented (Phase 2)');
}

export async function setBlockClass(blockId: string, klass: 'confirmed' | 'held' | 'suggested'): Promise<PlanBlock> {
  throw new Error('Not implemented (Phase 2)');
}

export async function dismissBlock(blockId: string, reason?: string): Promise<void> {
  throw new Error('Not implemented (Phase 2)');
}

export async function getMap(tripId: string): Promise<MapView> {
  throw new Error('Not implemented (Phase 2)');
}
