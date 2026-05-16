/**
 * Shift Swapping Marketplace Service
 * -----------------------------------
 * Enables employees to post available shifts and swap shifts with other employees
 * Features: Skill-based matching, availability matching, approval workflows
 */

import { logger } from "../lib/logger";

export interface ShiftPosting {
  id: string;
  orgId: string;
  outletId: string;
  deptId: string;
  employeeId: string; // Employee posting the shift
  shiftId: string; // Original shift ID
  shiftDate: string; // ISO date string
  startTime: string; // ISO datetime
  endTime: string; // ISO datetime
  positionId: string;
  requiredSkills?: string[]; // Skills required for this shift
  requiredCertifications?: string[]; // Certifications required
  postedAt: string; // ISO datetime
  status: "open" | "pending" | "approved" | "completed" | "cancelled";
  acceptedBy?: string; // Employee ID who accepted
  approvedBy?: string; // Manager ID who approved
  approvedAt?: string; // ISO datetime
  notes?: string;
}

export interface SwapRequest {
  id: string;
  orgId: string;
  postingId: string; // Shift posting ID
  requesterId: string; // Employee requesting the swap
  status: "pending" | "approved" | "rejected" | "cancelled";
  requestedAt: string; // ISO datetime
  approvedBy?: string; // Manager ID
  approvedAt?: string; // ISO datetime
  rejectedReason?: string;
  matchingScore?: number; // 0-1, how well the match is
}

export interface SwapMatch {
  posting: ShiftPosting;
  request: SwapRequest;
  matchScore: number; // 0-1
  matchingFactors: {
    skillMatch: number;
    availabilityMatch: number;
    experienceMatch: number;
  };
}

/**
 * Shift Swapping Marketplace Service
 * Manages shift postings, swap requests, matching, and approval workflows
 */
export class ShiftSwapMarketplaceService {
  private postings: Map<string, ShiftPosting> = new Map();
  private swapRequests: Map<string, SwapRequest> = new Map();

  /**
   * Post available shift for swapping
   */
  async postShift(posting: Omit<ShiftPosting, "id" | "postedAt" | "status">): Promise<ShiftPosting> {
    const id = `posting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newPosting: ShiftPosting = {
      ...posting,
      id,
      postedAt: new Date().toISOString(),
      status: "open",
    };

    // Store in database (mock for now, in production use Supabase)
    this.postings.set(id, newPosting);

    logger.info("[ShiftSwap] Shift posted", {
      postingId: id,
      employeeId: posting.employeeId,
      shiftId: posting.shiftId,
      orgId: posting.orgId,
    });

    return newPosting;
  }

  /**
   * Get available shift postings
   */
  async getAvailablePostings(
    orgId: string,
    filters?: {
      outletId?: string;
      deptId?: string;
      positionId?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<ShiftPosting[]> {
    let postings = Array.from(this.postings.values()).filter(
      (p) => p.orgId === orgId && p.status === "open"
    );

    // Apply filters
    if (filters?.outletId) {
      postings = postings.filter((p) => p.outletId === filters.outletId);
    }
    if (filters?.deptId) {
      postings = postings.filter((p) => p.deptId === filters.deptId);
    }
    if (filters?.positionId) {
      postings = postings.filter((p) => p.positionId === filters.positionId);
    }
    if (filters?.dateFrom) {
      postings = postings.filter((p) => p.shiftDate >= filters.dateFrom!);
    }
    if (filters?.dateTo) {
      postings = postings.filter((p) => p.shiftDate <= filters.dateTo!);
    }

    // Sort by date (earliest first)
    postings.sort((a, b) => a.shiftDate.localeCompare(b.shiftDate));

    return postings;
  }

  /**
   * Request swap for a posted shift
   */
  async requestSwap(
    postingId: string,
    requesterId: string,
    orgId: string
  ): Promise<SwapRequest> {
    const posting = this.postings.get(postingId);

    if (!posting) {
      throw new Error(`Shift posting not found: ${postingId}`);
    }

    if (posting.status !== "open") {
      throw new Error(`Shift posting is not available: ${posting.status}`);
    }

    if (posting.employeeId === requesterId) {
      throw new Error("Cannot request swap for your own shift");
    }

    // Check if requester already has a pending request for this posting
    const existingRequest = Array.from(this.swapRequests.values()).find(
      (r) => r.postingId === postingId && r.requesterId === requesterId && r.status === "pending"
    );

    if (existingRequest) {
      throw new Error("You already have a pending request for this shift");
    }

    // Calculate matching score
    const matchScore = await this.calculateMatchScore(posting, requesterId, orgId);

    const id = `swap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const swapRequest: SwapRequest = {
      id,
      orgId,
      postingId,
      requesterId,
      status: "pending",
      requestedAt: new Date().toISOString(),
      matchingScore: matchScore,
    };

    // Store in database
    this.swapRequests.set(id, swapRequest);

    // Update posting status to pending
    posting.status = "pending";
    posting.acceptedBy = requesterId;
    this.postings.set(postingId, posting);

    logger.info("[ShiftSwap] Swap requested", {
      swapId: id,
      postingId,
      requesterId,
      matchScore,
    });

    return swapRequest;
  }

