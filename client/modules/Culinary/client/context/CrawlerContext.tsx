import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";

interface KnowledgeUpdate {
  ingredientsTaught: number;
  techniquesLearned: number;
  flavorProfilesAnalyzed: number;
  unknownTermsIdentified: string[];
  sourcesUsed?: string[];
  flavorMatrixStats?: {
    totalRecipes: number;
    totalCuisines: number;
    totalIngredients: number;
    totalTechniques: number;
  };
}

interface CrawlerSession {
  id: string;
  isRunning: boolean;
  sessionId: string;
  currentUrl: string;
  currentRecipe: string;
  recipesProcessed: number;
  totalRecipes: number;
  knowledge: KnowledgeUpdate;
  messages: string[];
  error: string;
  crawlerMode: "legacy" | "global";
  extractFlavorData: boolean;
  autoLearn: boolean;
  sourcesUsed: string[];
  flavorMatrixStats: any;
  progress: number; // 0-100
  startedAt: number;
  completedAt?: number;
}

interface CrawlerContextType {
  sessions: CrawlerSession[];
  activeSessions: string[]; // IDs of currently running sessions
  startCrawler: (options: {
    mode: "legacy" | "global";
    extractFlavorData?: boolean;
    autoLearn?: boolean;
    name?: string;
  }) => Promise<string>; // Returns session ID
  stopCrawler: (sessionId: string) => void;
  stopAllCrawlers: () => void;
  resetCrawler: (sessionId: string) => void;
  resetAllCrawlers: () => void;
  clearMessages: (sessionId: string) => void;
  getSession: (sessionId: string) => CrawlerSession | undefined;
}

const CrawlerContext = createContext<CrawlerContextType | undefined>(undefined);

