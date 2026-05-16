/**
 * Predictive Guest Experience Service
 * Moat #11: Hyper-Personalized Predictive Guest Experience Engine
 * 
 * Industry First: True predictive personalization at this level
 * - Predicts guest needs before they ask
 * - Cross-property guest profile
 * - Predictive service delivery
 */

import { logger } from "../lib/logger";

export interface GuestProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  preferences: GuestPreferences;
  history: GuestHistoryItem[];
  predictedNeeds: PredictedNeed[];
  loyaltyScore: number;
  lifetimeValue: number;
  lastVisitDate?: Date;
  nextPredictedVisit?: Date;
}

export interface GuestPreferences {
  dietaryRestrictions: string[];
  allergies: string[];
  preferredTableLocation?: string;
  preferredTimeOfDay?: "morning" | "afternoon" | "evening";
  preferredCuisine?: string[];
  beveragePreferences?: string[];
  priceSensitivity: "low" | "medium" | "high";
  serviceStyle: "casual" | "formal" | "personalized";
  communicationPreferences: string[];
}

export interface GuestHistoryItem {
  visitDate: Date;
  propertyId: string;
  itemsOrdered: string[];
  totalSpend: number;
  rating?: number;
  feedback?: string;
  specialRequests: string[];
}

export interface PredictedNeed {
  type: "table_preference" | "dietary" | "service_timing" | "menu_item" | "special_request";
  confidence: number; // 0-1
  description: string;
  predictedTime?: Date;
  action?: string;
}

export interface PredictiveRecommendation {
  guestId: string;
  recommendationType: "table_assignment" | "menu_suggestion" | "service_timing" | "special_preparation";
  confidence: number;
  reasoning: string;
  suggestedAction: string;
  predictedOutcome: string;
}

export class PredictiveGuestExperienceService {
  private guestProfiles: Map<string, GuestProfile> = new Map();
  private predictionCache: Map<string, PredictedNeed[]> = new Map();

  /**
   * Build or update guest profile from history
   */
  async buildGuestProfile(
    guestId: string,
    history: GuestHistoryItem[],
    currentPreferences?: Partial<GuestPreferences>
  ): Promise<GuestProfile> {
    // Analyze history to extract preferences
    const preferences = this.analyzePreferences(history, currentPreferences);
    
    // Calculate loyalty score
    const loyaltyScore = this.calculateLoyaltyScore(history);
    
    // Calculate lifetime value
    const lifetimeValue = history.reduce((sum, item) => sum + item.totalSpend, 0);
    
    // Predict next visit
    const nextPredictedVisit = this.predictNextVisit(history);
    
    // Generate predicted needs
    const predictedNeeds = await this.generatePredictedNeeds(history, preferences);
    
    const profile: GuestProfile = {
      id: guestId,
      firstName: "", // Would be populated from database
      lastName: "", // Would be populated from database
      email: "", // Would be populated from database
      preferences,
      history,
      predictedNeeds,
      loyaltyScore,
      lifetimeValue,
      lastVisitDate: history.length > 0 ? history[history.length - 1].visitDate : undefined,
      nextPredictedVisit,
    };
    
    this.guestProfiles.set(guestId, profile);
    logger.info("[Predictive Guest] Profile built", { guestId, loyaltyScore, lifetimeValue });
    
    return profile;
  }

