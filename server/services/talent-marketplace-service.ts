/**
 * Talent Marketplace & Workforce Optimization Service
 * Moat #20: Workforce Optimization & Talent Marketplace
 * 
 * Industry First: Comprehensive Labor + Gig Economy
 * - Internal talent marketplace (shift swapping, cross-training)
 * - External gig worker integration
 * - Skill-based matching
 * - Performance tracking and recommendations
 * - Career path development
 */

import { logger } from "../lib/logger";

export interface Employee {
  id: string;
  name: string;
  organizationId: string;
  outletId?: string;
  skills: Skill[];
  certifications: Certification[];
  availability: AvailabilityWindow[];
  performanceRating: number;
  hourlyRate: number;
  preferredRoles: string[];
  careerGoals: string[];
  experienceLevel: "entry" | "intermediate" | "advanced" | "expert";
}

export interface Skill {
  name: string;
  level: "beginner" | "intermediate" | "advanced" | "expert";
  verified: boolean;
  yearsExperience: number;
}

export interface Certification {
  name: string;
  issuer: string;
  issuedDate: Date;
  expiryDate?: Date;
  verified: boolean;
}

export interface AvailabilityWindow {
  dayOfWeek: number; // 0-6
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export interface ShiftOpportunity {
  id: string;
  organizationId: string;
  outletId: string;
  role: string;
  shiftDate: Date;
  startTime: string;
  endTime: string;
  requiredSkills: string[];
  requiredCertifications: string[];
  hourlyRate: number;
  type: "internal" | "external" | "gig";
  status: "open" | "filled" | "cancelled";
  postedAt: Date;
}

export interface GigWorker {
  id: string;
  name: string;
  skills: Skill[];
  certifications: Certification[];
  rating: number;
  completedGigs: number;
  hourlyRate: number;
  availability: AvailabilityWindow[];
  backgroundChecked: boolean;
  verified: boolean;
}

export interface ShiftApplication {
  id: string;
  opportunityId: string;
  applicantId: string;
  applicantType: "employee" | "gig_worker";
  message?: string;
  status: "pending" | "accepted" | "rejected";
  appliedAt: Date;
  matchScore?: number;
}

export interface CrossTrainingRecommendation {
  employeeId: string;
  recommendedSkills: string[];
  reason: string;
  priority: "low" | "medium" | "high";
  estimatedTrainingTime: number; // hours
  benefits: string[];
}

export interface CareerPath {
  employeeId: string;
  currentRole: string;
  targetRole: string;
  steps: CareerStep[];
  estimatedTime: number; // months
  completionPercent: number;
}

export interface CareerStep {
  skill: string;
  certification?: string;
  training?: string;
  completed: boolean;
  order: number;
}

export class TalentMarketplaceService {
  private employees: Map<string, Employee> = new Map();
  private gigWorkers: Map<string, GigWorker> = new Map();
  private opportunities: Map<string, ShiftOpportunity> = new Map();
  private applications: Map<string, ShiftApplication[]> = new Map();
  private careerPaths: Map<string, CareerPath> = new Map();

  /**
   * Register employee
   */
  async registerEmployee(employee: Employee): Promise<Employee> {
    this.employees.set(employee.id, employee);
    logger.info("[Talent Marketplace] Employee registered", {
      employeeId: employee.id,
      name: employee.name,
      skillsCount: employee.skills.length,
    });
    return employee;
  }

  /**
   * Register gig worker
   */
  async registerGigWorker(worker: GigWorker): Promise<GigWorker> {
    this.gigWorkers.set(worker.id, worker);
    logger.info("[Talent Marketplace] Gig worker registered", {
      workerId: worker.id,
      name: worker.name,
      rating: worker.rating,
    });
    return worker;
  }

  /**
   * Post shift opportunity
   */
  async postOpportunity(opportunity: ShiftOpportunity): Promise<ShiftOpportunity> {
    this.opportunities.set(opportunity.id, opportunity);
    logger.info("[Talent Marketplace] Opportunity posted", {
      opportunityId: opportunity.id,
      role: opportunity.role,
      type: opportunity.type,
    });
    return opportunity;
  }

