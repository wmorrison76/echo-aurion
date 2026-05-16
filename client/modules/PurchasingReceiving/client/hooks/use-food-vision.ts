/**
 * LUCCCA Framework — AI Food Vision Analysis
 * Location: client/hooks/use-food-vision.ts
 * Wire to EchoAI³ endpoint; integrate with recipe standards; photo storage (Supabase).
 */

import { useCallback, useRef, useState } from "react";

export type PlateAnalysis = {
  id: string;
  imageUri: string;
  timestamp: string;
  recipeId?: string;
  recipeName?: string;
  outletId?: string;
  cookName?: string;
  overallScore: number;
  grade: "exceptional" | "excellent" | "good" | "needs-work" | "unacceptable";
  categories: {
    composition: { score: number; feedback: string };
    colorHarmony: { score: number; feedback: string };
    portionSize: { score: number; feedback: string };
    heightAndDimension: { score: number; feedback: string };
    negativeSpace: { score: number; feedback: string };
    garnishExecution: { score: number; feedback: string };
    sauceWork: { score: number; feedback: string };
    plateCleanlines: { score: number; feedback: string };
    temperatureIndicators: { score: number; feedback: string };
    professionalFinish: { score: number; feedback: string };
  };
  improvements: string[];
  strengths: string[];
  masterChefNotes: string;
  consistencyVsPrevious?: {
    trend: "improving" | "consistent" | "declining";
    previousScore: number;
    variancePercent: number;
  };
};

export type FoodVisionOptions = {
  apiEndpoint?: string;
  referenceImage?: string;
  recipeName?: string;
  outletId?: string;
  cookName?: string;
  onAnalysis?: (result: PlateAnalysis) => void;
  onError?: (error: Error) => void;
};

const SYSTEM_PROMPT = `You are a Michelin-star executive chef and MOF level food presentation expert. Analyze the dish photograph and respond ONLY with valid JSON: overallScore (0-100), grade (exceptional|excellent|good|needs-work|unacceptable), categories (composition, colorHarmony, portionSize, heightAndDimension, negativeSpace, garnishExecution, sauceWork, plateCleanlines, temperatureIndicators, professionalFinish each with score and feedback), improvements[], strengths[], masterChefNotes.`;

