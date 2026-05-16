import express, { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { validateAuth } from "../middleware/validateAuth";
import { asyncHandler, throwAppError } from "../middleware/errorHandler";

const router: Router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ""
);

// All routes require authentication
router.use(validateAuth);

// Generate SEO metadata using AI
router.post("/generate", asyncHandler(async (req: Request, res: Response) => {
  const { content_id, title, content, target_keywords, language = "en" } =
    req.body;

  if (!content_id || !title || !content) {
    return res.status(400).json({
      error: "Missing required fields: content_id, title, content",
    });
  }

  // Generate SEO metadata using OpenAI
  const openaiKey = process.env.ECHO_OPENAI_API_KEY;
  if (!openaiKey) {
    return res.status(503).json({ error: "OpenAI API key not configured" });
  }

  const prompt = `
    Analyze this content and generate optimal SEO metadata:
    
    Title: ${title}
    Content: ${content.substring(0, 1000)}
    Target Keywords: ${target_keywords || "auto-detect"}
    Language: ${language}
    
    Return a JSON object with:
    {
      "title": "SEO-optimized title (60 chars max)",
      "meta_description": "Meta description (160 chars max)",
      "keywords": "comma-separated keywords",
      "og_title": "OpenGraph title",
      "og_description": "OpenGraph description",
      "readability_score": 0-100,
      "keyword_density": {"keyword": percentage},
      "suggestions": ["suggestion1", "suggestion2"]
    }
    
    Only return the JSON object, no other text.
  `;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const aiResponse = data.choices[0].message.content;
  let seoData: Record<string, any> = {};

  try {
    seoData = JSON.parse(aiResponse);
  } catch {
    seoData = parseSeoResponse(aiResponse);
  }

  // Save SEO metadata to database
  const { data: existingSeo } = await supabase
    .from("cms_seo_metadata")
    .select("id")
    .eq("content_id", content_id);

  if (existingSeo && existingSeo.length > 0) {
    await supabase
      .from("cms_seo_metadata")
      .update({
        title: seoData.title,
        meta_description: seoData.meta_description,
        keywords: seoData.keywords,
        og_title: seoData.og_title,
        og_description: seoData.og_description,
        readability_score: seoData.readability_score,
        keyword_density: seoData.keyword_density,
        ai_suggestions: seoData.suggestions,
        generated_by: "ai",
        updated_at: new Date(),
      })
      .eq("content_id", content_id);
  } else {
    await supabase.from("cms_seo_metadata").insert({
      content_id,
      title: seoData.title,
      meta_description: seoData.meta_description,
      keywords: seoData.keywords,
      og_title: seoData.og_title,
      og_description: seoData.og_description,
      readability_score: seoData.readability_score,
      keyword_density: seoData.keyword_density,
      ai_suggestions: seoData.suggestions,
      generated_by: "ai",
    });
  }

  res.json({
    success: true,
    message: "SEO metadata generated and saved",
    seoData,
  });
}));

// Get SEO metadata for content
router.get("/:contentId", asyncHandler(async (req: Request, res: Response) => {
  const { contentId } = req.params;

  const { data, error } = await supabase
    .from("cms_seo_metadata")
    .select("*")
    .eq("content_id", contentId)
    .single();

  if (error && error.code === "PGRST116") {
    return res.json({ message: "No SEO metadata found for this content" });
  }

  if (error) throw error;
  res.json({ success: true, data });
}));

// Update SEO metadata manually
router.put("/:contentId", asyncHandler(async (req: Request, res: Response) => {
  const { contentId } = req.params;
  const updates = req.body;

  const { data, error } = await supabase
    .from("cms_seo_metadata")
    .update({
      ...updates,
      generated_by: "manual",
      updated_at: new Date(),
    })
    .eq("content_id", contentId)
    .select();

  if (error) throw error;
  res.json({ success: true, data: data[0] });
}));

// Generate sitemap
router.get("/sitemap/generate", asyncHandler(async (req: Request, res: Response) => {
  const { data: publishedContent } = await supabase
    .from("cms_content")
    .select("id, slug, updated_at, status")
    .eq("status", "published")
    .order("updated_at", { ascending: false });

  if (!publishedContent) {
    return res.json([]);
  }

  const baseUrl =
    process.env.VITE_SITE_URL || "https://echocoder.builder.io";
  const sitemapEntries = publishedContent.map((content: any) => ({
    url: `${baseUrl}/content/${content.slug}`,
    lastmod: content.updated_at,
    changefreq: "weekly",
    priority: 0.8,
  }));

  const xmlSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.map((entry: any) => `
  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>
`).join("")}
</urlset>`;

  res.set("Content-Type", "application/xml");
  res.send(xmlSitemap);
}));

// ===== HELPER FUNCTION =====
function parseSeoResponse(text: string): Record<string, any> {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // continue
  }

  return {
    title: "Generated Title",
    meta_description: "Auto-generated description from content",
    keywords: "content, keywords, seo",
    readability_score: 70,
    keyword_density: {},
    suggestions: ["Improve keyword density", "Add more descriptive content"],
  };
}

export default router;
