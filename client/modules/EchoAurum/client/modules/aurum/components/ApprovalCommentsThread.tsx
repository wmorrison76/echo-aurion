import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare } from "lucide-react";
import { fetchWithLucccaSession } from "../../auth";
interface Comment {
  id: string;
  author: string;
  authorRole: string;
  content: string;
  createdAt: string;
  mentions?: string[];
}
interface ApprovalCommentsThreadProps {
  approvalId: string;
  entityId: string;
  currentUser: string;
}
export function ApprovalCommentsThread({
  approvalId,
  entityId,
  currentUser,
}: ApprovalCommentsThreadProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  useEffect(() => {
    fetchComments();
  }, [approvalId]);
  const fetchComments = async () => {
    setLoading(true);
    try {
      const response = await fetchWithLucccaSession(
        `/api/aurum/approvals/${approvalId}/comments?entityId=${entityId}`,
      );
      if (response.ok) {
        const data: Comment[] = await response.json();
        setComments(data);
      }
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    } finally {
      setLoading(false);
    }
  };
  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      const response = await fetchWithLucccaSession(
        `/api/aurum/approvals/${approvalId}/comments`,
        {
          method: "POST",
          body: JSON.stringify({
            content: newComment,
            entityId,
            mentions: extractMentions(newComment),
          }),
        },
      );
      if (response.ok) {
        setNewComment("");
        fetchComments();
      }
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setPosting(false);
    }
  };
  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const matches = text.match(mentionRegex);
    return matches ? matches.map((m) => m.substring(1)) : [];
  };
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };
  return (
    <Card>
      {" "}
      <CardHeader>
        {" "}
        <CardTitle className="flex items-center gap-2">
          {" "}
          <MessageSquare className="h-5 w-5" /> Approval Discussion (
          {comments.length}){" "}
        </CardTitle>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-4">
        {" "}
        {/* Comments Thread */}{" "}
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {" "}
          {loading && (
            <div className="text-muted-foreground text-sm">
              {" "}
              Loading comments...{" "}
            </div>
          )}{" "}
          {!loading && comments.length === 0 && (
            <div className="text-center py-6">
              {" "}
              <p className="text-muted-foreground text-sm">
                {" "}
                No comments yet. Start a discussion!{" "}
              </p>{" "}
            </div>
          )}{" "}
          {!loading &&
            comments.map((comment) => (
              <div
                key={comment.id}
                className="bg-muted/30 p-3 rounded-lg space-y-2"
              >
                {" "}
                <div className="flex items-center justify-between">
                  {" "}
                  <div className="flex items-center gap-2">
                    {" "}
                    <span className="font-medium text-sm">
                      {" "}
                      {comment.author}{" "}
                    </span>{" "}
                    <Badge variant="outline" className="text-xs">
                      {" "}
                      {comment.authorRole}{" "}
                    </Badge>{" "}
                  </div>{" "}
                  <span className="text-xs text-muted-foreground">
                    {" "}
                    {formatTime(comment.createdAt)}{" "}
                  </span>{" "}
                </div>{" "}
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {" "}
                  {comment.content}{" "}
                </p>{" "}
                {comment.mentions && comment.mentions.length > 0 && (
                  <div className="flex gap-1 flex-wrap pt-1">
                    {" "}
                    {comment.mentions.map((mention) => (
                      <Badge
                        key={mention}
                        variant="secondary"
                        className="text-xs"
                      >
                        {" "}
                        @{mention}{" "}
                      </Badge>
                    ))}{" "}
                  </div>
                )}{" "}
              </div>
            ))}{" "}
        </div>{" "}
        {/* Comment Input */}{" "}
        <div className="space-y-2 pt-4 border-t">
          {" "}
          <Textarea
            placeholder="Add a comment (mention with @username)..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-20 resize-none"
            disabled={posting}
          />{" "}
          <div className="flex justify-end gap-2">
            {" "}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNewComment("")}
              disabled={posting}
            >
              {" "}
              Clear{" "}
            </Button>{" "}
            <Button
              size="sm"
              onClick={handlePostComment}
              disabled={posting || !newComment.trim()}
              className="gap-2"
            >
              {" "}
              <Send className="h-3 w-3" /> Post Comment{" "}
            </Button>{" "}
          </div>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
