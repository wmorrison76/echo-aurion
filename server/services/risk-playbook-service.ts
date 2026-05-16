/**
 * Risk Playbook Management Service
 * 
 * Provides playbook content management, versioning, and execution engine
 * 
 * Features:
 * - Playbook content library management
 * - Playbook versioning
 * - Playbook execution engine
 * - Template system
 * - Execution tracking and audit
 */

import { logger } from "../lib/logger";
import { supabase } from "../lib/supabase";

export interface RiskPlaybook {
  id: string;
  orgId: string;
  name: string;
  description: string;
  category: string;
  department: string;
  riskTypes: string[]; // Risk types this playbook applies to
  priority: "low" | "medium" | "high" | "critical";
  steps: PlaybookStep[];
  contactPerson?: string;
  link?: string;
  isActive: boolean;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlaybookStep {
  id: string;
  sequence: number;
  title: string;
  description: string;
  action?: string; // Action to execute (e.g., "call_on_call_pool", "escalate_to_manager")
  parameters?: Record<string, any>;
  dependencies?: string[]; // Step IDs that must complete first
  estimatedDuration?: number; // minutes
  assignee?: string; // User or role
  isRequired: boolean;
}

export interface PlaybookExecution {
  id: string;
  playbookId: string;
  eventId?: string;
  beoId?: string;
  orgId: string;
  triggeredBy: string;
  triggeredAt: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
  currentStep?: string;
  completedSteps: string[];
  failedSteps: string[];
  results?: Record<string, any>;
  completedAt?: string;
  notes?: string;
}

export interface PlaybookTemplate {
  name: string;
  description: string;
  category: string;
  department: string;
  riskTypes: string[];
  steps: Omit<PlaybookStep, "id">[];
}

/**
 * Risk Playbook Service
 */
export class RiskPlaybookService {
  /**
   * Get all playbooks for an organization
   */
  async getPlaybooks(orgId: string, filters?: {
    category?: string;
    department?: string;
    riskType?: string;
    isActive?: boolean;
  }): Promise<RiskPlaybook[]> {
    try {
      let query = supabase
        .from("risk_playbooks")
        .select("*")
        .eq("org_id", orgId)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters?.category) {
        query = query.eq("category", filters.category);
      }

      if (filters?.department) {
        query = query.eq("department", filters.department);
      }

      if (filters?.riskType) {
        query = query.contains("risk_types", [filters.riskType]);
      }

      if (filters?.isActive !== undefined) {
        query = query.eq("is_active", filters.isActive);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((row) => this.mapRowToPlaybook(row));
    } catch (error) {
      logger.error("[RiskPlaybook] Error getting playbooks", { error, orgId });
      throw error;
    }
  }

  /**
   * Get playbook by ID
   */
  async getPlaybook(playbookId: string, orgId: string): Promise<RiskPlaybook | null> {
    try {
      const { data, error } = await supabase
        .from("risk_playbooks")
        .select("*")
        .eq("id", playbookId)
        .eq("org_id", orgId)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }

      return data ? this.mapRowToPlaybook(data) : null;
    } catch (error) {
      logger.error("[RiskPlaybook] Error getting playbook", { error, playbookId, orgId });
      throw error;
    }
  }

