import { Router, Request, Response } from "express";
import { realtimeManager } from "../lib/realtime";
import * as Sentry from "@sentry/node";

const jobSharingRouter = Router();

// Wrap all route handlers with Sentry error tracking
jobSharingRouter.use((req, res, next) => {
  Sentry.captureException(null);
  next();
});

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
  selectedStaff?: {
    id: string;
    name: string;
  };
  status: "pending" | "approved" | "confirmed" | "rejected";
  approvalChain: {
    step: "requesting_chef" | "covering_staff" | "manager";
    approver: string;
    approved: boolean;
    approvedAt?: string;
  }[];
}

// Mock data
const jobShareRequests: Map<string, JobShareRequest> = new Map([
  [
    "job-share-1",
    {
      id: "job-share-1",
      requestingPosition: "Saute Station",
      date: "2024-12-20",
      reason: "Unexpected absence - James called out sick",
      requestedBy: "Chef_Frank",
      availableTrainedStaff: [
        {
          id: "staff-1",
          name: "Maria",
          trainedStations: ["Saute Station", "Grill"],
          trainedDate: "2024-01-20",
          trainedBy: "Chef_Frank",
          rating: 4.8,
          availability: true,
        },
        {
          id: "staff-2",
          name: "David",
          trainedStations: ["Saute Station", "Prep"],
          trainedDate: "2024-03-15",
          trainedBy: "Chef_Jean",
          rating: 4.5,
          availability: true,
        },
      ],
      status: "pending",
      approvalChain: [
        {
          step: "requesting_chef",
          approver: "Chef_Frank",
          approved: true,
          approvedAt: new Date().toISOString(),
        },
        {
          step: "covering_staff",
          approver: "",
          approved: false,
        },
        {
          step: "manager",
          approver: "",
          approved: false,
        },
      ],
    },
  ],
]);

const staffCertifications: Map<string, string[]> = new Map([
  ["staff-1", ["Saute Station", "Grill", "Prep", "Pastry"]],
  ["staff-2", ["Saute Station", "Prep", "Grill"]],
  ["staff-3", ["Saute Station", "Saucier"]],
  ["staff-4", ["Grill", "Fryer"]],
]);

// Create job share request
jobSharingRouter.post("/api/job-sharing/create", async (req: Request, res: Response) => {
  try {
    const {
      requestingPosition,
      date,
      reason,
      requestedBy,
      departmentId,
    } = req.body;

    // Get all staff trained for this position
    const availableTrainedStaff: StaffMember[] = [];

    // Find trained staff from certifications
    for (const [staffId, certifications] of staffCertifications.entries()) {
      if (certifications.includes(requestingPosition)) {
        availableTrainedStaff.push({
          id: staffId,
          name: `Staff_${staffId}`,
          trainedStations: certifications,
          trainedDate: "2024-01-20",
          trainedBy: "Chef_Manager",
          rating: 4.5,
          availability: true,
        });
      }
    }

    const jobShare: JobShareRequest = {
      id: `job-share-${Date.now()}`,
      requestingPosition,
      date,
      reason,
      requestedBy,
      availableTrainedStaff,
      status: "pending",
      approvalChain: [
        {
          step: "requesting_chef",
          approver: requestedBy,
          approved: true,
          approvedAt: new Date().toISOString(),
        },
        {
          step: "covering_staff",
          approver: "",
          approved: false,
        },
        {
          step: "manager",
          approver: "",
          approved: false,
        },
      ],
    };

    jobShareRequests.set(jobShare.id, jobShare);

    // Broadcast to realtime subscribers
    realtimeManager.sendEvent("job-sharing", {
      type: "job-share-created",
      data: jobShare,
      timestamp: Date.now(),
    });

    res.json({
      success: true,
      jobShare,
      message: "Job share request created successfully",
    });
  } catch (error) {
    console.error("[JOB-SHARING] Create error:", error);
    Sentry.captureException(error, {
      tags: { feature: "job-sharing", action: "create" },
      extra: { requestBody: req.body },
    });
    res.status(500).json({
      success: false,
      error: "Failed to create job share request",
    });
  }
});

