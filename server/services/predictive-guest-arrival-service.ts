/**
 * Predictive Guest Arrival & Service Orchestration Engine
 * Moat #26: Predictive Guest Arrival & Service Orchestration Engine
 * 
 * Industry First: Predicts guest arrivals and pre-orchestrates service
 * - Real-time arrival prediction (GPS, traffic, historical patterns)
 * - Pre-service orchestration (table setup, menu recommendations)
 * - Kitchen prep timing optimization
 * - Staff positioning optimization
 * - Multi-guest coordination
 */

import { logger } from "../lib/logger";

export interface GuestArrivalPrediction {
  guestId: string;
  reservationId: string;
  predictedArrivalTime: Date;
  confidence: number; // 0-1
  factors: ArrivalFactor[];
  currentLocation?: {
    latitude: number;
    longitude: number;
    distance: number; // miles
  };
}

export interface ArrivalFactor {
  type: "gps" | "traffic" | "historical" | "weather" | "event";
  impact: number; // minutes
  description: string;
}

export interface ServiceOrchestration {
  guestId: string;
  tableAssignment?: TableAssignment;
  menuRecommendations: MenuRecommendation[];
  prepInstructions: PrepInstruction[];
  staffPositions: StaffPosition[];
  specialRequests: SpecialRequest[];
  estimatedServiceStartTime: Date;
}

export interface TableAssignment {
  tableId: string;
  tableNumber: string;
  location: string;
  capacity: number;
  readyBy: Date;
  setupInstructions: string[];
}

export interface MenuRecommendation {
  itemId: string;
  itemName: string;
  reason: string;
  priority: "high" | "medium" | "low";
  prepTime: number; // minutes
}

export interface PrepInstruction {
  station: string;
  items: string[];
  startTime: Date;
  instructions: string;
  priority: "high" | "medium" | "low";
}

export interface StaffPosition {
  staffId: string;
  staffName: string;
  position: string;
  location: string;
  readyBy: Date;
  instructions: string;
}

export interface SpecialRequest {
  type: "dietary" | "allergy" | "preference" | "celebration";
  description: string;
  action: string;
  priority: "high" | "medium" | "low";
}

export class PredictiveGuestArrivalService {
  private arrivalPredictions: Map<string, GuestArrivalPrediction> = new Map();
  private orchestrations: Map<string, ServiceOrchestration> = new Map();
  private historicalPatterns: Map<string, number[]> = new Map(); // guestId -> arrival times (minutes late/early)

  /**
   * Predict guest arrival time
   */
  async predictArrival(
    guestId: string,
    reservationId: string,
    reservationTime: Date,
    gpsLocation?: { latitude: number; longitude: number },
    restaurantLocation: { latitude: number; longitude: number } = { latitude: 0, longitude: 0 }
  ): Promise<GuestArrivalPrediction> {
    const factors: ArrivalFactor[] = [];
    let predictedMinutes = 0; // minutes from reservation time

    // Historical pattern factor
    const historical = this.historicalPatterns.get(guestId);
    if (historical && historical.length > 0) {
      const avgDelay = historical.reduce((sum, val) => sum + val, 0) / historical.length;
      predictedMinutes += avgDelay;
      factors.push({
        type: "historical",
        impact: avgDelay,
        description: `Guest typically arrives ${avgDelay > 0 ? `${Math.round(avgDelay)} minutes late` : `${Math.abs(Math.round(avgDelay))} minutes early`}`,
      });
    } else {
      // Default: 5 minutes late for new guests
      predictedMinutes += 5;
      factors.push({
        type: "historical",
        impact: 5,
        description: "No historical data, using default pattern",
      });
    }

    // GPS-based factor (if available)
    if (gpsLocation) {
      const distance = this.calculateDistance(gpsLocation, restaurantLocation);
      const estimatedDriveTime = distance * 2; // Simplified: 2 minutes per mile
      
      factors.push({
        type: "gps",
        impact: estimatedDriveTime,
        description: `Estimated ${Math.round(estimatedDriveTime)} minutes based on current location (${distance.toFixed(1)} miles away)`,
      });

      // Adjust prediction based on current location
      const timeToReservation = (reservationTime.getTime() - Date.now()) / (1000 * 60); // minutes
      if (estimatedDriveTime > timeToReservation) {
        predictedMinutes += estimatedDriveTime - timeToReservation;
      }
    }

    // Traffic factor (simplified - would use real traffic API)
    const trafficImpact = this.estimateTrafficImpact(reservationTime);
    if (trafficImpact !== 0) {
      predictedMinutes += trafficImpact;
      factors.push({
        type: "traffic",
        impact: trafficImpact,
        description: `Traffic conditions add ${Math.round(trafficImpact)} minutes`,
      });
    }

    // Weather factor (simplified)
    const weatherImpact = this.estimateWeatherImpact();
    if (weatherImpact !== 0) {
      predictedMinutes += weatherImpact;
      factors.push({
        type: "weather",
        impact: weatherImpact,
        description: `Weather conditions add ${Math.round(weatherImpact)} minutes`,
      });
    }

    const predictedArrivalTime = new Date(reservationTime);
    predictedArrivalTime.setMinutes(predictedArrivalTime.getMinutes() + Math.round(predictedMinutes));

    // Calculate confidence (higher with more data points)
    let confidence = 0.6; // Base confidence
    if (gpsLocation) confidence += 0.2;
    if (historical && historical.length >= 3) confidence += 0.15;
    if (historical && historical.length >= 10) confidence += 0.05;
    confidence = Math.min(0.95, confidence);

    const prediction: GuestArrivalPrediction = {
      guestId,
      reservationId,
      predictedArrivalTime,
      confidence,
      factors,
      currentLocation: gpsLocation ? {
        ...gpsLocation,
        distance: gpsLocation ? this.calculateDistance(gpsLocation, restaurantLocation) : 0,
      } : undefined,
    };

    this.arrivalPredictions.set(guestId, prediction);
    
    logger.info("[Predictive Arrival] Arrival predicted", {
      guestId,
      reservationTime: reservationTime.toISOString(),
      predictedArrivalTime: predictedArrivalTime.toISOString(),
      confidence,
      factorsCount: factors.length,
    });

    return prediction;
  }

