import React, { useState, useEffect } from "react";
import type {
  HelpArticle,
  HelpMission,
  EchoHelpAnswer,
} from "@shared/echo/help/types";

type TabId = "ask" | "search" | "missions";

export interface EchoHelpOrbProps {
  defaultMode?: TabId;
  showMissions?: boolean;
  showSearch?: boolean;
  showAskEcho?: boolean;
  allowedModules?: string[];
  module?: string;
  route?: string;
  role?: string;
  userId?: string;
}

const EchoHelpOrb: React.FC<EchoHelpOrbProps> = ({
  defaultMode = "ask",
  showAskEcho = true,
  showSearch = true,
  showMissions = true,
  allowedModules,
  module,
  route,
  role,
  userId,
}) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabId>(defaultMode);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<HelpArticle[]>([]);
  const [missions, setMissions] = useState<HelpMission[]>([]);
  const [answer, setAnswer] = useState<EchoHelpAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const effectiveModule = module ?? "global";

  const isModuleAllowed =
    !allowedModules ||
    allowedModules.length === 0 ||
    allowedModules.includes(effectiveModule);

  // Listen for program start event
  useEffect(() => {
    const handleProgramStart = (event: any) => {
      const { programId, program, mode } = event.detail;
      if (mode === "missions" || true) {
        // Open orb and show missions when program starts
        setOpen(true);
        setTab("missions");
      }
    };

    window.addEventListener("echo-help:start-program", handleProgramStart);
    return () =>
      window.removeEventListener("echo-help:start-program", handleProgramStart);
  }, []);

  useEffect(() => {
    if (!open || !showMissions || !isModuleAllowed) return;

    const fetchMissions = async () => {
      try {
        const params = new URLSearchParams();
        params.set("module", effectiveModule);
        if (role) params.set("role", role);
        if (userId) params.set("userId", userId);
        if (route) params.set("route", route);

        const res = await fetch(`/api/help/mission?${params.toString()}`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setMissions(data.missions || []);
      } catch (err) {
        console.error("[EchoHelpOrb] Failed to load missions:", err);
      }
    };

    fetchMissions();
  }, [
    open,
    showMissions,
    effectiveModule,
    role,
    userId,
    route,
    isModuleAllowed,
  ]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    setAnswer(null);

    try {
      const params = new URLSearchParams();
      params.set("q", query);
      params.set("module", effectiveModule);
      if (role) params.set("role", role);
      if (userId) params.set("userId", userId);
      if (route) params.set("route", route);

      const res = await fetch(`/api/help/search?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSearchResults(data.articles || []);
    } catch (err) {
      console.error("[EchoHelpOrb] Search error:", err);
      setErrorMsg("I couldn't search the knowledge base right now.");
    } finally {
      setLoading(false);
    }
  };

  const handleAskEcho = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    setAnswer(null);
    setSearchResults([]);

    try {
      const res = await fetch("/api/help/ask-echo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: query,
          module: effectiveModule,
          role,
          route,
          userId,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as EchoHelpAnswer;
      setAnswer(data);
    } catch (err) {
      console.error("[EchoHelpOrb] Ask Echo error:", err);
      setErrorMsg("Echo couldn't answer right now. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  if (!isModuleAllowed) return null;

  return (
    <>
      {/* Orb button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-[9999] h-12 w-12 rounded-full shadow-lg bg-gradient-to-br from-card to-card text-foreground flex items-center justify-center hover:scale-105 transition-transform border border-border"
        aria-label="Open Echo Help"
      >
        <span className="text-xl font-semibold">?</span>
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-4 z-[9999] w-[340px] max-h-[70vh] rounded-2xl shadow-2xl bg-card/95 text-foreground flex flex-col overflow-hidden border border-border">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/80 flex items-center justify-center text-sm font-bold text-primary-foreground">
                E
              </div>
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Echo Help
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {effectiveModule.toUpperCase()}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border text-xs">
            {showAskEcho && (
              <button
                onClick={() => setTab("ask")}
                className={`flex-1 px-2 py-1 ${
                  tab === "ask"
                    ? "bg-muted text-primary"
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                Ask Echo
              </button>
            )}
            {showSearch && (
              <button
                onClick={() => setTab("search")}
                className={`flex-1 px-2 py-1 ${
                  tab === "search"
                    ? "bg-muted text-primary"
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                Search KB
              </button>
            )}
            {showMissions && (
              <button
                onClick={() => setTab("missions")}
                className={`flex-1 px-2 py-1 ${
                  tab === "missions"
                    ? "bg-muted text-primary"
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                Missions
              </button>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto text-xs px-3 py-2 space-y-2">
            {(tab === "ask" || tab === "search") && (
              <>
                <div className="flex gap-1">
                  <input
                    type="text"
                    className="flex-1 rounded-md bg-background/60 px-2 py-1 text-xs outline-none border border-border focus:border-primary text-foreground placeholder:text-muted-foreground"
                    placeholder={
                      tab === "ask"
                        ? "Ask Echo anything…"
                        : "Search the knowledge base…"
                    }
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        tab === "ask" ? handleAskEcho() : handleSearch();
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={loading}
                    onClick={tab === "ask" ? handleAskEcho : handleSearch}
                    className="px-2 py-1 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    Go
                  </button>
                </div>
                {loading && (
                  <div className="text-[11px] text-muted-foreground">
                    Echo is thinking…
                  </div>
                )}
                {errorMsg && (
                  <div className="text-[11px] text-red-400">{errorMsg}</div>
                )}
              </>
            )}

            {tab === "ask" && answer && (
              <div className="mt-2 space-y-2">
                <div className="text-[11px] text-muted-foreground">
                  Confidence: {(answer.confidence * 100).toFixed(0)}%
                </div>
                <div className="prose prose-invert max-w-none text-xs">
                  <pre className="whitespace-pre-wrap text-xs font-sans bg-muted/50 rounded-md p-2">
                    {answer.answer}
                  </pre>
                </div>
                {answer.sourceArticles?.length > 0 && (
                  <div className="text-[10px] text-muted-foreground">
                    Sources:{" "}
                    {answer.sourceArticles.map((s) => s.title).join(", ")}
                  </div>
                )}
              </div>
            )}

            {tab === "search" && searchResults.length > 0 && (
              <div className="mt-2 space-y-2">
                {searchResults.map((article) => (
                  <div
                    key={article.id}
                    className="border border-border rounded-md p-2 bg-card/60"
                  >
                    <div className="font-semibold text-[11px]">
                      {article.title}
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-3">
                      {article.body}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "missions" && (
              <div className="mt-1 space-y-2">
                {missions.length === 0 && (
                  <div className="text-[11px] text-muted-foreground">
                    No missions available yet for this module.
                  </div>
                )}
                {missions.map((m) => (
                  <div
                    key={m.id}
                    className="border border-border rounded-md p-2 bg-card/60"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-[11px]">{m.title}</div>
                      <span className="text-[10px] text-muted-foreground">
                        {m.difficulty}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-3">
                      {m.description}
                    </div>
                    <button
                      type="button"
                      className="mt-1 text-[10px] text-primary hover:opacity-80 underline"
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent("echo-help:start-mission", {
                            detail: {
                              missionId: m.id,
                              module: effectiveModule,
                            },
                          }),
                        );
                      }}
                    >
                      Start mission
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default EchoHelpOrb;
