/**
 * ===========================================================================
 * Pre-arrival forecast types
 * ===========================================================================
 * Layer:    Resonance
 * Status:   STUB
 * Phase:    1
 *
 * Purpose:  Predict guest entry score before arrival.
 *
 * Integrates with existing LUCCCA modules:
 *   - server/services/predictive-guest-experience-service.ts
 *   - server/services/predictive-guest-arrival-service.ts
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import type { UUID, ISODateTime } from '../base';

export interface ForecastInput {
  guestId: UUID;
  expectedArrivalAt: ISODateTime;
  partySize: number;
  bookingLeadTimeDays: number;
  lastVisitExitScore?: number;
  lastVisitDate?: ISODateTime;
  daysSinceLastVisit?: number;
  weather?: WeatherSignal;
  flightDelay?: FlightDelaySignal;
  traffic?: TrafficSignal;
  preArrivalVoiceSignals?: PreArrivalVoiceSummary;
}

export interface WeatherSignal {
  condition: 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow';
  tempF: number;
  isAdverse: boolean;
}

export interface FlightDelaySignal {
  scheduledArrival: ISODateTime;
  predictedArrival: ISODateTime;
  delayMinutes: number;
}

export interface TrafficSignal {
  routeMinutesNominal: number;
  routeMinutesPredicted: number;
  delayMinutes: number;
}

export interface PreArrivalVoiceSummary {
  conducted: boolean;
  durationSeconds?: number;
  detectedTone?: 'excited' | 'anxious' | 'neutral' | 'tired' | 'celebratory';
  occasionsMentioned?: string[];
  explicitRequests?: string[];
  energyEstimate?: number;
}

export interface ResonanceForecast {
  guestId: UUID;
  expectedArrivalAt: ISODateTime;
  predictedEntryScore: number;
  confidence: number;
  factors: ForecastFactor[];
  recommendedCascadeId?: UUID;
}

export interface ForecastFactor {
  name: string;
  impactDelta: number;
  evidence: string;
}
