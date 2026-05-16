import React from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  MapPin,
  Calendar,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/glass";
interface StaffMember {
  id: string;
  name: string;
  trainedStations: string[];
  trainedDate: string;
  trainedBy: string;
  rating: number;
  availability: boolean;
}
interface JobShareRequest {
  id: string;
  requestingPosition: string;
  date: string;
  reason: string;
  requestedBy: string;
  availableTrainedStaff: StaffMember[];
  selectedStaff?: { id: string; name: string };
  status: "pending" | "approved" | "confirmed" | "rejected";
  approvalChain: {
    step: "requesting_chef" | "covering_staff" | "manager";
    approver: string;
    approved: boolean;
    approvedAt?: string;
  }[];
}
const JobSharingPanel: React.FC = () => {
  const [pendingRequests, setPendingRequests] = React.useState<JobShareRequest[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedRequest, setSelectedRequest] =
    React.useState<JobShareRequest | null>(null);
  const [selectedStaffId, setSelectedStaffId] = React.useState<string>("");
  React.useEffect(() => {
    fetchPendingRequests();
  }, []);
  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/job-sharing/pending");
      if (response.ok) {
        const data = await response.json();
        setPendingRequests(data.pending || []);
      }
    } catch (error) {
      console.error("[JobSharing] Fetch pending error:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleConfirmStaff = async () => {
    if (!selectedRequest || !selectedStaffId) return;
    try {
      const response = await fetch("/api/job-sharing/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobShareId: selectedRequest.id,
          staffId: selectedStaffId,
          confirmBy: selectedStaffId,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setPendingRequests((prev) =>
          prev.map((req) =>
            req.id === data.jobShare.id ? data.jobShare : req,
          ),
        );
        setSelectedRequest(data.jobShare);
        setSelectedStaffId("");
      }
    } catch (error) {
      console.error("[JobSharing] Confirm error:", error);
    }
  };
  const handleManagerApproval = async (requestId: string) => {
    try {
      const response = await fetch("/api/job-sharing/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobShareId: requestId,
          managerId: "manager-001",
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setPendingRequests((prev) =>
          prev.map((req) =>
            req.id === data.jobShare.id ? data.jobShare : req,
          ),
        );
      }
    } catch (error) {
      console.error("[JobSharing] Approval error:", error);
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="text-green-400" size={18} />;
      case "confirmed":
        return <CheckCircle className="text-green-500" size={18} />;
      case "pending":
        return <Clock className="text-yellow-400" size={18} />;
      default:
        return <AlertCircle className="text-red-400" size={18} />;
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "confirmed":
        return "bg-green-600/20 text-green-300 border-green-600/30";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-red-500/20 text-red-400 border-red-500/30";
    }
  };
  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        {" "}
        <p className="text-foreground/60">Loading job share requests...</p>{" "}
      </div>
    );
  }
  return (
    <div className="w-full h-full bg-background/40 backdrop-blur-sm border border-cyan-400/30 rounded-lg flex flex-col overflow-hidden">
      {" "}
      {/* Header */}{" "}
      <div className="p-4 border-b border-cyan-400/20 bg-gradient-to-r from-cyan-500/10 to-cyan-400/5">
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <div className="flex items-center gap-2">
            {" "}
            <MapPin size={18} className="text-cyan-400" />{" "}
            <h2 className="font-semibold text-sm text-foreground">
              Job Sharing
            </h2>{" "}
          </div>{" "}
          <span className="text-xs bg-cyan-400/20 px-2 py-1 rounded text-cyan-400">
            {" "}
            {pendingRequests.length} Pending{" "}
          </span>{" "}
        </div>{" "}
      </div>{" "}
      {/* Content */}{" "}
      <div className="flex-1 overflow-y-auto">
        {" "}
        {pendingRequests.length === 0 ? (
          <div className="p-6 text-center text-foreground/60">
            {" "}
            <p className="text-sm">No pending job share requests</p>{" "}
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {" "}
            {pendingRequests.map((request) => (
              <Card
                key={request.id}
                className={cn(
                  "p-3 border cursor-pointer transition",
                  selectedRequest?.id === request.id
                    ? "border-cyan-400 bg-cyan-400/10"
                    : "border-cyan-400/20 hover:border-cyan-400/40",
                )}
                onClick={() => setSelectedRequest(request)}
              >
                {" "}
                {/* Request Header */}{" "}
                <div className="flex items-start justify-between mb-3">
                  {" "}
                  <div className="flex items-start gap-2 flex-1">
                    {" "}
                    <div className="mt-1">
                      {getStatusIcon(request.status)}
                    </div>{" "}
                    <div className="flex-1">
                      {" "}
                      <p className="font-medium text-sm text-foreground">
                        {" "}
                        {request.requestingPosition}{" "}
                      </p>{" "}
                      <p className="text-xs text-foreground/60 mt-1">
                        {" "}
                        {request.reason}{" "}
                      </p>{" "}
                    </div>{" "}
                  </div>{" "}
                  <span
                    className={cn(
                      "text-[10px] px-2 py-1 rounded border",
                      getStatusColor(request.status),
                    )}
                  >
                    {" "}
                    {request.status.toUpperCase()}{" "}
                  </span>{" "}
                </div>{" "}
                {/* Request Details */}{" "}
                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  {" "}
                  <div className="flex items-center gap-1 text-foreground/60">
                    {" "}
                    <Calendar size={12} />{" "}
                    {new Date(request.date).toLocaleDateString()}{" "}
                  </div>{" "}
                  <div className="flex items-center gap-1 text-foreground/60">
                    {" "}
                    <User size={12} /> {request.requestedBy}{" "}
                  </div>{" "}
                </div>{" "}
                {/* Trained Staff */}{" "}
                {selectedRequest?.id === request.id && (
                  <div className="mt-3 pt-3 border-t border-cyan-400/10">
                    {" "}
                    <p className="text-xs font-semibold text-cyan-400 mb-2">
                      {" "}
                      Trained Staff Available:{" "}
                    </p>{" "}
                    <div className="space-y-2">
                      {" "}
                      {request.availableTrainedStaff.map((staff) => (
                        <div
                          key={staff.id}
                          className="p-2 bg-background/30 rounded border border-blue-400/20 hover:border-blue-400/40 transition cursor-pointer"
                          onClick={() => setSelectedStaffId(staff.id)}
                        >
                          {" "}
                          <div className="flex items-start justify-between">
                            {" "}
                            <div>
                              {" "}
                              <p className="text-xs font-medium text-foreground">
                                {" "}
                                {staff.name}{" "}
                              </p>{" "}
                              <p className="text-[10px] text-foreground/60 mt-1">
                                {" "}
                                Rating: {staff.rating.toFixed(1)} ⭐{" "}
                              </p>{" "}
                              <p className="text-[10px] text-foreground/60">
                                {" "}
                                Trained by: {staff.trainedBy}{" "}
                              </p>{" "}
                            </div>{" "}
                            <input
                              type="radio"
                              name="staffSelection"
                              value={staff.id}
                              checked={selectedStaffId === staff.id}
                              onChange={() => setSelectedStaffId(staff.id)}
                              className="mt-1"
                            />{" "}
                          </div>{" "}
                        </div>
                      ))}{" "}
                    </div>{" "}
                    {/* Confirmation Button */}{" "}
                    {selectedStaffId && (
                      <div className="mt-3 flex gap-2">
                        {" "}
                        <Button
                          onClick={handleConfirmStaff}
                          className="flex-1 text-xs bg-green-600/30 hover:bg-green-600/50 text-green-300 border border-green-500/30"
                        >
                          {" "}
                          Confirm Staff{" "}
                        </Button>{" "}
                        <Button
                          onClick={() => handleManagerApproval(request.id)}
                          className="flex-1 text-xs bg-primary/30 hover:bg-primary/50 text-primary border border-blue-500/30"
                        >
                          {" "}
                          Manager Approve{" "}
                        </Button>{" "}
                      </div>
                    )}{" "}
                  </div>
                )}{" "}
              </Card>
            ))}{" "}
          </div>
        )}{" "}
      </div>{" "}
      {/* Footer */}{" "}
      <div className="p-3 border-t border-cyan-400/10 bg-background/20">
        {" "}
        <button
          onClick={fetchPendingRequests}
          className="w-full text-xs text-cyan-400 hover:text-cyan-300 py-2 transition"
        >
          {" "}
          Refresh Requests{" "}
        </button>{" "}
      </div>{" "}
    </div>
  );
};
export default JobSharingPanel;
