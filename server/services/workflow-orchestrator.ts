import { logger } from "../lib/logger";
import { safeRequire } from "../utils/safe-require";

type VercelPostgresModule = { sql: any };
const vercelPg = safeRequire<VercelPostgresModule>("@vercel/postgres");

export const sql =
  vercelPg?.sql ??
  ((..._args: any[]) => {
    throw new Error(
      "Workflow orchestrator requires @vercel/postgres, which is not installed in this environment.",
    );
  });

export interface WorkflowTemplate {
  id: string;
  orgId: string;
  templateName: string;
  templateSlug: string;
  description: string;
  eventType: string;
  totalSteps: number;
  requiresSequentialSteps: boolean;
  allowStepReversal: boolean;
  autoProgressOnCompletion: boolean;
  estimatedDurationHours: number;
  createdBy: string;
  isActive: boolean;
  isDefault: boolean;
}

export interface WorkflowInstance {
  id: string;
  eventId: string;
  orgId: string;
  templateId: string;
  workflowStatus: string;
  currentStepNumber: number;
  currentStepId: string;
  totalSteps: number;
  completedSteps: number;
  progressPercent: number;
  startedAt: Date | null;
  completedAt: Date | null;
  estimatedCompletion: Date | null;
  initiatedByUserId: string;
  notes: string;
  failureReason: string;
}

export interface WorkflowStep {
  id: string;
  stepNumber: number;
  stepName: string;
  stepDescription: string;
  stepType: string;
  estimatedDurationMinutes: number;
  requiredRoleForExecution: string;
  canSkip: boolean;
  isBlocking: boolean;
  autoCompleteWhen: string;
  autoCompleteThreshold: number;
  notifyDepartments: string[];
}

export interface StepProgression {
  id: string;
  workflowInstanceId: string;
  stepId: string;
  stepNumber: number;
  stepStatus: string;
  startedAt: Date | null;
  completedAt: Date | null;
  durationSeconds: number | null;
  approvalsRequired: number;
  approvalsReceived: number;
  approvalPercent: number;
  acknowledgementsRequired: number;
  acknowledgementsReceived: number;
  acknowledgmentPercent: number;
  completionNotes: string;
}

export interface WorkflowCheckpoint {
  id: string;
  stepProgressionId: string;
  checkpointName: string;
  checkpointDescription: string;
  requiresApproval: boolean;
  approverRole: string;
  approvalStatus: string;
  approvedByUserId: string;
  approvedAt: Date | null;
  approvalNotes: string;
  validationRequired: boolean;
  validationStatus: string;
}

class WorkflowOrchestrator {
  async createWorkflowInstance(
    eventId: string,
    orgId: string,
    templateId: string,
    initiatedByUserId: string,
  ): Promise<string> {
    try {
      const templateResult = await sql`
        SELECT total_steps, estimated_duration_hours
        FROM event_workflow_templates
        WHERE id = ${templateId}
          AND org_id = ${orgId}
        LIMIT 1;
      `;

      if (templateResult.rows.length === 0) {
        throw new Error("Template not found");
      }

      const { total_steps, estimated_duration_hours } = templateResult.rows[0];

      const instanceResult = await sql`
        INSERT INTO event_workflow_instances (
          id,
          event_id,
          org_id,
          template_id,
          workflow_status,
          current_step_number,
          total_steps,
          completed_steps,
          progress_percent,
          initiated_by_user_id,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          ${eventId},
          ${orgId},
          ${templateId},
          'not_started',
          0,
          ${total_steps},
          0,
          0,
          ${initiatedByUserId},
          NOW(),
          NOW()
        )
        RETURNING id;
      `;

      const instanceId = instanceResult.rows[0].id;

      await sql`
        INSERT INTO workflow_step_progression (
          id,
          workflow_instance_id,
          step_id,
          step_number,
          step_status,
          approvals_required,
          approvals_received,
          approval_percent,
          acknowledgments_required,
          acknowledgments_received,
          acknowledgment_percent,
          created_at,
          updated_at
        )
        SELECT
          gen_random_uuid(),
          ${instanceId},
          ws.id,
          ws.step_number,
          'pending',
          CASE WHEN ws.step_type = 'approval' THEN 1 ELSE 0 END,
          0,
          0,
          CASE WHEN ws.step_type = 'acknowledgment' THEN 1 ELSE 0 END,
          0,
          0,
          NOW(),
          NOW()
        FROM workflow_step_definitions ws
        WHERE ws.template_id = ${templateId}
        ORDER BY ws.step_number;
      `;

      logger.info("[WorkflowOrchestrator] Workflow instance created", {
        instanceId,
        eventId,
        templateId,
        totalSteps: total_steps,
      });

      return instanceId;
    } catch (error) {
      logger.error(
        "[WorkflowOrchestrator] Error creating workflow instance:",
        error,
      );
      throw error;
    }
  }

