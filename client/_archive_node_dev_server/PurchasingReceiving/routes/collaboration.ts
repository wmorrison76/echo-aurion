import { Router, Request, Response } from "express";
import { collaborationEngine } from "../lib/collaboration-engine";
import { logger } from "../lib/logger";
import { z } from "zod";
import crypto from "crypto";
const router = Router(); // Validation schemas
const AddCommentSchema = z.object({
  organizationId: z.string().uuid(),
  documentId: z.string().uuid(),
  documentType: z.enum(["invoice", "purchase_order", "receiving", "exception"]),
  content: z.string().min(1),
  mentions: z.array(z.string()).optional(),
});
const CreateApprovalRequestSchema = z.object({
  organizationId: z.string().uuid(),
  documentId: z.string().uuid(),
  documentType: z.enum(["invoice", "purchase_order", "receiving"]),
  approvers: z.array(
    z.object({
      userId: z.string().uuid(),
      name: z.string(),
      email: z.string().email(),
    }),
  ),
  requiredApprovals: z.number().int().positive().optional(),
});
const ApproveDocumentSchema = z.object({
  requestId: z.string().uuid(),
  notes: z.string().optional(),
});
const RejectDocumentSchema = z.object({
  requestId: z.string().uuid(),
  reason: z.string().min(5),
}); // Add comment to document
router.post("/comments", async (req: Request, res: Response) => {
  try {
    const { organizationId, documentId, documentType, content, mentions } =
      AddCommentSchema.parse(req.body);
    const userId = req.user?.id;
    const userName = req.user?.email || "Unknown User";
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const comment = await collaborationEngine.addComment(
      organizationId,
      documentId,
      documentType,
      userId,
      userName,
      content,
      mentions,
    );
    logger.info("Comment added", { commentId: comment.id, documentId });
    res.json(comment);
  } catch (error) {
    logger.error("Failed to add comment", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to add comment" });
  }
}); // Get document comments
router.get(
  "/comments/:documentId/:documentType",
  async (req: Request, res: Response) => {
    try {
      const { documentId, documentType } = req.params;
      const comments = await collaborationEngine.getDocumentComments(
        documentId,
        documentType,
      );
      res.json(comments);
    } catch (error) {
      logger.error("Failed to fetch comments", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  },
); // Create approval request
router.post("/approvals", async (req: Request, res: Response) => {
  try {
    const {
      organizationId,
      documentId,
      documentType,
      approvers,
      requiredApprovals,
    } = CreateApprovalRequestSchema.parse(req.body);
    const userId = req.user?.id;
    const userName = req.user?.email || "Unknown User";
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const approvalRequest = await collaborationEngine.createApprovalRequest(
      organizationId,
      documentId,
      documentType,
      userId,
      userName,
      approvers.map((a) => ({
        userId: a.userId,
        name: a.name,
        email: a.email,
        approvalStatus: "pending",
      })),
      requiredApprovals || 1,
    );
    logger.info("Approval request created", { requestId: approvalRequest.id });
    res.json(approvalRequest);
  } catch (error) {
    logger.error("Failed to create approval request", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to create approval request" });
  }
}); // Get pending approvals
router.get(
  "/approvals/pending/:organizationId",
  async (req: Request, res: Response) => {
    try {
      const { organizationId } = req.params;
      const userId = req.user?.id;
      const approvals = await collaborationEngine.getPendingApprovals(
        organizationId,
        userId,
      );
      res.json(approvals);
    } catch (error) {
      logger.error("Failed to fetch pending approvals", error);
      res.status(500).json({ error: "Failed to fetch approvals" });
    }
  },
); // Approve document
router.post("/approvals/approve", async (req: Request, res: Response) => {
  try {
    const { requestId, notes } = ApproveDocumentSchema.parse(req.body);
    const userId = req.user?.id;
    const userName = req.user?.email || "Unknown User";
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const approved = await collaborationEngine.approveDocument(
      requestId,
      userId,
      userName,
      notes,
    );
    if (!approved) {
      return res.status(404).json({ error: "Approval request not found" });
    }
    logger.info("Document approved", { requestId });
    res.json(approved);
  } catch (error) {
    logger.error("Failed to approve document", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to approve document" });
  }
}); // Reject document
router.post("/approvals/reject", async (req: Request, res: Response) => {
  try {
    const { requestId, reason } = RejectDocumentSchema.parse(req.body);
    const userId = req.user?.id;
    const userName = req.user?.email || "Unknown User";
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const rejected = await collaborationEngine.rejectDocument(
      requestId,
      userId,
      userName,
      reason,
    );
    if (!rejected) {
      return res.status(404).json({ error: "Approval request not found" });
    }
    logger.info("Document rejected", { requestId });
    res.json(rejected);
  } catch (error) {
    logger.error("Failed to reject document", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to reject document" });
  }
}); // Get notifications
router.get("/notifications", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { data, error } = await (req as any).supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      logger.error("Failed to fetch notifications", error);
      throw error;
    }
    res.json(data || []);
  } catch (error) {
    logger.error("Failed to fetch notifications", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
}); // Mark notification as read
router.post(
  "/notifications/:notificationId/read",
  async (req: Request, res: Response) => {
    try {
      const { notificationId } = req.params;
      const { error } = await (req as any).supabase
        .from("notifications")
        .update({ read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId);
      if (error) {
        logger.error("Failed to mark notification as read", error);
        throw error;
      }
      res.json({ success: true });
    } catch (error) {
      logger.error("Failed to update notification", error);
      res.status(500).json({ error: "Failed to update notification" });
    }
  },
);
export const collaborationRouter = router;