  /**
   * Calculate match score between posting and requester
   */
  private async calculateMatchScore(
    posting: ShiftPosting,
    requesterId: string,
    orgId: string
  ): Promise<number> {
    let score = 0.5; // Base score

    // Skill matching (40% weight)
    const skillMatch = await this.calculateSkillMatch(posting, requesterId, orgId);
    score += skillMatch * 0.4;

    // Availability matching (30% weight)
    const availabilityMatch = await this.calculateAvailabilityMatch(posting, requesterId, orgId);
    score += availabilityMatch * 0.3;

    // Experience matching (30% weight)
    const experienceMatch = await this.calculateExperienceMatch(posting, requesterId, orgId);
    score += experienceMatch * 0.3;

    return Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * Calculate skill match score
   */
  private async calculateSkillMatch(
    posting: ShiftPosting,
    requesterId: string,
    orgId: string
  ): Promise<number> {
    // Mock implementation - in production, query employee skills from database
    const requiredSkills = posting.requiredSkills || [];
    const requiredCerts = posting.requiredCertifications || [];

    if (requiredSkills.length === 0 && requiredCerts.length === 0) {
      return 1.0; // No requirements = perfect match
    }

    // Mock: Check if requester has required skills (in production, query from database)
    const requesterSkills = await this.getEmployeeSkills(requesterId, orgId);
    const requesterCerts = await this.getEmployeeCertifications(requesterId, orgId);

    let skillScore = 0;
    let certScore = 0;

    // Calculate skill match
    if (requiredSkills.length > 0) {
      const matchingSkills = requiredSkills.filter((skill) =>
        requesterSkills.includes(skill)
      );
      skillScore = matchingSkills.length / requiredSkills.length;
    } else {
      skillScore = 1.0;
    }

    // Calculate certification match
    if (requiredCerts.length > 0) {
      const matchingCerts = requiredCerts.filter((cert) =>
        requesterCerts.includes(cert)
      );
      certScore = matchingCerts.length / requiredCerts.length;
    } else {
      certScore = 1.0;
    }

    // Weighted average
    return (skillScore * 0.7 + certScore * 0.3);
  }

  /**
   * Calculate availability match score
   */
  private async calculateAvailabilityMatch(
    posting: ShiftPosting,
    requesterId: string,
    orgId: string
  ): Promise<number> {
    // Mock implementation - in production, check employee availability
    // For now, assume 0.8 match (good availability)
    return 0.8;
  }

  /**
   * Calculate experience match score
   */
  private async calculateExperienceMatch(
    posting: ShiftPosting,
    requesterId: string,
    orgId: string
  ): Promise<number> {
    // Mock implementation - in production, compare employee experience with position requirements
    // For now, assume 0.9 match (good experience)
    return 0.9;
  }

  /**
   * Get employee skills (mock)
   */
  private async getEmployeeSkills(employeeId: string, orgId: string): Promise<string[]> {
    // Mock - in production, query from database
    return ["cooking", "prep", "plating"];
  }

  /**
   * Get employee certifications (mock)
   */
  private async getEmployeeCertifications(employeeId: string, orgId: string): Promise<string[]> {
    // Mock - in production, query from database
    return ["food_safety", "servsafe"];
  }

  /**
   * Approve swap request
   */
  async approveSwap(
    swapId: string,
    approverId: string,
    orgId: string
  ): Promise<SwapRequest> {
    const swapRequest = this.swapRequests.get(swapId);

    if (!swapRequest) {
      throw new Error(`Swap request not found: ${swapId}`);
    }

    if (swapRequest.status !== "pending") {
      throw new Error(`Swap request is not pending: ${swapRequest.status}`);
    }

    const posting = this.postings.get(swapRequest.postingId);

    if (!posting) {
      throw new Error(`Shift posting not found: ${swapRequest.postingId}`);
    }

    // Update swap request
    swapRequest.status = "approved";
    swapRequest.approvedBy = approverId;
    swapRequest.approvedAt = new Date().toISOString();
    this.swapRequests.set(swapId, swapRequest);

    // Update posting
    posting.status = "approved";
    posting.approvedBy = approverId;
    posting.approvedAt = new Date().toISOString();
    this.postings.set(swapRequest.postingId, posting);

    // Execute the swap (update shifts in database)
    await this.executeSwap(posting, swapRequest, orgId);

    logger.info("[ShiftSwap] Swap approved", {
      swapId,
      approverId,
      postingId: swapRequest.postingId,
      requesterId: swapRequest.requesterId,
    });

    return swapRequest;
  }

  /**
   * Reject swap request
   */
  async rejectSwap(
    swapId: string,
    approverId: string,
    reason: string,
    orgId: string
  ): Promise<SwapRequest> {
    const swapRequest = this.swapRequests.get(swapId);

    if (!swapRequest) {
      throw new Error(`Swap request not found: ${swapId}`);
    }

    if (swapRequest.status !== "pending") {
      throw new Error(`Swap request is not pending: ${swapRequest.status}`);
    }

    // Update swap request
    swapRequest.status = "rejected";
    swapRequest.approvedBy = approverId;
    swapRequest.approvedAt = new Date().toISOString();
    swapRequest.rejectedReason = reason;
    this.swapRequests.set(swapId, swapRequest);

    // Update posting back to open
    const posting = this.postings.get(swapRequest.postingId);
    if (posting) {
      posting.status = "open";
      posting.acceptedBy = undefined;
      this.postings.set(swapRequest.postingId, posting);
    }

    logger.info("[ShiftSwap] Swap rejected", {
      swapId,
      approverId,
      reason,
    });

    return swapRequest;
  }

  /**
   * Execute swap (update shifts in database)
   */
  private async executeSwap(
    posting: ShiftPosting,
    swapRequest: SwapRequest,
    orgId: string
  ): Promise<void> {
    // In production, this would:
    // 1. Update the original shift's employee_id to requesterId
    // 2. Create a new shift for the original employee (if needed for balance)
    // 3. Send notifications to both employees
    // 4. Update schedule records

    logger.info("[ShiftSwap] Swap executed", {
      postingId: posting.id,
      originalEmployeeId: posting.employeeId,
      newEmployeeId: swapRequest.requesterId,
      shiftId: posting.shiftId,
    });

    // Mock: Update shift in database (in production, use Supabase)
    // await supabase
    //   .from("shifts")
    //   .update({ employee_id: swapRequest.requesterId })
    //   .eq("id", posting.shiftId);
  }

  /**
   * Get swap requests for an employee
   */
  async getSwapRequests(
    employeeId: string,
    orgId: string,
    status?: SwapRequest["status"]
  ): Promise<SwapRequest[]> {
    let requests = Array.from(this.swapRequests.values()).filter(
      (r) => r.orgId === orgId && r.requesterId === employeeId
    );

    if (status) {
      requests = requests.filter((r) => r.status === status);
    }

    // Sort by requested date (newest first)
    requests.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));