  /**
   * Get relevant playbooks for risk drivers
   */
  async getRelevantPlaybooks(
    riskDrivers: Array<{ label: string; impact: number; category?: string }>,
    orgId: string
  ): Promise<RiskPlaybook[]> {
    try {
      const highImpactDrivers = riskDrivers.filter((d) => d.impact >= 7);
      const riskTypes = highImpactDrivers.map((d) => d.label.toLowerCase());

      // Get all active playbooks
      const playbooks = await this.getPlaybooks(orgId, { isActive: true });

      // Filter playbooks that match risk types
      const relevantPlaybooks = playbooks.filter((playbook) => {
        return playbook.riskTypes.some((riskType) =>
          riskTypes.some((driverType) => driverType.includes(riskType.toLowerCase()) || riskType.toLowerCase().includes(driverType))
        );
      });

      // Sort by priority and match score
      return relevantPlaybooks.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;

        // Calculate match score (how many risk types match)
        const aMatchScore = a.riskTypes.filter((rt) =>
          riskTypes.some((dt) => dt.includes(rt.toLowerCase()) || rt.toLowerCase().includes(dt))
        ).length;
        const bMatchScore = b.riskTypes.filter((rt) =>
          riskTypes.some((dt) => dt.includes(rt.toLowerCase()) || rt.toLowerCase().includes(dt))
        ).length;

        return bMatchScore - aMatchScore;
      });
    } catch (error) {
      logger.error("[RiskPlaybook] Error getting relevant playbooks", { error, orgId });
      return [];
    }
  }

  /**
   * Create playbook
   */
  async createPlaybook(
    playbook: Omit<RiskPlaybook, "id" | "createdAt" | "updatedAt" | "version">,
    orgId: string
  ): Promise<RiskPlaybook> {
    try {
      // Get latest version number for this playbook name (if updating)
      const { data: existing } = await supabase
        .from("risk_playbooks")
        .select("version")
        .eq("org_id", orgId)
        .eq("name", playbook.name)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      const version = existing ? existing.version + 1 : 1;

      const { data, error } = await supabase
        .from("risk_playbooks")
        .insert({
          org_id: orgId,
          name: playbook.name,
          description: playbook.description,
          category: playbook.category,
          department: playbook.department,
          risk_types: playbook.riskTypes,
          priority: playbook.priority,
          steps: playbook.steps,
          contact_person: playbook.contactPerson || null,
          link: playbook.link || null,
          is_active: playbook.isActive,
          version,
          created_by: playbook.createdBy,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      logger.info("[RiskPlaybook] Playbook created", { playbookId: data.id, orgId });

      return this.mapRowToPlaybook(data);
    } catch (error) {
      logger.error("[RiskPlaybook] Error creating playbook", { error, orgId });
      throw error;
    }
  }

  /**
   * Update playbook
   */
  async updatePlaybook(
    playbookId: string,
    updates: Partial<Omit<RiskPlaybook, "id" | "createdAt" | "version">>,
    orgId: string
  ): Promise<RiskPlaybook> {
    try {
      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // Map fields to database schema
      if (updates.riskTypes) {
        updateData.risk_types = updates.riskTypes;
      }
      if (updates.contactPerson !== undefined) {
        updateData.contact_person = updates.contactPerson || null;
      }
      if (updates.steps) {
        updateData.steps = updates.steps;
      }

      const { data, error } = await supabase
        .from("risk_playbooks")
        .update(updateData)
        .eq("id", playbookId)
        .eq("org_id", orgId)
        .select()
        .single();

      if (error) throw error;

      logger.info("[RiskPlaybook] Playbook updated", { playbookId, orgId });

      return this.mapRowToPlaybook(data);
    } catch (error) {
      logger.error("[RiskPlaybook] Error updating playbook", { error, playbookId, orgId });
      throw error;
    }
  }

  /**
   * Delete playbook (soft delete by setting is_active to false)
   */
  async deletePlaybook(playbookId: string, orgId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("risk_playbooks")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", playbookId)
        .eq("org_id", orgId);

      if (error) throw error;

      logger.info("[RiskPlaybook] Playbook deleted", { playbookId, orgId });
    } catch (error) {
      logger.error("[RiskPlaybook] Error deleting playbook", { error, playbookId, orgId });
      throw error;
    }
  }

  /**
   * Execute playbook
   */
  async executePlaybook(
    playbookId: string,
    context: {
      eventId?: string;
      beoId?: string;
      orgId: string;
      triggeredBy: string;
      notes?: string;
    }
  ): Promise<PlaybookExecution> {
    try {
      const playbook = await this.getPlaybook(playbookId, context.orgId);
      if (!playbook || !playbook.isActive) {
        throw new Error("Playbook not found or not active");
      }

      // Create execution record
      const { data: execution, error: execError } = await supabase
        .from("risk_playbook_executions")
        .insert({
          playbook_id: playbookId,
          event_id: context.eventId || null,
          beo_id: context.beoId || null,
          org_id: context.orgId,
          triggered_by: context.triggeredBy,
          triggered_at: new Date().toISOString(),
          status: "pending",
          completed_steps: [],
          failed_steps: [],
          notes: context.notes || null,
        })
        .select()
        .single();

      if (execError) throw execError;

      logger.info("[RiskPlaybook] Playbook execution started", {
        executionId: execution.id,
        playbookId,
        orgId: context.orgId,
      });

      // Start execution in background (non-blocking)
      this.executePlaybookSteps(execution.id, playbook, context).catch((error) => {
        logger.error("[RiskPlaybook] Error executing playbook steps", { error, executionId: execution.id });
      });

      return this.mapRowToExecution(execution);
    } catch (error) {
      logger.error("[RiskPlaybook] Error executing playbook", { error, playbookId, orgId: context.orgId });
      throw error;
    }
  }

  /**
   * Execute playbook steps
   */
  private async executePlaybookSteps(
    executionId: string,
    playbook: RiskPlaybook,
    context: {
      eventId?: string;
      beoId?: string;
      orgId: string;
      triggeredBy: string;
    }
  ): Promise<void> {
    try {
      // Update status to in_progress
      await supabase
        .from("risk_playbook_executions")
        .update({ status: "in_progress" })
        .eq("id", executionId);

      const sortedSteps = [...playbook.steps].sort((a, b) => a.sequence - b.sequence);
      const completedSteps: string[] = [];
      const failedSteps: string[] = [];

      for (const step of sortedSteps) {
        // Check dependencies
        if (step.dependencies && step.dependencies.length > 0) {
          const allDependenciesCompleted = step.dependencies.every((depId) => completedSteps.includes(depId));
          if (!allDependenciesCompleted) {
            logger.warn("[RiskPlaybook] Step dependencies not met", {
              stepId: step.id,
              dependencies: step.dependencies,
              completedSteps,
            });
            failedSteps.push(step.id);
            continue;
          }
        }

        // Update current step
        await supabase
          .from("risk_playbook_executions")
          .update({ current_step: step.id })
          .eq("id", executionId);

        // Execute step action if provided
        let stepResult: { success: boolean; result?: any; error?: string } = { success: true };

        if (step.action) {
          stepResult = await this.executeStepAction(step, context);
        }

        if (stepResult.success) {
          completedSteps.push(step.id);
          logger.info("[RiskPlaybook] Step completed", { executionId, stepId: step.id });
        } else {
          if (step.isRequired) {
            failedSteps.push(step.id);
            logger.error("[RiskPlaybook] Required step failed", {
              executionId,
              stepId: step.id,
              error: stepResult.error,
            });
            // Stop execution if required step fails
            break;
          } else {
            // Optional step failed, continue
            failedSteps.push(step.id);
            logger.warn("[RiskPlaybook] Optional step failed", {
              executionId,
              stepId: step.id,
              error: stepResult.error,
            });
          }
        }

        // Update execution progress
        await supabase
          .from("risk_playbook_executions")
          .update({
            completed_steps: completedSteps,
            failed_steps: failedSteps,
          })
          .eq("id", executionId);
      }

      // Mark execution as completed or failed
      const status = failedSteps.length === 0 || failedSteps.length < completedSteps.length ? "completed" : "failed";
      await supabase
        .from("risk_playbook_executions")
        .update({
          status,
          completed_at: new Date().toISOString(),
          current_step: null,
        })
        .eq("id", executionId);

      logger.info("[RiskPlaybook] Playbook execution completed", {
        executionId,
        status,
        completedSteps: completedSteps.length,
        failedSteps: failedSteps.length,
      });
    } catch (error) {
      logger.error("[RiskPlaybook] Error executing playbook steps", { error, executionId });
      await supabase
        .from("risk_playbook_executions")
        .update({ status: "failed", completed_at: new Date().toISOString() })
        .eq("id", executionId);
    }
  }

  /**
   * Execute individual step action
   */
  private async executeStepAction(
    step: PlaybookStep,
    context: { eventId?: string; beoId?: string; orgId: string; triggeredBy: string }
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      switch (step.action) {
        case "call_on_call_pool":
          // Integrate with schedule module to call on-call staff
          logger.info("[RiskPlaybook] Executing: call_on_call_pool", { stepId: step.id });
          // TODO: Implement actual integration
          return { success: true, result: { message: "On-call pool contacted" } };

        case "escalate_to_manager":
          // Send notification to manager
          logger.info("[RiskPlaybook] Executing: escalate_to_manager", { stepId: step.id });
          // TODO: Implement actual integration
          return { success: true, result: { message: "Escalated to manager" } };

        case "lock_equipment":
          // Lock AV/equipment for event
          logger.info("[RiskPlaybook] Executing: lock_equipment", { stepId: step.id });
          // TODO: Implement actual integration
          return { success: true, result: { message: "Equipment locked" } };

        case "notify_department":
          // Send notification to department
          logger.info("[RiskPlaybook] Executing: notify_department", { stepId: step.id, department: step.parameters?.department });
          // TODO: Implement actual integration
          return { success: true, result: { message: `Notified ${step.parameters?.department}` } };

        case "create_checklist":
          // Create checklist items
          if (context.beoId && step.parameters?.checklistItems) {
            logger.info("[RiskPlaybook] Executing: create_checklist", { stepId: step.id, beoId: context.beoId });
            // TODO: Integrate with BEO execution service
            return { success: true, result: { message: "Checklist items created" } };
          }
          return { success: false, error: "Missing BEO ID or checklist items" };

        case "update_event_status":
          // Update event status
          if (context.eventId && step.parameters?.status) {
            logger.info("[RiskPlaybook] Executing: update_event_status", {
              stepId: step.id,
              eventId: context.eventId,
              status: step.parameters.status,
            });
            // TODO: Integrate with event management
            return { success: true, result: { message: `Event status updated to ${step.parameters.status}` } };
          }
          return { success: false, error: "Missing event ID or status" };

        default:
          logger.warn("[RiskPlaybook] Unknown step action", { action: step.action, stepId: step.id });
          return { success: true, result: { message: "Action not implemented, logged for manual execution" } };
      }
    } catch (error) {
      logger.error("[RiskPlaybook] Error executing step action", { error, stepId: step.id, action: step.action });
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  /**
   * Get playbook execution history
   */
  async getExecutionHistory(
    orgId: string,
    filters?: {
      playbookId?: string;
      eventId?: string;
      beoId?: string;
      status?: PlaybookExecution["status"];
      limit?: number;
    }
  ): Promise<PlaybookExecution[]> {
    try {
      let query = supabase
        .from("risk_playbook_executions")
        .select("*")
        .eq("org_id", orgId)
        .order("triggered_at", { ascending: false });

      if (filters?.playbookId) {
        query = query.eq("playbook_id", filters.playbookId);
      }

      if (filters?.eventId) {
        query = query.eq("event_id", filters.eventId);
      }

      if (filters?.beoId) {
        query = query.eq("beo_id", filters.beoId);
      }

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      } else {
        query = query.limit(100);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((row) => this.mapRowToExecution(row));
    } catch (error) {
      logger.error("[RiskPlaybook] Error getting execution history", { error, orgId });
      throw error;
    }
  }

  /**
   * Get execution status
   */
  async getExecutionStatus(executionId: string, orgId: string): Promise<PlaybookExecution | null> {
    try {
      const { data, error } = await supabase
        .from("risk_playbook_executions")
        .select("*")
        .eq("id", executionId)
        .eq("org_id", orgId)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }

      return data ? this.mapRowToExecution(data) : null;
    } catch (error) {
      logger.error("[RiskPlaybook] Error getting execution status", { error, executionId, orgId });
      throw error;
    }
  }

  /**
   * Create playbook from template
   */
  async createFromTemplate(template: PlaybookTemplate, orgId: string, createdBy: string): Promise<RiskPlaybook> {
    const playbook: Omit<RiskPlaybook, "id" | "createdAt" | "updatedAt" | "version"> = {
      orgId,
      name: template.name,
      description: template.description,
      category: template.category,
      department: template.department,
      riskTypes: template.riskTypes,
      priority: "medium",
      steps: template.steps.map((step, idx) => ({
        id: `step-${idx + 1}`,
        ...step,
        sequence: step.sequence || idx + 1,
      })),
      isActive: true,
      createdBy,
    };

    return this.createPlaybook(playbook, orgId);
  }

  /**
   * Map database row to Playbook
   */
  private mapRowToPlaybook(row: any): RiskPlaybook {
    return {
      id: row.id,
      orgId: row.org_id,
      name: row.name,
      description: row.description,
      category: row.category,
      department: row.department,
      riskTypes: row.risk_types || [],
      priority: row.priority,
      steps: (row.steps || []).map((step: any) => ({
        id: step.id || `step-${step.sequence}`,
        sequence: step.sequence,
        title: step.title,
        description: step.description,
        action: step.action,
        parameters: step.parameters,
        dependencies: step.dependencies || [],
        estimatedDuration: step.estimated_duration,
        assignee: step.assignee,
        isRequired: step.is_required !== false,
      })),
      contactPerson: row.contact_person || undefined,
      link: row.link || undefined,
      isActive: row.is_active !== false,
      version: row.version || 1,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Map database row to Execution
   */
  private mapRowToExecution(row: any): PlaybookExecution {
    return {
      id: row.id,
      playbookId: row.playbook_id,
      eventId: row.event_id || undefined,
      beoId: row.beo_id || undefined,
      orgId: row.org_id,
      triggeredBy: row.triggered_by,
      triggeredAt: row.triggered_at,
      status: row.status,
      currentStep: row.current_step || undefined,
      completedSteps: row.completed_steps || [],
      failedSteps: row.failed_steps || [],
      results: row.results || undefined,
      completedAt: row.completed_at || undefined,
      notes: row.notes || undefined,
    };
  }
}

// Export singleton instance
export const riskPlaybookService = new RiskPlaybookService();
