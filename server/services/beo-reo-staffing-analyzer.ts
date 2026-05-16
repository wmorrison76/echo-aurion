/**
 * BEO/REO Staffing Analyzer
 * 
 * Analyzes BEO/REO events to determine staffing needs
 * Integrates with recipe analysis, prep timelines, and event requirements
 * 
 * Features:
 * - Recipe prep time analysis
 * - Service type analysis (plated vs buffet)
 * - Staffing requirement calculation
 * - Timeline generation
 * - Skill requirement identification
 */

import { logger } from '../utils/logger.js';
import { echoAI3PerformanceAnalyzer, type RoleRequirement } from './echo-ai3-performance-analyzer.js';

export interface RecipePrepAnalysis {
  recipeId: string;
  recipeName: string;
  prepTime: number; // minutes
  cookTime: number; // minutes
  totalTime: number; // minutes
  requiredSkills: string[];
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  batchSize: number;
  canPrepAhead: boolean;
  mustBeFresh: boolean;
  station: 'prep' | 'hot_line' | 'cold_line' | 'pastry' | 'garde_manger' | 'saucier';
}

export interface EventStaffingRequirement {
  eventId: string;
  beoId?: string;
  eventType: 'BEO' | 'REO';
  eventDate: string;
  guestCount: number;
  serviceType: 'plated' | 'buffet' | 'family_style' | 'cocktail';
  
  // Timeline
  timeline: Array<{
    time: string; // ISO time
    phase: 'prep' | 'cooking' | 'service' | 'cleanup';
    description: string;
    duration: number; // minutes
  }>;
  
  // Staffing Requirements
  staffingNeeds: Array<{
    role: string;
    roleCode: string;
    count: number;
    startTime: string;
    endTime: string;
    requiredSkills: string[];
    preferredSkills: string[];
    minimumProficiency: Record<string, 'beginner' | 'intermediate' | 'advanced' | 'expert'>;
    notes?: string;
  }>;
  
  // Department Breakdown
  departments: {
    culinary: {
      totalStaff: number;
      roles: Array<{ role: string; count: number }>;
      totalHours: number;
    };
    pastry: {
      totalStaff: number;
      roles: Array<{ role: string; count: number }>;
      totalHours: number;
    };
    service: {
      totalStaff: number;
      roles: Array<{ role: string; count: number }>;
      totalHours: number;
    };
    stewards: {
      totalStaff: number;
      roles: Array<{ role: string; count: number }>;
      totalHours: number;
    };
  };
  
  // Total Summary
  totalStaff: number;
  totalHours: number;
  estimatedCost: number;
  
  // Analysis Metadata
  analyzedAt: string;
  confidence: number; // 0-100
  assumptions: string[];
}

