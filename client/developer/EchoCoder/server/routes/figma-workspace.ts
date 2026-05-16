import express, { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.VITE_SUPABASE_ANON_KEY || "",
);

const ECHO_OPENAI_API_KEY = process.env.ECHO_OPENAI_API_KEY || "";

// Helper: Call OpenAI for code generation
async function generateCodeFromDesign(
  design: any,
  format: "react" | "html" | "vue" | "svelte" | "json" = "react",
) {
  const systemPrompt = `You are an expert frontend developer. Convert Figma design JSON to production-ready ${format.toUpperCase()} code.
Include:
- Responsive design patterns
- Proper component structure
- Error handling
- TypeScript types for React
- Semantic HTML for HTML/Vue
- Proper styling approach`;

  const userPrompt = `Convert this Figma design to ${format}:

${JSON.stringify(design, null, 2)}

Generate ONLY valid, production-ready code with no explanations.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ECHO_OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    throw new Error("Code generation failed");
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

// GET workspace stats
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId required",
      });
    }

    const [filesResult, assetsResult, exportsResult] = await Promise.all([
      supabase.from("figma_workspace_files").select("id").eq("user_id", userId),
      supabase
        .from("figma_workspace_assets")
        .select("id")
        .eq("user_id", userId),
      supabase.from("figma_export_history").select("id").eq("user_id", userId),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalFiles: filesResult.data?.length || 0,
        totalAssets: assetsResult.data?.length || 0,
        totalExports: exportsResult.data?.length || 0,
        lastSync: new Date(),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch stats",
    });
  }
});

// GET list workspace files
router.get("/files", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId required",
      });
    }

    const { data, error } = await supabase
      .from("figma_workspace_files")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch files",
    });
  }
});

// POST import file
router.post("/import", async (req: Request, res: Response) => {
  try {
    const { userId, figmaFileKey, name, thumbnailUrl, fileData } = req.body;

    if (!userId || !figmaFileKey || !name) {
      return res.status(400).json({
        success: false,
        message: "userId, figmaFileKey, and name required",
      });
    }

    const { data, error } = await supabase
      .from("figma_workspace_files")
      .insert([
        {
          user_id: userId,
          figma_file_key: figmaFileKey,
          name,
          thumbnail_url: thumbnailUrl,
          file_data: fileData,
          status: "synced",
        },
      ]);

    if (error) throw error;

    return res.status(201).json({
      success: true,
      data: data?.[0],
      message: "File imported successfully",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to import file",
    });
  }
});

// GET file details
router.get("/files/:fileId", async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;

    const { data, error } = await supabase
      .from("figma_workspace_files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch file",
    });
  }
});

// GET file assets
router.get("/files/:fileId/assets", async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;

    const { data, error } = await supabase
      .from("figma_workspace_assets")
      .select("*")
      .eq("file_id", fileId);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch assets",
    });
  }
});

// POST export design to code
router.post("/export/:fileId", async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const { format = "react", userId } = req.body;

    if (!["react", "html", "vue", "svelte", "json"].includes(format)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid format. Must be one of: react, html, vue, svelte, json",
      });
    }

    // Get file data
    const { data: fileData, error: fileError } = await supabase
      .from("figma_workspace_files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (fileError || !fileData) throw new Error("File not found");

    // Generate code
    const generatedCode = await generateCodeFromDesign(
      fileData.file_data,
      format,
    );

    // Save export history
    await supabase.from("figma_export_history").insert([
      {
        user_id: userId,
        file_id: fileId,
        export_type: format.toUpperCase(),
        generated_code: generatedCode,
      },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        format,
        code: generatedCode,
        fileName: `${fileData.name}.${getFileExtension(format)}`,
      },
      message: "Code generated successfully",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to export design",
    });
  }
});

// POST save design version
router.post("/files/:fileId/versions", async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const { name, description, snapshot } = req.body;

    if (!snapshot) {
      return res.status(400).json({
        success: false,
        message: "snapshot required",
      });
    }

    // Get current version count
    const { count, error: countError } = await supabase
      .from("figma_design_versions")
      .select("*", { count: "exact", head: true })
      .eq("file_id", fileId);

    const versionNumber = (count || 0) + 1;

    const { data, error } = await supabase
      .from("figma_design_versions")
      .insert([
        {
          file_id: fileId,
          version_number: versionNumber,
          name: name || `Version ${versionNumber}`,
          description,
          snapshot,
        },
      ]);

    if (error) throw error;

    return res.status(201).json({
      success: true,
      data: data?.[0],
      message: "Version saved successfully",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to save version",
    });
  }
});

// GET design versions
router.get("/files/:fileId/versions", async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;

    const { data, error } = await supabase
      .from("figma_design_versions")
      .select("*")
      .eq("file_id", fileId)
      .order("version_number", { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch versions",
    });
  }
});

// DELETE file
router.delete("/files/:fileId", async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;

    const { error } = await supabase
      .from("figma_workspace_files")
      .delete()
      .eq("id", fileId);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete file",
    });
  }
});

// Helper function
function getFileExtension(format: string): string {
  const extensions: Record<string, string> = {
    react: "tsx",
    html: "html",
    vue: "vue",
    svelte: "svelte",
    json: "json",
  };
  return extensions[format] || format;
}

export default router;