    return requests;
  }

  /**
   * Get shift postings by employee
   */
  async getEmployeePostings(
    employeeId: string,
    orgId: string,
    status?: ShiftPosting["status"]
  ): Promise<ShiftPosting[]> {
    let postings = Array.from(this.postings.values()).filter(
      (p) => p.orgId === orgId && p.employeeId === employeeId
    );

    if (status) {
      postings = postings.filter((p) => p.status === status);
    }

    // Sort by posted date (newest first)
    postings.sort((a, b) => b.postedAt.localeCompare(a.postedAt));

    return postings;
  }

  /**
   * Cancel shift posting
   */
  async cancelPosting(postingId: string, employeeId: string): Promise<void> {
    const posting = this.postings.get(postingId);

    if (!posting) {
      throw new Error(`Shift posting not found: ${postingId}`);
    }

    if (posting.employeeId !== employeeId) {
      throw new Error("Only the posting employee can cancel");
    }

    if (posting.status === "approved" || posting.status === "completed") {
      throw new Error("Cannot cancel approved or completed posting");
    }

    // Cancel posting
    posting.status = "cancelled";
    this.postings.set(postingId, posting);

    // Cancel any pending swap requests
    const pendingRequests = Array.from(this.swapRequests.values()).filter(
      (r) => r.postingId === postingId && r.status === "pending"
    );

    for (const request of pendingRequests) {
      request.status = "cancelled";
      this.swapRequests.set(request.id, request);
    }

    logger.info("[ShiftSwap] Posting cancelled", {
      postingId,
      employeeId,
    });
  }

  /**
   * Get matching shifts for an employee
   */
  async getMatchingShifts(
    employeeId: string,
    orgId: string
  ): Promise<SwapMatch[]> {
    const postings = await this.getAvailablePostings(orgId);
    const matches: SwapMatch[] = [];

    for (const posting of postings) {
      const matchScore = await this.calculateMatchScore(posting, employeeId, orgId);

      if (matchScore > 0.5) { // Only include good matches
        const matchingFactors = {
          skillMatch: await this.calculateSkillMatch(posting, employeeId, orgId),
          availabilityMatch: await this.calculateAvailabilityMatch(posting, employeeId, orgId),
          experienceMatch: await this.calculateExperienceMatch(posting, employeeId, orgId),
        };

        matches.push({
          posting,
          request: null as any, // No request yet
          matchScore,
          matchingFactors,
        });
      }
    }

    // Sort by match score (highest first)
    matches.sort((a, b) => b.matchScore - a.matchScore);

    return matches;
  }
}

// Singleton instance
let shiftSwapMarketplaceInstance: ShiftSwapMarketplaceService | null = null;

export function getShiftSwapMarketplaceService(): ShiftSwapMarketplaceService {
  if (!shiftSwapMarketplaceInstance) {
    shiftSwapMarketplaceInstance = new ShiftSwapMarketplaceService();
  }
  return shiftSwapMarketplaceInstance;
}

export default ShiftSwapMarketplaceService;