  async startWorkflow(instanceId: string): Promise<boolean> {
    try {
      await sql`
        UPDATE event_workflow_instances
        SET workflow_status = 'in_progress',
            started_at = NOW()
        WHERE id = ${instanceId};
      `;

      const firstStepResult = await sql`
        UPDATE workflow_step_progression
        SET step_status = 'in_progress',
            started_at = NOW()
        WHERE workflow_instance_id = ${instanceId}
          AND step_number = 1
        RETURNING step_id;
      `;

      if (firstStepResult.rows.length > 0) {
        await sql`
          UPDATE event_workflow_instances
          SET current_step_number = 1,
              current_step_id = ${firstStepResult.rows[0].step_id}
          WHERE id = ${instanceId};
        `;
      }

      await this.recordAuditTrail(instanceId, "workflow_initiated", 1, null);

      logger.info("[WorkflowOrchestrator] Workflow started", { instanceId });

      return true;
    } catch (error) {
      logger.error("[WorkflowOrchestrator] Error starting workflow:", error);
      throw error;
    }
  }

  async completeStep(
    instanceId: string,
    stepNumber: number,
    notes?: string,
  ): Promise<boolean> {
    try {
      const stepResult = await sql`
        SELECT step_id, step_status
        FROM workflow_step_progression
        WHERE workflow_instance_id = ${instanceId}
          AND step_number = ${stepNumber}
        LIMIT 1;
      `;

      if (stepResult.rows.length === 0) {
        throw new Error("Step not found");
      }

      const stepId = stepResult.rows[0].step_id;

      await sql`
        UPDATE workflow_step_progression
        SET step_status = 'completed',
            completed_at = NOW(),
            duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER,
            completion_notes = ${notes || null},
            updated_at = NOW()
        WHERE workflow_instance_id = ${instanceId}
          AND step_number = ${stepNumber};
      `;

      const nextStepResult = await sql`
        SELECT step_id, step_number
        FROM workflow_step_progression
        WHERE workflow_instance_id = ${instanceId}
          AND step_number = ${stepNumber + 1}
        LIMIT 1;
      `;

      let nextStepStarted = false;
      if (nextStepResult.rows.length > 0) {
        const nextStep = nextStepResult.rows[0];

        const templateResult = await sql`
          SELECT auto_progress_on_completion
          FROM event_workflow_instances
          WHERE id = ${instanceId}
          LIMIT 1;
        `;

        if (templateResult.rows.length > 0) {
          const autoProgress = await sql`
            SELECT auto_progress_on_completion
            FROM event_workflow_instances ewi
            JOIN event_workflow_templates ewt ON ewi.template_id = ewt.id
            WHERE ewi.id = ${instanceId}
            LIMIT 1;
          `;

          if (autoProgress.rows[0].auto_progress_on_completion) {
            await sql`
              UPDATE workflow_step_progression
              SET step_status = 'in_progress',
                  started_at = NOW()
              WHERE workflow_instance_id = ${instanceId}
                AND step_number = ${stepNumber + 1};
            `;

            await sql`
              UPDATE event_workflow_instances
              SET current_step_number = ${stepNumber + 1},
                  current_step_id = ${nextStep.step_id}
              WHERE id = ${instanceId};
            `;

            nextStepStarted = true;
          }
        }
      }

      await this.recordAuditTrail(
        instanceId,
        "step_completed",
        stepNumber,
        null,
      );

      logger.info("[WorkflowOrchestrator] Step completed", {
        instanceId,
        stepNumber,
        nextStepStarted,
      });

      return nextStepStarted;
    } catch (error) {
      logger.error("[WorkflowOrchestrator] Error completing step:", error);
      throw error;
    }
  }