  /**
   * Orchestrate service for predicted arrival
   */
  async orchestrateService(
    guestId: string,
    reservationTime: Date,
    partySize: number,
    preferences: {
      preferredTable?: string;
      dietaryRestrictions?: string[];
      allergies?: string[];
      favoriteItems?: string[];
      specialRequests?: string[];
    },
    availableTables: Array<{ id: string; number: string; location: string; capacity: number }>,
    menuItems: Array<{ id: string; name: string; prepTime: number }>
  ): Promise<ServiceOrchestration> {
    const prediction = this.arrivalPredictions.get(guestId);
    const arrivalTime = prediction?.predictedArrivalTime || reservationTime;

    // Table assignment
    const tableAssignment = this.assignTable(availableTables, partySize, preferences.preferredTable);
    if (tableAssignment) {
      tableAssignment.readyBy = new Date(arrivalTime);
      tableAssignment.readyBy.setMinutes(tableAssignment.readyBy.getMinutes() - 5); // Ready 5 min before arrival
    }

    // Menu recommendations
    const menuRecommendations = this.generateMenuRecommendations(
      menuItems,
      preferences.favoriteItems || [],
      preferences.dietaryRestrictions || [],
      preferences.allergies || []
    );

    // Prep instructions
    const prepInstructions = this.generatePrepInstructions(
      menuRecommendations,
      arrivalTime
    );

    // Staff positioning
    const staffPositions = this.generateStaffPositions(
      tableAssignment,
      arrivalTime,
      partySize
    );

    // Special requests
    const specialRequests = this.generateSpecialRequests(preferences);

    const orchestration: ServiceOrchestration = {
      guestId,
      tableAssignment,
      menuRecommendations,
      prepInstructions,
      staffPositions,
      specialRequests,
      estimatedServiceStartTime: arrivalTime,
    };

    this.orchestrations.set(guestId, orchestration);
    
    logger.info("[Predictive Arrival] Service orchestrated", {
      guestId,
      arrivalTime: arrivalTime.toISOString(),
      tableAssigned: tableAssignment?.tableNumber,
      menuItems: menuRecommendations.length,
    });

    return orchestration;
  }

