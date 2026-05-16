/**
 * ===========================================================================
 * Atrium API client
 * ===========================================================================
 * Layer:    Atrium
 * Status:   STUB
 * Phase:    5
 *
 * Purpose:  Typed fetch wrappers for /api/echo-resonance/atrium/*.
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import type { Venue, VenuePage, MediaAsset } from '../../../shared/types/atrium';

const BASE = '/api/echo-resonance/atrium';

export async function getVenuePage(venueId: string): Promise<VenuePage> {
  throw new Error('Not implemented (Phase 5)');
}

export async function listVenuesForProperty(): Promise<Venue[]> {
  throw new Error('Not implemented (Phase 5)');
}

export async function getMediaAsset(assetId: string): Promise<MediaAsset> {
  throw new Error('Not implemented (Phase 5)');
}

export async function recordAssetView(assetId: string, durationMs: number): Promise<void> {
  throw new Error('Not implemented (Phase 5)');
}
