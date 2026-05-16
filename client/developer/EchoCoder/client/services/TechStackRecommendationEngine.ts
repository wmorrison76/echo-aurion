// SECURITY: API calls proxied through secure /api/openai endpoints
// The actual API key is stored server-side and NEVER exposed to client

export interface DialogUnderstanding {
  coreIdea: string;
  targetUsers: string;
  mainProblem: string;
  keyFeatures: string[];
  dataEntities: string[];
  integrations: string[];
  constraints: string[];
  complexity: "simple" | "moderate" | "complex";
  completenessScore: number;
  techStackPreferences?: TechStackPreferences;
}

export interface TechStackPreferences {
  database?: DatabaseOption;
  backend?: BackendOption;
  frontend?: FrontendOption;
  reason?: string;
}

export type DatabaseOption =
  | "postgresql"
  | "mongodb"
  | "dynamodb"
  | "firebase"
  | "supabase";
export type BackendOption =
  | "typescript"
  | "python"
  | "go"
  | "rust"
  | "java"
  | "dotnet";
export type FrontendOption =
  | "react"
  | "vue"
  | "svelte"
  | "angular"
  | "next"
  | "nuxt";

export interface TechStackRecommendation {
  database: {
    name: DatabaseOption;
    rationale: string;
    benefits: string[];
    tradeoffs: string[];
    estimatedCost: string;
  };
  backend: {
    name: BackendOption;
    rationale: string;
    benefits: string[];
    tradeoffs: string[];
    estimatedPerformance: string;
  };
  frontend: {
    name: FrontendOption;
    rationale: string;
    benefits: string[];
    tradeoffs: string[];
    bundleSize: string;
  };
  overall: {
    complexity: string;
    timeToMarket: string;
    scalability: string;
    maintenanceLevel: string;
    costEstimate: string;
  };
}

class TechStackRecommendationEngine {
  async recommendStack(
    understanding: DialogUnderstanding,
  ): Promise<TechStackRecommendation> {
    try {
      const prompt = this.buildRecommendationPrompt(understanding);
      const response = await this.callOpenAI(
        prompt,
        "You are an expert software architect specializing in tech stack selection.",
      );

      return this.parseRecommendation(response);
    } catch (error) {
      console.error("Tech stack recommendation error:", error);
      return this.getDefaultRecommendation();
    }
  }

  private buildRecommendationPrompt(
    understanding: DialogUnderstanding,
  ): string {
    return `
Recommend an optimal tech stack for this project:

**Project Details:**
- Core Idea: ${understanding.coreIdea}
- Target Users: ${understanding.targetUsers}
- Main Problem: ${understanding.mainProblem}
- Key Features: ${understanding.keyFeatures.join(", ")}
- Data Entities: ${understanding.dataEntities.join(", ")}
- Required Integrations: ${understanding.integrations.join(", ")}
- Constraints: ${understanding.constraints.join(", ")}
- Complexity: ${understanding.complexity}

**Analyze and recommend:**

1. **Database**:
   - Evaluate: PostgreSQL, MongoDB, DynamoDB, Firebase, Supabase
   - For each: Provide rationale, benefits, tradeoffs, estimated cost
   - Consider: Data structure, scalability, cost, maintenance

2. **Backend**:
   - Evaluate: TypeScript/Node, Python, Go, Rust, Java, .NET
   - For each: Provide rationale, benefits, tradeoffs, performance estimate
   - Consider: Development speed, performance, scalability, ecosystem

3. **Frontend**:
   - Evaluate: React, Vue, Svelte, Angular, Next.js, Nuxt
   - For each: Provide rationale, benefits, tradeoffs, bundle size
   - Consider: Development speed, performance, ecosystem, team expertise

4. **Overall Assessment**:
   - Complexity level (simple/moderate/complex)
   - Time to market estimate (weeks)
   - Scalability potential
   - Maintenance level (low/medium/high)
   - Total cost estimate range

Return a detailed JSON response with recommendations for each category.
    `;
  }

