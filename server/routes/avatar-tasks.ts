/**
 * Avatar Task Execution Engine
 * Handles autonomous task creation, approval, execution, and audit trail
 * Weeks 3-4 Implementation
 */

import { Router, Request, Response } from "express";
// import { createClient } from '@openai/sdk';
import { logger } from "../lib/logger";
import { supabase } from "../lib/supabase";
import { getOrgContext, getOrgId } from "../lib/org-resolver";

const router = Router();

// OpenAI client - will use voice transcription endpoints
// const openai = new createClient({
//   apiKey: process.env.ECHO_OPENAI_API_KEY,
// });

/**
 * Type definitions for avatar tasks
 */
interface TaskAction {
  description: string;
  type:
    | "inventory_check"
    | "order_generation"
    | "schedule_modification"
    | "notification";
  requiredApproval: boolean;
}

interface AvatarTask {
  id?: string;
  task_type: string;
  status:
    | "pending_approval"
    | "approved"
    | "executing"
    | "completed"
    | "rejected"
    | "failed";
  action_plan: {
    action_steps: TaskAction[];
    estimated_time_minutes: number;
  };
  confidence_score: number;
  voice_transcript: string;
  ai_rationale: string;
  created_at?: string;
  executed_at?: string;
  modified_by?: string;
}

/**
 * Helper: Extract intent from voice transcript
 */
function extractTaskIntent(transcript: string): {
  taskType: string;
  confidence: number;
} {
  const transcript_lower = transcript.toLowerCase();

  // Task type detection
  const intentPatterns = {
    generate_order: [
      /prepare.*order/i,
      /create.*order/i,
      /generate.*order/i,
      /make.*party.*order/i,
      /process.*supply.*order/i,
    ],
    check_inventory: [
      /check.*inventory/i,
      /what.*stock/i,
      /inventory.*status/i,
      /how.*much.*we.*have/i,
    ],
    schedule_modification: [
      /schedule.*shift/i,
      /assign.*staff/i,
      /change.*schedule/i,
      /add.*to.*schedule/i,
    ],
    quality_check: [
      /quality.*check/i,
      /inspect/i,
      /quality.*assurance/i,
      /check.*quality/i,
    ],
    cost_analysis: [
      /cost.*analysis/i,
      /price.*check/i,
      /what.*does.*cost/i,
      /pricing/i,
    ],
  };

  for (const [taskType, patterns] of Object.entries(intentPatterns)) {
    if (patterns.some((p) => p.test(transcript))) {
      return { taskType, confidence: 0.85 };
    }
  }

  // Default to general task
  return { taskType: "general_inquiry", confidence: 0.5 };
}

/**
 * Helper: Generate action plan for task
 */
function generateActionPlan(
  taskType: string,
  transcript: string,
): { action_steps: TaskAction[]; estimated_time_minutes: number } {
  const actionPlans: Record<
    string,
    { action_steps: TaskAction[]; estimated_time_minutes: number }
  > = {
    generate_order: {
      action_steps: [
        {
          description: "Check current inventory levels",
          type: "inventory_check",
          requiredApproval: false,
        },
        {
          description: "Check active orders and outstanding items",
          type: "inventory_check",
          requiredApproval: false,
        },
        {
          description: "Generate supply order based on forecasted demand",
          type: "order_generation",
          requiredApproval: true,
        },
        {
          description: "Log action to audit trail",
          type: "notification",
          requiredApproval: false,
        },
      ],
      estimated_time_minutes: 15,
    },
    check_inventory: {
      action_steps: [
        {
          description: "Retrieve current inventory snapshot",
          type: "inventory_check",
          requiredApproval: false,
        },
        {
          description: "Identify items below minimum threshold",
          type: "inventory_check",
          requiredApproval: false,
        },
        {
          description: "Generate report for manager",
          type: "notification",
          requiredApproval: false,
        },
      ],
      estimated_time_minutes: 5,
    },
    schedule_modification: {
      action_steps: [
        {
          description: "Analyze current staffing levels",
          type: "inventory_check",
          requiredApproval: false,
        },
        {
          description: "Check employee availability",
          type: "inventory_check",
          requiredApproval: false,
        },
        {
          description: "Propose schedule modification",
          type: "schedule_modification",
          requiredApproval: true,
        },
        {
          description: "Notify affected employees",
          type: "notification",
          requiredApproval: false,
        },
      ],
      estimated_time_minutes: 20,
    },
    quality_check: {
      action_steps: [
        {
          description: "Review recent service reports",
          type: "inventory_check",
          requiredApproval: false,
        },
        {
          description: "Compile quality metrics",
          type: "inventory_check",
          requiredApproval: false,
        },
        {
          description: "Generate quality report",
          type: "notification",
          requiredApproval: false,
        },
      ],
      estimated_time_minutes: 10,
    },
    cost_analysis: {
      action_steps: [
        {
          description: "Calculate current operating costs",
          type: "inventory_check",
          requiredApproval: false,
        },
        {
          description: "Compare to budget allocation",
          type: "inventory_check",
          requiredApproval: false,
        },
        {
          description: "Generate cost analysis report",
          type: "notification",
          requiredApproval: false,
        },
      ],
      estimated_time_minutes: 8,
    },
  };

  return (
    actionPlans[taskType] || {
      action_steps: [
        {
          description: `Process: ${transcript}`,
          type: "notification",
          requiredApproval: false,
        },
      ],
      estimated_time_minutes: 5,
    }
  );
}

