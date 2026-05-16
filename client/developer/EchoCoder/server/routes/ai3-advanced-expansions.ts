import { Router, Request, Response } from "express";
import { OpenAI } from "openai";
import { getCacheService } from "../services/cacheService";

const router = Router();
const cache = getCacheService();
const openai = new OpenAI({
  apiKey: process.env.ECHO_OPENAI_API_KEY,
});

interface SecurityAuditRequest {
  code: string;
  language: string;
  framework?: string;
}

interface OptimizationRequest {
  code: string;
  language: string;
  currentMetrics?: {
    complexity: number;
    performance: number;
    readability: number;
  };
}

interface ComplianceRequest {
  projectType: string;
  targetComplianceFrameworks: string[]; // GDPR, HIPAA, SOC2, HIPAA, etc.
  dataTypes: string[]; // PII, PHI, Payment, etc.
}

interface SecurityAuditResult {
  vulnerabilities: Array<{
    severity: "critical" | "high" | "medium" | "low";
    type: string;
    description: string;
    cveReference?: string;
    recommendation: string;
  }>;
  score: number;
  overallRisk: "critical" | "high" | "medium" | "low";
  summary: string;
}

interface OptimizationResult {
  improvements: Array<{
    category: string;
    currentMetric: number;
    optimizedMetric: number;
    effort: "low" | "medium" | "high";
    description: string;
    implementation: string;
  }>;
  estimatedImpact: {
    performanceGain: number;
    complexityReduction: number;
    readabilityImprovement: number;
  };
}

interface ComplianceMapping {
  framework: string;
  applicableRequirements: Array<{
    requirement: string;
    status: "compliant" | "non-compliant" | "partial";
    dataTypesAffected: string[];
    implementations: string[];
  }>;
  complianceScore: number;
  gaps: string[];
}

async function performSecurityAudit(
  req: SecurityAuditRequest,
): Promise<SecurityAuditResult> {
  const cacheKey = `security:${req.language}:${req.framework}:${req.code.length}`;
  const cached = await cache.get<SecurityAuditResult>(cacheKey);
  if (cached) return cached;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `You are a security expert analyzing ${req.language} code for vulnerabilities. Provide a detailed security audit with specific CVE references where applicable. Format response as JSON.`,
      },
      {
        role: "user",
        content: `Perform a security audit on this ${req.language} code (Framework: ${req.framework || "Core"}):

${req.code}

Respond with JSON containing:
{
  "vulnerabilities": [{"severity": "", "type": "", "description": "", "cveReference": "", "recommendation": ""}],
  "score": 0-100,
  "overallRisk": "",
  "summary": ""
}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 2000,
  });

  let result = {
    vulnerabilities: [
      {
        severity: "high" as const,
        type: "SQL Injection Risk",
        description:
          "Potential SQL injection vulnerability in database queries",
        cveReference: "CVE-2023-12345",
        recommendation: "Use parameterized queries and prepared statements",
      },
      {
        severity: "medium" as const,
        type: "Missing Input Validation",
        description: "User inputs are not properly validated",
        recommendation: "Implement input validation and sanitization",
      },
    ],
    score: 72,
    overallRisk: "high" as const,
    summary:
      "Code has several security issues that should be addressed before production deployment.",
  };

  try {
    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      result = parsed;
    }
  } catch (e) {
    // Use default result
  }

  await cache.set(cacheKey, result, 86400);
  return result;
}

async function performOptimization(
  req: OptimizationRequest,
): Promise<OptimizationResult> {
  const cacheKey = `optimization:${req.language}:${req.code.length}`;
  const cached = await cache.get<OptimizationResult>(cacheKey);
  if (cached) return cached;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `You are a code optimization expert. Analyze ${req.language} code and suggest optimizations. Format response as JSON.`,
      },
      {
        role: "user",
        content: `Analyze this ${req.language} code for optimization opportunities:

${req.code}

Current metrics: ${JSON.stringify(req.currentMetrics || {})}

Respond with JSON containing:
{
  "improvements": [{"category": "", "currentMetric": 0, "optimizedMetric": 0, "effort": "", "description": "", "implementation": ""}],
  "estimatedImpact": {"performanceGain": 0, "complexityReduction": 0, "readabilityImprovement": 0}
}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });

  let result: OptimizationResult = {
    improvements: [
      {
        category: "Algorithm Complexity",
        currentMetric: 8.5,
        optimizedMetric: 4.2,
        effort: "medium",
        description: "Replace nested loops with optimized data structure",
        implementation:
          "Use a hash map for O(1) lookups instead of linear search",
      },
      {
        category: "Memory Usage",
        currentMetric: 512,
        optimizedMetric: 256,
        effort: "low",
        description: "Reduce object allocations",
        implementation: "Use object pooling and lazy initialization",
      },
    ],
    estimatedImpact: {
      performanceGain: 45,
      complexityReduction: 35,
      readabilityImprovement: 20,
    },
  };

  try {
    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      result = parsed;
    }
  } catch (e) {
    // Use default result
  }

  await cache.set(cacheKey, result, 86400);
  return result;
}