  private async callOpenAI(prompt: string, system: string): Promise<string> {
    // SECURITY: All calls proxied through secure /api/openai endpoint
    // The API key is stored server-side and never exposed to client
    const { chatCompletion } = await import("./secureOpenAIService");
    const response = await chatCompletion({
      messages: [
        {
          role: "system",
          content: system,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "gpt-4",
      temperature: 0.7,
      maxTokens: 2000,
    });
    return response;
  }

  private parseRecommendation(response: string): TechStackRecommendation {
    try {
      // Extract JSON from response (might be wrapped in markdown)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.getDefaultRecommendation();
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        database: parsed.database || {
          name: "postgresql" as const,
          rationale: "Reliable relational database",
          benefits: ["ACID compliance", "Strong consistency"],
          tradeoffs: ["Less flexible schema"],
          estimatedCost: "$50-200/month",
        },
        backend: parsed.backend || {
          name: "typescript" as const,
          rationale: "Type-safe and widely supported",
          benefits: ["Type safety", "Large ecosystem"],
          tradeoffs: ["Requires compilation"],
          estimatedPerformance: "Moderate throughput",
        },
        frontend: parsed.frontend || {
          name: "react" as const,
          rationale: "Industry standard with large ecosystem",
          benefits: ["Large community", "Rich libraries"],
          tradeoffs: ["Larger bundle size"],
          bundleSize: "~40KB gzipped",
        },
        overall: parsed.overall || {
          complexity: "moderate",
          timeToMarket: "6-12 weeks",
          scalability: "Good",
          maintenanceLevel: "Medium",
          costEstimate: "$1000-5000/month at scale",
        },
      };
    } catch (error) {
      console.error("Parse recommendation error:", error);
      return this.getDefaultRecommendation();
    }
  }

  private getDefaultRecommendation(): TechStackRecommendation {
    return {
      database: {
        name: "postgresql",
        rationale: "Battle-tested relational database with excellent tooling",
        benefits: [
          "ACID compliance",
          "Excellent querying",
          "Strong consistency",
          "Cost-effective",
        ],
        tradeoffs: [
          "Fixed schema",
          "Scaling requires partitioning",
          "Limited horizontal scaling",
        ],
        estimatedCost: "$50-500/month",
      },
      backend: {
        name: "typescript",
        rationale: "Type-safe, widely supported, large ecosystem",
        benefits: [
          "Type safety",
          "Huge ecosystem",
          "Async-first design",
          "Easy to learn",
        ],
        tradeoffs: [
          "Slower startup",
          "Higher memory usage",
          "Requires Node runtime",
        ],
        estimatedPerformance: "5,000-10,000 req/sec",
      },
      frontend: {
        name: "react",
        rationale: "Industry standard with unmatched ecosystem",
        benefits: [
          "Huge community",
          "Rich libraries",
          "Great tooling",
          "Easy to hire for",
        ],
        tradeoffs: ["Larger bundle size", "Steep learning curve"],
        bundleSize: "~40KB gzipped",
      },
      overall: {
        complexity: "moderate",
        timeToMarket: "6-12 weeks",
        scalability:
          "Vertical scaling to 100K users, horizontal with optimization",
        maintenanceLevel: "Medium - requires consistent updates",
        costEstimate: "$2000-10000/month at 100K users",
      },
    };
  }

  /**
   * Get score for different tech stacks (for comparison)
   */
  getStackScores(understanding: DialogUnderstanding): {
    [key: string]: { score: number; reason: string };
  } {
    const scores: { [key: string]: { score: number; reason: string } } = {};

    // Evaluate different combinations
    const stacks = [
      {
        name: "MERN (React/Node/MongoDB)",
        score: this.calculateStackScore(understanding, {
          frontend: "react",
          backend: "typescript",
          database: "mongodb",
        }),
      },
      {
        name: "Next.js + PostgreSQL",
        score: this.calculateStackScore(understanding, {
          frontend: "next",
          backend: "typescript",
          database: "postgresql",
        }),
      },
      {
        name: "Python/FastAPI + React",
        score: this.calculateStackScore(understanding, {
          frontend: "react",
          backend: "python",
          database: "postgresql",
        }),
      },
      {
        name: "Go + React + PostgreSQL",
        score: this.calculateStackScore(understanding, {
          frontend: "react",
          backend: "go",
          database: "postgresql",
        }),
      },
      {
        name: "Vue + Node + MongoDB",
        score: this.calculateStackScore(understanding, {
          frontend: "vue",
          backend: "typescript",
          database: "mongodb",
        }),
      },
      {
        name: "Svelte + Go + PostgreSQL",
        score: this.calculateStackScore(understanding, {
          frontend: "svelte",
          backend: "go",
          database: "postgresql",
        }),
      },
    ];

    stacks.forEach(({ name, score }) => {
      scores[name] = {
        score,
        reason: this.getScoreReason(score),
      };
    });

    return scores;
  }

  private calculateStackScore(
    understanding: DialogUnderstanding,
    stack: TechStackPreferences,
  ): number {
    let score = 50; // Base score

    // Factor in complexity
    if (
      understanding.complexity === "simple" &&
      stack.backend === "typescript"
    ) {
      score += 10;
    } else if (
      understanding.complexity === "complex" &&
      stack.backend === "go"
    ) {
      score += 15;
    }

    // Factor in integrations
    const pythonIntegrations = ["ml", "ai", "data", "analytics"];
    if (
      pythonIntegrations.some((i) =>
        understanding.integrations.some((int) => int.toLowerCase().includes(i)),
      )
    ) {
      if (stack.backend === "python") score += 20;
      else score -= 5;
    }

    // Factor in performance needs
    if (
      understanding.constraints.some((c) =>
        c.toLowerCase().includes("performance"),
      )
    ) {
      if (stack.backend === "go" || stack.backend === "rust") score += 15;
      else if (stack.backend === "python") score -= 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  private getScoreReason(score: number): string {
    if (score >= 80) return "Excellent fit for your requirements";
    if (score >= 60) return "Good choice with some tradeoffs";
    if (score >= 40) return "Acceptable but consider alternatives";
    return "Poor fit for your specific needs";
  }
}

export const techStackRecommendationEngine =
  new TechStackRecommendationEngine();
