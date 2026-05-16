import React, { useState, useCallback } from "react";
import { ObjectComment, CommentReply, CanvasSelectable } from "./types";
import { MessageSquare, X, Check, Reply } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { cn } from "@/lib/glass";
interface CommentsPanelProps {
  comments: ObjectComment[];
  selectedTarget: CanvasSelectable | null;
  userId: string;
  userName: string;
  onCommentAdd: (comment: ObjectComment) => void;
  onCommentReply: (commentId: string, reply: CommentReply) => void;
  onCommentResolve: (commentId: string, isResolved: boolean) => void;
  onCommentDelete: (commentId: string) => void;
}
export const CommentsPanel: React.FC<CommentsPanelProps> = ({
  comments,
  selectedTarget,
  userId,
  userName,
  onCommentAdd,
  onCommentReply,
  onCommentResolve,
  onCommentDelete,
}) => {
  const [newCommentText, setNewCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const relevantComments = selectedTarget
    ? comments.filter(
        (c) =>
          c.targetId === selectedTarget.id &&
          c.targetKind === selectedTarget.kind,
      )
    : [];
  const handleAddComment = useCallback(() => {
    if (!newCommentText.trim() || !selectedTarget) return;
    const comment: ObjectComment = {
      id: uuidv4(),
      targetId: selectedTarget.id,
      targetKind: selectedTarget.kind as any,
      authorId: userId,
      authorName: userName,
      text: newCommentText,
      mentions: [],
      timestamp: Date.now(),
      isResolved: false,
      replies: [],
    };
    onCommentAdd(comment);
    setNewCommentText("");
  }, [newCommentText, selectedTarget, userId, userName, onCommentAdd]);
  const handleAddReply = useCallback(
    (commentId: string) => {
      if (!replyText.trim()) return;
      const reply: CommentReply = {
        id: uuidv4(),
        authorId: userId,
        authorName: userName,
        text: replyText,
        mentions: [],
        timestamp: Date.now(),
      };
      onCommentReply(commentId, reply);
      setReplyText("");
      setReplyingTo(null);
    },
    [replyText, userId, userName, onCommentReply],
  );
  if (!selectedTarget) {
    return (
      <div className="w-80 bg-secondary/30 border-l border-border/20 p-4 flex flex-col items-center justify-center text-foreground/50">
        {" "}
        <MessageSquare size={32} className="mb-2 opacity-30" />{" "}
        <p className="text-sm">Select an object to view comments</p>{" "}
      </div>
    );
  }
  return (
    <div className="w-80 bg-secondary/30 border-l border-border/20 flex flex-col min-h-0">
      {" "}
      {/* Header */}{" "}
      <div className="p-4 border-b border-border/20">
        {" "}
        <div className="flex items-center gap-2 mb-3">
          {" "}
          <MessageSquare size={16} />{" "}
          <h3 className="font-semibold text-sm">Comments</h3>{" "}
          {relevantComments.length > 0 && (
            <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-1 rounded">
              {" "}
              {relevantComments.length}{" "}
            </span>
          )}{" "}
        </div>{" "}
        {/* New comment input */}{" "}
        <div className="space-y-2">
          {" "}
          <textarea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="w-full px-2 py-2 bg-background border border-border/30 rounded text-xs placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            rows={3}
          />{" "}
          <div className="flex gap-2 justify-end">
            {" "}
            {newCommentText.trim() && (
              <button
                onClick={handleAddComment}
                className="px-3 py-1.5 bg-primary text-white rounded text-xs font-medium hover:opacity-90 transition-colors"
              >
                {" "}
                Post{" "}
              </button>
            )}{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {/* Comments list */}{" "}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {" "}
        {relevantComments.length === 0 ? (
          <p className="text-xs text-foreground/50 text-center py-8">
            {" "}
            No comments yet{" "}
          </p>
        ) : (
          relevantComments.map((comment) => (
            <div
              key={comment.id}
              className={cn(
                "p-3 bg-background rounded border border-border/20 space-y-2",
                comment.isResolved && "bg-slate-50 opacity-60",
              )}
            >
              {" "}
              {/* Comment header */}{" "}
              <div className="flex items-start justify-between gap-2">
                {" "}
                <div>
                  {" "}
                  <p className="text-xs font-semibold text-foreground">
                    {" "}
                    {comment.authorName}{" "}
                  </p>{" "}
                  <p className="text-xs text-foreground/50">
                    {" "}
                    {new Date(comment.timestamp).toLocaleTimeString()}{" "}
                  </p>{" "}
                </div>{" "}
                {comment.authorId === userId && (
                  <button
                    onClick={() => onCommentDelete(comment.id)}
                    className="text-foreground/40 hover:text-red-600 transition-colors"
                  >
                    {" "}
                    <X size={14} />{" "}
                  </button>
                )}{" "}
              </div>{" "}
              {/* Comment text */}{" "}
              <p className="text-xs text-foreground leading-relaxed">
                {" "}
                {comment.text}{" "}
              </p>{" "}
              {/* Action buttons */}{" "}
              <div className="flex gap-2 pt-2">
                {" "}
                <button
                  onClick={() =>
                    onCommentResolve(comment.id, !comment.isResolved)
                  }
                  className={cn(
                    "flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors",
                    comment.isResolved
                      ? "bg-green-500/20 text-green-700"
                      : "text-foreground/60 hover:bg-secondary/50",
                  )}
                >
                  {" "}
                  <Check size={12} />{" "}
                  {comment.isResolved ? "Resolved" : "Resolve"}{" "}
                </button>{" "}
                {replyingTo !== comment.id && (
                  <button
                    onClick={() => setReplyingTo(comment.id)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded text-foreground/60 hover:bg-secondary/50 transition-colors"
                  >
                    {" "}
                    <Reply size={12} /> Reply{" "}
                  </button>
                )}{" "}
              </div>{" "}
              {/* Replies */}{" "}
              {comment.replies && comment.replies.length > 0 && (
                <div className="pt-2 border-t border-border/10 space-y-2">
                  {" "}
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="p-2 bg-slate-50 rounded">
                      {" "}
                      <p className="text-xs font-semibold text-foreground">
                        {" "}
                        {reply.authorName}{" "}
                      </p>{" "}
                      <p className="text-xs text-foreground/70 leading-relaxed">
                        {" "}
                        {reply.text}{" "}
                      </p>{" "}
                      <p className="text-xs text-foreground/40 mt-1">
                        {" "}
                        {new Date(reply.timestamp).toLocaleTimeString()}{" "}
                      </p>{" "}
                    </div>
                  ))}{" "}
                </div>
              )}{" "}
              {/* Reply input */}{" "}
              {replyingTo === comment.id && (
                <div className="pt-2 border-t border-border/10 space-y-2">
                  {" "}
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Add a reply..."
                    className="w-full px-2 py-2 bg-slate-50 border border-border/30 rounded text-xs placeholder-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                    rows={2}
                    autoFocus
                  />{" "}
                  <div className="flex gap-2 justify-end">
                    {" "}
                    <button
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyText("");
                      }}
                      className="px-2 py-1 text-xs text-foreground/60 hover:bg-secondary/50 rounded transition-colors"
                    >
                      {" "}
                      Cancel{" "}
                    </button>{" "}
                    {replyText.trim() && (
                      <button
                        onClick={() => handleAddReply(comment.id)}
                        className="px-2 py-1 bg-primary text-white rounded text-xs font-medium hover:opacity-90 transition-colors"
                      >
                        {" "}
                        Reply{" "}
                      </button>
                    )}{" "}
                  </div>{" "}
                </div>
              )}{" "}
            </div>
          ))
        )}{" "}
      </div>{" "}
    </div>
  );
};
