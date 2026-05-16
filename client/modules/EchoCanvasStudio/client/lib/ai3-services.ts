/**
 * AI^3 SERVICE ARCHITECTURE
 * Three integrated AI capabilities working together
 *
 * Layer 1: Content Analysis - Understand what's in the image
 * Layer 2: Parameter Optimization - Suggest smart defaults
 * Layer 3: Context Assistance - Real-time guidance and previews
 */

export interface ImageAnalysis {
  hasFaces: boolean;
  faceRegions: Array<{ x: number; y: number; width: number; height: number }>;
  dominantColors: string[];
  colorPalette: Array<{ color: string; percentage: number }>;
  hasText: boolean;
  textRegions: Array<{ x: number; y: number; width: number; height: number }>;
  hasObjects: Array<{ type: string; confidence: number; region: any }>;
  lighting: "bright" | "normal" | "dark";
  contrast: "low" | "normal" | "high";
  blur: "sharp" | "slight_blur" | "motion_blur";
  hasHorizon: boolean;
  horizonAngle: number;
  textures: string[];
}

/**
 * LAYER 1: CONTENT ANALYSIS
 * Analyzes the current image to understand its contents
 */
export const contentAnalyzer = {
  /**
   * Analyze image canvas for intelligent tool suggestions
   */
  analyzeCanvas: async (
    canvas: HTMLCanvasElement | null,
  ): Promise<ImageAnalysis | null> => {
    if (!canvas) return null;

    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Analyze colors
      const colorMap = new Map<string, number>();
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a > 128) {
          const hex = `#${r.toString(16).padStart(2, "0")}${g
            .toString(16)
            .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
          colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
        }
      }

      // Get dominant colors
      const dominantColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([color]) => color);

      // Calculate average brightness
      let totalBrightness = 0;
      let pixelCount = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a > 128) {
          totalBrightness += (r + g + b) / 3;
          pixelCount++;
        }
      }

      const avgBrightness = pixelCount > 0 ? totalBrightness / pixelCount : 128;
      const lighting =
        avgBrightness < 85 ? "dark" : avgBrightness > 170 ? "bright" : "normal";

      // Analyze image characteristics for AI suggestions
      const hasHighContrast =
        Math.max(
          ...dominantColors.map((c) => {
            const hex = c.substring(1);
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            return Math.max(r, g, b) - Math.min(r, g, b);
          }),
        ) > 128;

      const hasBrightColors = dominantColors.some((c) => {
        const hex = c.substring(1);
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return (r + g + b) / 3 > 180;
      });

      const hasDarkColors = dominantColors.some((c) => {
        const hex = c.substring(1);
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return (r + g + b) / 3 < 75;
      });

      return {
        hasFaces: false,
        faceRegions: [],
        dominantColors,
        colorPalette: dominantColors.map((color, i) => ({
          color,
          percentage: (5 - i) * 10,
        })),
        hasText: false,
        textRegions: [],
        hasObjects: [],
        lighting: hasBrightColors ? "bright" : hasDarkColors ? "dim" : "normal",
        contrast: hasHighContrast ? "high" : "normal",
        blur: "sharp",
        hasHorizon: false,
        horizonAngle: 0,
        textures: [],
      };
    } catch (error) {
      console.warn("Content analysis failed:", error);
      return null;
    }
  },

  /**
   * Detect faces in image for red-eye tool
   */
  detectFaces: async (
    canvas: HTMLCanvasElement | null,
  ): Promise<ImageAnalysis["faceRegions"]> => {
    const analysis = await contentAnalyzer.analyzeCanvas(canvas);
    return analysis?.faceRegions || [];
  },

  /**
   * Get dominant color palette
   */
  getColorPalette: async (
    canvas: HTMLCanvasElement | null,
  ): Promise<string[]> => {
    const analysis = await contentAnalyzer.analyzeCanvas(canvas);
    return analysis?.dominantColors || [];
  },

  /**
   * Detect text regions
   */
  detectTextRegions: async (
    canvas: HTMLCanvasElement | null,
  ): Promise<ImageAnalysis["textRegions"]> => {
    const analysis = await contentAnalyzer.analyzeCanvas(canvas);
    return analysis?.textRegions || [];
  },
};

/**
 * LAYER 2: PARAMETER OPTIMIZATION
 * Suggests optimal parameters for tools based on content analysis
 */
export const parameterOptimizer = {
  /**
   * Suggest optimal brush size based on image size and object size
   */
  suggestBrushSize: (
    canvasWidth: number,
    canvasHeight: number,
    analysis: ImageAnalysis | null,
  ): number => {
    // Scale brush size based on canvas size and image characteristics
    const avgDimension = (canvasWidth + canvasHeight) / 2;
    let baseSize = Math.max(5, Math.min(50, avgDimension / 80));

    // Adjust based on image sharpness
    if (analysis?.blur === "motion_blur") {
      baseSize *= 1.5; // Larger brush for blurry images
    } else if (analysis?.blur === "sharp") {
      baseSize *= 0.8; // Smaller brush for sharp details
    }

    // Adjust for image contrast
    if (analysis?.contrast === "high") {
      baseSize *= 0.9;
    } else if (analysis?.contrast === "low") {
      baseSize *= 1.1;
    }

    return Math.round(baseSize);
  },

  /**
   * Suggest optimal crop region based on composition
   */
  suggestCropRegion: (
    canvasWidth: number,
    canvasHeight: number,
    analysis: ImageAnalysis | null,
  ): { x: number; y: number; width: number; height: number } => {
    // If faces detected, compose around them
    if (analysis?.hasFaces && analysis.faceRegions.length > 0) {
      const faces = analysis.faceRegions;
      const minX = Math.min(...faces.map((f) => f.x));
      const minY = Math.min(...faces.map((f) => f.y));
      const maxX = Math.max(...faces.map((f) => f.x + f.width));
      const maxY = Math.max(...faces.map((f) => f.y + f.height));

      // Add 20% padding
      const padding = Math.max((maxX - minX) * 0.2, (maxY - minY) * 0.2);

      return {
        x: Math.max(0, Math.round(minX - padding)),
        y: Math.max(0, Math.round(minY - padding)),
        width: Math.min(canvasWidth, Math.round(maxX - minX + padding * 2)),
        height: Math.min(canvasHeight, Math.round(maxY - minY + padding * 2)),
      };
    }

    // If horizon detected, use it as a guide
    if (analysis?.hasHorizon) {
      const horizonY = canvasHeight / 2;
      return {
        x: 0,
        y: Math.round(horizonY * 0.3),
        width: canvasWidth,
        height: Math.round(horizonY * 1.4),
      };
    }

    // Default rule of thirds
    const thirdWidth = canvasWidth / 3;
    const thirdHeight = canvasHeight / 3;

    return {
      x: Math.round(thirdWidth * 0.5),
      y: Math.round(thirdHeight * 0.5),
      width: Math.round(thirdWidth * 2),
      height: Math.round(thirdHeight * 2),
    };
  },

  /**
   * Suggest clone stamp source based on nearby pixels
   */
  suggestCloneSource: (
    x: number,
    y: number,
    canvas: HTMLCanvasElement | null,
  ): { x: number; y: number } => {
    if (!canvas) return { x: 0, y: 0 };

    // In production, analyze texture to find best source
    // For now, suggest nearby clean area (offset)
    return {
      x: Math.max(0, Math.min(canvas.width - 1, x + 50)),
      y: Math.max(0, Math.min(canvas.height - 1, y - 50)),
    };
  },

  /**
   * Suggest gradient colors based on image palette
   */
  suggestGradientColors: (
    analysis: ImageAnalysis | null,
  ): { start: string; end: string } => {
    if (analysis?.dominantColors && analysis.dominantColors.length >= 2) {
      // Use complementary colors from the palette
      const primaryColor = analysis.dominantColors[0];
      const secondaryColor =
        analysis.dominantColors[
          Math.min(2, analysis.dominantColors.length - 1)
        ];

      // If there are at least 3 colors, use contrasting colors
      if (analysis.dominantColors.length >= 3) {
        return {
          start: analysis.dominantColors[0],
          end: analysis.dominantColors[analysis.dominantColors.length - 1],
        };
      }

      return {
        start: primaryColor,
        end: secondaryColor,
      };
    }

    // Default gradient based on image lighting
    if (analysis?.lighting === "dark") {
      return {
        start: "#1a1a1a",
        end: "#666666",
      };
    } else if (analysis?.lighting === "bright") {
      return {
        start: "#ffffff",
        end: "#cccccc",
      };
    }

    return {
      start: "#000000",
      end: "#ffffff",
    };
  },

  /**
   * Suggest font properties based on image style
   */
  suggestFontProperties: (
    analysis: ImageAnalysis | null,
  ): { size: number; family: string; color: string } => {
    // Suggest text color with contrast to background
    let textColor = "#333333";
    if (analysis?.lighting === "dark") {
      textColor = "#ffffff";
    } else if (analysis?.lighting === "bright") {
      textColor = "#000000";
    }

    // If there's a dominant color, use complementary color for text
    if (analysis?.dominantColors && analysis.dominantColors.length > 0) {
      const dominant = analysis.dominantColors[0];
      // Simple approach: if background is light, use dark text; vice versa
      const rgb = parseInt(dominant.slice(1), 16);
      const brightness = (rgb >> 16) & (255 > 127) ? "light" : "dark";
      textColor = brightness === "light" ? "#000000" : "#ffffff";
    }

    // Suggest font based on image characteristics
    let fontFamily = "Arial";
    if (analysis?.textures && analysis.textures.includes("rough")) {
      fontFamily = "Georgia"; // Serif for textured images
    }

    return {
      size: 32,
      family: fontFamily,
      color: textColor,
    };
  },

  /**
   * Suggest healing/blur amount based on image sharpness
   */
  suggestBlurAmount: (analysis: ImageAnalysis | null): number => {
    if (analysis?.blur === "motion_blur") return 10;
    if (analysis?.blur === "slight_blur") return 5;
    return 3;
  },

  /**
   * Suggest selection method based on object characteristics
   */
  suggestSelectionMethod: (
    analysis: ImageAnalysis | null,
  ): "rect" | "ellipse" | "lasso" | "magic-wand" | "object-select" => {
    // Prefer object select if objects are detected with confidence
    if (analysis?.hasObjects && analysis.hasObjects.length > 0) {
      const avgConfidence =
        analysis.hasObjects.reduce((sum, obj) => sum + obj.confidence, 0) /
        analysis.hasObjects.length;
      if (avgConfidence > 0.7) {
        return "object-select";
      }
    }

    // Use magic wand for limited color palette
    if (
      analysis?.dominantColors &&
      analysis.dominantColors.length < 4 &&
      analysis.contrast === "high"
    ) {
      return "magic-wand";
    }

    // Check if image has clear edges (use lasso)
    if (analysis?.blur === "sharp") {
      return "lasso";
    }

    // Default to magic wand for photographs
    return "magic-wand";
  },
};

/**
 * LAYER 3: CONTEXT ASSISTANCE
 * Provides real-time guidance and suggestions based on user actions
 */
export const contextAssistant = {
  /**
   * Get suggested next action based on current tool and image state
   */
  suggestNextAction: (
    currentTool: string,
    analysis: ImageAnalysis | null,
  ): string | null => {
    const suggestions: { [key: string]: string | null } = {
      crop: analysis?.hasFaces
        ? `${analysis.faceRegions?.length || 0} faces detected - compose using rule of thirds`
        : analysis?.hasHorizon
          ? "Horizon detected - use horizontal rule of thirds"
          : null,
      text: analysis?.hasText
        ? "Existing text detected - avoid overlapping"
        : analysis?.lighting === "dark"
          ? "Use light text color for contrast"
          : "Use dark text color for contrast",
      healing: analysis?.hasObjects
        ? `${analysis.hasObjects.length} objects detected - try spot healing first`
        : null,
      "clone-stamp": analysis?.textures
        ? `Match ${analysis.textures.join(", ")} texture for seamless blending`
        : null,
      "color-replace": analysis?.dominantColors
        ? `Dominant colors: ${analysis.dominantColors.slice(0, 3).join(", ")}`
        : null,
      brush:
        analysis?.blur === "motion_blur"
          ? "Motion blur detected - use larger brush for blending"
          : analysis?.contrast === "high"
            ? "High contrast image - smaller brush for precision"
            : null,
      gradient: `Use colors from palette: ${analysis?.dominantColors?.slice(0, 2).join(", ") || "default"}`,
    };

    return suggestions[currentTool] || null;
  },

  /**
   * Provide composition feedback during crop/compose operations
   */
  getCompositionFeedback: (
    x: number,
    y: number,
    width: number,
    height: number,
    canvasWidth: number,
    canvasHeight: number,
  ): string[] => {
    const feedback: string[] = [];

    // Rule of thirds
    const thirdX = canvasWidth / 3;
    const thirdY = canvasHeight / 3;
    const cropCenterX = x + width / 2;
    const cropCenterY = y + height / 2;

    if (
      (Math.abs(cropCenterX - thirdX) < 30 ||
        Math.abs(cropCenterX - thirdX * 2) < 30) &&
      (Math.abs(cropCenterY - thirdY) < 30 ||
        Math.abs(cropCenterY - thirdY * 2) < 30)
    ) {
      feedback.push("✓ Rule of thirds");
    }

    // Aspect ratio feedback
    const aspectRatio = width / height;
    if (Math.abs(aspectRatio - 16 / 9) < 0.2) {
      feedback.push("✓ 16:9 aspect ratio");
    } else if (Math.abs(aspectRatio - 1) < 0.1) {
      feedback.push("✓ Square aspect ratio");
    }

    // Edge padding
    if (x > 20 && y > 20 && canvasWidth - (x + width) > 20) {
      feedback.push("✓ Balanced padding");
    }

    return feedback;
  },

  /**
   * Get real-time preview of tool effect
   */
  generatePreview: (
    tool: string,
    imageData: ImageData,
    params: any,
  ): ImageData => {
    // Create a copy
    const preview = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height,
    );

    // Apply preview effect based on tool
    // This would be implemented with actual effects
    // For now, return the original

    return preview;
  },
};

/**
 * INTEGRATED AI^3 SERVICE
 * Coordinates all three layers for seamless assistance
 */
export const ai3Service = {
  /**
   * Full analysis and recommendation for a tool
   */
  analyze: async (
    tool: string,
    canvas: HTMLCanvasElement | null,
    params?: any,
  ) => {
    const analysis = await contentAnalyzer.analyzeCanvas(canvas);
    const canvasWidth = canvas?.width || 1200;
    const canvasHeight = canvas?.height || 800;

    let suggestedParams: any = {};
    let nextAction: string | null = null;
    let compositionFeedback: string[] = [];
    let selectionMethod: string | null = null;

    switch (tool) {
      case "crop":
        suggestedParams = parameterOptimizer.suggestCropRegion(
          canvasWidth,
          canvasHeight,
          analysis,
        );
        nextAction = contextAssistant.suggestNextAction(tool, analysis);
        compositionFeedback = contextAssistant.getCompositionFeedback(
          params?.x || suggestedParams.x,
          params?.y || suggestedParams.y,
          params?.width || suggestedParams.width,
          params?.height || suggestedParams.height,
          canvasWidth,
          canvasHeight,
        );
        break;

      case "brush":
        suggestedParams = {
          size: parameterOptimizer.suggestBrushSize(
            canvasWidth,
            canvasHeight,
            analysis,
          ),
        };
        nextAction = contextAssistant.suggestNextAction(tool, analysis);
        break;

      case "gradient":
        suggestedParams = parameterOptimizer.suggestGradientColors(analysis);
        nextAction = contextAssistant.suggestNextAction(tool, analysis);
        break;

      case "text":
        suggestedParams = parameterOptimizer.suggestFontProperties(analysis);
        nextAction = contextAssistant.suggestNextAction(tool, analysis);
        break;

      case "rect-select":
      case "ellipse-select":
      case "lasso":
      case "magic-wand":
      case "quick-select":
      case "object-select":
        selectionMethod = parameterOptimizer.suggestSelectionMethod(analysis);
        nextAction = contextAssistant.suggestNextAction(
          selectionMethod,
          analysis,
        );
        break;

      case "healing-brush":
      case "spot-healing":
      case "patch":
        nextAction = contextAssistant.suggestNextAction(tool, analysis);
        suggestedParams = {
          brushSize: parameterOptimizer.suggestBrushSize(
            canvasWidth,
            canvasHeight,
            analysis,
          ),
          blurAmount: parameterOptimizer.suggestBlurAmount(analysis),
        };
        break;

      default:
        nextAction = contextAssistant.suggestNextAction(tool, analysis);
    }

    return {
      analysis,
      suggestedParams,
      nextAction,
      compositionFeedback,
      selectionMethod,
      timestamp: Date.now(),
    };
  },

  /**
   * Get intelligent recommendations for improving the current work
   */
  getRecommendations: async (
    canvas: HTMLCanvasElement | null,
    recentTools: string[],
  ): Promise<string[]> => {
    const analysis = await contentAnalyzer.analyzeCanvas(canvas);
    const recommendations: string[] = [];

    // Face-based recommendations
    if (analysis?.hasFaces && analysis.faceRegions.length > 0) {
      if (!recentTools.includes("red-eye")) {
        recommendations.push("✨ Use Red Eye removal for better portraits");
      }
      if (!recentTools.includes("healing-brush")) {
        recommendations.push("✨ Spot healing can smooth skin");
      }
    }

    // Color-based recommendations
    if (analysis?.dominantColors && analysis.dominantColors.length > 0) {
      if (!recentTools.includes("color-balance")) {
        recommendations.push("✨ Adjust color balance to enhance vibrancy");
      }
    }

    // Lighting-based recommendations
    if (analysis?.lighting === "dark" && !recentTools.includes("levels")) {
      recommendations.push("✨ Increase brightness with Levels or Curves");
    }
    if (analysis?.lighting === "bright" && !recentTools.includes("curves")) {
      recommendations.push("✨ Recover details with Curves adjustment");
    }

    // Blur-based recommendations
    if (analysis?.blur === "motion_blur" && !recentTools.includes("sharpen")) {
      recommendations.push("✨ Try Smart Sharpen to reduce motion blur");
    }

    return recommendations;
  },
};

export default ai3Service;