// Confirm job sharing request
jobSharingRouter.post("/api/job-sharing/confirm", async (req: Request, res: Response) => {
  try {
    const { jobShareId, staffId, confirmBy } = req.body;

    const jobShare = jobShareRequests.get(jobShareId);
    if (!jobShare) {
      return res.status(404).json({ error: "Job share request not found" });
    }

    // Verify staff is in available list
    const selectedStaff = jobShare.availableTrainedStaff.find(
      (staff) => staff.id === staffId
    );
    if (!selectedStaff) {
      return res
        .status(400)
        .json({ error: "Selected staff is not trained for this position" });
    }

    jobShare.selectedStaff = {
      id: staffId,
      name: selectedStaff.name,
    };

    // Update approval chain
    jobShare.approvalChain[1].approver = staffId;
    jobShare.approvalChain[1].approved = true;
    jobShare.approvalChain[1].approvedAt = new Date().toISOString();

    // Update status
    if (
      jobShare.approvalChain[0].approved &&
      jobShare.approvalChain[1].approved
    ) {
      jobShare.status = "confirmed";
    }

    jobShareRequests.set(jobShareId, jobShare);

    // Broadcast confirmation
    realtimeManager.sendEvent("job-sharing", {
      type: "job-share-confirmed",
      data: jobShare,
      timestamp: Date.now(),
    });

    res.json({
      success: true,
      jobShare,
      message: "Staff confirmed for job share",
    });
  } catch (error) {
    console.error("[JOB-SHARING] Confirm error:", error);
    Sentry.captureException(error, {
      tags: { feature: "job-sharing", action: "confirm" },
      extra: { jobShareId, staffId },
    });
    res.status(500).json({
      success: false,
      error: "Failed to confirm job share",
    });
  }
});

// Get pending job share requests
jobSharingRouter.get("/api/job-sharing/pending", async (req: Request, res: Response) => {
  try {
    const pending = Array.from(jobShareRequests.values()).filter(
      (req) => req.status === "pending"
    );

    res.json({
      success: true,
      pending,
      count: pending.length,
    });
  } catch (error) {
    console.error("[JOB-SHARING] Get pending error:", error);
    Sentry.captureException(error, {
      tags: { feature: "job-sharing", action: "get-pending" },
    });
    res.status(500).json({
      success: false,
      error: "Failed to fetch pending requests",
    });
  }
});

// Get staff certifications
jobSharingRouter.get("/api/job-sharing/certifications/:staffId", async (req: Request, res: Response) => {
  try {
    const { staffId } = req.params;
    const certifications = staffCertifications.get(staffId) || [];

    res.json({
      success: true,
      staffId,
      certifications,
      trainedPositions: certifications.length,
    });
  } catch (error) {
    console.error("[JOB-SHARING] Get certifications error:", error);
    Sentry.captureException(error, {
      tags: { feature: "job-sharing", action: "get-certifications" },
      extra: { staffId },
    });
    res.status(500).json({
      success: false,
      error: "Failed to fetch certifications",
    });
  }
});

// Manager approval
jobSharingRouter.post("/api/job-sharing/approve", async (req: Request, res: Response) => {
  try {
    const { jobShareId, managerId } = req.body;

    const jobShare = jobShareRequests.get(jobShareId);
    if (!jobShare) {
      return res.status(404).json({ error: "Job share request not found" });
    }

    // Update manager approval
    jobShare.approvalChain[2].approver = managerId;
    jobShare.approvalChain[2].approved = true;
    jobShare.approvalChain[2].approvedAt = new Date().toISOString();

    // If all approved, mark as approved
    const allApproved = jobShare.approvalChain.every((step) => step.approved);
    if (allApproved) {
      jobShare.status = "approved";
    }

    jobShareRequests.set(jobShareId, jobShare);

    // Broadcast approval
    realtimeManager.sendEvent("job-sharing", {
      type: "job-share-approved",
      data: jobShare,
      timestamp: Date.now(),
    });

    res.json({
      success: true,
      jobShare,
      message: "Job share request approved",
    });
  } catch (error) {
    console.error("[JOB-SHARING] Approval error:", error);
    Sentry.captureException(error, {
      tags: { feature: "job-sharing", action: "approve" },
      extra: { jobShareId, managerId },
    });
    res.status(500).json({
      success: false,
      error: "Failed to approve job share",
    });
  }
});

export default jobSharingRouter;
