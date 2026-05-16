import type { RequestHandler } from "express";

interface EmployeeSkill {
  skillId: string;
  name: string;
  level: "beginner" | "intermediate" | "expert";
  certifications: string[];
  yearsExperience: number;
  lastUsed: string;
}

interface SharedJob {
  jobId: string;
  title: string;
  department: string;
  schedule: {
    daysPerWeek: number;
    hoursPerWeek: number;
    shifts: string[];
  };
  employees: Array<{
    employeeId: string;
    name: string;
    allocation: number;
    skills: EmployeeSkill[];
    availability: string[];
  }>;
  requiredSkills: EmployeeSkill[];
  coverage: number;
  efficiency: number;
}

interface JobSharingAnalysis {
  sharedJobs: SharedJob[];
  totalJobs: number;
  optimalMatches: Array<{
    jobId: string;
    recommendedEmployee: string;
    matchScore: number;
    reason: string;
  }>;
  crossTrainingOpportunities: Array<{
    employee: string;
    skill: string;
    benefit: string;
  }>;
  insights: string[];
  recommendations: string[];
}

const generateJobSharingAnalyticsHandler: RequestHandler = async (req, res) => {
  try {
    const { departmentId, optimizationStrategy = "coverage" } = req.body;

    const sharedJobs: SharedJob[] = [
      {
        jobId: "job-001",
        title: "Head Chef",
        department: "Culinary",
        schedule: {
          daysPerWeek: 5,
          hoursPerWeek: 40,
          shifts: ["Lunch", "Dinner"],
        },
        employees: [
          {
            employeeId: "emp-101",
            name: "Marcus Johnson",
            allocation: 60,
            skills: [
              {
                skillId: "sk-001",
                name: "Classical French Cuisine",
                level: "expert",
                certifications: ["Le Cordon Bleu"],
                yearsExperience: 12,
                lastUsed: "2024-01-15",
              },
              {
                skillId: "sk-002",
                name: "Kitchen Management",
                level: "expert",
                certifications: ["ServSafe Manager"],
                yearsExperience: 8,
                lastUsed: "2024-01-20",
              },
            ],
            availability: ["Monday-Friday", "Weekends available"],
          },
          {
            employeeId: "emp-102",
            name: "Sofia Chen",
            allocation: 40,
            skills: [
              {
                skillId: "sk-001",
                name: "Classical French Cuisine",
                level: "intermediate",
                certifications: [],
                yearsExperience: 5,
                lastUsed: "2024-01-18",
              },
              {
                skillId: "sk-003",
                name: "Asian Fusion",
                level: "expert",
                certifications: ["Michelin Training"],
                yearsExperience: 7,
                lastUsed: "2024-01-22",
              },
            ],
            availability: ["Flexible", "Weekends preferred"],
          },
        ],
        requiredSkills: [
          {
            skillId: "sk-001",
            name: "Classical French Cuisine",
            level: "expert",
            certifications: ["Le Cordon Bleu"],
            yearsExperience: 10,
            lastUsed: "2024-01-15",
          },
          {
            skillId: "sk-002",
            name: "Kitchen Management",
            level: "expert",
            certifications: ["ServSafe Manager"],
            yearsExperience: 5,
            lastUsed: "2024-01-20",
          },
        ],
        coverage: 100,
        efficiency: 92,
      },
      {
        jobId: "job-002",
        title: "Sommelier / Wine Director",
        department: "Beverage",
        schedule: {
          daysPerWeek: 4,
          hoursPerWeek: 32,
          shifts: ["Dinner"],
        },
        employees: [
          {
            employeeId: "emp-103",
            name: "David Rodriguez",
            allocation: 70,
            skills: [
              {
                skillId: "sk-004",
                name: "Wine Knowledge",
                level: "expert",
                certifications: ["Court of Master Sommeliers Level 2"],
                yearsExperience: 15,
                lastUsed: "2024-01-22",
              },
            ],
            availability: ["Dinner service", "Special events"],
          },
          {
            employeeId: "emp-104",
            name: "Jessica Kim",
            allocation: 30,
            skills: [
              {
                skillId: "sk-004",
                name: "Wine Knowledge",
                level: "intermediate",
                certifications: ["WSET Level 2"],
                yearsExperience: 3,
                lastUsed: "2024-01-20",
              },
            ],
            availability: ["Weekends", "Training schedule"],
          },
        ],
        requiredSkills: [
          {
            skillId: "sk-004",
            name: "Wine Knowledge",
            level: "expert",
            certifications: ["Court of Master Sommeliers"],
            yearsExperience: 10,
            lastUsed: "2024-01-22",
          },
        ],
        coverage: 100,
        efficiency: 88,
      },
    ];

    const optimalMatches = [
      {
        jobId: "job-001",
        recommendedEmployee: "Sofia Chen",
        matchScore: 94,
        reason:
          "Expert in Asian Fusion - adds menu diversity, strong French background",
      },
      {
        jobId: "job-002",
        recommendedEmployee: "Jessica Kim",
        matchScore: 87,
        reason: "WSET Level 2 certified, eager to develop - ideal for growth",
      },
    ];

    const crossTrainingOpportunities = [
      {
        employee: "Sofia Chen",
        skill: "Kitchen Management Certification",
        benefit: "Enables succession planning, improves operational knowledge",
      },
      {
        employee: "Jessica Kim",
        skill: "Level 3 Sommelier Certification",
        benefit: "Increases job flexibility, improves mentorship capability",
      },
      {
        employee: "Marcus Johnson",
        skill: "Asian Fusion Techniques",
        benefit: "Expands menu options, reduces dependency on Sofia",
      },
    ];

    const insights = [
      `Job sharing model reduces staffing costs by estimated 18-22% while maintaining 100% coverage`,
      `Marcus Johnson and Sofia Chen job share efficiently - together they cover all skill requirements`,
      `David Rodriguez has capacity for mentoring - recommend pairing with Jessica Kim quarterly`,
      `Current skill matrix: ${sharedJobs.reduce((sum, j) => sum + j.coverage, 0) / sharedJobs.length}% coverage across all shared positions`,
      `Cross-training recommendations could reduce hiring costs by $45,000-$60,000 annually`,
    ];

    const recommendations = [
      "Formalize job sharing agreement between Marcus & Sofia with clear schedule rotation",
      "Establish mentorship program: David Rodriguez → Jessica Kim (1 hour/week)",
      "Enroll Jessica Kim in WSET Level 3 program (company-sponsored, $2,500 investment)",
      "Create skill matrix dashboard for real-time job-skill matching",
      "Implement quarterly skill assessments to track competency growth",
      "Consider expanding job sharing model to prep cook and server positions",
    ];

    const analysis: JobSharingAnalysis = {
      sharedJobs,
      totalJobs: sharedJobs.length,
      optimalMatches,
      crossTrainingOpportunities,
      insights,
      recommendations,
    };

    res.json(analysis);
  } catch (error) {
    console.error("[JOB-SHARING] Analytics error:", error);
    res.status(500).json({
      error: "Job sharing analytics generation failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export default generateJobSharingAnalyticsHandler;
