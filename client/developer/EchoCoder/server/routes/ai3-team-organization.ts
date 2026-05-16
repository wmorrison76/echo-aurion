import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

const router = Router();

interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "member" | "viewer";
  organizationId: string;
  createdAt: string;
}

interface Organization {
  id: string;
  name: string;
  plan: "free" | "pro" | "enterprise";
  usersCount: number;
  createdAt: string;
  settings: {
    requireApproval: boolean;
    maxTeamMembers: number;
    enableSSO: boolean;
  };
}

interface ApprovalWorkflow {
  id: string;
  generationId: string;
  requestedBy: string;
  status: "pending" | "approved" | "rejected";
  approvers: string[];
  approvals: Array<{ userId: string; approvedAt: string; comments: string }>;
  createdAt: string;
  expiresAt: string;
}

interface Role {
  name: string;
  permissions: string[];
  description: string;
}

const defaultRoles: Record<string, Role> = {
  admin: {
    name: "Admin",
    permissions: [
      "generate-code",
      "view-analytics",
      "manage-users",
      "approve-generations",
      "manage-team",
      "view-audit-logs",
      "manage-integrations",
      "manage-billing",
    ],
    description: "Full access to all features",
  },
  member: {
    name: "Member",
    permissions: [
      "generate-code",
      "view-analytics",
      "submit-for-approval",
      "view-team-generations",
    ],
    description: "Can generate code and view team analytics",
  },
  viewer: {
    name: "Viewer",
    permissions: ["view-analytics", "view-team-generations"],
    description: "Read-only access to analytics and shared generations",
  },
};

let organizations: Map<string, Organization> = new Map();
let users: Map<string, User> = new Map();
let approvalWorkflows: Map<string, ApprovalWorkflow> = new Map();

router.post("/organizations", async (req: Request, res: Response) => {
  try {
    const { name, plan = "free" } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Organization name is required" });
    }

    const orgId = `org-${uuidv4()}`;
    const org: Organization = {
      id: orgId,
      name,
      plan,
      usersCount: 1,
      createdAt: new Date().toISOString(),
      settings: {
        requireApproval: plan !== "free",
        maxTeamMembers: plan === "free" ? 5 : plan === "pro" ? 50 : 1000,
        enableSSO: plan === "enterprise",
      },
    };

    organizations.set(orgId, org);
    res.json({ success: true, organization: org });
  } catch (error) {
    console.error("Organization creation error:", error);
    res.status(500).json({ error: "Failed to create organization" });
  }
});

router.get("/organizations/:orgId", async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const org = organizations.get(orgId);

    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    res.json({ success: true, organization: org });
  } catch (error) {
    console.error("Organization fetch error:", error);
    res.status(500).json({ error: "Failed to fetch organization" });
  }
});

