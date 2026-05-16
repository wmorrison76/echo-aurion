/**
 * User Preferences Routes
 * Handles saving and retrieving theme, appearance, and background settings
 * These are synced across all devices/logins as core LUCCCA layout
 */

import { Router, Request, Response, RequestHandler } from "express";
import { supabase } from "../lib/supabase";
import { jwtAuthMiddleware } from "../middleware/auth-jwt";
import { z } from "zod";

const router = Router();

// Constants
const MAX_BG_IMAGE_SIZE = 3 * 1024 * 1024; // 3MB max
const DEFAULT_BACKGROUND_IMAGE_LIGHT =
  "https://cdn.builder.io/api/v1/image/assets%2Fe33328d06dce4e279c4e2c119bb4b07c%2F381baef077c34520a54d42619fa6906e?format=webp&width=2400";
const DEFAULT_BACKGROUND_IMAGE_DARK =
  "https://cdn.builder.io/api/v1/image/assets%2Fe33328d06dce4e279c4e2c119bb4b07c%2F51ac8ea41cbb4592882af4b41641ab8c?format=webp&width=2400";
const DEFAULT_BACKGROUND_OPACITY = 0.18;

// Validation schema for preferences
const PreferencesSchema = z.object({
  theme: z.enum(["corporate", "vibrant", "minimal", "warm", "echo"]).optional(),
  font: z
    .enum(["inter", "poppins", "playfair", "montserrat", "lato"])
    .optional(),
  appearance: z.enum(["light", "dark"]).optional(),
  fontScale: z.number().min(0.8).max(1.5).optional(),
  highContrast: z.boolean().optional(),
  backgroundImageLight: z
    .string()
    .refine(
      (val) => !val || val.length < MAX_BG_IMAGE_SIZE,
      `Background image too large (max 3MB)`,
    )
    .nullable()
    .optional(),
  backgroundOpacityLight: z.number().min(0).max(1).optional(),
  backgroundImageDark: z
    .string()
    .refine(
      (val) => !val || val.length < MAX_BG_IMAGE_SIZE,
      `Background image too large (max 3MB)`,
    )
    .nullable()
    .optional(),
  backgroundOpacityDark: z.number().min(0).max(1).optional(),
});

/**
 * GET /api/user-preferences
 * Retrieve user's saved preferences
 * Works for both authenticated and anonymous users
 */