class BEOREOStaffingAnalyzer {
  /**
   * Analyze BEO/REO for staffing requirements
   */
  async analyzeEvent(
    eventId: string,
    beoId?: string,
    orgId: string
  ): Promise<EventStaffingRequirement> {
    try {
      logger.info(`[BEOREOStaffing] Analyzing event ${eventId} for staffing requirements`);

      // Fetch event and BEO data
      const event = await this.fetchEventData(eventId, orgId);
      const beo = beoId ? await this.fetchBEOData(beoId, orgId) : null;

      // Determine service type
      const serviceType = this.determineServiceType(event, beo);

      // Analyze recipes and prep requirements
      const recipeAnalysis = await this.analyzeRecipes(event, beo, orgId);

      // Generate timeline
      const timeline = this.generateTimeline(event, recipeAnalysis, serviceType);

      // Calculate staffing needs
      const staffingNeeds = this.calculateStaffingNeeds(
        event,
        recipeAnalysis,
        serviceType,
        timeline
      );

      // Organize by department
      const departments = this.organizeByDepartment(staffingNeeds);

      // Calculate totals
      const totalStaff = staffingNeeds.reduce((sum, s) => sum + s.count, 0);
      const totalHours = this.calculateTotalHours(staffingNeeds);
      const estimatedCost = await this.estimateCost(staffingNeeds, orgId);

      // Generate assumptions
      const assumptions = this.generateAssumptions(event, recipeAnalysis, serviceType);

      return {
        eventId,
        beoId: beo?.id,
        eventType: event.eventType || 'BEO',
        eventDate: event.date,
        guestCount: event.guestCount || 0,
        serviceType,
        timeline,
        staffingNeeds,
        departments,
        totalStaff,
        totalHours,
        estimatedCost,
        analyzedAt: new Date().toISOString(),
        confidence: this.calculateConfidence(event, beo, recipeAnalysis),
        assumptions,
      };
    } catch (error) {
      logger.error(`[BEOREOStaffing] Error analyzing event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Analyze recipes for prep requirements
   */
  private async analyzeRecipes(
    event: any,
    beo: any,
    orgId: string
  ): Promise<RecipePrepAnalysis[]> {
    const recipes: RecipePrepAnalysis[] = [];

    // Extract recipes from BEO or event menu
    const menuItems = beo?.contentData?.menuItems || event.menuItems || [];

    for (const item of menuItems) {
      const recipe = await this.analyzeRecipe(item, orgId);
      if (recipe) {
        recipes.push(recipe);
      }
    }

    return recipes;
  }

  /**
   * Analyze a single recipe
   */
  private async analyzeRecipe(item: any, orgId: string): Promise<RecipePrepAnalysis | null> {
    try {
      // In production, fetch recipe from database and analyze with AI
      // For now, use heuristics based on item type

      const recipeName = item.name || item.productName || 'Unknown';
      const quantity = item.quantity || 1;
      const guestCount = item.guestCount || 100;

      // Determine station based on item type
      const station = this.determineStation(item);

      // Estimate prep and cook times
      const { prepTime, cookTime, difficulty } = this.estimateTimes(item, quantity, guestCount);

      // Determine required skills
      const requiredSkills = this.determineRequiredSkills(item, station);

      return {
        recipeId: item.recipeId || `recipe-${Date.now()}`,
        recipeName,
        prepTime,
        cookTime,
        totalTime: prepTime + cookTime,
        requiredSkills,
        difficulty,
        batchSize: quantity,
        canPrepAhead: this.canPrepAhead(item),
        mustBeFresh: this.mustBeFresh(item),
        station,
      };
    } catch (error) {
      logger.error('[BEOREOStaffing] Error analyzing recipe:', error);
      return null;
    }
  }

  /**
   * Generate event timeline
   */
  private generateTimeline(
    event: any,
    recipes: RecipePrepAnalysis[],
    serviceType: EventStaffingRequirement['serviceType']
  ): EventStaffingRequirement['timeline'] {
    const timeline: EventStaffingRequirement['timeline'] = [];
    const eventStart = new Date(event.date);
    const serviceTime = new Date(eventStart);
    serviceTime.setHours(18, 0, 0, 0); // Default 6 PM service

    // Calculate earliest prep start (work backwards from service)
    const maxPrepTime = Math.max(...recipes.map(r => r.prepTime), 0);
    const prepStart = new Date(serviceTime);
    prepStart.setMinutes(prepStart.getMinutes() - maxPrepTime - 60); // Add 1 hour buffer

    // Prep phase
    timeline.push({
      time: prepStart.toISOString(),
      phase: 'prep',
      description: 'Preparation phase - mise en place, ingredient prep',
      duration: maxPrepTime,
    });

    // Cooking phase
    const maxCookTime = Math.max(...recipes.map(r => r.cookTime), 0);
    const cookStart = new Date(serviceTime);
    cookStart.setMinutes(cookStart.getMinutes() - maxCookTime - 30); // 30 min buffer

    timeline.push({
      time: cookStart.toISOString(),
      phase: 'cooking',
      description: 'Active cooking phase - final preparation',
      duration: maxCookTime,
    });

    // Service phase
    const serviceDuration = this.calculateServiceDuration(event.guestCount || 0, serviceType);
    timeline.push({
      time: serviceTime.toISOString(),
      phase: 'service',
      description: `${serviceType} service for ${event.guestCount || 0} guests`,
      duration: serviceDuration,
    });

    // Cleanup phase
    const cleanupStart = new Date(serviceTime);
    cleanupStart.setMinutes(cleanupStart.getMinutes() + serviceDuration);
    timeline.push({
      time: cleanupStart.toISOString(),
      phase: 'cleanup',
      description: 'Post-service cleanup and breakdown',
      duration: 120, // 2 hours default
    });

    return timeline;
  }

  /**
   * Calculate staffing needs based on recipes and service type
   */
  private calculateStaffingNeeds(
    event: any,
    recipes: RecipePrepAnalysis[],
    serviceType: EventStaffingRequirement['serviceType'],
    timeline: EventStaffingRequirement['timeline']
  ): EventStaffingRequirement['staffingNeeds'] {
    const needs: EventStaffingRequirement['staffingNeeds'] = [];

    // Group recipes by station
    const byStation = new Map<string, RecipePrepAnalysis[]>();
    for (const recipe of recipes) {
      const existing = byStation.get(recipe.station) || [];
      existing.push(recipe);
      byStation.set(recipe.station, existing);
    }

    // Calculate culinary staffing
    for (const [station, stationRecipes] of byStation.entries()) {
      if (station === 'pastry') continue; // Handled separately

      const totalPrepTime = stationRecipes.reduce((sum, r) => sum + r.prepTime, 0);
      const totalCookTime = stationRecipes.reduce((sum, r) => sum + r.cookTime, 0);
      const maxDifficulty = this.getMaxDifficulty(stationRecipes);

      // Calculate staff needed based on workload
      const prepStaff = Math.ceil(totalPrepTime / (8 * 60)); // 8 hours per person
      const cookStaff = Math.ceil(totalCookTime / (4 * 60)); // 4 hours active cooking per person
      const staffCount = Math.max(prepStaff, cookStaff, 1);

      // Determine role based on station
      const role = this.getRoleForStation(station);
      const requiredSkills = this.getRequiredSkillsForStation(station);
      const preferredSkills = this.getPreferredSkillsForStation(station, maxDifficulty);

      const prepPhase = timeline.find(t => t.phase === 'prep');
      const cookPhase = timeline.find(t => t.phase === 'cooking');

      needs.push({
        role,
        roleCode: station,
        count: staffCount,
        startTime: prepPhase?.time || timeline[0].time,
        endTime: cookPhase ? new Date(new Date(cookPhase.time).getTime() + cookPhase.duration * 60000).toISOString() : timeline[timeline.length - 1].time,
        requiredSkills,
        preferredSkills,
        minimumProficiency: this.getMinimumProficiency(station, maxDifficulty),
        notes: `${staffCount} ${role} needed for ${stationRecipes.length} recipes`,
      });
    }

    // Calculate pastry staffing
    const pastryRecipes = recipes.filter(r => r.station === 'pastry');
    if (pastryRecipes.length > 0) {
      const totalTime = pastryRecipes.reduce((sum, r) => sum + r.totalTime, 0);
      const staffCount = Math.ceil(totalTime / (8 * 60));
      const prepPhase = timeline.find(t => t.phase === 'prep');

      needs.push({
        role: 'Pastry Chef',
        roleCode: 'pastry_chef',
        count: staffCount,
        startTime: prepPhase?.time || timeline[0].time,
        endTime: timeline.find(t => t.phase === 'service')?.time || timeline[timeline.length - 1].time,
        requiredSkills: ['pastry_fundamentals', 'plating', 'dessert_prep'],
        preferredSkills: ['advanced_pastry', 'sugar_work', 'chocolate_work'],
        minimumProficiency: {
          pastry_fundamentals: 'intermediate',
          plating: 'intermediate',
        },
        notes: `${staffCount} pastry chef(s) needed for ${pastryRecipes.length} pastry items`,
      });
    }

    // Calculate service staffing
    const serviceStaff = this.calculateServiceStaffing(
      event.guestCount || 0,
      serviceType
    );
    needs.push(...serviceStaff);

    // Calculate steward staffing
    const stewardStaff = this.calculateStewardStaffing(
      event.guestCount || 0,
      serviceType
    );
    needs.push(...stewardStaff);

    return needs;
  }

  /**
   * Calculate service staffing (FOH)
   */
  private calculateServiceStaffing(
    guestCount: number,
    serviceType: EventStaffingRequirement['serviceType']
  ): EventStaffingRequirement['staffingNeeds'] {
    const needs: EventStaffingRequirement['staffingNeeds'] = [];

    if (serviceType === 'plated') {
      // Plated service: 1 server per 15-20 guests
      const serversNeeded = Math.ceil(guestCount / 18);
      const captainsNeeded = Math.ceil(serversNeeded / 4); // 1 captain per 4 servers
      const foodRunnersNeeded = Math.ceil(guestCount / 50); // 1 runner per 50 guests

      needs.push({
        role: 'Banquet Server',
        roleCode: 'banquet_server',
        count: serversNeeded,
        startTime: '', // Will be set from timeline
        endTime: '',
        requiredSkills: ['plated_service', 'wine_service'],
        preferredSkills: ['fine_dining', 'table_side_service'],
        minimumProficiency: {
          plated_service: 'intermediate',
          wine_service: 'beginner',
        },
        notes: `${serversNeeded} servers for plated service (1 per 18 guests)`,
      });

      if (captainsNeeded > 0) {
        needs.push({
          role: 'Service Captain',
          roleCode: 'service_captain',
          count: captainsNeeded,
          startTime: '',
          endTime: '',
          requiredSkills: ['service_management', 'guest_relations'],
          preferredSkills: ['event_coordination', 'crisis_management'],
          minimumProficiency: {
            service_management: 'advanced',
            guest_relations: 'advanced',
          },
          notes: `${captainsNeeded} captain(s) to oversee service`,
        });
      }

      if (foodRunnersNeeded > 0) {
        needs.push({
          role: 'Food Runner',
          roleCode: 'food_runner',
          count: foodRunnersNeeded,
          startTime: '',
          endTime: '',
          requiredSkills: ['food_running', 'expediting'],
          preferredSkills: ['hot_food_handling'],
          minimumProficiency: {
            food_running: 'intermediate',
            expediting: 'beginner',
          },
          notes: `${foodRunnersNeeded} food runner(s) for expediting`,
        });
      }
    } else if (serviceType === 'buffet') {
      // Buffet service: 1 server per 25-30 guests
      const serversNeeded = Math.ceil(guestCount / 28);
      const captainsNeeded = Math.ceil(serversNeeded / 5);

      needs.push({
        role: 'Buffet Server',
        roleCode: 'buffet_server',
        count: serversNeeded,
        startTime: '',
        endTime: '',
        requiredSkills: ['buffet_service', 'food_safety'],
        preferredSkills: ['presentation', 'guest_interaction'],
        minimumProficiency: {
          buffet_service: 'intermediate',
          food_safety: 'advanced',
        },
        notes: `${serversNeeded} servers for buffet service (1 per 28 guests)`,
      });

      if (captainsNeeded > 0) {
        needs.push({
          role: 'Service Captain',
          roleCode: 'service_captain',
          count: captainsNeeded,
          startTime: '',
          endTime: '',
          requiredSkills: ['service_management', 'buffet_management'],
          preferredSkills: ['event_coordination'],
          minimumProficiency: {
            service_management: 'advanced',
            buffet_management: 'intermediate',
          },
          notes: `${captainsNeeded} captain(s) to oversee buffet`,
        });
      }
    }

    return needs;
  }

  /**
   * Calculate steward staffing
   */
  private calculateStewardStaffing(
    guestCount: number,
    serviceType: EventStaffingRequirement['serviceType']
  ): EventStaffingRequirement['staffingNeeds'] {
    const needs: EventStaffingRequirement['staffingNeeds'] = [];

    // 1 steward per 40-50 guests for cleanup
    const stewardsNeeded = Math.ceil(guestCount / 45);

    needs.push({
      role: 'Steward',
      roleCode: 'steward',
      count: stewardsNeeded,
      startTime: '', // Will be set from timeline
      endTime: '',
      requiredSkills: ['dishwashing', 'equipment_handling'],
      preferredSkills: ['breakdown', 'setup'],
      minimumProficiency: {
        dishwashing: 'intermediate',
        equipment_handling: 'beginner',
      },
      notes: `${stewardsNeeded} steward(s) for cleanup (1 per 45 guests)`,
    });

    return needs;
  }

  /**
   * Organize staffing by department
   */
  private organizeByDepartment(
    needs: EventStaffingRequirement['staffingNeeds']
  ): EventStaffingRequirement['departments'] {
    const culinary: Array<{ role: string; count: number }> = [];
    const pastry: Array<{ role: string; count: number }> = [];
    const service: Array<{ role: string; count: number }> = [];
    const stewards: Array<{ role: string; count: number }> = [];

    for (const need of needs) {
      if (need.roleCode.includes('pastry')) {
        pastry.push({ role: need.role, count: need.count });
      } else if (need.roleCode.includes('server') || need.roleCode.includes('captain') || need.roleCode.includes('runner')) {
        service.push({ role: need.role, count: need.count });
      } else if (need.roleCode.includes('steward')) {
        stewards.push({ role: need.role, count: need.count });
      } else {
        culinary.push({ role: need.role, count: need.count });
      }
    }

    return {
      culinary: {
        totalStaff: culinary.reduce((sum, r) => sum + r.count, 0),
        roles: culinary,
        totalHours: this.calculateDepartmentHours(needs.filter(n => !n.roleCode.includes('pastry') && !n.roleCode.includes('server') && !n.roleCode.includes('captain') && !n.roleCode.includes('runner') && !n.roleCode.includes('steward'))),
      },
      pastry: {
        totalStaff: pastry.reduce((sum, r) => sum + r.count, 0),
        roles: pastry,
        totalHours: this.calculateDepartmentHours(needs.filter(n => n.roleCode.includes('pastry'))),
      },
      service: {
        totalStaff: service.reduce((sum, r) => sum + r.count, 0),
        roles: service,
        totalHours: this.calculateDepartmentHours(needs.filter(n => n.roleCode.includes('server') || n.roleCode.includes('captain') || n.roleCode.includes('runner'))),
      },
      stewards: {
        totalStaff: stewards.reduce((sum, r) => sum + r.count, 0),
        roles: stewards,
        totalHours: this.calculateDepartmentHours(needs.filter(n => n.roleCode.includes('steward'))),
      },
    };
  }

  /**
   * Helper methods
   */

  private async fetchEventData(eventId: string, orgId: string): Promise<any> {
    // In production, query calendar_events table
    return { id: eventId, date: new Date().toISOString(), guestCount: 100 };
  }

  private async fetchBEOData(beoId: string, orgId: string): Promise<any> {
    // In production, query beo_banquet_orders table
    return { id: beoId, contentData: {} };
  }

  private determineServiceType(event: any, beo: any): EventStaffingRequirement['serviceType'] {
    // Check BEO or event data for service type
    const serviceType = beo?.contentData?.serviceType || event.serviceType;
    if (serviceType) {
      return serviceType;
    }

    // Default based on event type
    return 'plated';
  }

  private determineStation(item: any): RecipePrepAnalysis['station'] {
    const name = (item.name || '').toLowerCase();
    if (name.includes('dessert') || name.includes('pastry') || name.includes('cake')) {
      return 'pastry';
    }
    if (name.includes('sauce') || name.includes('gravy')) {
      return 'saucier';
    }
    if (name.includes('salad') || name.includes('appetizer')) {
      return 'garde_manger';
    }
    return 'hot_line';
  }

  private estimateTimes(item: any, quantity: number, guestCount: number): {
    prepTime: number;
    cookTime: number;
    difficulty: RecipePrepAnalysis['difficulty'];
  } {
    // Base times in minutes
    const basePrep = 30;
    const baseCook = 20;

    // Scale based on quantity
    const scaleFactor = Math.sqrt(quantity / 10); // Square root scaling
    const prepTime = Math.ceil(basePrep * scaleFactor);
    const cookTime = Math.ceil(baseCook * scaleFactor);

    // Determine difficulty
    let difficulty: RecipePrepAnalysis['difficulty'] = 'medium';
    if (prepTime > 120 || cookTime > 60) {
      difficulty = 'hard';
    } else if (prepTime < 20 && cookTime < 15) {
      difficulty = 'easy';
    }

    return { prepTime, cookTime, difficulty };
  }

  private determineRequiredSkills(item: any, station: RecipePrepAnalysis['station']): string[] {
    const skills: string[] = [];

    switch (station) {
      case 'prep':
        skills.push('knife_skills', 'mise_en_place');
        break;
      case 'hot_line':
        skills.push('sauté', 'grill', 'roasting');
        break;
      case 'saucier':
        skills.push('sauce_making', 'reduction');
        break;
      case 'pastry':
        skills.push('pastry_fundamentals', 'baking');
        break;
      case 'garde_manger':
        skills.push('cold_prep', 'plating');
        break;
    }

    return skills;
  }

  private canPrepAhead(item: any): boolean {
    const name = (item.name || '').toLowerCase();
    return !name.includes('fresh') && !name.includes('live');
  }

  private mustBeFresh(item: any): boolean {
    const name = (item.name || '').toLowerCase();
    return name.includes('fresh') || name.includes('live') || name.includes('sushi');
  }

  private getMaxDifficulty(recipes: RecipePrepAnalysis[]): RecipePrepAnalysis['difficulty'] {
    const difficultyMap = { easy: 1, medium: 2, hard: 3, expert: 4 };
    const max = Math.max(...recipes.map(r => difficultyMap[r.difficulty]));
    return Object.entries(difficultyMap).find(([_, v]) => v === max)?.[0] as RecipePrepAnalysis['difficulty'] || 'medium';
  }

  private getRoleForStation(station: string): string {
    const roleMap: Record<string, string> = {
      prep: 'Prep Chef',
      hot_line: 'Line Cook',
      cold_line: 'Cold Line Cook',
      garde_manger: 'Garde Manger',
      saucier: 'Saucier',
    };
    return roleMap[station] || 'Cook';
  }

  private getRequiredSkillsForStation(station: string): string[] {
    return this.determineRequiredSkills({}, station as RecipePrepAnalysis['station']);
  }

  private getPreferredSkillsForStation(
    station: string,
    difficulty: RecipePrepAnalysis['difficulty']
  ): string[] {
    const skills: string[] = [];
    if (difficulty === 'hard' || difficulty === 'expert') {
      skills.push('advanced_techniques', 'high_volume');
    }
    return skills;
  }

  private getMinimumProficiency(
    station: string,
    difficulty: RecipePrepAnalysis['difficulty']
  ): Record<string, 'beginner' | 'intermediate' | 'advanced' | 'expert'> {
    const base: Record<string, 'beginner' | 'intermediate' | 'advanced' | 'expert'> = {};
    const requiredSkills = this.getRequiredSkillsForStation(station);
    
    for (const skill of requiredSkills) {
      if (difficulty === 'expert') {
        base[skill] = 'advanced';
      } else if (difficulty === 'hard') {
        base[skill] = 'intermediate';
      } else {
        base[skill] = 'beginner';
      }
    }

    return base;
  }

  private calculateServiceDuration(guestCount: number, serviceType: EventStaffingRequirement['serviceType']): number {
    if (serviceType === 'plated') {
      // Plated: 2-3 hours for full service
      return 150; // 2.5 hours
    } else if (serviceType === 'buffet') {
      // Buffet: 1.5-2 hours
      return 90; // 1.5 hours
    }
    return 120; // Default 2 hours
  }

  private calculateTotalHours(needs: EventStaffingRequirement['staffingNeeds']): number {
    let total = 0;
    for (const need of needs) {
      const start = new Date(need.startTime);
      const end = new Date(need.endTime);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      total += hours * need.count;
    }
    return Math.ceil(total);
  }

  private calculateDepartmentHours(needs: EventStaffingRequirement['staffingNeeds']): number {
    return this.calculateTotalHours(needs);
  }

  private async estimateCost(needs: EventStaffingRequirement['staffingNeeds'], orgId: string): Promise<number> {
    // In production, fetch labor rates and calculate
    // For now, use average rate
    const avgRate = 25; // $25/hour average
    const totalHours = this.calculateTotalHours(needs);
    return totalHours * avgRate;
  }

  private generateAssumptions(
    event: any,
    recipes: RecipePrepAnalysis[],
    serviceType: EventStaffingRequirement['serviceType']
  ): string[] {
    const assumptions: string[] = [];

    assumptions.push(`Service type: ${serviceType}`);
    assumptions.push(`Guest count: ${event.guestCount || 0}`);
    assumptions.push(`Recipes analyzed: ${recipes.length}`);
    assumptions.push('Staffing ratios based on industry standards');
    assumptions.push('Prep times estimated from recipe complexity');

    return assumptions;
  }

  private calculateConfidence(
    event: any,
    beo: any,
    recipes: RecipePrepAnalysis[]
  ): number {
    let confidence = 50; // Base confidence

    if (beo) confidence += 20; // BEO data available
    if (recipes.length > 0) confidence += 15; // Recipes analyzed
    if (event.guestCount) confidence += 10; // Guest count known
    if (event.serviceType) confidence += 5; // Service type specified

    return Math.min(confidence, 100);
  }
}

export const beoREOStaffingAnalyzer = new BEOREOStaffingAnalyzer();