export async function captureFromCamera(): Promise<string | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    });
    const video = document.createElement("video");
    video.srcObject = stream;
    video.setAttribute("playsinline", "true");
    await video.play();
    await new Promise((r) => setTimeout(r, 500));
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      stream.getTracks().forEach((t) => t.stop());
      return null;
    }
    ctx.drawImage(video, 0, 0);
    stream.getTracks().forEach((t) => t.stop());
    return canvas.toDataURL("image/jpeg", 0.9);
  } catch {
    return null;
  }
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function useFoodVision(options: FoodVisionOptions = {}) {
  const {
    apiEndpoint = "/api/echo-ai/analyze-plate",
    recipeName,
    outletId,
    cookName,
    onAnalysis,
    onError,
  } = options;
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<PlateAnalysis | null>(null);
  const [history, setHistory] = useState<PlateAnalysis[]>([]);
  const [error, setError] = useState<string | null>(null);
  const callbacksRef = useRef({ onAnalysis, onError });
  callbacksRef.current = { onAnalysis, onError };

  const analyzeImage = useCallback(
    async (
      imageBase64: string,
      meta?: { recipeName?: string; cookName?: string; recipeId?: string },
    ) => {
      setIsAnalyzing(true);
      setError(null);
      try {
        const base64Data = imageBase64.includes(",")
          ? imageBase64.split(",")[1]
          : imageBase64;
        const mediaType = imageBase64.startsWith("data:image/png")
          ? "image/png"
          : "image/jpeg";
        const userMessage = `Analyze this plated dish.${meta?.recipeName || recipeName ? ` Dish: ${meta?.recipeName || recipeName}` : ""}`;
        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system: SYSTEM_PROMPT,
            image: { type: "base64", media_type: mediaType, data: base64Data },
            message: userMessage,
          }),
        });
        if (!response.ok)
          throw new Error(`AI analysis failed: ${response.status}`);
        const data = await response.json();
        let parsed: any =
          typeof data.analysis === "string"
            ? JSON.parse(data.analysis.replace(/```json|```/g, "").trim())
            : data.analysis || data;
        const analysis: PlateAnalysis = {
          id: `plate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          imageUri: imageBase64,
          timestamp: new Date().toISOString(),
          recipeId: meta?.recipeId,
          recipeName: meta?.recipeName || recipeName,
          outletId,
          cookName: meta?.cookName || cookName,
          overallScore: parsed.overallScore ?? 0,
          grade: parsed.grade ?? "needs-work",
          categories: {
            composition: parsed.categories?.composition ?? {
              score: 0,
              feedback: "",
            },
            colorHarmony: parsed.categories?.colorHarmony ?? {
              score: 0,
              feedback: "",
            },
            portionSize: parsed.categories?.portionSize ?? {
              score: 0,
              feedback: "",
            },
            heightAndDimension: parsed.categories?.heightAndDimension ?? {
              score: 0,
              feedback: "",
            },
            negativeSpace: parsed.categories?.negativeSpace ?? {
              score: 0,
              feedback: "",
            },
            garnishExecution: parsed.categories?.garnishExecution ?? {
              score: 0,
              feedback: "",
            },
            sauceWork: parsed.categories?.sauceWork ?? {
              score: 0,
              feedback: "",
            },
            plateCleanlines: parsed.categories?.plateCleanlines ?? {
              score: 0,
              feedback: "",
            },
            temperatureIndicators: parsed.categories?.temperatureIndicators ?? {
              score: 0,
              feedback: "",
            },
            professionalFinish: parsed.categories?.professionalFinish ?? {
              score: 0,
              feedback: "",
            },
          },
          improvements: parsed.improvements ?? [],
          strengths: parsed.strengths ?? [],
          masterChefNotes: parsed.masterChefNotes ?? "",
        };
        if (analysis.recipeId) {
          const prev = history.find((h) => h.recipeId === analysis.recipeId);
          if (prev) {
            const diff = analysis.overallScore - prev.overallScore;
            analysis.consistencyVsPrevious = {
              trend:
                diff > 3 ? "improving" : diff < -3 ? "declining" : "consistent",
              previousScore: prev.overallScore,
              variancePercent: Math.round(
                (Math.abs(diff) / prev.overallScore) * 100,
              ),
            };
          }
        }
        setLastAnalysis(analysis);
        setHistory((prev) => [analysis, ...prev].slice(0, 100));
        callbacksRef.current.onAnalysis?.(analysis);
        return analysis;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e.message);
        callbacksRef.current.onError?.(e);
        return null;
      } finally {
        setIsAnalyzing(false);
      }
    },
    [apiEndpoint, recipeName, outletId, cookName, history],
  );

  const analyzeFile = useCallback(
    async (
      file: File,
      meta?: { recipeName?: string; cookName?: string; recipeId?: string },
    ) => {
      const base64 = await fileToBase64(file);
      return analyzeImage(base64, meta);
    },
    [analyzeImage],
  );

  const analyzeFromCamera = useCallback(
    async (meta?: {
      recipeName?: string;
      cookName?: string;
      recipeId?: string;
    }) => {
      const image = await captureFromCamera();
      if (!image) {
        setError("Camera capture failed");
        return null;
      }
      return analyzeImage(image, meta);
    },
    [analyzeImage],
  );

  const getCookStats = useCallback(
    (cookNameFilter: string) => {
      const cookHistory = history.filter((h) => h.cookName === cookNameFilter);
      if (cookHistory.length === 0) return null;
      const avg = Math.round(
        cookHistory.reduce((s, h) => s + h.overallScore, 0) /
          cookHistory.length,
      );
      const best = Math.max(...cookHistory.map((h) => h.overallScore));
      const worst = Math.min(...cookHistory.map((h) => h.overallScore));
      const catScores: Record<string, number[]> = {};
      for (const h of cookHistory) {
        for (const [key, val] of Object.entries(h.categories)) {
          if (!catScores[key]) catScores[key] = [];
          catScores[key].push((val as { score: number }).score);
        }
      }
      const catAverages = Object.entries(catScores).map(([key, scores]) => ({
        category: key,
        average: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
      }));
      catAverages.sort((a, b) => a.average - b.average);
      return {
        totalAnalyses: cookHistory.length,
        averageScore: avg,
        bestScore: best,
        worstScore: worst,
        weakestCategory: catAverages[0]?.category || "none",
        strongestCategory:
          catAverages[catAverages.length - 1]?.category || "none",
        trend: (cookHistory.length >= 3
          ? cookHistory[0].overallScore > cookHistory[2].overallScore
            ? "improving"
            : cookHistory[0].overallScore < cookHistory[2].overallScore
              ? "declining"
              : "consistent"
          : "consistent") as "improving" | "consistent" | "declining",
      };
    },
    [history],
  );

  return {
    isAnalyzing,
    lastAnalysis,
    history,
    error,
    analyzeImage,
    analyzeFile,
    analyzeFromCamera,
    getCookStats,
    clearHistory: () => setHistory([]),
  };
}