  /**
   * Update historical pattern after guest arrival
   */
  async recordActualArrival(
    guestId: string,
    reservationTime: Date,
    actualArrivalTime: Date
  ): Promise<void> {
    const delayMinutes = (actualArrivalTime.getTime() - reservationTime.getTime()) / (1000 * 60);
    
    if (!this.historicalPatterns.has(guestId)) {
      this.historicalPatterns.set(guestId, []);
    }

    const patterns = this.historicalPatterns.get(guestId)!;
    patterns.push(delayMinutes);

    // Keep last 20 arrivals
    if (patterns.length > 20) {
      patterns.shift();
    }

    logger.info("[Predictive Arrival] Arrival recorded", {
      guestId,
      delayMinutes: Math.round(delayMinutes),
      patternCount: patterns.length,
    });
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    const R = 3959; // Earth radius in miles
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Estimate traffic impact (simplified - would use real API)
   */
  private estimateTrafficImpact(reservationTime: Date): number {
    const hour = reservationTime.getHours();
    // Rush hour: 5-7 PM add 10-15 minutes
    if (hour >= 17 && hour < 19) {
      return 12;
    }
    // Lunch rush: 12-1 PM add 5-8 minutes
    if (hour >= 12 && hour < 13) {
      return 6;
    }
    return 0;
  }

  /**
   * Estimate weather impact (simplified)
   */
  private estimateWeatherImpact(): number {
    // Would use weather API in production
    return 0;
  }

  /**
   * Assign table
   */
  private assignTable(
    availableTables: Array<{ id: string; number: string; location: string; capacity: number }>,
    partySize: number,
    preferredLocation?: string
  ): TableAssignment | undefined {
    // Find suitable tables
    const suitableTables = availableTables.filter(t => 
      t.capacity >= partySize && t.capacity <= partySize + 2
    );

    if (suitableTables.length === 0) {
      return undefined;
    }

    // Prefer preferred location
    let selectedTable = suitableTables[0];
    if (preferredLocation) {
      const preferred = suitableTables.find(t => 
        t.location.toLowerCase().includes(preferredLocation.toLowerCase())
      );
      if (preferred) {
        selectedTable = preferred;
      }
    }

    return {
      tableId: selectedTable.id,
      tableNumber: selectedTable.number,
      location: selectedTable.location,
      capacity: selectedTable.capacity,
      readyBy: new Date(),
      setupInstructions: [
        `Set table for ${partySize} guests`,
        `Clean and sanitize table`,
        `Set appropriate tableware`,
        `Prepare water and menus`,
      ],
    };
  }

  /**
   * Generate menu recommendations
   */
  private generateMenuRecommendations(
    menuItems: Array<{ id: string; name: string; prepTime: number }>,
    favoriteItems: string[],
    dietaryRestrictions: string[],
    allergies: string[]
  ): MenuRecommendation[] {
    const recommendations: MenuRecommendation[] = [];

    // Favorite items (high priority)
    favoriteItems.forEach(favorite => {
      const item = menuItems.find(m => m.name.toLowerCase().includes(favorite.toLowerCase()));
      if (item) {
        recommendations.push({
          itemId: item.id,
          itemName: item.name,
          reason: "Guest favorite item",
          priority: "high",
          prepTime: item.prepTime,
        });
      }
    });

    // Popular items (medium priority)
    const popularItems = menuItems
      .filter(item => !favoriteItems.some(fav => item.name.toLowerCase().includes(fav.toLowerCase())))
      .slice(0, 3);

    popularItems.forEach(item => {
      recommendations.push({
        itemId: item.id,
        itemName: item.name,
        reason: "Popular menu item",
        priority: "medium",
        prepTime: item.prepTime,
      });
    });

    return recommendations;
  }

  /**
   * Generate prep instructions
   */
  private generatePrepInstructions(
    recommendations: MenuRecommendation[],
    arrivalTime: Date
  ): PrepInstruction[] {
    const highPriorityItems = recommendations.filter(r => r.priority === "high");
    
    if (highPriorityItems.length === 0) {
      return [];
    }

    const startTime = new Date(arrivalTime);
    const longestPrepTime = Math.max(...highPriorityItems.map(r => r.prepTime));
    startTime.setMinutes(startTime.getMinutes() - longestPrepTime - 5); // Start 5 min before needed

    return [{
      station: "Kitchen",
      items: highPriorityItems.map(r => r.itemName),
      startTime,
      instructions: `Prepare ${highPriorityItems.map(r => r.itemName).join(", ")} for guest arrival`,
      priority: "high",
    }];
  }

  /**
   * Generate staff positions
   */
  private generateStaffPositions(
    tableAssignment: TableAssignment | undefined,
    arrivalTime: Date,
    partySize: number
  ): StaffPosition[] {
    if (!tableAssignment) {
      return [];
    }

    const readyBy = new Date(arrivalTime);
    readyBy.setMinutes(readyBy.getMinutes() - 2);

    return [
      {
        staffId: "host-1",
        staffName: "Host",
        position: "Host Stand",
        location: "Front entrance",
        readyBy,
        instructions: `Prepare to greet party of ${partySize}, direct to table ${tableAssignment.tableNumber}`,
      },
      {
        staffId: "server-1",
        staffName: "Server",
        position: "Service Area",
        location: tableAssignment.location,
        readyBy,
        instructions: `Prepare service for table ${tableAssignment.tableNumber}, party of ${partySize}`,
      },
    ];
  }

  /**
   * Generate special requests
   */
  private generateSpecialRequests(preferences: {
    dietaryRestrictions?: string[];
    allergies?: string[];
    specialRequests?: string[];
  }): SpecialRequest[] {
    const requests: SpecialRequest[] = [];

    if (preferences.allergies && preferences.allergies.length > 0) {
      preferences.allergies.forEach(allergy => {
        requests.push({
          type: "allergy",
          description: `Guest has ${allergy} allergy`,
          action: `Ensure no ${allergy} in any items, notify kitchen`,
          priority: "high",
        });
      });
    }

    if (preferences.dietaryRestrictions && preferences.dietaryRestrictions.length > 0) {
      preferences.dietaryRestrictions.forEach(restriction => {
        requests.push({
          type: "dietary",
          description: `Guest requires ${restriction} diet`,
          action: `Provide ${restriction} options, notify kitchen`,
          priority: "high",
        });
      });
    }

    if (preferences.specialRequests && preferences.specialRequests.length > 0) {
      preferences.specialRequests.forEach(request => {
        requests.push({
          type: "preference",
          description: request,
          action: `Accommodate: ${request}`,
          priority: "medium",
        });
      });
    }

    return requests;
  }
}

let serviceInstance: PredictiveGuestArrivalService | null = null;

export function getPredictiveGuestArrivalService(): PredictiveGuestArrivalService {
  if (!serviceInstance) {
    serviceInstance = new PredictiveGuestArrivalService();
  }
  return serviceInstance;
}

export default PredictiveGuestArrivalService;
