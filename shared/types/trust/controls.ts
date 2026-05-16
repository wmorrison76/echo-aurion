/**
 * ===========================================================================
 * Guest privacy controls
 * ===========================================================================
 * Layer:    Substrate: Trust
 * Status:   STUB
 * Phase:    3
 *
 * Purpose:  Four guest-facing privacy controls per Tenet 5.
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import type { GuestId, ISODateTime } from '../base';

export interface GuestMemoryView {
  guestId: GuestId;
  generatedAt: ISODateTime;
  categories: GuestMemoryCategory[];
}

export interface GuestMemoryCategory {
  category: 'preferences' | 'occasions' | 'allergens' | 'amenity-affinity'
          | 'service-history' | 'communication-style';
  items: GuestMemoryItem[];
}

export interface GuestMemoryItem {
  id: string;
  description: string;
  source: 'stated-by-guest' | 'observed-by-staff' | 'inferred-by-aurion';
  capturedAt: ISODateTime;
  canForget: boolean;
}

export type PrivacyControl = 'review-memory' | 'pause-aurion' | 'delete-everything' | 'export-data';

export interface ControlAuditEntry {
  guestId: GuestId;
  control: PrivacyControl;
  invokedAt: ISODateTime;
  result: 'success' | 'partial' | 'failed';
  details?: string;
}
