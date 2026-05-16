import type { HelpArticle, HelpMission, HelpContextBinding } from "./types";

const BUILDER_API_KEY = process.env.BUILDER_API_KEY;

if (!BUILDER_API_KEY) {
  console.warn("[EchoHelp] BUILDER_API_KEY is not set. HelpSystem will have limited functionality.");
}

const BUILDER_BASE_URL = "https://cdn.builder.io/api/v3/content";

interface BuilderContentResponse<T> {
  results: {
    id: string;
    name: string;
    data: any;
    createdDate?: number;
    lastUpdated?: number;
  }[];
}

async function fetchBuilderContent<T>(
  model: string,
  opts: { query?: Record<string, unknown>; limit?: number } = {},
): Promise<T[]> {
  if (!BUILDER_API_KEY) return [];

  const params = new URLSearchParams({
    apiKey: BUILDER_API_KEY,
    limit: String(opts.limit ?? 50),
  });

  if (opts.query) {
    params.set("query", JSON.stringify(opts.query));
  }

  const url = `${BUILDER_BASE_URL}/${model}?${params.toString()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error("[EchoHelp] Builder fetch failed:", res.status, await res.text());
      return [];
    }

    const data = (await res.json()) as BuilderContentResponse<any>;
    return data.results.map((r) => normalizeBuilderRecord<T>(r));
  } catch (err) {
    console.error("[EchoHelp] Builder fetch error:", err);
    return [];
  }
}

function normalizeBuilderRecord<T>(record: {
  id: string;
  data: any;
  lastUpdated?: number;
}): T {
  const base = record.data ?? {};
  const lastUpdatedAt =
    base.lastUpdatedAt ||
    (record.lastUpdated ? new Date(record.lastUpdated).toISOString() : new Date().toISOString());

  return {
    id: record.id,
    lastUpdatedAt,
    ...base,
  } as unknown as T;
}

export async function fetchHelpArticles(
  query?: Record<string, unknown>,
  limit?: number,
): Promise<HelpArticle[]> {
  return fetchBuilderContent<HelpArticle>("help_article", { query, limit });
}

export async function fetchHelpMissions(
  query?: Record<string, unknown>,
  limit?: number,
): Promise<HelpMission[]> {
  return fetchBuilderContent<HelpMission>("help_mission", { query, limit });
}

export async function fetchHelpContextBindings(
  query?: Record<string, unknown>,
  limit?: number,
): Promise<HelpContextBinding[]> {
  return fetchBuilderContent<HelpContextBinding>("help_context_binding", { query, limit });
}