  async approveStep(
    instanceId: string,
    stepNumber: number,
    approverUserId: string,
    approvalNotes?: string,
  ): Promise<boolean> {
    try {
      const progressionResult = await sql`
        SELECT id, approvals_required, approvals_received
        FROM workflow_step_progression
        WHERE workflow_instance_id = ${instanceId}
          AND step_number = ${stepNumber}
        LIMIT 1;
      `;

      if (progressionResult.rows.length === 0) {
        throw new Error("Step progression not found");
      }

      const progression = progressionResult.rows[0];
      const newApprovalsReceived = progression.approvals_received + 1;
      const approvalPercent =
        progression.approvals_required > 0
          ? Math.round(
              (newApprovalsReceived / progression.approvals_required) * 100,
            )
          : 100;

      await sql`
        UPDATE workflow_step_progression
        SET approvals_received = ${newApprovalsReceived},
            approval_percent = ${approvalPercent},
            updated_at = NOW()
        WHERE workflow_instance_id = ${instanceId}
          AND step_number = ${stepNumber};
      `;

      const checkpointResult = await sql`
        INSERT INTO workflow_checkpoints (
          id,
          step_progression_id,
          workflow_instance_id,
          checkpoint_name,
          checkpoint_description,
          requires_approval,
          approval_status,
          approved_by_user_id,
          approved_at,
          approval_notes,
          created_at
        ) VALUES (
          gen_random_uuid(),
          ${progression.id},
          ${instanceId},
          'Approval Checkpoint',
          ${approvalNotes || ""},
          TRUE,
          'passed',
          ${approverUserId},
          NOW(),
          ${approvalNotes || ""},
          NOW()
        )
        RETURNING id;
      `;

      await this.recordAuditTrail(
        instanceId,
        "approval_granted",
        stepNumber,
        approverUserId,
      );

      logger.info("[WorkflowOrchestrator] Step approved", {
        instanceId,
        stepNumber,
        approverUserId,
      });

      return approvalPercent === 100;
    } catch (error) {
      logger.error("[WorkflowOrchestrator] Error approving step:", error);
      throw error;
    }
  }

  async acknowledgeStep(
    instanceId: string,
    stepNumber: number,
    acknowledgerUserId: string,
  ): Promise<boolean> {
    try {
      const progressionResult = await sql`
        SELECT id, acknowledgments_required, acknowledgments_received
        FROM workflow_step_progression
        WHERE workflow_instance_id = ${instanceId}
          AND step_number = ${stepNumber}
        LIMIT 1;
      `;

      if (progressionResult.rows.length === 0) {
        throw new Error("Step progression not found");
      }

      const progression = progressionResult.rows[0];
      const newAcknowledgementsReceived =
        progression.acknowledgments_received + 1;
      const acknowledgmentPercent =
        progression.acknowledgments_required > 0
          ? Math.round(
              (newAcknowledgementsReceived /
                progression.acknowledgments_required) *
                100,
            )
          : 100;

      await sql`
        UPDATE workflow_step_progression
        SET acknowledgments_received = ${newAcknowledgementsReceived},
            acknowledgment_percent = ${acknowledgmentPercent},
            updated_at = NOW()
        WHERE workflow_instance_id = ${instanceId}
          AND step_number = ${stepNumber};
      `;

      logger.info("[WorkflowOrchestrator] Step acknowledged", {
        instanceId,
        stepNumber,
        acknowledgerUserId,
      });

      return acknowledgmentPercent === 100;
    } catch (error) {
      logger.error("[WorkflowOrchestrator] Error acknowledging step:", error);
      throw error;
    }
  }

