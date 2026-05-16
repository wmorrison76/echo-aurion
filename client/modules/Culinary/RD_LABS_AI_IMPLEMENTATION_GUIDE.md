# AI Research Assistant - Technical Implementation Guide

## Code Patterns & Integration Architecture

**Version**: 1.0  
**Target Audience**: Full-stack developers  
**Technology Stack**: React + TypeScript + Express + Supabase + OpenAI

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [LLM Integration Setup](#llm-integration-setup)
3. [Vector Database Integration](#vector-database-integration)
4. [Experiment Designer AI](#experiment-designer-ai)
5. [Statistical Validation Service](#statistical-validation-service)
6. [Production Bridge Module](#production-bridge-module)
7. [UI Components](#ui-components)
8. [Testing Strategy](#testing-strategy)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend (React)                       │
├─────────────────┬──────────────────┬───────────────────────┤
│ AI Designer     │ Validation Panel  │ Production Bridge     │
│ Component       │ Component         │ Component             │
└────────┬────────┴──────────┬────────┴────────┬──────────────┘
         │                   │                 │
         └───────────────────┼─────────────────┘
                             │
         ┌───────────────���───▼─────────────────┐
         │    API Layer (Express Routes)       │
         │                                     │
         │  /api/rdlabs/ai/design              │
         │  /api/rdlabs/ai/validate            │
         │  /api/rdlabs/ai/production-bridge   │
         │  /api/rdlabs/ai/embeddings          │
         └────────┬────────────────┬───────────┘
                  │                │
        ┌─────────▼──┐   ┌────────▼──────────┐
        │  LLM API   │   │ Vector Database   │
        │(OpenAI)    │   │(Pinecone)         │
        └────────────┘   └───────────────────┘
                              │
         ┌────────────────────▼──────────────┐
         │   Supabase PostgreSQL             │
         │   (Experiments, metadata, cache)  │
         └───────────────────────────────────┘
```

---

## LLM Integration Setup

### 1. Environment Configuration

**File**: `.env` (add these variables)

```bash
# OpenAI Configuration
VITE_OPENAI_API_KEY=sk-proj-xxxxx...
OPENAI_API_KEY=sk-proj-xxxxx...  # Backend key (never expose to frontend)

# Vector Database
VITE_PINECONE_API_KEY=xxxxx...
PINECONE_INDEX_NAME=rdlabs-experiments
PINECONE_ENVIRONMENT=us-east-1-aws

# Feature Flags
VITE_AI_FEATURES_ENABLED=true
VITE_AI_EXPERIMENT_DESIGNER=true
VITE_AI_VALIDATION=true
VITE_AI_PRODUCTION_BRIDGE=true
```

### 2. Backend LLM Service

**File**: `server/lib/llm-service.ts`

````typescript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ExperimentDesignRequest {
  goal: string;
  constraints?: {
    ingredients?: string[];
    equipment?: string[];
    timeline?: number; // days
    budget?: number;
  };
  context?: {
    recentExperiments?: string[];
    teamExpertise?: string[];
  };
}

interface ExperimentDesignResponse {
  hypothesis: string;
  variables: Array<{
    name: string;
    min: number;
    max: number;
    unit: string;
    importance: "critical" | "important" | "nice-to-have";
  }>;
  controls: {
    baselineIngredients: string[];
    standardProcedure: string;
  };
  testMatrix: {
    sampleSize: number;
    replicates: number;
    rationale: string;
  };
  successCriteria: Array<{
    metric: string;
    target: string;
    how_measured: string;
  }>;
  riskFlags: Array<{
    risk: string;
    severity: "low" | "medium" | "high";
    mitigation: string;
  }>;
  estimatedTimeline: {
    days: number;
    phases: string[];
  };
}

export async function designExperiment(
  request: ExperimentDesignRequest,
): Promise<ExperimentDesignResponse> {
  const systemPrompt = `You are an expert culinary scientist and R&D director. 
Your role is to design rigorous food experiments that are:
- Scientifically sound (proper controls, statistical validity)
- Practically executable (within kitchen constraints)
- Results-driven (measurable outcomes)

When designing experiments:
1. Identify 3-5 key variables based on the goal
2. Recommend sample size (minimum 3 replicates for validation)
3. Flag risks early (allergens, cost, sourcing, equipment)
4. Estimate realistic timeline
5. Provide clear success criteria`;

  const userPrompt = `Design an experiment for this goal:
"${request.goal}"

${
  request.constraints
    ? `Constraints:
- Ingredients available: ${request.constraints.ingredients?.join(", ")}
- Equipment: ${request.constraints.equipment?.join(", ")}
- Timeline: ${request.constraints.timeline} days max
- Budget: $${request.constraints.budget}`
    : ""
}

${
  request.context
    ? `Context:
- Recent experiments: ${request.context.recentExperiments?.join(", ")}
- Team expertise in: ${request.context.teamExpertise?.join(", ")}`
    : ""
}

Return your design as a JSON object with this structure:
{
  "hypothesis": "...",
  "variables": [...],
  "controls": {...},
  "testMatrix": {...},
  "successCriteria": [...],
  "riskFlags": [...],
  "estimatedTimeline": {...}
}`;

  try {
    const message = await openai.messages.create({
      model: "gpt-4-turbo-preview",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from OpenAI");
    }

    // Extract JSON from response (may be wrapped in markdown code blocks)
    let jsonString = content.text;
    const jsonMatch = jsonString.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      jsonString = jsonMatch[1];
    }

    const design = JSON.parse(jsonString) as ExperimentDesignResponse;
    return design;
  } catch (error) {
    console.error("Error designing experiment:", error);
    throw new Error(
      `Failed to design experiment: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function validateExperiment(experimentData: {
  results: number[];
  baseline: number[];
  notes: string;
}): Promise<{
  isValid: boolean;
  confidence: number;
  recommendations: string[];
  concerns: string[];
}> {
  const systemPrompt = `You are a statistical analyst reviewing experimental results.
Evaluate the data for:
1. Statistical significance (check for outliers, sufficient sample size)
2. Reproducibility (consistency across replicates)
3. Practical significance (does the result matter?)
4. Potential issues (data quality, confounding factors)`;

  const userPrompt = `Review these experimental results:
Results: ${JSON.stringify(experimentData.results)}
Baseline: ${JSON.stringify(experimentData.baseline)}
Notes: ${experimentData.notes}

Provide assessment in JSON:
{
  "isValid": boolean,
  "confidence": 0-100,
  "recommendations": [...],
  "concerns": [...]
}`;

  const message = await openai.messages.create({
    model: "gpt-4-turbo-preview",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
    system: systemPrompt,
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from OpenAI");
  }

  let jsonString = content.text;
  const jsonMatch = jsonString.match(/```json\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    jsonString = jsonMatch[1];
  }

  return JSON.parse(jsonString);
}

export async function generateSOP(experimentData: {
  title: string;
  hypothesis: string;
  variables: Array<{ name: string; value: string }>;
  procedure: string;
  ingredients: Array<{ name: string; amount: string }>;
}): Promise<string> {
  const systemPrompt = `You are an expert at writing Standard Operating Procedures (SOPs).
Create clear, step-by-step procedures that production staff can follow.
Format:
- Title
- Ingredients/Materials (with exact amounts)
- Equipment needed
- Step-by-step procedure (numbered, with temperatures/times)
- Quality checks
- Storage/shelf-life
- Safety notes
- Troubleshooting`;

  const userPrompt = `Generate an SOP for this recipe experiment:
Title: ${experimentData.title}
Hypothesis: ${experimentData.hypothesis}
Key variables: ${experimentData.variables.map((v) => `${v.name}=${v.value}`).join(", ")}
Procedure: ${experimentData.procedure}
Ingredients: ${experimentData.ingredients.map((i) => `${i.amount} ${i.name}`).join(", ")}`;

  const message = await openai.messages.create({
    model: "gpt-4-turbo-preview",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
    system: systemPrompt,
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from OpenAI");
  }

  return content.text;
}
````

---

## Vector Database Integration

### 1. Pinecone Setup

**File**: `server/lib/vector-db.ts`

```typescript
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
  environment: process.env.PINECONE_ENVIRONMENT,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ExperimentEmbedding {
  id: string;
  title: string;
  hypothesis: string;
  specialization: string;
  embedding: number[];
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

export async function indexExperiment(
  experimentId: string,
  title: string,
  hypothesis: string,
  specialization: string,
): Promise<void> {
  const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);

  const textToEmbed = `${title} ${hypothesis}`;
  const embedding = await generateEmbedding(textToEmbed);

  await index.upsert([
    {
      id: experimentId,
      values: embedding,
      metadata: {
        title,
        hypothesis,
        specialization,
        indexed_at: new Date().toISOString(),
      },
    },
  ]);
}

export async function findSimilarExperiments(
  goal: string,
  limit: number = 5,
): Promise<
  Array<{
    id: string;
    title: string;
    hypothesis: string;
    score: number;
  }>
> {
  const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);

  const queryEmbedding = await generateEmbedding(goal);

  const results = await index.query({
    vector: queryEmbedding,
    topK: limit,
    includeMetadata: true,
  });

  return results.matches.map((match) => ({
    id: match.id,
    title: (match.metadata?.title as string) || "",
    hypothesis: (match.metadata?.hypothesis as string) || "",
    score: match.score || 0,
  }));
}

export async function rebuildIndexFromDatabase(
  experiments: Array<{
    id: string;
    title: string;
    hypothesis: string;
    specialization: string;
  }>,
): Promise<void> {
  console.log(`Rebuilding index with ${experiments.length} experiments...`);

  const batchSize = 10;
  for (let i = 0; i < experiments.length; i += batchSize) {
    const batch = experiments.slice(i, i + batchSize);

    const vectors = await Promise.all(
      batch.map(async (exp) => {
        const embedding = await generateEmbedding(
          `${exp.title} ${exp.hypothesis}`,
        );
        return {
          id: exp.id,
          values: embedding,
          metadata: {
            title: exp.title,
            hypothesis: exp.hypothesis,
            specialization: exp.specialization,
            indexed_at: new Date().toISOString(),
          },
        };
      }),
    );

    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);
    await index.upsert(vectors);

    console.log(`Indexed ${i + batch.length}/${experiments.length}`);
  }

  console.log("Index rebuild complete");
}
```

### 2. Embedding Caching

**File**: `server/lib/embedding-cache.ts`

```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface CachedEmbedding {
  id: string;
  text_hash: string;
  embedding: number[];
  created_at: string;
}

export async function getCachedEmbedding(
  textHash: string,
): Promise<number[] | null> {
  const { data } = await supabase
    .from("embedding_cache")
    .select("embedding")
    .eq("text_hash", textHash)
    .single();

  return data?.embedding || null;
}

export async function cacheEmbedding(
  textHash: string,
  embedding: number[],
): Promise<void> {
  await supabase.from("embedding_cache").insert({
    text_hash: textHash,
    embedding,
  });
}
```

---

## Experiment Designer AI

### 1. Backend Route

**File**: `server/routes/rdlabs-ai.ts` (new file)

```typescript
import { Router, Request, Response } from "express";
import { designExperiment } from "../lib/llm-service";
import { findSimilarExperiments } from "../lib/vector-db";
import { createClient } from "@supabase/supabase-js";

const router = Router();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface DesignRequest {
  goal: string;
  constraints?: {
    ingredients?: string[];
    equipment?: string[];
    timeline?: number;
    budget?: number;
  };
  includeContext?: boolean;
}

router.post("/design", async (req: Request, res: Response) => {
  try {
    const { goal, constraints, includeContext } = req.body as DesignRequest;

    if (!goal) {
      return res.status(400).json({
        success: false,
        error: "Goal is required",
      });
    }

    // Find similar past experiments for context
    let recentExperiments: string[] = [];
    let teamExpertise: string[] = [];

    if (includeContext) {
      const similar = await findSimilarExperiments(goal, 3);
      recentExperiments = similar.map((e) => `${e.title}: ${e.hypothesis}`);

      // Get team expertise (can be enhanced with actual team data)
      const { data: experiments } = await supabase
        .from("experiments")
        .select("specialization")
        .limit(100);

      if (experiments) {
        const specializations = [
          ...new Set(experiments.map((e) => e.specialization)),
        ];
        teamExpertise = specializations as string[];
      }
    }

    // Design experiment using LLM
    const design = await designExperiment({
      goal,
      constraints,
      context: {
        recentExperiments,
        teamExpertise,
      },
    });

    // Store design proposal in cache (optional, for audit trail)
    await supabase.from("ai_design_proposals").insert({
      goal,
      proposal: design,
      created_by: req.headers["x-user-id"],
      created_at: new Date().toISOString(),
    });

    return res.json({
      success: true,
      data: design,
    });
  } catch (error) {
    console.error("Error in experiment design:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/similar", async (req: Request, res: Response) => {
  try {
    const { goal, limit = 5 } = req.query;

    if (!goal) {
      return res.status(400).json({
        success: false,
        error: "Goal query parameter is required",
      });
    }

    const similar = await findSimilarExperiments(
      goal as string,
      parseInt(limit as string, 10),
    );

    return res.json({
      success: true,
      data: similar,
    });
  } catch (error) {
    console.error("Error finding similar experiments:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
```

### 2. Register Route in Main Server

**File**: `server/index.ts` (add this import and router registration)

```typescript
import rdLabsAIRoutes from "./routes/rdlabs-ai";

// After existing rdlabs router
app.use("/api/rdlabs/ai", rdLabsAIRoutes);
```

---

## Statistical Validation Service

**File**: `server/lib/stats-service.ts`

```typescript
import { ttest, mean, std, variance } from "simple-statistics";

interface ValidationResult {
  isValid: boolean;
  confidenceScore: number;
  summary: string;
  details: {
    sampleSize: number;
    mean: number;
    standardDeviation: number;
    variance: number;
    outliers: number[];
    outlierCount: number;
    tStatistic?: number;
    pValue?: number;
    effectSize?: number;
    reproducibilityScore: number;
  };
  recommendations: string[];
  concerns: string[];
}

export function validateResults(
  results: number[],
  baseline: number[],
  threshold: number = 0.05,
): ValidationResult {
  // Check sample size
  if (results.length < 3) {
    return {
      isValid: false,
      confidenceScore: 0,
      summary: "Insufficient sample size (minimum 3)",
      details: {
        sampleSize: results.length,
        mean: mean(results),
        standardDeviation: std(results),
        variance: variance(results),
        outliers: [],
        outlierCount: 0,
        reproducibilityScore: 0,
      },
      recommendations: ["Conduct more replicates (3-5 minimum)"],
      concerns: ["Sample size is too small for statistical validity"],
    };
  }

  // Calculate statistics
  const resultMean = mean(results);
  const resultStd = std(results);
  const resultVar = variance(results);
  const baselineMean = mean(baseline);

  // Identify outliers using IQR method
  const sorted = [...results].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const outliers = results.filter(
    (v) => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr,
  );

  // Calculate effect size (Cohen's d)
  const baselineStd = std(baseline);
  const pooledStd = Math.sqrt(
    ((results.length - 1) * resultVar +
      (baseline.length - 1) * variance(baseline)) /
      (results.length + baseline.length - 2),
  );
  const effectSize = Math.abs(resultMean - baselineMean) / pooledStd;

  // Calculate reproducibility score
  const coefficientOfVariation = (resultStd / resultMean) * 100;
  const reproducibilityScore = Math.max(0, 100 - coefficientOfVariation * 5); // CV < 20% is good

  // Simple t-test approximation
  const tStat =
    (resultMean - baselineMean) / (resultStd / Math.sqrt(results.length));

  // Confidence score based on multiple factors
  let confidenceScore = 100;

  if (outliers.length > 0) {
    confidenceScore -= 10 * outliers.length;
  }
  if (reproducibilityScore < 70) {
    confidenceScore -= 20;
  }
  if (Math.abs(effectSize) < 0.3) {
    confidenceScore -= 15; // Small effect size
  }

  const isValid = confidenceScore >= 70 && outliers.length === 0;

  const recommendations: string[] = [];
  const concerns: string[] = [];

  if (outliers.length > 0) {
    concerns.push(
      `Found ${outliers.length} outlier(s): ${outliers.join(", ")}`,
    );
    recommendations.push("Review outlier samples for errors or contamination");
  }

  if (reproducibilityScore < 70) {
    concerns.push(
      "Reproducibility is low (high variability between replicates)",
    );
    recommendations.push(
      "Improve protocol consistency, control conditions more tightly",
    );
  }

  if (Math.abs(effectSize) > 2) {
    recommendations.push(
      "Large effect size detected - results are substantial",
    );
  }

  if (results.length < 5) {
    recommendations.push(
      "Consider conducting 2-3 more replicates for statistical robustness",
    );
  }

  return {
    isValid,
    confidenceScore,
    summary: `${isValid ? "✓ Valid" : "✗ Issues found"} - Confidence: ${confidenceScore.toFixed(0)}%`,
    details: {
      sampleSize: results.length,
      mean: resultMean,
      standardDeviation: resultStd,
      variance: resultVar,
      outliers,
      outlierCount: outliers.length,
      tStatistic: tStat,
      pValue: 1 - (tStat > 0 ? 0.975 : 0.025), // Approximation
      effectSize,
      reproducibilityScore,
    },
    recommendations,
    concerns,
  };
}

export function estimateTimelineImprovements(
  similarExperiments: Array<{
    title: string;
    daysToReady: number;
  }>,
): {
  estimatedDays: number;
  range: { min: number; max: number };
  baselineComparison: string;
} {
  if (similarExperiments.length === 0) {
    return {
      estimatedDays: 45, // Default
      range: { min: 30, max: 60 },
      baselineComparison: "No similar experiments to compare",
    };
  }

  const days = similarExperiments.map((e) => e.daysToReady);
  const avg = mean(days);
  const stdev = std(days);

  return {
    estimatedDays: Math.round(avg),
    range: {
      min: Math.round(avg - stdev),
      max: Math.round(avg + stdev),
    },
    baselineComparison: `Based on ${similarExperiments.length} similar experiments (${similarExperiments.map((e) => e.title).join(", ")})`,
  };
}
```

---

## Production Bridge Module

**File**: `server/lib/production-bridge.ts`

```typescript
import { generateSOP } from "./llm-service";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface ProductionCheckResult {
  isReady: boolean;
  readinessScore: number; // 0-100
  checks: {
    name: string;
    passed: boolean;
    message: string;
  }[];
  documentation: {
    sop: string;
    allergenStatement: string;
    nutritionLabel: string;
  };
  recommendations: string[];
}

export async function checkProductionReadiness(
  experimentId: string,
): Promise<ProductionCheckResult> {
  // Fetch experiment details
  const { data: experiment } = await supabase
    .from("experiments")
    .select("*")
    .eq("id", experimentId)
    .single();

  if (!experiment) {
    throw new Error("Experiment not found");
  }

  const checks = [];
  let score = 100;
  const recommendations: string[] = [];

  // Check 1: Status
  const statusCheck = experiment.status === "ready";
  checks.push({
    name: "Status Ready",
    passed: statusCheck,
    message: statusCheck
      ? "Experiment marked as ready"
      : "Experiment not ready for production",
  });
  if (!statusCheck) score -= 15;

  // Check 2: Sensory validation
  const sensoryCheck = (experiment.sensory_feedback?.length || 0) >= 3;
  checks.push({
    name: "Sensory Evaluation",
    passed: sensoryCheck,
    message: sensoryCheck
      ? `${experiment.sensory_feedback.length} sensory evaluations completed`
      : "Need minimum 3 sensory evaluations",
  });
  if (!sensoryCheck) {
    score -= 20;
    recommendations.push(
      `Get ${3 - (experiment.sensory_feedback?.length || 0)} more sensory evaluations`,
    );
  }

  // Check 3: Cost lock
  const costLocked = experiment.cost_locked === true;
  checks.push({
    name: "Cost Locked",
    passed: costLocked,
    message: costLocked
      ? `Cost locked at $${experiment.cost_per_portion}`
      : "Ingredient costs need to be locked",
  });
  if (!costLocked) {
    score -= 10;
    recommendations.push("Lock ingredient costs with suppliers");
  }

  // Check 4: Equipment verified
  const equipmentVerified = experiment.equipment_verified || false;
  checks.push({
    name: "Equipment Verified",
    passed: equipmentVerified,
    message: equipmentVerified
      ? "Equipment capacity confirmed"
      : "Need to verify kitchen equipment can handle recipe",
  });
  if (!equipmentVerified) {
    score -= 15;
    recommendations.push(
      "Verify all equipment requirements with kitchen staff",
    );
  }

  // Check 5: Documentation complete
  const docsComplete = !!(experiment.procedure && experiment.ingredients);
  checks.push({
    name: "Documentation",
    passed: docsComplete,
    message: docsComplete
      ? "Full procedure and ingredients documented"
      : "Missing procedure or ingredients",
  });
  if (!docsComplete) {
    score -= 20;
    recommendations.push("Complete procedure and ingredients documentation");
  }

  // Generate SOP if ready
  let sopText = "";
  if (score >= 60) {
    sopText = await generateSOP({
      title: experiment.title,
      hypothesis: experiment.hypothesis,
      variables: experiment.variables || [],
      procedure: experiment.procedure,
      ingredients: experiment.ingredients || [],
    });
  }

  // Generate allergen statement (placeholder)
  const allergenStatement = generateAllergenStatement(
    experiment.ingredients || [],
  );

  // Generate nutrition label (placeholder)
  const nutritionLabel = generateNutritionLabel(experiment.ingredients || []);

  return {
    isReady: score >= 70,
    readinessScore: score,
    checks,
    documentation: {
      sop: sopText,
      allergenStatement,
      nutritionLabel,
    },
    recommendations,
  };
}

function generateAllergenStatement(
  ingredients: Array<{ name: string }>,
): string {
  const allergens = [
    "eggs",
    "dairy",
    "peanuts",
    "tree nuts",
    "soy",
    "fish",
    "shellfish",
    "wheat",
  ];
  const found = allergens.filter((a) =>
    ingredients.some((i) => i.name.toLowerCase().includes(a)),
  );

  if (found.length === 0) {
    return "This product contains no major FDA allergens.";
  }

  return `Contains: ${found.join(", ")}. May also contain traces from shared equipment.`;
}

function generateNutritionLabel(ingredients: Array<{ name: string }>): string {
  // Placeholder - would integrate with nutrition database
  return "Serving Size: 1 portion\nCalories: 250\nProtein: 8g\nFat: 12g\nCarbs: 28g";
}
```

---

## UI Components

### 1. Experiment Designer Panel

**File**: `client/components/RDLab/AIExperimentDesigner.tsx`

```typescript
import * as React from 'react';
const { useState } = React;

import { useRDLabStore } from '@/stores/rdLabStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2, Sparkles } from 'lucide-react';

interface AIDesign {
  hypothesis: string;
  variables: Array<{
    name: string;
    min: number;
    max: number;
    unit: string;
  }>;
  controls: {
    baselineIngredients: string[];
    standardProcedure: string;
  };
  testMatrix: {
    sampleSize: number;
    replicates: number;
    rationale: string;
  };
  riskFlags: Array<{
    risk: string;
    severity: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
}

export function AIExperimentDesigner() {
  const [goal, setGoal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [design, setDesign] = useState<AIDesign | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { addExperiment } = useRDLabStore();

  const handleDesign = async () => {
    if (!goal.trim()) {
      setError('Please describe your experiment goal');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/rdlabs/ai/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          includeContext: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to design experiment');
      }

      const { data } = await response.json();
      setDesign(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptDesign = () => {
    if (!design) return;

    addExperiment({
      title: goal,
      hypothesis: design.hypothesis,
      variables: design.variables,
      procedure: design.controls.standardProcedure,
      specialization: 'culinary',
      status: 'ideation',
    });

    setGoal('');
    setDesign(null);
  };

  return (
    <div className="w-full space-y-4 p-4">
      <div className="flex gap-2">
        <Input
          placeholder="What would you like to create? (e.g., 'Stable foam using dairy alternatives')"
          value={goal}
          onChange={e => setGoal(e.target.value)}
          disabled={isLoading}
        />
        <Button
          onClick={handleDesign}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          <Sparkles className="w-4 h-4" />
          Design
        </Button>
      </div>

      {error && (
        <Card className="p-3 bg-red-50 border-red-200 text-red-700">
          {error}
        </Card>
      )}

      {design && (
        <Card className="p-4 space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Hypothesis</h3>
            <p className="text-sm text-gray-700">{design.hypothesis}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Test Variables</h3>
            <div className="space-y-2">
              {design.variables.map((v, i) => (
                <div key={i} className="text-sm p-2 bg-gray-50 rounded">
                  <strong>{v.name}</strong>: {v.min} - {v.max} {v.unit}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Risk Flags</h3>
            <div className="space-y-2">
              {design.riskFlags.map((r, i) => (
                <div
                  key={i}
                  className={`text-sm p-2 rounded ${
                    r.severity === 'high'
                      ? 'bg-red-50 border border-red-200'
                      : r.severity === 'medium'
                      ? 'bg-yellow-50 border border-yellow-200'
                      : 'bg-blue-50 border border-blue-200'
                  }`}
                >
                  <strong>{r.risk}</strong>: {r.mitigation}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleAcceptDesign}
              variant="default"
            >
              Accept Design
            </Button>
            <Button
              onClick={() => setDesign(null)}
              variant="outline"
            >
              Modify & Retry
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
```

### 2. Validation Results Panel

**File**: `client/components/RDLab/AIValidationPanel.tsx`

```typescript
import * as React from 'react';
const { useState } = React;

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface ValidationResult {
  isValid: boolean;
  confidenceScore: number;
  summary: string;
  details: {
    sampleSize: number;
    mean: number;
    standardDeviation: number;
    outliers: number[];
    reproducibilityScore: number;
  };
  recommendations: string[];
  concerns: string[];
}

interface AIValidationPanelProps {
  experimentId: string;
}

export function AIValidationPanel({ experimentId }: AIValidationPanelProps) {
  const [results, setResults] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleValidate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/rdlabs/ai/validate/${experimentId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Validation failed');
      }

      const { data } = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!results) {
    return (
      <div className="p-4">
        <Button onClick={handleValidate} disabled={isLoading}>
          {isLoading ? 'Validating...' : 'Validate Results'}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 p-4">
      <Card className={`p-4 ${results.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center gap-2">
          {results.isValid ? (
            <CheckCircle className="w-6 h-6 text-green-600" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-red-600" />
          )}
          <div>
            <h3 className="font-semibold">{results.summary}</h3>
            <p className="text-sm">Sample Size: {results.details.sampleSize}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-600">Mean</p>
          <p className="text-2xl font-bold">{results.details.mean.toFixed(2)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-600">Reproducibility</p>
          <p className="text-2xl font-bold">{results.details.reproducibilityScore.toFixed(0)}%</p>
        </Card>
      </div>

      {results.concerns.length > 0 && (
        <Card className="p-4 border-yellow-200 bg-yellow-50">
          <h4 className="font-semibold text-yellow-900 mb-2">Concerns</h4>
          <ul className="space-y-1 text-sm text-yellow-800">
            {results.concerns.map((c, i) => (
              <li key={i}>• {c}</li>
            ))}
          </ul>
        </Card>
      )}

      {results.recommendations.length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold mb-2">Recommendations</h4>
          <ul className="space-y-1 text-sm">
            {results.recommendations.map((r, i) => (
              <li key={i}>• {r}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
```

---

## Testing Strategy

### Unit Tests

**File**: `client/lib/__tests__/stats-service.test.ts`

```typescript
import { validateResults } from "@/server/lib/stats-service";

describe("Statistical Validation", () => {
  it("should identify invalid results with low sample size", () => {
    const results = [10, 12];
    const baseline = [8, 9];

    const validation = validateResults(results, baseline);
    expect(validation.isValid).toBe(false);
    expect(validation.details.sampleSize).toBe(2);
  });

  it("should detect outliers", () => {
    const results = [100, 102, 101, 99, 500]; // 500 is outlier
    const baseline = [95, 96, 97];

    const validation = validateResults(results, baseline);
    expect(validation.details.outlierCount).toBeGreaterThan(0);
    expect(validation.confidenceScore).toBeLessThan(100);
  });

  it("should validate consistent results", () => {
    const results = [100, 101, 99, 100, 102];
    const baseline = [85, 86, 84];

    const validation = validateResults(results, baseline);
    expect(validation.details.reproducibilityScore).toBeGreaterThan(80);
    expect(validation.isValid).toBe(true);
  });
});
```

### Integration Tests

**File**: `server/__tests__/rdlabs-ai.test.ts`

```typescript
import request from "supertest";
import app from "../index";

describe("R&D Labs AI Routes", () => {
  it("POST /api/rdlabs/ai/design should return experiment design", async () => {
    const response = await request(app).post("/api/rdlabs/ai/design").send({
      goal: "Create a stable emulsion for saucing",
      includeContext: false,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty("hypothesis");
    expect(response.body.data).toHaveProperty("variables");
    expect(response.body.data).toHaveProperty("riskFlags");
  });

  it("GET /api/rdlabs/ai/similar should find similar experiments", async () => {
    const response = await request(app)
      .get("/api/rdlabs/ai/similar")
      .query({ goal: "foams", limit: 3 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
```

---

## Deployment Checklist

- [ ] Set up OpenAI API account and billing
- [ ] Create Pinecone account and index
- [ ] Add environment variables to `.env` (local) and hosting platform
- [ ] Create database migration for embedding_cache and ai_design_proposals tables
- [ ] Set up error monitoring (Sentry) for LLM API failures
- [ ] Configure rate limiting for AI endpoints (prevent API bill overages)
- [ ] Test all routes with valid/invalid inputs
- [ ] Monitor costs after launch
- [ ] Set up user feedback loop (thumbs up/down on AI suggestions)

---

## Cost Optimization Tips

1. **Cache embeddings**: Don't re-embed the same text
2. **Batch operations**: Group similar requests together
3. **Use embeddings-ada-002**: Cheaper than text-davinci-003
4. **Rate limit aggressively**: Prevent runaway costs from testing
5. **Monitor usage dashboard**: Set alerts for unusual spikes

---

## Troubleshooting

| Issue                    | Cause                  | Solution                                      |
| ------------------------ | ---------------------- | --------------------------------------------- |
| "Invalid API key"        | OPENAI_API_KEY not set | Add key to .env and restart server            |
| 429 Rate Limited         | Too many requests      | Implement exponential backoff, queue requests |
| Slow responses           | Large embeddings       | Use smaller batch sizes, cache results        |
| Poor design quality      | Weak prompt            | Improve system prompt with examples           |
| Vector search no results | Empty index            | Run rebuildIndexFromDatabase()                |

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Status**: Ready for Implementation
