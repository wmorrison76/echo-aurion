import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Load help docs at build time (markdown/txt)
const helpFiles = import.meta.glob("/docs/**/*.{md,txt}?raw", {
  eager: true,
  import: "default",
}) as Record<string, string>;

type Article = {
  id: string;
  path: string;
  title: string;
  text: string;
  devOnly: boolean;
};

function buildIndex(role: string): Article[] {
  const out: Article[] = [];
  for (const [p, raw] of Object.entries(helpFiles)) {
    const text = String(raw || "");
    const firstLine = text.split(/\r?\n/)[0] || "";
    const title =
      firstLine.replace(/^#\s*/, "").trim() || p.split("/").pop() || "Untitled";
    const devOnly =
      /\/dev\//i.test(p) || /\b(DEVELOPER|INTERNAL)\b/i.test(title);
    if (devOnly && role === "viewer") continue;
    out.push({ id: p, path: p, title, text, devOnly });
  }
  return out.sort((a, b) => a.title.localeCompare(b.title));
}

export default function HelpDesk() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [role, setRole] = useState<string>(
    () => localStorage.getItem("studio.role") || "viewer",
  );
  useEffect(() => {
    const onStorage = () =>
      setRole(localStorage.getItem("studio.role") || "viewer");
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const articles = useMemo(() => buildIndex(role), [role]);
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return articles;
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(t) || a.text.toLowerCase().includes(t),
    );
  }, [q, articles]);
  const active = results.find((a) => a.id === sel) || results[0];

  function askEcho() {
    const prompt = q || (active ? `Explain: ${active.title}` : "Help me");
    try {
      window.dispatchEvent(new CustomEvent("echo:ask", { detail: { prompt } }));
    } catch {}
    setOpen(false);
  }
  function startGuide() {
    const steps = [
      { selector: "header", text: "This is the site header" },
      {
        selector: '[data-loc="client/components/site/MenuBar.tsx:17:5"] , nav',
        text: "Use the menu to navigate",
      },
      { selector: "#root", text: "Main content lives here" },
    ];
    try {
      window.dispatchEvent(
        new CustomEvent("guide:start", { detail: { steps } }),
      );
    } catch {}
    setOpen(false);
  }

  return (
    <>
      <button
        aria-label="Help & Support"
        onClick={() => setOpen(true)}
        className="rounded-full border bg-background/80 px-2 py-1 text-xs hover:bg-accent/50"
        title="Help & Support"
      >
        💡
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Help & Support</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-3 text-xs">
            <div className="md:col-span-1 space-y-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search help…"
                className="w-full rounded border bg-background px-2 py-1"
              />
              <div className="max-h-72 overflow-auto border rounded">
                {results.length === 0 && (
                  <div className="p-2 text-muted-foreground">No results</div>
                )}
                {results.map((a) => (
                  <button
                    key={a.id}
                    className={
                      (sel === a.id ? "bg-accent/40 " : "") +
                      "block w-full text-left px-2 py-1 hover:bg-accent/30"
                    }
                    onClick={() => setSel(a.id)}
                  >
                    {a.title}
                    {a.devOnly && (
                      <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-amber-600/20 text-amber-700 dark:text-amber-300">
                        dev
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="default" size="sm" onClick={askEcho}>
                  Ask Echo AI
                </Button>
                <Button variant="outline" size="sm" onClick={startGuide}>
                  Start guided steps
                </Button>
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="text-[11.5px] whitespace-pre-wrap leading-5 rounded border bg-muted/20 p-2 max-h-80 overflow-auto">
                {active ? active.text : "Select a help article on the left."}
              </div>
              <div className="mt-2 text-muted-foreground">
                Role: {role}. Developer-only articles are hidden from end users.
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
