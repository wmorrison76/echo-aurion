/**
 * Terms ingestion routes
 * ----------------------
 * Provides endpoints used by TermsVectorIngestionPanel.
 * If a local master-dictionary JSON is present at server/data/master-dictionary.json,
 * we ingest it into the vector store; otherwise we report zero with success.
 */
import { Router } from "express";
import fs from "fs";
import path from "path";
import { vectorProvider } from "../lib/vector-provider";

const router = Router();

let ingestionState:
  | {
      status: "idle" | "in_progress";
      startedAt?: number;
      progress?: any;
    }
  | undefined = { status: "idle" };

router.get("/terms/count", async (_req: any, res) => {
  try {
    // Return vector count as a proxy for total terms available
    const total = await vectorProvider.count();
    return res.json({ success: true, totalTerms: total });
  } catch (error) {
    return res.status(200).json({ success: true, totalTerms: 0 });
  }
});

router.get("/terms/ingestion/progress", (_req: any, res) => {
  return res.json(ingestionState || { status: "idle" });
});

router.post("/terms/ingest/start", async (_req: any, res) => {
  if (ingestionState?.status === "in_progress") {
    return res.json({ success: true, message: "Already running" });
  }
  ingestionState = {
    status: "in_progress",
    startedAt: Date.now(),
    progress: {
      totalTerms: 0,
      processedTerms: 0,
      supabaseSuccess: 0,
      supabaseErrors: 0,
      pineconeSuccess: 0,
      pineconeErrors: 0,
      overallProgress: 0,
      currentPhase: "fetching",
      message: "Starting ingestion",
      errors: [],
      startTime: Date.now(),
      estimatedTimeRemaining: 0,
    },
  };

  setImmediate(async () => {
    try {
      const dictPath = path.join(process.cwd(), "server", "data", "master-dictionary.json");
      let terms: Array<{ term: string; definition?: string }> = [];
      if (fs.existsSync(dictPath)) {
        terms = JSON.parse(fs.readFileSync(dictPath, "utf-8"));
      }
      ingestionState!.progress.totalTerms = terms.length;
      ingestionState!.progress.currentPhase = "embedding";
      ingestionState!.progress.message = `Embedding ${terms.length} terms`;

      // Index each term as a "recipe" vector to reuse search endpoints
      let processed = 0;
      for (const t of terms) {
        await vectorProvider.storeRecipeVector({
          id: `md:${t.term.toLowerCase().replace(/\s+/g, "-")}`,
          title: t.term,
          description: t.definition || t.term,
          ingredients: [],
          track: "manufacturing",
          metadata: { source: "master-dictionary", definition: t.definition || "" },
        });
        processed++;
        ingestionState!.progress.processedTerms = processed;
        ingestionState!.progress.pineconeSuccess = processed;
        ingestionState!.progress.overallProgress =
          terms.length === 0 ? 100 : Math.round((processed / terms.length) * 100);
      }
      ingestionState!.progress.currentPhase = "complete";
      ingestionState!.progress.message = "Ingestion complete";
      ingestionState!.status = "idle";
    } catch (error) {
      ingestionState!.progress.errors.push(
        error instanceof Error ? error.message : String(error),
      );
      ingestionState!.progress.currentPhase = "complete";
      ingestionState!.status = "idle";
    }
  });

  return res.json({ success: true });
});

export default router;