  /**
   * Match employees/gig workers to opportunity
   */
  async matchCandidates(opportunityId: string): Promise<{
    employees: Array<Employee & { matchScore: number }>;
    gigWorkers: Array<GigWorker & { matchScore: number }>;
  }> {
    const opportunity = this.opportunities.get(opportunityId);
    if (!opportunity) {
      throw new Error("Opportunity not found");
    }

    const matchedEmployees: Array<Employee & { matchScore: number }> = [];
    const matchedGigWorkers: Array<GigWorker & { matchScore: number }> = [];

    // Match internal employees
    for (const employee of this.employees.values()) {
      if (employee.organizationId === opportunity.organizationId) {
        const matchScore = this.calculateMatchScore(employee, opportunity);
        if (matchScore >= 0.6) { // 60% match threshold
          matchedEmployees.push({ ...employee, matchScore });
        }
      }
    }

    // Match gig workers (if external opportunity)
    if (opportunity.type === "external" || opportunity.type === "gig") {
      for (const worker of this.gigWorkers.values()) {
        const matchScore = this.calculateGigWorkerMatchScore(worker, opportunity);
        if (matchScore >= 0.6) {
          matchedGigWorkers.push({ ...worker, matchScore });
        }
      }
    }

    // Sort by match score
    matchedEmployees.sort((a, b) => b.matchScore - a.matchScore);
    matchedGigWorkers.sort((a, b) => b.matchScore - a.matchScore);

    return {
      employees: matchedEmployees,
      gigWorkers: matchedGigWorkers,
    };
  }

  /**
   * Calculate match score for employee
   */
  private calculateMatchScore(employee: Employee, opportunity: ShiftOpportunity): number {
    let score = 0;
    let maxScore = 0;

    // Skills match (40% weight)
    maxScore += 40;
    const requiredSkills = new Set(opportunity.requiredSkills.map(s => s.toLowerCase()));
    const employeeSkills = new Set(employee.skills.map(s => s.name.toLowerCase()));
    const matchingSkills = Array.from(requiredSkills).filter(s => employeeSkills.has(s)).length;
    const skillMatchRatio = opportunity.requiredSkills.length > 0 
      ? matchingSkills / opportunity.requiredSkills.length 
      : 1;
    score += skillMatchRatio * 40;

    // Certifications match (30% weight)
    maxScore += 30;
    const requiredCerts = new Set(opportunity.requiredCertifications.map(c => c.toLowerCase()));
    const employeeCerts = new Set(employee.certifications.map(c => c.name.toLowerCase()));
    const matchingCerts = Array.from(requiredCerts).filter(c => employeeCerts.has(c)).length;
    const certMatchRatio = opportunity.requiredCertifications.length > 0
      ? matchingCerts / opportunity.requiredCertifications.length
      : 1;
    score += certMatchRatio * 30;

    // Role preference (20% weight)
    maxScore += 20;
    if (employee.preferredRoles.includes(opportunity.role)) {
      score += 20;
    } else {
      score += 10; // Partial credit
    }

    // Performance rating (10% weight)
    maxScore += 10;
    score += (employee.performanceRating / 5) * 10;

    return score / maxScore;
  }

  /**
   * Calculate match score for gig worker
   */
  private calculateGigWorkerMatchScore(worker: GigWorker, opportunity: ShiftOpportunity): number {
    let score = 0;
    let maxScore = 0;

    // Skills match (35% weight)
    maxScore += 35;
    const requiredSkills = new Set(opportunity.requiredSkills.map(s => s.toLowerCase()));
    const workerSkills = new Set(worker.skills.map(s => s.name.toLowerCase()));
    const matchingSkills = Array.from(requiredSkills).filter(s => workerSkills.has(s)).length;
    const skillMatchRatio = opportunity.requiredSkills.length > 0
      ? matchingSkills / opportunity.requiredSkills.length
      : 1;
    score += skillMatchRatio * 35;

    // Certifications (25% weight)
    maxScore += 25;
    const requiredCerts = new Set(opportunity.requiredCertifications.map(c => c.toLowerCase()));
    const workerCerts = new Set(worker.certifications.map(c => c.name.toLowerCase()));
    const matchingCerts = Array.from(requiredCerts).filter(c => workerCerts.has(c)).length;
    const certMatchRatio = opportunity.requiredCertifications.length > 0
      ? matchingCerts / opportunity.requiredCertifications.length
      : 1;
    score += certMatchRatio * 25;

    // Rating (25% weight)
    maxScore += 25;
    score += (worker.rating / 5) * 25;

    // Experience (15% weight)
    maxScore += 15;
    const experienceScore = Math.min(worker.completedGigs / 50, 1); // Cap at 50 gigs
    score += experienceScore * 15;

    return score / maxScore;
  }