const getPreferences: RequestHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    // If not authenticated, return default preferences
    // (user will use localStorage as fallback)
    if (!userId) {
      return res.json({
        theme: "echo",
        font: "inter",
        appearance: "dark",
        fontScale: 1.0,
        highContrast: false,
        backgroundImageLight: DEFAULT_BACKGROUND_IMAGE_LIGHT,
        backgroundOpacityLight: DEFAULT_BACKGROUND_OPACITY,
        backgroundImageDark: DEFAULT_BACKGROUND_IMAGE_DARK,
        backgroundOpacityDark: DEFAULT_BACKGROUND_OPACITY,
      });
    }

    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Handle Supabase errors gracefully
    if (error) {
      // PGRST116 = no rows found, which is fine for new users
      if (error.code === "PGRST116" || !data) {
        // Return default preferences for new users or if table doesn't exist
        console.log(
          "No preferences found for user, returning defaults:",
          userId,
        );
        return res.json({
          theme: "echo",
          font: "inter",
          appearance: "dark",
          fontScale: 1.0,
          highContrast: false,
          backgroundImageLight: DEFAULT_BACKGROUND_IMAGE_LIGHT,
          backgroundOpacityLight: DEFAULT_BACKGROUND_OPACITY,
          backgroundImageDark: DEFAULT_BACKGROUND_IMAGE_DARK,
          backgroundOpacityDark: DEFAULT_BACKGROUND_OPACITY,
        });
      }

      // For other Supabase errors (permission denied, table doesn't exist, etc),
      // log but still return defaults to avoid breaking the app
      console.warn("Supabase query warning (returning defaults):", {
        code: error.code,
        message: error.message,
        userId,
      });

      return res.json({
        theme: "echo",
        font: "inter",
        appearance: "dark",
        fontScale: 1.0,
        highContrast: false,
        backgroundImageLight: DEFAULT_BACKGROUND_IMAGE_LIGHT,
        backgroundOpacityLight: DEFAULT_BACKGROUND_OPACITY,
        backgroundImageDark: DEFAULT_BACKGROUND_IMAGE_DARK,
        backgroundOpacityDark: DEFAULT_BACKGROUND_OPACITY,
      });
    }

    // Successfully retrieved preferences
    return res.json({
      theme: data?.theme || "echo",
      font: data?.font || "inter",
      appearance: data?.appearance || "dark",
      fontScale:
        (data?.font_scale && Math.max(0.8, Math.min(1.5, data.font_scale))) ||
        1.0,
      highContrast: data?.high_contrast || false,
      backgroundImageLight:
        data?.background_image_light ?? DEFAULT_BACKGROUND_IMAGE_LIGHT,
      backgroundOpacityLight:
        data?.background_opacity_light ?? DEFAULT_BACKGROUND_OPACITY,
      backgroundImageDark:
        data?.background_image_dark ?? DEFAULT_BACKGROUND_IMAGE_DARK,
      backgroundOpacityDark:
        data?.background_opacity_dark ?? DEFAULT_BACKGROUND_OPACITY,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Unexpected error in getPreferences:", {
      message: errorMessage,
      error: error,
      userId,
    });
    // Return defaults instead of error to prevent client breakage
    // Client will fall back to localStorage if needed
    res.status(200).json({
      theme: "echo",
      font: "inter",
      appearance: "dark",
      fontScale: 1.0,
      highContrast: false,
      backgroundImageLight: DEFAULT_BACKGROUND_IMAGE_LIGHT,
      backgroundOpacityLight: DEFAULT_BACKGROUND_OPACITY,
      backgroundImageDark: DEFAULT_BACKGROUND_IMAGE_DARK,
      backgroundOpacityDark: DEFAULT_BACKGROUND_OPACITY,
    });
  }
};

/**
 * POST /api/user-preferences
 * Save/update user's preferences
 * Requires authentication to persist across devices
 */
const savePreferences: RequestHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    // If not authenticated, save locally only (silent success)
    if (!userId) {
      return res.json({
        success: true,
        message: "Preferences saved locally (not synced to backend)",
      });
    }

    const validated = PreferencesSchema.parse(req.body);

    // Log background image sizes for monitoring
    if (validated.backgroundImageLight) {
      const lightSize = (validated.backgroundImageLight.length / 1024).toFixed(
        1,
      );
      console.log(
        `[USER-PREFS] Saving light background image (${lightSize}KB)`,
      );
    }
    if (validated.backgroundImageDark) {
      const darkSize = (validated.backgroundImageDark.length / 1024).toFixed(1);
      console.log(`[USER-PREFS] Saving dark background image (${darkSize}KB)`);
    }

    const updateData: any = {};

    if (validated.theme !== undefined) updateData.theme = validated.theme;
    if (validated.font !== undefined) updateData.font = validated.font;
    if (validated.appearance !== undefined)
      updateData.appearance = validated.appearance;
    if (validated.fontScale !== undefined)
      updateData.font_scale = validated.fontScale;
    if (validated.highContrast !== undefined)
      updateData.high_contrast = validated.highContrast;
    if (validated.backgroundImageLight !== undefined)
      updateData.background_image_light = validated.backgroundImageLight;
    if (validated.backgroundOpacityLight !== undefined)
      updateData.background_opacity_light = validated.backgroundOpacityLight;
    if (validated.backgroundImageDark !== undefined)
      updateData.background_image_dark = validated.backgroundImageDark;
    if (validated.backgroundOpacityDark !== undefined)
      updateData.background_opacity_dark = validated.backgroundOpacityDark;

    // Upsert: insert if not exists, update if exists
    const { data, error } = await supabase
      .from("user_preferences")
      .upsert(
        {
          user_id: userId,
          ...updateData,
        },
        {
          onConflict: "user_id",
        },
      )
      .select()
      .single();

    if (error) {
      console.warn("Supabase upsert error (returning success):", {
        code: error.code,
        message: error.message,
        userId,
      });
      // Return success anyway - client has local save
      return res.json({
        success: true,
        message: "Preferences saved locally (backend sync failed, but safe)",
      });
    }

    res.json({
      success: true,
      preferences: {
        theme: data?.theme || validated.theme,
        font: data?.font || validated.font,
        appearance: data?.appearance || validated.appearance,
        fontScale: data?.font_scale || validated.fontScale || 1.0,
        highContrast: data?.high_contrast || validated.highContrast || false,
        backgroundImageLight:
          data?.background_image_light || validated.backgroundImageLight,
        backgroundOpacityLight:
          data?.background_opacity_light || validated.backgroundOpacityLight,
        backgroundImageDark:
          data?.background_image_dark || validated.backgroundImageDark,
        backgroundOpacityDark:
          data?.background_opacity_dark || validated.backgroundOpacityDark,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        details: error.errors,
      });
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in savePreferences:", {
      message: errorMessage,
      error: error,
      userId,
    });

    // Return success even on error since client has local save
    res.json({
      success: true,
      message: "Preferences saved locally (backend error, but safe)",
    });
  }
};

