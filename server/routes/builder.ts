import type { RequestHandler } from "express";

const BUILDER_API_BASE = "https://builder.io/api/v3";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_BUILDER_PUBLIC_KEY || "";
const PRIVATE_KEY = process.env.BUILDER_PRIVATE_API_KEY || "";

export const handleBuilderContent: RequestHandler = async (req, res) => {
  if (!PUBLIC_KEY) {
    return res.status(500).json({
      ok: false,
      error: "NEXT_PUBLIC_BUILDER_PUBLIC_KEY is not set on the server",
    });
  }

  try {
    const model = String(req.query.model || "panel");
    const urlAttr = String(req.query.url || "/generated");
    const entryId = req.query.id ? String(req.query.id) : undefined;
    const preview = req.query.preview === "1" || req.query.preview === "true";

    const params = new URLSearchParams();
    params.set("apiKey", PUBLIC_KEY);
    params.set("limit", "1");
    params.set("userAttributes.url", urlAttr);
    if (entryId) {
      params.set("query.id", entryId);
    }
    if (preview && PRIVATE_KEY) {
      params.set("preview", "true");
    }

    const endpoint = `${BUILDER_API_BASE}/content/${encodeURIComponent(
      model,
    )}?${params.toString()}`;

    const response = await fetch(endpoint, {
      headers: PRIVATE_KEY
        ? {
            Authorization: `Bearer ${PRIVATE_KEY}`,
          }
        : undefined,
    });

    const payload = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error:
          payload?.message ||
          payload?.error ||
          `Builder API request failed with status ${response.status}`,
      });
    }

    const content = Array.isArray(payload?.results)
      ? payload.results[0] ?? null
      : null;

    return res.json({
      ok: true,
      content,
      meta: {
        model,
        url: urlAttr,
        id: content?.id || null,
        entryName: content?.name || null,
        preview: Boolean(preview && PRIVATE_KEY),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Builder integration error";
    return res.status(500).json({ ok: false, error: message });
  }
};
