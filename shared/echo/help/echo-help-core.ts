import {
  HelpArticle,
  HelpSearchResult,
  EchoHelpAnswer,
  HelpContextId,
  HelpMission,
  HelpContextBinding,
} from "./types";
import { fetchHelpArticles, fetchHelpMissions, fetchHelpContextBindings } from "./builder-client";
import { logHelpEvent } from "./echo-help-telemetry";

export async function searchHelpArticles(opts: {
  query: string;
  module?: string;
  role?: string;
  limit?: number;
  userId?: string;
  route?: string;
}): Promise<HelpSearchResult> {
  const { query, module, role, limit = 20, userId, route } = opts;
  const normalizedQuery = query.toLowerCase();

  const articles = await fetchHelpArticles(
    module ? { "data.module.$eq": module } : undefined,
    100,
  );

  const filtered = articles.filter((a) => {
    const text = [a.title, a.body, a.tags?.join(" "), a.contextIds?.join(" ")]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const moduleMatch = module ? a.module === module : true;
    const roleMatch = role ? a.audienceRoles?.includes(role) : true;

    return moduleMatch && roleMatch && text.includes(normalizedQuery);
  });

  const limited = filtered.slice(0, limit);

  await logHelpEvent({
    type: "help.search",
    userId,
    role,
    module,
    route,
    payload: { query, resultCount: limited.length },
    createdAt: new Date().toISOString(),
  });

  return { articles: limited, total: filtered.length };
}

export async function askEchoHelp(opts: {
  question: string;
  module?: string;
  role?: string;
  route?: string;
  userId?: string;
  contextId?: HelpContextId;
}): Promise<EchoHelpAnswer> {
  const { question, module, role, route, userId, contextId } = opts;

  const { articles } = await searchHelpArticles({
    query: question,
    module,
    role,
    limit: 10,
  });

  const contextBlocks = articles.map((a) => {
    return `# ${a.title}\n\n${a.body}\n\n[tags: ${a.tags?.join(", ") ?? ""}]`;
  });

  const echoResponse = await callEchoAi3Help({
    question,
    module,
    role,
    contextBlocks,
    contextId,
  });

  const answer: EchoHelpAnswer = {
    answer: echoResponse.answer,
    sourceArticles: articles.map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
    })),
    confidence: echoResponse.confidence ?? 0.7,
    followUps: echoResponse.followUps ?? [],
  };

  await logHelpEvent({
    type: "help.ask",
    userId,
    role,
    module,
    route,
    payload: {
      question,
      contextId,
      articleIds: articles.map((a) => a.id),
      confidence: answer.confidence,
    },
    createdAt: new Date().toISOString(),
  });

  return answer;
}

interface EchoAi3HelpRequest {
  question: string;
  module?: string;
  role?: string;
  contextBlocks: string[];
  contextId?: HelpContextId;
}

interface EchoAi3HelpResponse {
  answer: string;
  confidence?: number;
  followUps?: string[];
}

async function callEchoAi3Help(payload: EchoAi3HelpRequest): Promise<EchoAi3HelpResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const res = await fetch(`${baseUrl}/api/echo/ask-help`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error("[EchoHelp] EchoAi³ help call failed:", res.status, await res.text());
    return {
      answer:
        "I'm sorry, I couldn't reach Echo's brain right now. Please try again in a moment, or consult the knowledge base.",
      confidence: 0.1,
      followUps: [],
    };
  }

  const data = (await res.json()) as EchoAi3HelpResponse;
  return data;
}

export async function getHelpMissions(opts: {
  module?: string;
  role?: string;
  userId?: string;
  route?: string;
}): Promise<HelpMission[]> {
  const { module, role, userId, route } = opts;

  const query: Record<string, unknown> = {};
  if (module) query["data.module.$eq"] = module;

  const missions = await fetchHelpMissions(query, 50);
  const filtered = role
    ? missions.filter((m) => !m.roles?.length || m.roles.includes(role))
    : missions;

  await logHelpEvent({
    type: "help.mission.start",
    userId,
    role,
    module,
    route,
    payload: { missionCount: filtered.length },
    createdAt: new Date().toISOString(),
  });

  return filtered;
}

export async function getContextHelp(opts: {
  contextId: HelpContextId;
  module?: string;
  route?: string;
  userId?: string;
  role?: string;
}): Promise<HelpContextBinding | null> {
  const { contextId, module, route, userId, role } = opts;

  const bindings = await fetchHelpContextBindings({ "data.contextId.$eq": contextId });
  const binding = bindings[0];

  await logHelpEvent({
    type: "help.context.open",
    userId,
    role,
    module,
    route,
    payload: { contextId },
    createdAt: new Date().toISOString(),
  });

  return binding ?? null;
}