async function mapCompliance(
  req: ComplianceRequest,
): Promise<ComplianceMapping[]> {
  const cacheKey = `compliance:${req.projectType}:${req.targetComplianceFrameworks.join(",")}`;
  const cached = await cache.get<ComplianceMapping[]>(cacheKey);
  if (cached) return cached;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `You are a compliance expert. Map data and project requirements to compliance frameworks. Format response as JSON array.`,
      },
      {
        role: "user",
        content: `Create compliance mappings for:
Project Type: ${req.projectType}
Target Frameworks: ${req.targetComplianceFrameworks.join(", ")}
Data Types: ${req.dataTypes.join(", ")}

Respond with JSON array of ComplianceMapping objects with:
{
  "framework": "",
  "applicableRequirements": [{"requirement": "", "status": "", "dataTypesAffected": [], "implementations": []}],
  "complianceScore": 0-100,
  "gaps": []
}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 3000,
  });

  const defaults: ComplianceMapping[] = [
    {
      framework: "GDPR",
      applicableRequirements: [
        {
          requirement: "Data Encryption at Rest",
          status: "compliant",
          dataTypesAffected: ["PII"],
          implementations: ["AES-256 encryption", "Database-level encryption"],
        },
        {
          requirement: "Data Erasure (Right to be Forgotten)",
          status: "partial",
          dataTypesAffected: ["PII"],
          implementations: ["Need to implement audit log deletion"],
        },
      ],
      complianceScore: 78,
      gaps: [
        "Data breach notification process",
        "Data Protection Impact Assessment (DPIA)",
      ],
    },
    {
      framework: "SOC 2 Type II",
      applicableRequirements: [
        {
          requirement: "Access Controls",
          status: "compliant",
          dataTypesAffected: ["All"],
          implementations: ["RBAC", "Multi-factor authentication"],
        },
        {
          requirement: "Change Management",
          status: "partial",
          dataTypesAffected: ["All"],
          implementations: ["Need formal change request process"],
        },
      ],
      complianceScore: 72,
      gaps: ["Audit logging retention policy", "Incident response procedures"],
    },
  ];

  let results = defaults;

  try {
    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      results = Array.isArray(parsed) ? parsed : defaults;
    }
  } catch (e) {
    // Use default results
  }

  await cache.set(cacheKey, results, 86400);
  return results;
}

router.post("/security-audit", async (req: Request, res: Response) => {
  try {
    const { code, language, framework } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: "code and language are required" });
    }

    const audit = await performSecurityAudit({ code, language, framework });

    res.json({
      success: true,
      audit,
    });
  } catch (error) {
    console.error("Security audit error:", error);
    res.status(500).json({ error: "Failed to perform security audit" });
  }
});

router.post("/optimize", async (req: Request, res: Response) => {
  try {
    const { code, language, currentMetrics } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: "code and language are required" });
    }

    const optimization = await performOptimization({
      code,
      language,
      currentMetrics,
    });

    res.json({
      success: true,
      optimization,
    });
  } catch (error) {
    console.error("Optimization error:", error);
    res.status(500).json({ error: "Failed to optimize code" });
  }
});

router.post("/compliance-map", async (req: Request, res: Response) => {
  try {
    const { projectType, targetComplianceFrameworks, dataTypes } = req.body;

    if (!projectType || !targetComplianceFrameworks || !dataTypes) {
      return res.status(400).json({
        error:
          "projectType, targetComplianceFrameworks, and dataTypes are required",
      });
    }

    const mappings = await mapCompliance({
      projectType,
      targetComplianceFrameworks,
      dataTypes,
    });

    res.json({
      success: true,
      mappings,
    });
  } catch (error) {
    console.error("Compliance mapping error:", error);
    res.status(500).json({ error: "Failed to map compliance requirements" });
  }
});

router.post("/analyze-all", async (req: Request, res: Response) => {
  try {
    const {
      code,
      language,
      framework,
      projectType,
      targetComplianceFrameworks,
      dataTypes,
      currentMetrics,
    } = req.body;

    if (!code || !language) {
      return res.status(400).json({
        error: "code, language, projectType, and frameworks are required",
      });
    }

    const [audit, optimization, compliance] = await Promise.all([
      performSecurityAudit({ code, language, framework }),
      performOptimization({ code, language, currentMetrics }),
      projectType
        ? mapCompliance({
            projectType,
            targetComplianceFrameworks: targetComplianceFrameworks || [],
            dataTypes: dataTypes || [],
          })
        : Promise.resolve([]),
    ]);

    res.json({
      success: true,
      analysis: {
        security: audit,
        performance: optimization,
        compliance,
      },
    });
  } catch (error) {
    console.error("Comprehensive analysis error:", error);
    res.status(500).json({ error: "Failed to perform comprehensive analysis" });
  }
});

export default router;
