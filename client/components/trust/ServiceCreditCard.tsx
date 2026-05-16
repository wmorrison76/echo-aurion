/**
 * ===========================================================================
 * Service credit card - shows active credits and history
 * ===========================================================================
 * Layer:    Substrate: Trust
 * Status:   STUB
 * Phase:    5
 *
 * Purpose:  Guest sees credits issued to them. Triggers a small joy moment when an unsolicited credit appears.
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import * as React from 'react';
import type { ServiceCredit } from '../../../shared/types/trust';

export interface ServiceCreditCardProps {
  credit: ServiceCredit;
}

export const ServiceCreditCard: React.FC<ServiceCreditCardProps> = ({ credit }) => {
  return null;
};