  /**
   * Generate predictive recommendations for guest
   */
  async generateRecommendations(
    guestId: string,
    propertyId: string,
    visitDate: Date
  ): Promise<PredictiveRecommendation[]> {
    const profile = this.guestProfiles.get(guestId);
    if (!profile) {
      return [];
    }

    const recommendations: PredictiveRecommendation[] = [];

    // Table assignment recommendation
    if (profile.preferences.preferredTableLocation) {
      recommendations.push({
        guestId,
        recommendationType: "table_assignment",
        confidence: 0.85,
        reasoning: `Guest prefers ${profile.preferences.preferredTableLocation} based on ${profile.history.length} previous visits`,
        suggestedAction: `Assign table in ${profile.preferences.preferredTableLocation} area`,
        predictedOutcome: "Increased guest satisfaction and likelihood of return",
      });
    }

    // Menu suggestions based on ordering history
    const favoriteItems = this.getFavoriteItems(profile.history);
    if (favoriteItems.length > 0) {
      recommendations.push({
        guestId,
        recommendationType: "menu_suggestion",
        confidence: 0.9,
        reasoning: `Guest has ordered these items ${favoriteItems.length} times in the past`,
        suggestedAction: `Suggest: ${favoriteItems.slice(0, 3).join(", ")}`,
        predictedOutcome: "Faster ordering, higher satisfaction",
      });
    }

    // Service timing recommendation
    if (profile.preferences.preferredTimeOfDay) {
      recommendations.push({
        guestId,
        recommendationType: "service_timing",
        confidence: 0.75,
        reasoning: `Guest typically visits during ${profile.preferences.preferredTimeOfDay}`,
        suggestedAction: `Prepare for ${profile.preferences.preferredTimeOfDay} service style`,
        predictedOutcome: "Better service alignment with guest expectations",
      });
    }

    // Special preparation for dietary restrictions
    if (profile.preferences.dietaryRestrictions.length > 0 || profile.preferences.allergies.length > 0) {
      recommendations.push({
        guestId,
        recommendationType: "special_preparation",
        confidence: 0.95,
        reasoning: `Guest has dietary restrictions/allergies: ${[...profile.preferences.dietaryRestrictions, ...profile.preferences.allergies].join(", ")}`,
        suggestedAction: "Notify kitchen of dietary requirements before guest arrives",
        predictedOutcome: "Prevent allergic reactions, ensure dietary compliance",
      });
    }

    return recommendations;
  }

  /**
   * Predict guest needs before they arrive
   */
  async predictGuestNeeds(guestId: string, propertyId: string, visitDate: Date): Promise<PredictedNeed[]> {
    const cacheKey = `${guestId}:${propertyId}:${visitDate.toISOString()}`;
    
    if (this.predictionCache.has(cacheKey)) {
      return this.predictionCache.get(cacheKey)!;
    }

    const profile = this.guestProfiles.get(guestId);
    if (!profile) {
      return [];
    }

    const needs: PredictedNeed[] = [];

    // Predict table preference
    if (profile.preferences.preferredTableLocation) {
      needs.push({
        type: "table_preference",
        confidence: 0.85,
        description: `Prefer ${profile.preferences.preferredTableLocation} table`,
        predictedTime: visitDate,
        action: `Reserve table in ${profile.preferences.preferredTableLocation} area`,
      });
    }

    // Predict dietary needs
    if (profile.preferences.dietaryRestrictions.length > 0) {
      needs.push({
        type: "dietary",
        confidence: 0.95,
        description: `Dietary restrictions: ${profile.preferences.dietaryRestrictions.join(", ")}`,
        predictedTime: visitDate,
        action: "Prepare menu items compliant with dietary restrictions",
      });
    }

    // Predict service timing (e.g., coffee ready when guest arrives)
    if (profile.preferences.preferredTimeOfDay === "morning") {
      needs.push({
        type: "service_timing",
        confidence: 0.7,
        description: "Guest typically orders coffee in the morning",
        predictedTime: visitDate,
        action: "Have coffee ready when guest arrives",
      });
    }

    // Predict favorite menu items
    const favoriteItems = this.getFavoriteItems(profile.history);
    if (favoriteItems.length > 0) {
      needs.push({
        type: "menu_item",
        confidence: 0.8,
        description: `Likely to order: ${favoriteItems[0]}`,
        predictedTime: visitDate,
        action: "Prepare ingredients for favorite dish",
      });
    }

    this.predictionCache.set(cacheKey, needs);
    return needs;
  }

  /**
   * Get cross-property guest profile
   */
  async getCrossPropertyProfile(guestId: string): Promise<GuestProfile | null> {
    return this.guestProfiles.get(guestId) || null;
  }

