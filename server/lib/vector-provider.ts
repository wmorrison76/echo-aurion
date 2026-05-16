/**
 * Vector Provider (file-backed)
 * ---------------------------------
 * Production-friendly fallback provider that persists vectors to disk and
 * supports simple token-based similarity. Designed to share the same API
 * shape as Pinecone/pgvector so we can swap providers via env.
 */

import fs from "fs";
import path from "path";

export type RecipeTrack = "fine-dining" | "manufacturing";

export interface StoredVector {
  id: string;
  recipeId: string;
  title: string;
  track: RecipeTrack;
  tokens: string[];
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface SimilarityMatch {
  id: string;
  recipeId: string;
  title: string;
  track: RecipeTrack;
  score: number;
  metadata?: any;
}

const DATA_DIR = path.join(process.cwd(), "server", "data");
const VECTORS_FILE = path.join(DATA_DIR, "vectors.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(VECTORS_FILE)) fs.writeFileSync(VECTORS_FILE, JSON.stringify({ vectors: [] }, null, 2));
}

function loadVectors(): { vectors: StoredVector[] } {
  ensureDataDir();
  try {
    return JSON.parse(fs.readFileSync(VECTORS_FILE, "utf-8"));
  } catch {
    return { vectors: [] };
  }
}

function saveVectors(store: { vectors: StoredVector[] }) {
  ensureDataDir();
  fs.writeFileSync(VECTORS_FILE, JSON.stringify(store, null, 2));
}

function tokenize(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const uni = A.size + B.size - inter;
  return uni === 0 ? 0 : inter / uni;
}

export const vectorProvider = {
  storeRecipeVector: async (params: {
    id: string;
    title: string;
    description?: string;
    ingredients?: string[];
    track: RecipeTrack;
    metadata?: any;
  }) => {
    const store = loadVectors();
    // Upsert by id
    const existingIdx = store.vectors.findIndex((v) => v.id === params.id);
    const tokens = tokenize(
      `${params.title} ${params.description || ""} ${(params.ingredients || []).join(" ")}`
    );
    const vector: StoredVector = {
      id: params.id,
      recipeId: params.id,
      title: params.title,
      track: params.track,
      tokens,
      metadata: params.metadata || {},
      createdAt: new Date().toISOString(),
    };
    if (existingIdx >= 0) store.vectors[existingIdx] = vector;
    else store.vectors.push(vector);
    saveVectors(store);
    return { success: true, recipeId: params.id };
  },

  searchSimilarRecipes: async (params: {
    recipeText: string;
    userTrack: RecipeTrack;
    limit?: number;
    includeCrossTrack?: boolean;
  }) => {
    const store = loadVectors();
    const qTokens = tokenize(params.recipeText);
    const matches: SimilarityMatch[] = [];
    for (const v of store.vectors) {
      if (!params.includeCrossTrack && v.track !== params.userTrack) continue;
      const score = jaccard(qTokens, v.tokens);
      if (score > 0) {
        matches.push({
          id: v.id,
          recipeId: v.recipeId,
          title: v.title,
          track: v.track,
          score,
          metadata: v.metadata,
        });
      }
    }
    matches.sort((a, b) => b.score - a.score);
    return { success: true, matches: matches.slice(0, params.limit ?? 10) };
  },

  deleteRecipeVector: async (recipeId: string) => {
    const store = loadVectors();
    const before = store.vectors.length;
    const filtered = store.vectors.filter((v) => v.recipeId !== recipeId);
    store.vectors = filtered;
    saveVectors(store);
    return { success: before !== filtered.length };
  },

  getByTrack: async (track: RecipeTrack, limit: number, organizationId?: string) => {
    const store = loadVectors();
    const result = store.vectors.filter((v) => v.track === track).slice(0, limit);
    return {
      success: true,
      recipes: result.map<SimilarityMatch>((v) => ({
        id: v.id,
        recipeId: v.recipeId,
        title: v.title,
        track: v.track,
        score: 1,
        metadata: v.metadata,
      })),
    };
  },

  count: async () => {
    const store = loadVectors();
    return store.vectors.length;
  },
};

