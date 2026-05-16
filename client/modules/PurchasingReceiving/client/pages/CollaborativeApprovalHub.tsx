import React, { useState, useEffect } from "react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  CheckCircle2,
  Clock,
  XCircle,
  MessageSquare,
  AlertCircle,
  Send,
  ThumbsUp,
} from "lucide-react";
interface ApprovalRequest {
  id: string;
  documentId: string;
  documentType: string;
  requestedByName: string;
  status: "pending" | "approved" | "rejected";
  approvers: Array<{
    userId: string;
    name: string;
    approvalStatus: "pending" | "approved" | "rejected";
  }>;
  requiredApprovals: number;
  currentApprovals: number;
  createdAt: string;
  updatedAt: string;
}
interface Comment {
  id: string;
  userName: string;
  content: string;
  mentions: string[];
  createdAt: string;
  likes: number;
}
export default function CollaborativeApprovalHub() {
  const [organizationId, setOrganizationId] = useState<string>("");
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] =
    useState<ApprovalRequest | null>(null);
  const [commentText, setCommentText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  useEffect(() => {
    fetchApprovals();
  }, [organizationId]);
  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/collaboration/approvals/pending/${organizationId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setApprovals(data);
      }
    } catch (err) {
      setError("Failed to fetch approvals");
    } finally {
      setLoading(false);
    }
  };
  const fetchComments = async (approvalId: string) => {
    try {
      // This would fetch comments for the specific approval/document const response = await fetch( `/api/collaboration/comments/${approvalId}/invoice` ); if (response.ok) { const data = await response.json(); setComments(data); } } catch (err) { setError('Failed to fetch comments'); } }; const handleAddComment = async () => { if (!commentText.trim() || !selectedApproval) return; try { const response = await fetch('/api/collaboration/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizationId, documentId: selectedApproval.documentId, documentType: selectedApproval.documentType, content: commentText, }), }); if (response.ok) { setCommentText(''); await fetchComments(selectedApproval.id); } } catch (err) { setError('Failed to add comment'); } }; const handleApprove = async (approvalId: string) => { try { const response = await fetch('/api/collaboration/approvals/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: approvalId, notes: approvalNotes, }), }); if (response.ok) { setApprovalNotes(''); await fetchApprovals(); } } catch (err) { setError('Failed to approve'); } }; const handleReject = async (approvalId: string) => { try { const response = await fetch('/api/collaboration/approvals/reject', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: approvalId, reason: rejectionReason, }), }); if (response.ok) { setRejectionReason(''); await fetchApprovals(); } } catch (err) { setError('Failed to reject'); } }; const pendingApprovals = approvals.filter((a) => a.status === 'pending'); const approvedApprovals = approvals.filter((a) => a.status === 'approved'); const rejectedApprovals = approvals.filter((a) => a.status === 'rejected'); if (loading) { return ( <main id="main-content" className="flex-1 overflow-auto"> <div className="p-6 text-center"> <p>Loading approval requests...</p> </div> </main> ); } return ( <main id="main-content" className="flex-1 overflow-auto"> <div className="p-6 space-y-6"> {/* Header */} <div> <div className="flex items-center gap-3 mb-2"> <MessageSquare className="w-8 h-8 text-primary" /> <h1 className="text-3xl font-bold">Collaborative Approval Hub</h1> </div> <p className="text-muted-foreground"> Streamlined document approvals with team collaboration </p> </div> {error && ( <Alert className="bg-red-50 border-red-200"> <AlertCircle className="h-4 w-4 text-red-600" /> <AlertDescription className="text-red-800"> {error} <button onClick={() => setError(null)} className="ml-4 text-sm underline" > Dismiss </button> </AlertDescription> </Alert> )} {/* Key Metrics */} <div className="grid grid-cols-1 md:grid-cols-4 gap-4"> <Card className="p-4"> <p className="text-sm text-muted-foreground mb-1">Total Pending</p> <p className="text-3xl font-bold text-orange-600"> {pendingApprovals.length} </p> </Card> <Card className="p-4"> <p className="text-sm text-muted-foreground mb-1">Approved</p> <p className="text-3xl font-bold text-green-600"> {approvedApprovals.length} </p> </Card> <Card className="p-4"> <p className="text-sm text-muted-foreground mb-1">Rejected</p> <p className="text-3xl font-bold text-red-600"> {rejectedApprovals.length} </p> </Card> <Card className="p-4"> <p className="text-sm text-muted-foreground mb-1">Total Documents</p> <p className="text-3xl font-bold">{approvals.length}</p> </Card> </div> {/* Main Tabs */} <Tabs defaultValue="pending" className="w-full"> <TabsList className="grid w-full grid-cols-4"> <TabsTrigger value="pending"> Pending ({pendingApprovals.length}) </TabsTrigger> <TabsTrigger value="approved"> Approved ({approvedApprovals.length}) </TabsTrigger> <TabsTrigger value="rejected"> Rejected ({rejectedApprovals.length}) </TabsTrigger> <TabsTrigger value="collaboration">Collaboration</TabsTrigger> </TabsList> {/* Pending Tab */} <TabsContent value="pending" className="space-y-4"> {pendingApprovals.length === 0 ? ( <Alert> <CheckCircle2 className="h-4 w-4 text-green-600" /> <AlertDescription> No pending approvals. All documents have been reviewed. </AlertDescription> </Alert> ) : ( <div className="space-y-3"> {pendingApprovals.map((approval) => ( <ApprovalCard key={approval.id} approval={approval} isSelected={selectedApproval?.id === approval.id} onSelect={() => { setSelectedApproval(approval); fetchComments(approval.id); }} onApprove={() => handleApprove(approval.id)} onReject={() => handleReject(approval.id)} /> ))} </div> )} </TabsContent> {/* Approved Tab */} <TabsContent value="approved" className="space-y-4"> {approvedApprovals.length === 0 ? ( <Alert> <AlertCircle className="h-4 w-4" /> <AlertDescription>No approved documents yet</AlertDescription> </Alert> ) : ( <div className="space-y-3"> {approvedApprovals.map((approval) => ( <ApprovedCard key={approval.id} approval={approval} /> ))} </div> )} </TabsContent> {/* Rejected Tab */} <TabsContent value="rejected" className="space-y-4"> {rejectedApprovals.length === 0 ? ( <Alert> <CheckCircle2 className="h-4 w-4 text-green-600" /> <AlertDescription>No rejected documents</AlertDescription> </Alert> ) : ( <div className="space-y-3"> {rejectedApprovals.map((approval) => ( <RejectedCard key={approval.id} approval={approval} /> ))} </div> )} </TabsContent> {/* Collaboration Tab */} <TabsContent value="collaboration" className="space-y-4"> {!selectedApproval ? ( <Alert> <AlertCircle className="h-4 w-4" /> <AlertDescription> Select an approval request to view comments and collaborate </AlertDescription> </Alert> ) : ( <div className="space-y-4"> <Card className="p-4 bg-blue-50 border-blue-200"> <h3 className="font-semibold text-blue-900 mb-2"> {selectedApproval.documentType} - {selectedApproval.requestedByName} </h3> <p className="text-sm text-blue-800"> Requested on {new Date(selectedApproval.createdAt).toLocaleDateString()} </p> </Card> {/* Comments Section */} <Card className="p-4"> <h3 className="font-semibold mb-4">Comments</h3> <div className="space-y-3 mb-4 max-h-64 overflow-y-auto"> {comments.length === 0 ? ( <p className="text-sm text-muted-foreground">No comments yet</p> ) : ( comments.map((comment) => ( <div key={comment.id} className="p-3 bg-surface rounded-md" > <div className="flex items-start justify-between mb-1"> <p className="font-medium text-sm"> {comment.userName} </p> <span className="text-xs text-muted-foreground"> {new Date(comment.createdAt).toLocaleTimeString()} </span> </div> <p className="text-sm text-foreground mb-2"> {comment.content} </p> <button className="text-xs text-muted-foreground hover:text-gray-800 flex items-center gap-1"> <ThumbsUp className="w-3 h-3" /> {comment.likes} </button> </div> )) )} </div> {/* Add Comment */} <div className="flex gap-2"> <Input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment..." onKeyPress={(e) => { if (e.key === 'Enter') { handleAddComment(); } }} /> <Button onClick={handleAddComment} disabled={!commentText.trim()} size="sm" > <Send className="w-4 h-4" /> </Button> </div> </Card> {/* Approval Actions */} <Card className="p-4"> <h3 className="font-semibold mb-4">Your Decision</h3> <div className="space-y-3"> <div> <label className="block text-sm font-medium mb-1"> Notes (Optional) </label> <textarea value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} placeholder="Add notes to your approval..." className="w-full px-3 py-2 border rounded-md text-sm" rows={3} /> </div> <div className="flex gap-2"> <Button onClick={() => handleApprove(selectedApproval.id)} className="flex-1 bg-green-600 hover:bg-green-700" > <CheckCircle2 className="w-4 h-4 mr-2" /> Approve </Button> <Button onClick={() => handleReject(selectedApproval.id)} className="flex-1 bg-red-600 hover:bg-red-700" > <XCircle className="w-4 h-4 mr-2" /> Reject </Button> </div> </div> </Card> </div> )} </TabsContent> </Tabs> </div> </main> );
    } catch (e) {}
  };
}
function ApprovalCard({
  approval,
  isSelected,
  onSelect,
  onApprove,
  onReject,
}: {
  approval: ApprovalRequest;
  isSelected: boolean;
  onSelect: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const approvalProgress =
    (approval.currentApprovals / approval.requiredApprovals) * 100;
  return (
    <Card
      className={`p-4 cursor-pointer transition ${isSelected ? "bg-blue-50 border-primary" : "hover:bg-surface"}`}
      onClick={onSelect}
    >
      {" "}
      <div className="flex items-start justify-between mb-3">
        {" "}
        <div>
          {" "}
          <p className="font-semibold">
            {approval.documentType.toUpperCase()}
          </p>{" "}
          <p className="text-sm text-muted-foreground">
            {" "}
            Requested by {approval.requestedByName}{" "}
          </p>{" "}
        </div>{" "}
        <Clock className="w-5 h-5 text-orange-500" />{" "}
      </div>{" "}
      <div className="mb-3">
        {" "}
        <div className="flex items-center justify-between mb-1">
          {" "}
          <span className="text-xs font-medium">Approval Progress</span>{" "}
          <span className="text-xs text-muted-foreground">
            {" "}
            {approval.currentApprovals} / {approval.requiredApprovals}{" "}
          </span>{" "}
        </div>{" "}
        <div className="w-full bg-surface rounded h-2">
          {" "}
          <div
            className="bg-green-600 h-2 rounded transition-all"
            style={{ width: `${approvalProgress}%` }}
          />{" "}
        </div>{" "}
      </div>{" "}
      <div className="flex items-center gap-2">
        {" "}
        <span className="text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded">
          {" "}
          Pending your approval{" "}
        </span>{" "}
        <span className="text-xs text-muted-foreground">
          {" "}
          {new Date(approval.createdAt).toLocaleDateString()}{" "}
        </span>{" "}
      </div>{" "}
      {isSelected && (
        <div className="flex gap-2 mt-3">
          {" "}
          <Button
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={(e) => {
              e.stopPropagation();
              onApprove();
            }}
          >
            {" "}
            Approve{" "}
          </Button>{" "}
          <Button
            size="sm"
            className="flex-1 bg-red-600 hover:bg-red-700"
            onClick={(e) => {
              e.stopPropagation();
              onReject();
            }}
          >
            {" "}
            Reject{" "}
          </Button>{" "}
        </div>
      )}{" "}
    </Card>
  );
}
function ApprovedCard({ approval }: { approval: ApprovalRequest }) {
  return (
    <Card className="p-4 bg-green-50 border-green-200">
      {" "}
      <div className="flex items-start justify-between">
        {" "}
        <div>
          {" "}
          <div className="flex items-center gap-2 mb-1">
            {" "}
            <CheckCircle2 className="w-5 h-5 text-green-600" />{" "}
            <p className="font-semibold">
              {approval.documentType.toUpperCase()}
            </p>{" "}
          </div>{" "}
          <p className="text-sm text-muted-foreground mb-2">
            {" "}
            Approved - {new Date(approval.updatedAt).toLocaleDateString()}{" "}
          </p>{" "}
        </div>{" "}
      </div>{" "}
    </Card>
  );
}
function RejectedCard({ approval }: { approval: ApprovalRequest }) {
  return (
    <Card className="p-4 bg-red-50 border-red-200">
      {" "}
      <div className="flex items-start justify-between">
        {" "}
        <div>
          {" "}
          <div className="flex items-center gap-2 mb-1">
            {" "}
            <XCircle className="w-5 h-5 text-red-600" />{" "}
            <p className="font-semibold">
              {approval.documentType.toUpperCase()}
            </p>{" "}
          </div>{" "}
          <p className="text-sm text-muted-foreground">
            {" "}
            Rejected - {new Date(approval.updatedAt).toLocaleDateString()}{" "}
          </p>{" "}
        </div>{" "}
      </div>{" "}
    </Card>
  );
}