/**
 * POST /api/user-preferences/sync-background
 * Sync background images to backend (handles large data)
 * Separate endpoint because base64 images can be large
 * Requires authentication to persist across devices
 */
const syncBackground: RequestHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    // If not authenticated, save locally only (silent success)
    if (!userId) {
      return res.json({
        success: true,
        message: "Background saved locally (not synced to backend)",
      });
    }

    const {
      backgroundImageLight,
      backgroundImageDark,
      backgroundOpacityLight,
      backgroundOpacityDark,
    } = req.body;

    if (!backgroundImageLight && !backgroundImageDark) {
      return res.status(400).json({
        error: "INVALID_INPUT",
        message: "At least one background image is required",
      });
    }

    const { data, error } = await supabase
      .from("user_preferences")
      .upsert(
        {
          user_id: userId,
          background_image_light: backgroundImageLight || null,
          background_opacity_light: backgroundOpacityLight ?? 0,
          background_image_dark: backgroundImageDark || null,
          background_opacity_dark: backgroundOpacityDark ?? 0,
        },
        {
          onConflict: "user_id",
        },
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: "Background images synced successfully",
    });
  } catch (error) {
    console.error("Failed to sync background:", error);
    res.status(500).json({
      error: "SYNC_FAILED",
      message: "Failed to sync background images",
    });
  }
};

/**
 * DELETE /api/user-preferences/background/:mode
 * Remove background image for light or dark mode
 */
const removeBackground: RequestHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = (req as any).user?.id;
    const { mode } = req.params;

    if (!userId) {
      return res.json({
        success: true,
        message: "Background removed locally (not synced to backend)",
      });
    }

    if (!["light", "dark"].includes(mode)) {
      return res.status(400).json({
        error: "INVALID_MODE",
        message: 'Mode must be "light" or "dark"',
      });
    }

    const updateData: any = {};
    if (mode === "light") {
      updateData.background_image_light = null;
      updateData.background_opacity_light = 0;
    } else {
      updateData.background_image_dark = null;
      updateData.background_opacity_dark = 0;
    }

    const { data, error } = await supabase
      .from("user_preferences")
      .update(updateData)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: `${mode} mode background removed`,
    });
  } catch (error) {
    console.error("Failed to remove background:", error);
    res.status(500).json({
      error: "REMOVE_FAILED",
      message: "Failed to remove background image",
    });
  }
};

// Routes (mounted at /api in server/index.ts)
// Note: Routes work for both authenticated and anonymous users
// Authentication is optional - allows preferences to work before login
router.get("/user-preferences", getPreferences);
router.post("/user-preferences", savePreferences);
router.post("/user-preferences/sync-background", syncBackground);
router.delete("/user-preferences/background/:mode", removeBackground);

export default router;
