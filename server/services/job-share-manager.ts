/**
 * Job Share Manager
 * 
 * Manages job share postings, approvals, and assignments
 * Integrates with Chef for approvals
 * 
 * Features:
 * - Job share posting creation
 * - Chef approval workflow
 * - Employee applications
 * - Assignment management
 */

import { logger } from '../utils/logger.js';
import * as crypto from 'crypto';
import type { JobShareOpportunity } from './staff-shortage-forecaster.js';

export interface JobShareApplication {
  id: string;
  opportunityId: string;
  employeeId: string;
  employeeName: string;
  appliedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'assigned' | 'cancelled';
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface JobSharePosting {
  opportunity: JobShareOpportunity;
  applications: JobShareApplication[];
  status: 'draft' | 'pending_chef_approval' | 'posted' | 'filled' | 'cancelled';
  postedAt?: string;
  filledAt?: string;
  filledBy?: string;
}

class JobShareManager {
  private postings: Map<string, JobSharePosting> = new Map();

  /**
   * Create job share posting
   */
  async createJobSharePosting(
    opportunity: JobShareOpportunity,
    createdBy: string
  ): Promise<JobSharePosting> {
    try {
      logger.info(`[JobShareManager] Creating job share posting for ${opportunity.roleName} on ${opportunity.date}`);

      const posting: JobSharePosting = {
        opportunity,
        applications: [],
        status: 'draft',
      };

      this.postings.set(opportunity.id, posting);

      return posting;
    } catch (error) {
      logger.error('[JobShareManager] Error creating posting:', error);
      throw error;
    }
  }

  /**
   * Submit job share for Chef approval
   */
  async submitForChefApproval(
    opportunityId: string,
    chefId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const posting = this.postings.get(opportunityId);
      if (!posting) {
        throw new Error('Job share posting not found');
      }

      posting.status = 'pending_chef_approval';
      posting.opportunity.chefApproved = false;

      // In production, send notification to chef
      logger.info(`[JobShareManager] Job share ${opportunityId} submitted for chef approval`);

      return {
        success: true,
        message: 'Job share submitted for chef approval',
      };
    } catch (error) {
      logger.error('[JobShareManager] Error submitting for approval:', error);
      return {
        success: false,
        message: `Failed to submit: ${error}`,
      };
    }
  }

  /**
   * Chef approves job share
   */
  async chefApproveJobShare(
    opportunityId: string,
    chefId: string,
    chefName: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const posting = this.postings.get(opportunityId);
      if (!posting) {
        throw new Error('Job share posting not found');
      }

      posting.opportunity.chefApproved = true;
      posting.opportunity.chefApprovedBy = chefId;
      posting.opportunity.chefApprovedAt = new Date().toISOString();
      posting.status = 'posted';
      posting.postedAt = new Date().toISOString();

      logger.info(`[JobShareManager] Chef ${chefName} approved job share ${opportunityId}`);

      return {
        success: true,
        message: 'Job share approved and posted',
      };
    } catch (error) {
      logger.error('[JobShareManager] Error approving job share:', error);
      return {
        success: false,
        message: `Failed to approve: ${error}`,
      };
    }
  }

  /**
   * Chef rejects job share
   */
  async chefRejectJobShare(
    opportunityId: string,
    chefId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const posting = this.postings.get(opportunityId);
      if (!posting) {
        throw new Error('Job share posting not found');
      }

      posting.status = 'cancelled';
      posting.opportunity.status = 'cancelled';

      logger.info(`[JobShareManager] Chef rejected job share ${opportunityId}: ${reason}`);

      return {
        success: true,
        message: 'Job share rejected',
      };
    } catch (error) {
      logger.error('[JobShareManager] Error rejecting job share:', error);
      return {
        success: false,
        message: `Failed to reject: ${error}`,
      };
    }
  }

  /**
   * Employee applies for job share
   */
  async applyForJobShare(
    opportunityId: string,
    employeeId: string,
    employeeName: string,
    notes?: string
  ): Promise<JobShareApplication> {
    try {
      const posting = this.postings.get(opportunityId);
      if (!posting) {
        throw new Error('Job share posting not found');
      }

      if (posting.status !== 'posted') {
        throw new Error('Job share is not currently accepting applications');
      }

      const application: JobShareApplication = {
        id: `app_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
        opportunityId,
        employeeId,
        employeeName,
        appliedAt: new Date().toISOString(),
        status: 'pending',
        notes,
      };

      posting.applications.push(application);

      logger.info(`[JobShareManager] Employee ${employeeName} applied for job share ${opportunityId}`);

      return application;
    } catch (error) {
      logger.error('[JobShareManager] Error applying for job share:', error);
      throw error;
    }
  }

  /**
   * Assign employee to job share
   */
  async assignJobShare(
    opportunityId: string,
    applicationId: string,
    assignedBy: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const posting = this.postings.get(opportunityId);
      if (!posting) {
        throw new Error('Job share posting not found');
      }

      const application = posting.applications.find(a => a.id === applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      // Mark application as assigned
      application.status = 'assigned';
      application.approvedBy = assignedBy;
      application.approvedAt = new Date().toISOString();

      // Mark other applications as rejected
      posting.applications.forEach(app => {
        if (app.id !== applicationId) {
          app.status = 'rejected';
        }
      });

      // Update posting
      posting.status = 'filled';
      posting.filledAt = new Date().toISOString();
      posting.filledBy = application.employeeId;
      posting.opportunity.status = 'filled';
      posting.opportunity.filledBy = application.employeeId;

      logger.info(`[JobShareManager] Job share ${opportunityId} assigned to ${application.employeeName}`);

      return {
        success: true,
        message: `Job share assigned to ${application.employeeName}`,
      };
    } catch (error) {
      logger.error('[JobShareManager] Error assigning job share:', error);
      return {
        success: false,
        message: `Failed to assign: ${error}`,
      };
    }
  }

  /**
   * Get job share postings
   */
  async getJobSharePostings(
    filters?: {
      status?: string;
      date?: string;
      role?: string;
      chefApproved?: boolean;
    }
  ): Promise<JobSharePosting[]> {
    let postings = Array.from(this.postings.values());

    if (filters) {
      if (filters.status) {
        postings = postings.filter(p => p.status === filters.status);
      }
      if (filters.date) {
        postings = postings.filter(p => p.opportunity.date === filters.date);
      }
      if (filters.role) {
        postings = postings.filter(p => p.opportunity.role === filters.role);
      }
      if (filters.chefApproved !== undefined) {
        postings = postings.filter(p => p.opportunity.chefApproved === filters.chefApproved);
      }
    }

    return postings;
  }

  /**
   * Get job share posting by ID
   */
  async getJobSharePosting(opportunityId: string): Promise<JobSharePosting | null> {
    return this.postings.get(opportunityId) || null;
  }

  /**
   * Batch create job share postings from forecast
   */
  async batchCreateFromForecast(
    opportunities: JobShareOpportunity[],
    createdBy: string
  ): Promise<JobSharePosting[]> {
    const postings: JobSharePosting[] = [];

    for (const opportunity of opportunities) {
      const posting = await this.createJobSharePosting(opportunity, createdBy);
      postings.push(posting);
    }

    return postings;
  }
}

export const jobShareManager = new JobShareManager();