export function CrawlerProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<CrawlerSession[]>([]);
  const eventSourcesRef = useRef<Map<string, EventSource>>(new Map());

  const getSession = useCallback(
    (sessionId: string) => {
      return sessions.find((s) => s.sessionId === sessionId);
    },
    [sessions],
  );

  const startCrawler = useCallback(
    async (options: {
      mode: "legacy" | "global";
      extractFlavorData?: boolean;
      autoLearn?: boolean;
      name?: string;
    }): Promise<string> => {
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const id = `crawler-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const newSession: CrawlerSession = {
        id,
        isRunning: true,
        sessionId,
        currentUrl: "",
        currentRecipe: "",
        recipesProcessed: 0,
        totalRecipes: 0,
        knowledge: {
          ingredientsTaught: 0,
          techniquesLearned: 0,
          flavorProfilesAnalyzed: 0,
          unknownTermsIdentified: [],
        },
        messages: [],
        error: "",
        crawlerMode: options.mode,
        extractFlavorData: options.extractFlavorData ?? true,
        autoLearn: options.autoLearn ?? true,
        sourcesUsed: [],
        flavorMatrixStats: null,
        progress: 0,
        startedAt: Date.now(),
      };

      setSessions((prev) => [...prev, newSession]);

      try {
        // Start crawler session
        const startResponse = await fetch("/api/echo/crawler/start-crawl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            maxRecipes: options.mode === "global" ? 1000 : 500,
            mode: options.mode,
            extractFlavorData: options.extractFlavorData ?? true,
            autoLearn: options.autoLearn ?? true,
          }),
        });

        if (!startResponse.ok) {
          throw new Error("Failed to start crawler session");
        }

        // Connect to progress stream
        const eventSource = new EventSource(
          `/api/echo/crawler/progress?sessionId=${sessionId}`,
        );
        eventSourcesRef.current.set(id, eventSource);

        eventSource.onmessage = (event) => {
          try {
            const crawlerEvent = JSON.parse(event.data);

            if (!crawlerEvent.type) {
              console.warn("Received SSE message without type:", crawlerEvent);
              return;
            }

            switch (crawlerEvent.type) {
              case "start":
              case "ping":
                // Connection established or keep-alive ping
                break;

              case "recipe":
                setSessions((prev) =>
                  prev.map((s) =>
                    s.id === id
                      ? {
                          ...s,
                          currentRecipe:
                            crawlerEvent.data.currentRecipe || s.currentRecipe,
                          currentUrl:
                            crawlerEvent.data.currentUrl || s.currentUrl,
                          recipesProcessed:
                            crawlerEvent.data.recipesProcessed ??
                            s.recipesProcessed,
                          totalRecipes:
                            crawlerEvent.data.totalRecipes ?? s.totalRecipes,
                          progress:
                            crawlerEvent.data.totalRecipes &&
                            crawlerEvent.data.recipesProcessed !== undefined
                              ? Math.min(
                                  99,
                                  Math.round(
                                    (crawlerEvent.data.recipesProcessed /
                                      crawlerEvent.data.totalRecipes) *
                                      100,
                                  ),
                                )
                              : s.progress,
                          messages: crawlerEvent.data.message
                            ? [
                                ...s.messages.slice(-9),
                                crawlerEvent.data.message,
                              ]
                            : s.messages,
                        }
                      : s,
                  ),
                );
                break;

              case "knowledge":
                setSessions((prev) =>
                  prev.map((s) =>
                    s.id === id
                      ? {
                          ...s,
                          knowledge: {
                            ...s.knowledge,
                            ...crawlerEvent.data.knowledgeUpdates,
                          },
                          messages: crawlerEvent.data.message
                            ? [
                                ...s.messages.slice(-9),
                                crawlerEvent.data.message,
                              ]
                            : s.messages,
                        }
                      : s,
                  ),
                );
                break;

              case "learning":
                setSessions((prev) =>
                  prev.map((s) =>
                    s.id === id
                      ? {
                          ...s,
                          messages: crawlerEvent.data.message
                            ? [
                                ...s.messages.slice(-9),
                                crawlerEvent.data.message,
                              ]
                            : s.messages,
                        }
                      : s,
                  ),
                );
                break;

              case "complete":
                setSessions((prev) =>
                  prev.map((s) =>
                    s.id === id
                      ? {
                          ...s,
                          isRunning: false,
                          progress: 100,
                          knowledge: {
                            ...s.knowledge,
                            ...(crawlerEvent.data.knowledgeUpdates || {}),
                          },
                          sourcesUsed:
                            crawlerEvent.data.knowledgeUpdates?.sourcesUsed ||
                            s.sourcesUsed,
                          flavorMatrixStats:
                            crawlerEvent.data.knowledgeUpdates
                              ?.flavorMatrixStats || s.flavorMatrixStats,
                          messages: [
                            ...s.messages.slice(-9),
                            "🎉 Crawler completed successfully!",
                          ],
                          completedAt: Date.now(),
                        }
                      : s,
                  ),
                );
                eventSourcesRef.current.delete(id);
                break;

              case "error":
                setSessions((prev) =>
                  prev.map((s) =>
                    s.id === id
                      ? {
                          ...s,
                          isRunning: false,
                          error: crawlerEvent.data.error || "Unknown error",
                          messages: [
                            ...s.messages.slice(-9),
                            `❌ ${crawlerEvent.data.error}`,
                          ],
                          completedAt: Date.now(),
                        }
                      : s,
                  ),
                );
                eventSourcesRef.current.delete(id);
                break;

              default:
                console.warn("Unknown crawler event type:", crawlerEvent.type);
            }
          } catch (e) {
            console.error(
              "Failed to parse crawler event:",
              e,
              "raw data:",
              event.data,
            );
          }
        };

        eventSource.onerror = () => {
          setSessions((prev) =>
            prev.map((s) =>
              s.id === id
                ? {
                    ...s,
                    isRunning: false,
                    error: "Connection to crawler lost",
                    completedAt: Date.now(),
                  }
                : s,
            ),
          );
          eventSourcesRef.current.delete(id);
        };

        return id;
      } catch (err) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  isRunning: false,
                  error: err instanceof Error ? err.message : "Unknown error",
                }
              : s,
          ),
        );
        throw err;
      }
    },
    [],
  );

  const stopCrawler = useCallback((crawlerId: string) => {
    const eventSource = eventSourcesRef.current.get(crawlerId);
    if (eventSource) {
      eventSource.close();
      eventSourcesRef.current.delete(crawlerId);
    }
    setSessions((prev) =>
      prev.map((s) =>
        s.id === crawlerId
          ? {
              ...s,
              isRunning: false,
              completedAt: Date.now(),
            }
          : s,
      ),
    );
  }, []);

  const stopAllCrawlers = useCallback(() => {
    eventSourcesRef.current.forEach((eventSource) => eventSource.close());
    eventSourcesRef.current.clear();
    setSessions((prev) =>
      prev.map((s) => ({
        ...s,
        isRunning: false,
        completedAt: Date.now(),
      })),
    );
  }, []);

  const resetCrawler = useCallback(
    (crawlerId: string) => {
      stopCrawler(crawlerId);
      setSessions((prev) => prev.filter((s) => s.id !== crawlerId));
    },
    [stopCrawler],
  );

  const resetAllCrawlers = useCallback(() => {
    stopAllCrawlers();
    setSessions([]);
  }, [stopAllCrawlers]);

  const clearMessages = useCallback((crawlerId: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === crawlerId
          ? {
              ...s,
              messages: [],
            }
          : s,
      ),
    );
  }, []);

  const activeSessions = sessions.filter((s) => s.isRunning).map((s) => s.id);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      eventSourcesRef.current.forEach((eventSource) => eventSource.close());
    };
  }, []);

  return (
    <CrawlerContext.Provider
      value={{
        sessions,
        activeSessions,
        startCrawler,
        stopCrawler,
        stopAllCrawlers,
        resetCrawler,
        resetAllCrawlers,
        clearMessages,
        getSession,
      }}
    >
      {children}
    </CrawlerContext.Provider>
  );
}

export function useCrawler() {
  const context = useContext(CrawlerContext);
  if (context === undefined) {
    throw new Error("useCrawler must be used within CrawlerProvider");
  }
  return context;
}