  async skipStep(
    instanceId: string,
    stepNumber: number,
    reason: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const stepResult = await sql`
        SELECT is_blocking
        FROM workflow_step_definitions wsd
        JOIN workflow_step_progression wsp
          ON wsd.id = wsp.step_id
        WHERE wsp.workflow_instance_id = ${instanceId}
          AND wsp.step_number = ${stepNumber}
        LIMIT 1;
      `;

      if (stepResult.rows.length === 0) {
        throw new Error("Step not found");
      }

      if (stepResult.rows[0].is_blocking) {
        throw new Error("Cannot skip blocking step");
      }

      await sql`
        UPDATE workflow_step_progression
        SET step_status = 'skipped',
            completed_at = NOW(),
            skip_reason = ${reason},
            updated_at = NOW()
        WHERE workflow_instance_id = ${instanceId}
          AND step_number = ${stepNumber};
      `;

      await this.recordAuditTrail(
        instanceId,
        "step_skipped",
        stepNumber,
        userId,
      );

      logger.info("[WorkflowOrchestrator] Step skipped", {
        instanceId,
        stepNumber,
        reason,
      });

      return true;
    } catch (error) {
      logger.error("[WorkflowOrchestrator] Error skipping step:", error);
      throw error;
    }
  }

  async getWorkflowStatus(
    instanceId: string,
  ): Promise<WorkflowInstance | null> {
    try {
      const result = await sql`
        SELECT
          id,
          event_id,
          org_id,
          template_id,
          workflow_status,
          current_step_number,
          current_step_id,
          total_steps,
          completed_steps,
          progress_percent,
          started_at,
          completed_at,
          estimated_completion,
          initiated_by_user_id,
          notes,
          failure_reason
        FROM event_workflow_instances
        WHERE id = ${instanceId}
        LIMIT 1;
      `;

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        eventId: row.event_id,
        orgId: row.org_id,
        templateId: row.template_id,
        workflowStatus: row.workflow_status,
        currentStepNumber: row.current_step_number,
        currentStepId: row.current_step_id,
        totalSteps: row.total_steps,
        completedSteps: row.completed_steps,
        progressPercent: parseFloat(row.progress_percent),
        startedAt: row.started_at ? new Date(row.started_at) : null,
        completedAt: row.completed_at ? new Date(row.completed_at) : null,
        estimatedCompletion: row.estimated_completion
          ? new Date(row.estimated_completion)
          : null,
        initiatedByUserId: row.initiated_by_user_id,
        notes: row.notes,
        failureReason: row.failure_reason,
      };
    } catch (error) {
      logger.error(
        "[WorkflowOrchestrator] Error getting workflow status:",
        error,
      );
      throw error;
    }
  }

  async getStepProgression(
    instanceId: string,
    stepNumber: number,
  ): Promise<StepProgression | null> {
    try {
      const result = await sql`
        SELECT
          id,
          workflow_instance_id,
          step_id,
          step_number,
          step_status,
          started_at,
          completed_at,
          duration_seconds,
          approvals_required,
          approvals_received,
          approval_percent,
          acknowledgments_required,
          acknowledgments_received,
          acknowledgment_percent,
          completion_notes
        FROM workflow_step_progression
        WHERE workflow_instance_id = ${instanceId}
          AND step_number = ${stepNumber}
        LIMIT 1;
      `;

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        workflowInstanceId: row.workflow_instance_id,
        stepId: row.step_id,
        stepNumber: row.step_number,
        stepStatus: row.step_status,
        startedAt: row.started_at ? new Date(row.started_at) : null,
        completedAt: row.completed_at ? new Date(row.completed_at) : null,
        durationSeconds: row.duration_seconds,
        approvalsRequired: row.approvals_required,
        approvalsReceived: row.approvals_received,
        approvalPercent: parseFloat(row.approval_percent),
        acknowledgementsRequired: row.acknowledgments_required,
        acknowledgementsReceived: row.acknowledgments_received,
        acknowledgmentPercent: parseFloat(row.acknowledgment_percent),
        completionNotes: row.completion_notes,
      };
    } catch (error) {
      logger.error(
        "[WorkflowOrchestrator] Error getting step progression:",
        error,
      );
      throw error;
    }
  }

  async getWorkflowSteps(templateId: string): Promise<WorkflowStep[]> {
    try {
      const result = await sql`
        SELECT
          id,
          step_number,
          step_name,
          step_description,
          step_type,
          estimated_duration_minutes,
          required_role_for_execution,
          can_skip,
          is_blocking,
          auto_complete_when,
          auto_complete_threshold,
          notify_departments
        FROM workflow_step_definitions
        WHERE template_id = ${templateId}
        ORDER BY step_number ASC;
      `;

      return result.rows.map((row) => ({
        id: row.id,
        stepNumber: row.step_number,
        stepName: row.step_name,
        stepDescription: row.step_description,
        stepType: row.step_type,
        estimatedDurationMinutes: row.estimated_duration_minutes,
        requiredRoleForExecution: row.required_role_for_execution,
        canSkip: row.can_skip,
        isBlocking: row.is_blocking,
        autoCompleteWhen: row.auto_complete_when,
        autoCompleteThreshold: row.auto_complete_threshold,
        notifyDepartments: row.notify_departments || [],
      }));
    } catch (error) {
      logger.error(
        "[WorkflowOrchestrator] Error getting workflow steps:",
        error,
      );
      throw error;
    }
  }

  async pauseWorkflow(instanceId: string, reason?: string): Promise<boolean> {
    try {
      await sql`
        UPDATE event_workflow_instances
        SET workflow_status = 'paused',
            notes = ${reason || "Paused by administrator"}
        WHERE id = ${instanceId};
      `;

      await this.recordAuditTrail(instanceId, "workflow_paused", null, null);

      logger.info("[WorkflowOrchestrator] Workflow paused", { instanceId });

      return true;
    } catch (error) {
      logger.error("[WorkflowOrchestrator] Error pausing workflow:", error);
      throw error;
    }
  }

  async resumeWorkflow(instanceId: string): Promise<boolean> {
    try {
      await sql`
        UPDATE event_workflow_instances
        SET workflow_status = 'in_progress'
        WHERE id = ${instanceId}
          AND workflow_status = 'paused';
      `;

      await this.recordAuditTrail(instanceId, "workflow_resumed", null, null);

      logger.info("[WorkflowOrchestrator] Workflow resumed", { instanceId });

      return true;
    } catch (error) {
      logger.error("[WorkflowOrchestrator] Error resuming workflow:", error);
      throw error;
    }
  }

  async completeWorkflow(instanceId: string): Promise<boolean> {
    try {
      await sql`
        UPDATE event_workflow_instances
        SET workflow_status = 'completed',
            completed_at = NOW(),
            progress_percent = 100
        WHERE id = ${instanceId};
      `;

      await this.recordAuditTrail(instanceId, "workflow_completed", null, null);

      logger.info("[WorkflowOrchestrator] Workflow completed", { instanceId });

      return true;
    } catch (error) {
      logger.error("[WorkflowOrchestrator] Error completing workflow:", error);
      throw error;
    }
  }

  private async recordAuditTrail(
    workflowInstanceId: string,
    action: string,
    stepNumber: number | null,
    actionByUserId: string | null,
  ): Promise<void> {
    try {
      const eventResult = await sql`
        SELECT event_id FROM event_workflow_instances
        WHERE id = ${workflowInstanceId}
        LIMIT 1;
      `;

      if (eventResult.rows.length > 0) {
        await sql`
          INSERT INTO workflow_progression_audit (
            id,
            workflow_instance_id,
            event_id,
            action,
            step_number,
            action_by_user_id,
            action_timestamp
          ) VALUES (
            gen_random_uuid(),
            ${workflowInstanceId},
            ${eventResult.rows[0].event_id},
            ${action},
            ${stepNumber},
            ${actionByUserId},
            NOW()
          );
        `;
      }
    } catch (error) {
      logger.warn("[WorkflowOrchestrator] Error recording audit trail:", error);
    }
  }
}

export const workflowOrchestrator = new WorkflowOrchestrator();
