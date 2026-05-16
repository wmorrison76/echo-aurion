import type { RequestHandler } from "express";

interface PTORequest {
  requestId: string;
  employeeId: string;
  employeeName: string;
  type: "vacation" | "sick" | "personal" | "unpaid" | "sabbatical";
  startDate: string;
  endDate: string;
  daysRequested: number;
  reason?: string;
  status: "pending" | "approved" | "denied" | "cancelled";
  submittedDate: string;
  approverName: string;
  approverFeedback?: string;
  coverage: {
    assignedCoverage: string[];
    coverageScore: number;
    gapAreas: string[];
  };
  impact: {
    operationalImpact: "low" | "medium" | "high";
    estimatedCost: number;
    recommendation: string;
  };
}

interface PTOAnalytics {
  requests: PTORequest[];
  totalRequests: number;
  summary: {
    approved: number;
    pending: number;
    denied: number;
    totalDaysApproved: number;
    totalDaysPending: number;
  };
  insights: string[];
  recommendations: string[];
  upcomingBlackoutPeriods: Array<{
    period: string;
    reason: string;
    restrictedDepartments: string[];
  }>;
  coveragePlan: {
    temporaryHires: number;
    crossTraining: string[];
    shiftRebalancing: string[];
  };
}

const generatePTOManagementHandler: RequestHandler = async (req, res) => {
  try {
    const { departmentId, timeframe = "quarter" } = req.body;

    const mockRequests: PTORequest[] = [
      {
        requestId: "pto-001",
        employeeId: "emp-101",
        employeeName: "Marcus Johnson",
        type: "vacation",
        startDate: "2024-03-15",
        endDate: "2024-03-29",
        daysRequested: 15,
        reason: "Family vacation to Europe",
        status: "approved",
        submittedDate: "2024-01-20",
        approverName: "Sarah Mitchell",
        coverage: {
          assignedCoverage: ["Sofia Chen", "James Rodriguez"],
          coverageScore: 94,
          gapAreas: [],
        },
        impact: {
          operationalImpact: "low",
          estimatedCost: 4500,
          recommendation:
            "Approved - Sofia Chen can cover 60%, hire temporary for 40%",
        },
      },
      {
        requestId: "pto-002",
        employeeId: "emp-103",
        employeeName: "David Rodriguez",
        type: "vacation",
        startDate: "2024-05-01",
        endDate: "2024-05-05",
        daysRequested: 5,
        reason: "Wedding attendance",
        status: "pending",
        submittedDate: "2024-01-25",
        approverName: "Sarah Mitchell",
        coverage: {
          assignedCoverage: ["Jessica Kim"],
          coverageScore: 72,
          gapAreas: ["Senior sommelier expertise gap during peak season"],
        },
        impact: {
          operationalImpact: "medium",
          estimatedCost: 2800,
          recommendation:
            "Consider temporary sommelier hire + Jessica Kim mentoring intensive",
        },
      },
      {
        requestId: "pto-003",
        employeeId: "emp-205",
        employeeName: "Amy Washington",
        type: "sick",
        startDate: "2024-02-05",
        endDate: "2024-02-07",
        daysRequested: 3,
        status: "approved",
        submittedDate: "2024-02-05",
        approverName: "Sarah Mitchell",
        coverage: {
          assignedCoverage: ["Cross-trained staff pool"],
          coverageScore: 85,
          gapAreas: [],
        },
        impact: {
          operationalImpact: "low",
          estimatedCost: 1200,
          recommendation: "Approved - standard sick leave coverage protocol",
        },
      },
      {
        requestId: "pto-004",
        employeeId: "emp-304",
        employeeName: "Kevin Park",
        type: "sabbatical",
        startDate: "2024-06-01",
        endDate: "2024-08-31",
        daysRequested: 91,
        reason: "Professional development - culinary research abroad",
        status: "pending",
        submittedDate: "2024-01-10",
        approverName: "Sarah Mitchell",
        coverage: {
          assignedCoverage: [
            "Hire replacement chef",
            "Cross-train Marcus Johnson",
          ],
          coverageScore: 68,
          gapAreas: [
            "Specialized dessert techniques",
            "Menu innovation leadership",
          ],
        },
        impact: {
          operationalImpact: "high",
          estimatedCost: 18500,
          recommendation:
            "Hire seasonal replacement chef, budget $18,500 for coverage + recruitment",
        },
      },
    ];

    const summary = {
      approved: mockRequests.filter((r) => r.status === "approved").length,
      pending: mockRequests.filter((r) => r.status === "pending").length,
      denied: mockRequests.filter((r) => r.status === "denied").length,
      totalDaysApproved: mockRequests
        .filter((r) => r.status === "approved")
        .reduce((sum, r) => sum + r.daysRequested, 0),
      totalDaysPending: mockRequests
        .filter((r) => r.status === "pending")
        .reduce((sum, r) => sum + r.daysRequested, 0),
    };

    const insights = [
      `${summary.approved} approved requests covering ${summary.totalDaysApproved} total days`,
      `${summary.pending} pending requests - ${mockRequests.find((r) => r.requestId === "pto-004")?.daysRequested || 91} days for Kevin Park sabbatical`,
      `Average coverage score: 79.75% - indicating generally manageable absences`,
      `Estimated Q1-Q3 coverage costs: $${mockRequests.reduce((sum, r) => sum + r.impact.estimatedCost, 0).toLocaleString()}`,
      `High-impact request detected: Kevin Park sabbatical requires strategic hiring`,
    ];

    const recommendations = [
      "Approve Marcus Johnson vacation - Sofia Chen can handle 60%, hire seasonal for 40%",
      "For David Rodriguez (David) vacation: Enroll Jessica Kim in advanced sommelier training before May",
      "Implement staggered vacation schedule: no more than 1 chef per month",
      "Kevin Park sabbatical: Start hiring seasonal chef by April 1st - requires 8-week lead time",
      "Create PTO blackout calendar for peak seasons (holidays, events)",
      "Budget $45,000 for temporary staffing across all approved/pending requests",
      "Establish PTO forecasting - request 90-day minimum notice for requests > 10 days",
    ];

    const upcomingBlackoutPeriods = [
      {
        period: "December 20 - January 2",
        reason: "Holiday season peak demand",
        restrictedDepartments: ["Culinary", "Beverage"],
      },
      {
        period: "May 1 - May 15",
        reason: "Mother's Day and special events",
        restrictedDepartments: ["All departments - 50% max absence"],
      },
      {
        period: "July 4 - July 7",
        reason: "Independence Day - historically busiest period",
        restrictedDepartments: ["Kitchen", "Service"],
      },
    ];

    const coveragePlan = {
      temporaryHires: 3,
      crossTraining: [
        "Sofia Chen → Senior prep chef role",
        "Jessica Kim → Lead sommelier capability",
      ],
      shiftRebalancing: [
        "Extend Sofia Chen hours during Marcus vacation",
        "Rotate sous chef schedule for Kevin sabbatical coverage",
      ],
    };

    const analytics: PTOAnalytics = {
      requests: mockRequests,
      totalRequests: mockRequests.length,
      summary,
      insights,
      recommendations,
      upcomingBlackoutPeriods,
      coveragePlan,
    };

    res.json(analytics);
  } catch (error) {
    console.error("[PTO] Management error:", error);
    res.status(500).json({
      error: "PTO management analytics generation failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export default generatePTOManagementHandler;