router.post("/users", async (req: Request, res: Response) => {
  try {
    const { email, name, organizationId, role = "member" } = req.body;

    if (!email || !organizationId) {
      return res
        .status(400)
        .json({ error: "email and organizationId are required" });
    }

    const org = organizations.get(organizationId);
    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    if (org.usersCount >= org.settings.maxTeamMembers) {
      return res.status(400).json({
        error: `Team member limit (${org.settings.maxTeamMembers}) reached for your plan`,
      });
    }

    const userId = `user-${uuidv4()}`;
    const user: User = {
      id: userId,
      email,
      name: name || email.split("@")[0],
      role,
      organizationId,
      createdAt: new Date().toISOString(),
    };

    users.set(userId, user);
    org.usersCount += 1;

    res.json({ success: true, user });
  } catch (error) {
    console.error("User creation error:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

router.get(
  "/organizations/:orgId/users",
  async (req: Request, res: Response) => {
    try {
      const { orgId } = req.params;

      const orgUsers = Array.from(users.values()).filter(
        (u) => u.organizationId === orgId,
      );

      res.json({
        success: true,
        users: orgUsers,
        count: orgUsers.length,
      });
    } catch (error) {
      console.error("Users fetch error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  },
);

router.put("/users/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const user = users.get(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!["admin", "member", "viewer"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    user.role = role;
    users.set(userId, user);

    res.json({
      success: true,
      user,
      message: `User role updated to ${role}`,
    });
  } catch (error) {
    console.error("User update error:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

router.delete("/users/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = users.get(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const org = organizations.get(user.organizationId);
    if (org) {
      org.usersCount -= 1;
    }

    users.delete(userId);

    res.json({
      success: true,
      message: "User removed from organization",
    });
  } catch (error) {
    console.error("User deletion error:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

router.get("/roles", async (req: Request, res: Response) => {
  try {
    const roles = Object.entries(defaultRoles).map(([key, role]) => ({
      id: key,
      ...role,
    }));

    res.json({
      success: true,
      roles,
    });
  } catch (error) {
    console.error("Roles fetch error:", error);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
});

router.post("/approvals", async (req: Request, res: Response) => {
  try {
    const { generationId, requestedBy, approvers, organizationId } = req.body;

    if (!generationId || !requestedBy || !approvers) {
      return res.status(400).json({
        error: "generationId, requestedBy, and approvers are required",
      });
    }

    const org = organizations.get(organizationId);
    if (!org || !org.settings.requireApproval) {
      return res
        .status(400)
        .json({ error: "Approval workflow not enabled for this organization" });
    }

    const approvalId = `approval-${uuidv4()}`;
    const approval: ApprovalWorkflow = {
      id: approvalId,
      generationId,
      requestedBy,
      status: "pending",
      approvers,
      approvals: [],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    approvalWorkflows.set(approvalId, approval);

    res.json({
      success: true,
      approval,
      message: "Approval request created. Awaiting approver action.",
    });
  } catch (error) {
    console.error("Approval creation error:", error);
    res.status(500).json({ error: "Failed to create approval workflow" });
  }
});

router.post(
  "/approvals/:approvalId/approve",
  async (req: Request, res: Response) => {
    try {
      const { approvalId } = req.params;
      const { userId, comments = "" } = req.body;

      const approval = approvalWorkflows.get(approvalId);
      if (!approval) {
        return res.status(404).json({ error: "Approval workflow not found" });
      }

      if (!approval.approvers.includes(userId)) {
        return res
          .status(403)
          .json({ error: "You are not an authorized approver" });
      }

      const alreadyApproved = approval.approvals.some(
        (a) => a.userId === userId,
      );
      if (alreadyApproved) {
        return res
          .status(400)
          .json({ error: "You have already approved this request" });
      }

      approval.approvals.push({
        userId,
        approvedAt: new Date().toISOString(),
        comments,
      });

      if (approval.approvals.length === approval.approvers.length) {
        approval.status = "approved";
      }

      approvalWorkflows.set(approvalId, approval);

      res.json({
        success: true,
        approval,
        message:
          approval.status === "approved"
            ? "All approvers have approved!"
            : "Approval recorded",
      });
    } catch (error) {
      console.error("Approval error:", error);
      res.status(500).json({ error: "Failed to process approval" });
    }
  },
);

router.post(
  "/approvals/:approvalId/reject",
  async (req: Request, res: Response) => {
    try {
      const { approvalId } = req.params;
      const { userId, reason = "" } = req.body;

      const approval = approvalWorkflows.get(approvalId);
      if (!approval) {
        return res.status(404).json({ error: "Approval workflow not found" });
      }

      if (!approval.approvers.includes(userId)) {
        return res
          .status(403)
          .json({ error: "You are not an authorized approver" });
      }

      approval.status = "rejected";
      approval.approvals.push({
        userId,
        approvedAt: new Date().toISOString(),
        comments: `Rejected: ${reason}`,
      });

      approvalWorkflows.set(approvalId, approval);

      res.json({
        success: true,
        approval,
        message: "Generation rejected and workflow closed",
      });
    } catch (error) {
      console.error("Rejection error:", error);
      res.status(500).json({ error: "Failed to reject approval" });
    }
  },
);

router.get("/approvals/:approvalId", async (req: Request, res: Response) => {
  try {
    const { approvalId } = req.params;
    const approval = approvalWorkflows.get(approvalId);

    if (!approval) {
      return res.status(404).json({ error: "Approval workflow not found" });
    }

    res.json({ success: true, approval });
  } catch (error) {
    console.error("Approval fetch error:", error);
    res.status(500).json({ error: "Failed to fetch approval" });
  }
});

router.get(
  "/organizations/:orgId/approvals",
  async (req: Request, res: Response) => {
    try {
      const { orgId } = req.params;
      const { status } = req.query;

      let approvals = Array.from(approvalWorkflows.values());

      if (status) {
        approvals = approvals.filter((a) => a.status === status);
      }

      res.json({
        success: true,
        approvals,
        count: approvals.length,
      });
    } catch (error) {
      console.error("Approvals fetch error:", error);
      res.status(500).json({ error: "Failed to fetch approvals" });
    }
  },
);

router.post(
  "/organizations/:orgId/audit-log",
  async (req: Request, res: Response) => {
    try {
      const { orgId } = req.params;
      const { action, userId, details } = req.body;

      const log = {
        id: `log-${uuidv4()}`,
        organizationId: orgId,
        action,
        userId,
        details,
        timestamp: new Date().toISOString(),
      };

      res.json({
        success: true,
        log,
        message: "Action logged",
      });
    } catch (error) {
      console.error("Audit log error:", error);
      res.status(500).json({ error: "Failed to create audit log" });
    }
  },
);

export default router;
