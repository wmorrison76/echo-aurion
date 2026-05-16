import express, { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "http://localhost:5432",
  process.env.VITE_SUPABASE_ANON_KEY || "test-key",
);

// Generate Asset with AI
router.post("/generate", async (req: Request, res: Response) => {
  try {
    const { prompt, type, style, colorScheme } = req.body;

    if (!prompt) {
      return res
        .status(400)
        .json({ success: false, message: "Prompt is required" });
    }

    // Call OpenAI to generate asset description/code
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ECHO_OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: `You are an expert UI/UX designer creating design assets. Generate ${type} assets based on descriptions. Return valid SVG or color arrays.`,
          },
          {
            role: "user",
            content: `Create a ${type} based on: ${prompt}${style ? ` in ${style} style` : ""}. Return only SVG code for visual assets or JSON for color palettes.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    const data = await response.json();
    const content = data.choices[0]?.message?.content || "";

    // Parse response based on type
    let svgData, colorPalette;
    if (type === "color-palette") {
      try {
        const colors = JSON.parse(content);
        colorPalette = Array.isArray(colors) ? colors : Object.values(colors);
      } catch {
        colorPalette = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];
      }
    } else {
      svgData = content.includes("<svg")
        ? content
        : `<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="${colorScheme?.[0] || "#3B82F6"}"/></svg>`;
    }

    return res.status(200).json({
      success: true,
      data: {
        svgData,
        colorPalette,
        metadata: {
          generatedAt: new Date(),
          model: "gpt-4-turbo",
          tokensUsed: data.usage?.total_tokens || 0,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Asset generation failed",
    });
  }
});

// Generate Variants
router.post("/variants/:assetId", async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;
    const { count = 3 } = req.body;

    // Generate multiple variants of an asset
    const variants = [];
    for (let i = 0; i < Math.min(count, 5); i++) {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.ECHO_OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4-turbo",
            messages: [
              {
                role: "user",
                content: `Create a design variant (version ${i + 1}) of the following. Make it distinct but related.`,
              },
            ],
            max_tokens: 500,
          }),
        },
      );

      const data = await response.json();
      variants.push({
        version: i + 1,
        content: data.choices[0]?.message?.content || "",
      });
    }

    return res.status(200).json({
      success: true,
      data: { variants },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Variant generation failed",
    });
  }
});

// Extract Color Palette from Asset
router.post("/extract-colors", async (req: Request, res: Response) => {
  try {
    const { svgData } = req.body;

    if (!svgData) {
      return res
        .status(400)
        .json({ success: false, message: "SVG data is required" });
    }

    // Extract colors from SVG
    const colorRegex = /(#[A-F0-9]{6}|#[A-F0-9]{3}|rgb\(\d+,\s*\d+,\s*\d+\))/gi;
    const colors = Array.from(new Set(svgData.match(colorRegex) || []));

    return res.status(200).json({
      success: true,
      data: {
        colors: colors.slice(0, 10),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Color extraction failed",
    });
  }
});

// Suggest Similar Assets
router.get("/suggestions/:type", async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { tags = [] } = req.query;

    // Query Supabase for similar assets
    let query = supabase.from("figma_assets").select("*").eq("type", type);

    if (tags && Array.isArray(tags) && tags.length > 0) {
      query = query.contains("tags", tags);
    }

    const { data, error } = await query.limit(5);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Asset suggestion failed",
    });
  }
});

// Analyze Design System
router.post("/analyze-system", async (req: Request, res: Response) => {
  try {
    const { assets } = req.body;

    if (!Array.isArray(assets) || assets.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Assets array is required" });
    }

    // Analyze colors, typography, components used
    const analysis = {
      colors: new Set(),
      components: new Set(),
      typography: new Set(),
    };

    assets.forEach((asset: any) => {
      if (asset.colorPalette) {
        asset.colorPalette.forEach((c: string) => analysis.colors.add(c));
      }
      if (asset.type) {
        analysis.components.add(asset.type);
      }
      if (asset.textStyle) {
        analysis.typography.add(
          `${asset.textStyle.fontFamily}-${asset.textStyle.fontSize}`,
        );
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        colorCount: analysis.colors.size,
        componentTypes: Array.from(analysis.components),
        typographyVariants: Array.from(analysis.typography),
        consistency: Math.round(
          (analysis.colors.size <= 5 ? 100 : 70) *
            (1 / Math.log(assets.length + 1)),
        ),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "System analysis failed",
    });
  }
});

export default router;
