/**
 * Hook for integrating Background Knowledge Crawler
 * Manages crawler lifecycle and provides progress updates
 */

import { useEffect, useCallback, useState } from "react";
import { useAppData } from "@/context/AppDataContext";
import {
  getBackgroundCrawler,
  initializeBackgroundCrawler,
} from "@/echo/services/backgroundCrawler";
import KnowledgeProgressTracker, {
  type KnowledgeProgressState,
} from "@/echo/services/knowledgeProgressTracker";

export interface BackgroundCrawlerStatus {
  isRunning: boolean;
  mode: "learning" | "on_demand";
  crawlCount: number;
  progress: KnowledgeProgressState | null;
  summary: {
    mode: string;
    coverage: number;
    approved: number;
    progress: string;
    nextThreshold?: string;
  } | null;
}

/**
 * Hook to manage background crawler
 */
export function useBackgroundCrawler() {
  const { recipes, ingredients } = useAppData();
  const [status, setStatus] = useState<BackgroundCrawlerStatus>({
    isRunning: false,
    mode: "learning",
    crawlCount: 0,
    progress: null,
    summary: null,
  });
  const [isInitialized, setIsInitialized] = useState(false);

  const updateStatus = useCallback(() => {
    try {
      const crawler = getBackgroundCrawler();
      const crawlerStatus = crawler.getStatus();
      const progress = crawler.getProgress();
      const summary = crawler.getProgressSummary();

      setStatus({
        isRunning: crawlerStatus.isRunning,
        mode: crawlerStatus.mode,
        crawlCount: crawlerStatus.crawlCount,
        progress,
        summary,
      });
    } catch (error) {
      console.warn("Error updating crawler status:", error);
    }
  }, []);

  // Initialize crawler on mount or when recipes change
  useEffect(() => {
    console.log("🔍 Crawler init check:", {
      isInitialized,
      recipesCount: recipes?.length || 0,
      hasMockRecipes: (recipes?.some((r) => r.id?.includes("mock")) || false),
    });

    if (!isInitialized && recipes && recipes.length > 0) {
      console.log(`✅ Initializing background crawler with ${recipes.length} recipes...`);

      // Extract ingredients from recipes to build ingredients map
      const ingredientsMap: Record<string, any> = {};
      recipes.forEach((recipe) => {
        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
          recipe.ingredients.forEach((ing: string) => {
            const trimmed = String(ing).trim().toLowerCase();
            if (trimmed) {
              ingredientsMap[trimmed] = {
                name: trimmed,
                frequency: (ingredientsMap[trimmed]?.frequency || 0) + 1,
                recipeCount: new Set([
                  ...(ingredientsMap[trimmed]?.recipes || []),
                  recipe.id,
                ]).size,
              };
            }
          });
        }
      });

      const uniqueIngredients = Object.keys(ingredientsMap).length;
      console.log(`📚 Found ${uniqueIngredients} unique ingredients from ${recipes.length} recipes`);
      console.log("🚀 Calling initializeBackgroundCrawler...");

      try {
        initializeBackgroundCrawler(recipes, ingredientsMap);
        setIsInitialized(true);
        console.log("✨ Crawler initialized successfully");

        // Force status update
        setTimeout(() => {
          console.log("📊 Updating crawler status...");
          updateStatus();
        }, 100);
      } catch (error) {
        console.error("❌ Failed to initialize crawler:", error);
      }
    }
  }, [recipes, isInitialized, updateStatus]);

  // Poll for status updates (more frequently when running)
  useEffect(() => {
    const interval = setInterval(() => {
      updateStatus();
    }, isInitialized && status.isRunning ? 2000 : 5000); // 2s when running, 5s otherwise

    return () => clearInterval(interval);
  }, [updateStatus, isInitialized, status.isRunning]);

  const start = useCallback(() => {
    try {
      const crawler = getBackgroundCrawler();
      console.log("Starting crawler...");
      crawler.start();
      // Update status immediately
      setTimeout(() => updateStatus(), 100);
    } catch (error) {
      console.error("Error starting crawler:", error);
    }
  }, [updateStatus]);

  const stop = useCallback(() => {
    try {
      const crawler = getBackgroundCrawler();
      console.log("Stopping crawler...");
      crawler.stop();
      // Update status immediately
      setTimeout(() => updateStatus(), 100);
    } catch (error) {
      console.error("Error stopping crawler:", error);
    }
  }, [updateStatus]);

  const setMode = useCallback(
    (mode: "learning" | "on_demand") => {
      const crawler = getBackgroundCrawler();
      crawler.setMode(mode);
      updateStatus();
    },
    [updateStatus],
  );

  const crawlTopic = useCallback(
    async (topic: string) => {
      try {
        const crawler = getBackgroundCrawler();
        await crawler.crawlTopic(topic);
        updateStatus();
      } catch (error) {
        console.error("Error crawling topic:", error);
      }
    },
    [updateStatus],
  );

  return {
    status,
    start,
    stop,
    setMode,
    crawlTopic,
    updateStatus,
  };
}

/**
 * Hook for displaying crawler status compactly
 */
export function useBackgroundCrawlerStatus() {
  const { status, setMode } = useBackgroundCrawler();

  return {
    mode: status.mode,
    coverage: status.progress?.overallCoverage ?? 0,
    approved: status.progress?.totalApprovedItems ?? 0,
    isRunning: status.isRunning,
    summary: status.summary,
    setMode,
  };
}

export default useBackgroundCrawler;