/**
 * POST /api/avatar/voice-command
 * Process voice command and create task if needed
 */
export async function handleVoiceCommand(req: Request, res: Response) {
  const file = req.file;
  const contextStr = req.body.context;
  const orgContext = getOrgContext(req);

  if (!file) {
    return res.status(400).json({ error: "No audio file provided" });
  }

  try {
    logger.info("[AVATAR-TASKS] Processing voice command");

    // Transcribe audio
    const transcript = await openai.audio.transcriptions.create({
      file: file.buffer,
      model: "whisper-1",
      language: "en",
    });

    const text = transcript.text;
    logger.info("[AVATAR-TASKS] Transcribed:", text);

    // Extract task intent
    const { taskType, confidence } = extractTaskIntent(text);

    // Generate action plan
    const actionPlan = generateActionPlan(taskType, text);

    // Check if task needs approval
    const requiresApproval = actionPlan.action_steps.some(
      (step) => step.requiredApproval,
    );

    // Create task in database
    const { data: task, error: taskError } = await supabase
      .from("avatar_tasks")
      .insert({
        org_id: orgContext.orgId,
        task_type: taskType,
        status: requiresApproval ? "pending_approval" : "approved",
        voice_transcript: text,
        action_plan: actionPlan,
        confidence_score: confidence,
        ai_rationale: `Task extracted from voice command with ${(confidence * 100).toFixed(0)}% confidence.`,
        created_by: req.user?.id || "system",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (taskError) {
      logger.error("[AVATAR-TASKS] Task creation error:", taskError);
      return res.status(500).json({
        error: "Failed to create task",
        message: taskError.message,
      });
    }

    // Log to audit trail
    await supabase.from("avatar_audit_log").insert({
      task_id: task.id,
      action: "TASK_CREATED_FROM_VOICE",
      action_by: req.user?.id || "system",
      details: {
        transcript: text,
        taskType,
        confidence,
        requiresApproval,
      },
      created_at: new Date().toISOString(),
    });

    // Generate response message
    let message = `I've identified a ${taskType.replace(/_/g, " ")} task`;
    if (requiresApproval) {
      message += " and created a request for your approval.";
    } else {
      message += " and initiated execution.";
    }

    return res.json({
      success: true,
      message,
      task,
      requiresApproval,
    });
  } catch (error) {
    logger.error("[AVATAR-TASKS] Voice command error:", error);
    return res.status(500).json({
      error: "Failed to process voice command",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * GET /api/avatar/tasks
 * Fetch avatar tasks with optional filtering
 */
export async function handleGetTasks(req: Request, res: Response) {
  try {
    const orgContext = getOrgContext(req);
    const { status = "pending_approval", limit = 20, offset = 0 } = req.query;

    let query = supabase
      .from("avatar_tasks")
      .select("*")
      .eq("org_id", orgContext.orgId);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const {
      data: tasks,
      error,
      count,
    } = await query
      .order("created_at", { ascending: false })
      .range(offset as number, (offset as number) + (limit as number) - 1);

    if (error) {
      logger.error("[AVATAR-TASKS] Fetch error:", error);
      return res.status(500).json({
        error: "Failed to fetch tasks",
        message: error.message,
      });
    }

    return res.json({
      success: true,
      tasks: tasks || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    logger.error("[AVATAR-TASKS] Error:", error);
    return res.status(500).json({
      error: "Failed to fetch tasks",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * POST /api/avatar/tasks/:taskId/approve
 * Approve an avatar task and execute it
 */
export async function handleApproveTask(req: Request, res: Response) {
  const { taskId } = req.params;
  const { modifications } = req.body;

  try {
    logger.info("[AVATAR-TASKS] Approving task:", taskId);

    // Fetch the task
    const { data: task, error: fetchError } = await supabase
      .from("avatar_tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (fetchError || !task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Update task status
    const { data: updatedTask, error: updateError } = await supabase
      .from("avatar_tasks")
      .update({
        status: "executing",
        modified_by: req.user?.id || "system",
        execution_started_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .select()
      .single();

    if (updateError) {
      logger.error("[AVATAR-TASKS] Update error:", updateError);
      return res.status(500).json({
        error: "Failed to approve task",
        message: updateError.message,
      });
    }

    // Log approval to audit trail
    await supabase.from("avatar_audit_log").insert({
      task_id: taskId,
      action: "TASK_APPROVED",
      action_by: req.user?.id || "system",
      details: {
        modifications,
        approvedAt: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });

    // Execute task (async in background)
    executeTaskInBackground(updatedTask, req.user?.id || "system");

    return res.json({
      success: true,
      message: "Task approved and execution started",
      task: updatedTask,
    });
  } catch (error) {
    logger.error("[AVATAR-TASKS] Approval error:", error);
    return res.status(500).json({
      error: "Failed to approve task",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * POST /api/avatar/tasks/:taskId/reject
 * Reject an avatar task
 */
export async function handleRejectTask(req: Request, res: Response) {
  const { taskId } = req.params;
  const { reason } = req.body;

  try {
    logger.info("[AVATAR-TASKS] Rejecting task:", taskId);

    // Update task status
    const { data: updatedTask, error: updateError } = await supabase
      .from("avatar_tasks")
      .update({
        status: "rejected",
        modified_by: req.user?.id || "system",
        rejection_reason: reason || "No reason provided",
      })
      .eq("id", taskId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        error: "Failed to reject task",
        message: updateError.message,
      });
    }

    // Log rejection to audit trail
    await supabase.from("avatar_audit_log").insert({
      task_id: taskId,
      action: "TASK_REJECTED",
      action_by: req.user?.id || "system",
      details: {
        reason,
        rejectedAt: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: "Task rejected",
      task: updatedTask,
    });
  } catch (error) {
    logger.error("[AVATAR-TASKS] Rejection error:", error);
    return res.status(500).json({
      error: "Failed to reject task",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * GET /api/avatar/tasks/:taskId
 * Fetch a specific task
 */
export async function handleGetTask(req: Request, res: Response) {
  const { taskId } = req.params;

  try {
    const { data: task, error } = await supabase
      .from("avatar_tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (error || !task) {
      return res.status(404).json({ error: "Task not found" });
    }

    return res.json({
      success: true,
      task,
    });
  } catch (error) {
    logger.error("[AVATAR-TASKS] Fetch error:", error);
    return res.status(500).json({
      error: "Failed to fetch task",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * GET /api/avatar/audit-log
 * Fetch audit trail for avatar tasks
 */
export async function handleGetAuditLog(req: Request, res: Response) {
  try {
    const { taskId, limit = 50, offset = 0 } = req.query;

    let query = supabase.from("avatar_audit_log").select("*");

    if (taskId) {
      query = query.eq("task_id", taskId);
    }

    const {
      data: logs,
      error,
      count,
    } = await query
      .order("created_at", { ascending: false })
      .range(offset as number, (offset as number) + (limit as number) - 1);

    if (error) {
      return res.status(500).json({
        error: "Failed to fetch audit log",
        message: error.message,
      });
    }

    return res.json({
      success: true,
      logs: logs || [],
      total: count || 0,
    });
  } catch (error) {
    logger.error("[AVATAR-TASKS] Audit log error:", error);
    return res.status(500).json({
      error: "Failed to fetch audit log",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Background task execution (non-blocking)
 */
async function executeTaskInBackground(task: AvatarTask, userId: string) {
  try {
    logger.info("[AVATAR-TASKS] Executing task:", task.id);

    // Simulate task execution with action steps
    for (const step of task.action_plan.action_steps) {
      logger.info("[AVATAR-TASKS] Executing step:", step.description);

      // Execute based on action type
      switch (step.type) {
        case "inventory_check":
          // Placeholder: In production, query actual inventory system
          break;
        case "order_generation":
          // Placeholder: In production, integrate with ordering system
          break;
        case "schedule_modification":
          // Placeholder: In production, integrate with scheduling system
          break;
        case "notification":
          // Placeholder: In production, send notifications
          break;
      }

      // Log step completion
      await supabase.from("avatar_audit_log").insert({
        task_id: task.id,
        action: "TASK_STEP_EXECUTED",
        action_by: "system",
        details: {
          step: step.description,
          executedAt: new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
      });
    }

    // Mark task as completed
    await supabase
      .from("avatar_tasks")
      .update({
        status: "completed",
        executed_at: new Date().toISOString(),
      })
      .eq("id", task.id);

    // Final audit log
    await supabase.from("avatar_audit_log").insert({
      task_id: task.id,
      action: "TASK_COMPLETED",
      action_by: "system",
      details: {
        completedAt: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });

    logger.info("[AVATAR-TASKS] Task completed:", task.id);
  } catch (error) {
    logger.error("[AVATAR-TASKS] Execution error:", error);

    // Mark as failed
    await supabase
      .from("avatar_tasks")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", task.id);
  }
}

// Register routes
router.post("/voice-command", handleVoiceCommand);
router.get("/tasks", handleGetTasks);
router.get("/tasks/:taskId", handleGetTask);
router.post("/tasks/:taskId/approve", handleApproveTask);
router.post("/tasks/:taskId/reject", handleRejectTask);
router.get("/audit-log", handleGetAuditLog);

export default router;
