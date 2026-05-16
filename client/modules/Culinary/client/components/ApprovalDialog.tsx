/**
 * Approval Dialog Component
 * For reviewing and approving/rejecting recipe changes
 */

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  approveRequest,
  rejectRequest,
  addApprovalComment,
  type ApprovalRequest,
  ApprovalStatus,
} from "@/lib/approval-workflow";
import { useAuth } from "@/context/AuthContext";

interface ApprovalDialogProps {
  request: ApprovalRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onApprovalStatusChange?: () => void;
}

export function ApprovalDialog({
  request,
  isOpen,
  onClose,
  onApprovalStatusChange,
}: ApprovalDialogProps) {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [newComment, setNewComment] = useState("");
  const [activeTab, setActiveTab] = useState("changes");

  if (!request) {
    return null;
  }

  const isApproved = request.status === ApprovalStatus.APPROVED;
  const isRejected = request.status === ApprovalStatus.REJECTED;
  const isPending = request.status === ApprovalStatus.PENDING;

  const handleApprove = useCallback(async () => {
    if (!user) return;

    setIsProcessing(true);
    try {
      const result = await approveRequest(request.id, user.id, user.username);
      if (result.success) {
        onApprovalStatusChange?.();
        onClose();
      }
    } finally {
      setIsProcessing(false);
    }
  }, [request.id, user, onApprovalStatusChange, onClose]);

  const handleReject = useCallback(async () => {
    if (!user || !rejectionReason.trim()) return;

    setIsProcessing(true);
    try {
      const result = await rejectRequest(request.id, user.id, rejectionReason);
      if (result.success) {
        onApprovalStatusChange?.();
        onClose();
      }
    } finally {
      setIsProcessing(false);
    }
  }, [request.id, user, rejectionReason, onApprovalStatusChange, onClose]);

  const handleAddComment = useCallback(async () => {
    if (!user || !newComment.trim()) return;

    setIsProcessing(true);
    try {
      const result = await addApprovalComment(
        request.id,
        user.id,
        user.username,
        newComment,
        user.role === "chef",
      );
      if (result.success) {
        setNewComment("");
        onApprovalStatusChange?.();
      }
    } finally {
      setIsProcessing(false);
    }
  }, [request.id, user, newComment, onApprovalStatusChange]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Recipe Change Approval</DialogTitle>
            <StatusBadge status={request.status} />
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-3">
            <div>
              <p className="text-xs text-gray-600">Requested By</p>
              <p className="font-medium">{request.requestedByUsername}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Requested At</p>
              <p className="font-medium">
                {new Date(request.requestedAt).toLocaleString()}
              </p>
            </div>
            {request.approvedBy && (
              <>
                <div>
                  <p className="text-xs text-gray-600">Approved By</p>
                  <p className="font-medium">{request.approvedByUsername}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Approved At</p>
                  <p className="font-medium">
                    {request.approvedAt &&
                      new Date(request.approvedAt).toLocaleString()}
                  </p>
                </div>
              </>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="changes" className="flex-1">
                Changes
              </TabsTrigger>
              <TabsTrigger value="comments" className="flex-1">
                Comments ({request.comments?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="changes" className="space-y-3">
              <ChangesSummary changes={request.changes} />
            </TabsContent>

            <TabsContent value="comments" className="space-y-3">
              <CommentsSection
                comments={request.comments || []}
                onAddComment={handleAddComment}
                newComment={newComment}
                onCommentChange={setNewComment}
                isProcessing={isProcessing}
              />
            </TabsContent>
          </Tabs>

          {isPending && (
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason (if rejecting)
                </label>
                <Textarea
                  placeholder="Explain why you're rejecting this change..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="min-h-24"
                />
              </div>
            </div>
          )}

          {isRejected && request.rejectionReason && (
            <div className="rounded-lg bg-red-50 p-3 border border-red-200">
              <p className="text-sm font-medium text-red-900">Rejection Reason</p>
              <p className="text-sm text-red-800 mt-1">{request.rejectionReason}</p>
            </div>
          )}
        </div>

        {isPending && (
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isProcessing || !rejectionReason.trim()}
            >
              Reject
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isProcessing}
            >
              Approve
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Status Badge Component
 */
function StatusBadge({ status }: { status: ApprovalStatus }) {
  const statusConfig = {
    [ApprovalStatus.PENDING]: { variant: "outline" as const, label: "Pending" },
    [ApprovalStatus.APPROVED]: { variant: "default" as const, label: "Approved" },
    [ApprovalStatus.REJECTED]: { variant: "destructive" as const, label: "Rejected" },
    [ApprovalStatus.DRAFT]: { variant: "secondary" as const, label: "Draft" },
  };

  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

/**
 * Changes Summary Component
 */
interface ChangesSummaryProps {
  changes: ApprovalRequest["changes"];
}

function ChangesSummary({ changes }: ChangesSummaryProps) {
  return (
    <div className="space-y-3">
      {changes.name && (
        <div className="rounded-lg border p-3">
          <p className="text-sm font-medium text-gray-700">Recipe Name</p>
          <p className="text-sm text-gray-900 mt-1">{changes.name}</p>
        </div>
      )}

      {changes.description && (
        <div className="rounded-lg border p-3">
          <p className="text-sm font-medium text-gray-700">Description</p>
          <p className="text-sm text-gray-900 mt-1">{changes.description}</p>
        </div>
      )}

      {changes.yield && (
        <div className="rounded-lg border p-3">
          <p className="text-sm font-medium text-gray-700">Yield</p>
          <p className="text-sm text-gray-900 mt-1">{changes.yield} servings</p>
        </div>
      )}

      {changes.costPerServing && (
        <div className="rounded-lg border p-3">
          <p className="text-sm font-medium text-gray-700">Cost Per Serving</p>
          <p className="text-sm text-gray-900 mt-1">
            ${changes.costPerServing.toFixed(2)}
          </p>
        </div>
      )}

      {changes.ingredients && changes.ingredients.length > 0 && (
        <div className="rounded-lg border p-3">
          <p className="text-sm font-medium text-gray-700">Ingredients</p>
          <ul className="mt-2 space-y-1">
            {changes.ingredients.map((ing) => (
              <li key={ing.id} className="text-sm text-gray-900">
                {ing.quantity} {ing.unit} {ing.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {changes.instructions && (
        <div className="rounded-lg border p-3">
          <p className="text-sm font-medium text-gray-700">Instructions</p>
          <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
            {changes.instructions}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Comments Section Component
 */
interface CommentsSectionProps {
  comments: ApprovalRequest["comments"];
  onAddComment: () => void;
  newComment: string;
  onCommentChange: (comment: string) => void;
  isProcessing: boolean;
}

function CommentsSection({
  comments = [],
  onAddComment,
  newComment,
  onCommentChange,
  isProcessing,
}: CommentsSectionProps) {
  return (
    <div className="space-y-3">
      {comments.length === 0 ? (
        <p className="text-sm text-gray-600">No comments yet.</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-lg bg-gray-50 p-3 border">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm text-gray-900">
                  {comment.authorUsername}
                  {comment.isChef && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Chef
                    </Badge>
                  )}
                </p>
                <p className="text-xs text-gray-600">
                  {new Date(comment.createdAt).toLocaleString()}
                </p>
              </div>
              <p className="text-sm text-gray-700 mt-2">{comment.content}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-2 border-t pt-4">
        <label className="block text-sm font-medium text-gray-700">
          Add Comment
        </label>
        <Textarea
          placeholder="Add your comment..."
          value={newComment}
          onChange={(e) => onCommentChange(e.target.value)}
          className="min-h-20"
        />
        <Button
          onClick={onAddComment}
          disabled={isProcessing || !newComment.trim()}
          size="sm"
        >
          Post Comment
        </Button>
      </div>
    </div>
  );
}
