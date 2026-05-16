import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/glass";

interface SearchResult {
  id: string;
  title: string;
  type: "module" | "recipe" | "staff";
  icon: string;
}

export function QuickSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchResults = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/quick-search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults((data.results ?? []).map((r: { id: string; title: string; type: string; icon: string }) => ({
        id: r.id,
        title: r.title,
        type: r.type as SearchResult["type"],
        icon: r.icon ?? "📌",
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchResults(searchQuery);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, fetchResults]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      inputRef.current?.focus();
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleResultClick = (result: SearchResult) => {
    if (result.type === "module") {
      window.dispatchEvent(
        new CustomEvent("open-panel", { detail: { id: result.id } })
      );
    } else {
      // For recipes and staff, you could open relevant modules
      if (result.type === "recipe") {
        window.dispatchEvent(
          new CustomEvent("open-panel", { detail: { id: "culinary" } })
        );
      } else if (result.type === "staff") {
        window.dispatchEvent(
          new CustomEvent("open-panel", { detail: { id: "schedule" } })
        );
      }
    }
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div ref={searchRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-7 w-7 rounded flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-primary/15 transition-colors flex-shrink-0"
        title="Quick Search"
      >
        <Search size={14} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-80 bg-background/95 backdrop-blur-sm border border-border/30 rounded-lg shadow-xl z-50">
          {/* Search Input */}
          <div className="p-3 border-b border-border/30">
            <div className="flex items-center gap-2 bg-background rounded-lg border border-border/30 px-3 py-2">
              <Search size={16} className="text-foreground/60" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search modules, recipes, staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder-foreground/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-foreground/60 hover:text-foreground"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          {searchQuery && (
            <div className="max-h-80 overflow-y-auto">
              {loading && (
                <div className="flex items-center justify-center gap-2 py-4 text-foreground/60 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Searching…
                </div>
              )}
              {error && !loading && (
                <div className="p-4 text-center text-sm text-destructive">{error}</div>
              )}
              {!loading && !error && results.length > 0 ? (
                <div className="divide-y divide-border/30">
                  {results.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className="w-full px-4 py-3 text-left hover:bg-primary/10 transition-colors flex items-center gap-3 text-sm"
                    >
                      <span className="text-lg">{result.icon}</span>
                      <div className="flex-1">
                        <div className="font-medium text-foreground">
                          {result.title}
                        </div>
                        <div className="text-xs text-foreground/60 capitalize">
                          {result.type}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : !loading && !error ? (
                <div className="p-4 text-center text-sm text-foreground/60">
                  No results found
                </div>
              ) : null}
            </div>
          )}

          {/* Empty State */}
          {!searchQuery && (
            <div className="p-4">
              <p className="text-xs text-foreground/60">
                Search for modules, recipes, or staff members
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