  /**
   * Apply for opportunity
   */
  async applyForOpportunity(
    opportunityId: string,
    applicantId: string,
    applicantType: "employee" | "gig_worker",
    message?: string
  ): Promise<ShiftApplication> {
    const opportunity = this.opportunities.get(opportunityId);
    if (!opportunity) {
      throw new Error("Opportunity not found");
    }

    if (opportunity.status !== "open") {
      throw new Error("Opportunity is not open for applications");
    }

    // Calculate match score
    let matchScore: number | undefined;
    if (applicantType === "employee") {
      const employee = this.employees.get(applicantId);
      if (employee) {
        matchScore = this.calculateMatchScore(employee, opportunity);
      }
    } else {
      const worker = this.gigWorkers.get(applicantId);
      if (worker) {
        matchScore = this.calculateGigWorkerMatchScore(worker, opportunity);
      }
    }

    const application: ShiftApplication = {
      id: `app-${Date.now()}`,
      opportunityId,
      applicantId,
      applicantType,
      message,
      status: "pending",
      appliedAt: new Date(),
      matchScore,
    };

    if (!this.applications.has(opportunityId)) {
      this.applications.set(opportunityId, []);
    }
    this.applications.get(opportunityId)!.push(application);

    logger.info("[Talent Marketplace] Application submitted", {
      applicationId: application.id,
      opportunityId,
      applicantId,
      applicantType,
      matchScore,
    });

    return application;
  }

  /**
   * Generate cross-training recommendations
   */
  async generateCrossTrainingRecommendations(
    organizationId: string
  ): Promise<CrossTrainingRecommendation[]> {
    const recommendations: CrossTrainingRecommendation[] = [];

    const employees = Array.from(this.employees.values())
      .filter(e => e.organizationId === organizationId);

    // Analyze skill gaps and opportunities
    const allSkills = new Set<string>();
    employees.forEach(e => {
      e.skills.forEach(s => allSkills.add(s.name));
    });

    for (const employee of employees) {
      const employeeSkills = new Set(employee.skills.map(s => s.name));
      const missingSkills = Array.from(allSkills).filter(s => !employeeSkills.has(s));

      if (missingSkills.length > 0) {
        recommendations.push({
          employeeId: employee.id,
          recommendedSkills: missingSkills.slice(0, 3), // Top 3 recommendations
          reason: "Skill gaps identified for increased flexibility",
          priority: employee.experienceLevel === "entry" ? "high" : "medium",
          estimatedTrainingTime: 20, // hours
          benefits: [
            "Increased shift coverage",
            "Career development",
            "Higher earning potential",
          ],
        });
      }
    }

    return recommendations;
  }

  /**
   * Create career path for employee
   */
  async createCareerPath(
    employeeId: string,
    targetRole: string
  ): Promise<CareerPath> {
    const employee = this.employees.get(employeeId);
    if (!employee) {
      throw new Error("Employee not found");
    }

    // Generate steps (simplified - would be more sophisticated in production)
    const steps: CareerStep[] = [
      {
        skill: "Leadership",
        certification: "Leadership Certificate",
        completed: false,
        order: 1,
      },
      {
        skill: "Management",
        training: "Management Training Program",
        completed: false,
        order: 2,
      },
    ];

    const careerPath: CareerPath = {
      employeeId,
      currentRole: employee.preferredRoles[0] || "Staff",
      targetRole,
      steps,
      estimatedTime: 12, // months
      completionPercent: 0,
    };

    this.careerPaths.set(employeeId, careerPath);

    logger.info("[Talent Marketplace] Career path created", {
      employeeId,
      targetRole,
      stepsCount: steps.length,
    });

    return careerPath;
  }

  /**
   * Get performance recommendations
   */
  async getPerformanceRecommendations(employeeId: string): Promise<{
    strengths: string[];
    areasForImprovement: string[];
    recommendations: string[];
  }> {
    const employee = this.employees.get(employeeId);
    if (!employee) {
      throw new Error("Employee not found");
    }

    const strengths: string[] = [];
    const areasForImprovement: string[] = [];
    const recommendations: string[] = [];

    // Analyze performance
    if (employee.performanceRating >= 4.0) {
      strengths.push("High performance rating");
    } else if (employee.performanceRating < 3.0) {
      areasForImprovement.push("Performance rating below target");
      recommendations.push("Consider additional training or coaching");
    }

    if (employee.skills.length >= 5) {
      strengths.push("Diverse skill set");
    } else {
      areasForImprovement.push("Limited skill diversity");
      recommendations.push("Consider cross-training opportunities");
    }

    if (employee.certifications.length > 0) {
      strengths.push("Certified professional");
    } else {
      recommendations.push("Consider obtaining industry certifications");
    }

    return {
      strengths,
      areasForImprovement,
      recommendations,
    };
  }
}

let serviceInstance: TalentMarketplaceService | null = null;

export function getTalentMarketplaceService(): TalentMarketplaceService {
  if (!serviceInstance) {
    serviceInstance = new TalentMarketplaceService();
  }
  return serviceInstance;
}

export default TalentMarketplaceService;