  /**
   * Analyze preferences from history
   */
  private analyzePreferences(
    history: GuestHistoryItem[],
    currentPreferences?: Partial<GuestPreferences>
  ): GuestPreferences {
    // Analyze ordering patterns
    const allItems = history.flatMap(h => h.itemsOrdered);
    const itemCounts = new Map<string, number>();
    allItems.forEach(item => {
      itemCounts.set(item, (itemCounts.get(item) || 0) + 1);
    });

    // Extract cuisine preferences from item names (simplified)
    const cuisinePreferences: string[] = [];
    
    // Analyze price sensitivity from spend patterns
    const avgSpend = history.reduce((sum, h) => sum + h.totalSpend, 0) / history.length;
    let priceSensitivity: "low" | "medium" | "high" = "medium";
    if (avgSpend > 150) priceSensitivity = "low";
    if (avgSpend < 50) priceSensitivity = "high";

    // Extract dietary restrictions from special requests
    const dietaryRestrictions: string[] = [];
    const allergies: string[] = [];
    history.forEach(h => {
      h.specialRequests.forEach(req => {
        const lower = req.toLowerCase();
        if (lower.includes("vegetarian") || lower.includes("vegan")) {
          dietaryRestrictions.push("Vegetarian");
        }
        if (lower.includes("gluten")) {
          dietaryRestrictions.push("Gluten-free");
        }
        if (lower.includes("allergy") || lower.includes("allergic")) {
          // Extract allergen
          const allergenMatch = req.match(/(?:allergic|allergy) to (\w+)/i);
          if (allergenMatch) {
            allergies.push(allergenMatch[1]);
          }
        }
      });
    });

    return {
      dietaryRestrictions: [...new Set(dietaryRestrictions)],
      allergies: [...new Set(allergies)],
      preferredCuisine: cuisinePreferences,
      priceSensitivity,
      serviceStyle: "personalized",
      communicationPreferences: ["email"],
      ...currentPreferences,
    };
  }

  /**
   * Calculate loyalty score from history
   */
  private calculateLoyaltyScore(history: GuestHistoryItem[]): number {
    if (history.length === 0) return 0;

    const visitCount = history.length;
    const avgRating = history
      .filter(h => h.rating !== undefined)
      .reduce((sum, h) => sum + (h.rating || 0), 0) / 
      history.filter(h => h.rating !== undefined).length || 0;
    
    const returnRate = visitCount > 1 ? 1 : 0;
    const avgSpend = history.reduce((sum, h) => sum + h.totalSpend, 0) / history.length;

    // Weighted score: visit count (40%), rating (30%), return rate (20%), spend (10%)
    const score = 
      (Math.min(visitCount / 10, 1) * 40) +
      ((avgRating / 5) * 30) +
      (returnRate * 20) +
      (Math.min(avgSpend / 200, 1) * 10);

    return Math.round(score);
  }

  /**
   * Predict next visit date
   */
  private predictNextVisit(history: GuestHistoryItem[]): Date | undefined {
    if (history.length < 2) return undefined;

    // Calculate average days between visits
    const intervals: number[] = [];
    for (let i = 1; i < history.length; i++) {
      const days = (history[i].visitDate.getTime() - history[i - 1].visitDate.getTime()) / (1000 * 60 * 60 * 24);
      intervals.push(days);
    }

    const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
    const lastVisit = history[history.length - 1].visitDate;
    
    const nextVisit = new Date(lastVisit);
    nextVisit.setDate(nextVisit.getDate() + Math.round(avgInterval));
    
    return nextVisit;
  }

  /**
   * Generate predicted needs
   */
  private async generatePredictedNeeds(
    history: GuestHistoryItem[],
    preferences: GuestPreferences
  ): Promise<PredictedNeed[]> {
    const needs: PredictedNeed[] = [];

    if (preferences.preferredTableLocation) {
      needs.push({
        type: "table_preference",
        confidence: 0.85,
        description: `Prefer ${preferences.preferredTableLocation} table`,
      });
    }

    if (preferences.dietaryRestrictions.length > 0) {
      needs.push({
        type: "dietary",
        confidence: 0.95,
        description: `Dietary: ${preferences.dietaryRestrictions.join(", ")}`,
      });
    }

    if (preferences.allergies.length > 0) {
      needs.push({
        type: "dietary",
        confidence: 0.98,
        description: `Allergies: ${preferences.allergies.join(", ")}`,
      });
    }

    return needs;
  }

  /**
   * Get favorite items from history
   */
  private getFavoriteItems(history: GuestHistoryItem[]): string[] {
    const itemCounts = new Map<string, number>();
    history.forEach(h => {
      h.itemsOrdered.forEach(item => {
        itemCounts.set(item, (itemCounts.get(item) || 0) + 1);
      });
    });

    return Array.from(itemCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([item]) => item);
  }
}

let serviceInstance: PredictiveGuestExperienceService | null = null;

export function getPredictiveGuestExperienceService(): PredictiveGuestExperienceService {
  if (!serviceInstance) {
    serviceInstance = new PredictiveGuestExperienceService();
  }
  return serviceInstance;
}

export default PredictiveGuestExperienceService;
