export type EmbeddingProviderName = "openai" | "gemini";

const EMBEDDING_PROVIDER: EmbeddingProviderName =
  (process.env.EMBEDDING_PROVIDER as EmbeddingProviderName) || "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-large";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004";

/**
 * Main entrypoint: embed arbitrary text into a vector for Pinecone search.
 * Supports OpenAI and Gemini embedding models.
 */
export async function embedTextToVector(text: string): Promise<number[]> {
  if (!text || !text.trim()) {
    throw new Error("embedTextToVector: text is required.");
  }

  if (EMBEDDING_PROVIDER === "gemini") {
    return embedWithGemini(text);
  }

  return embedWithOpenAI(text);
}

async function embedWithOpenAI(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `OpenAI embedding error: ${res.status} ${res.statusText} – ${body}`,
    );
  }

  const json = (await res.json()) as {
    data: { embedding: number[] }[];
  };

  const [first] = json.data;
  if (!first?.embedding) {
    throw new Error("OpenAI embedding: missing embedding in response.");
  }

  return first.embedding;
}

async function embedWithGemini(text: string): Promise<number[]> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    GEMINI_EMBEDDING_MODEL,
  )}:embedContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: {
        parts: [{ text }],
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Gemini embedding error: ${res.status} ${res.statusText} – ${body}`,
    );
  }

  const json = (await res.json()) as {
    embedding?: { values: number[] };
  };

  if (!json.embedding?.values) {
    throw new Error("Gemini embedding: missing embedding values in response.");
  }

  return json.embedding.values;
}
