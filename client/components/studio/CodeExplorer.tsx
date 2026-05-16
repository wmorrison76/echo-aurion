import { useEffect, useMemo, useState, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import MonacoCodeEditor, { EditorRefApi } from "./MonacoCodeEditor";

type ExplorerProps = {
  filesOverride?: Record<string, string>;
  onActiveChange?: (path: string) => void;
  showPreview?: boolean;
  autoOpenFirst?: boolean;
  editablePaths?: string[];
  unlockDurationMs?: number;
  onOpenGithub?: () => void;
  initialActivePath?: string | null;
};

export default function CodeExplorer({
  filesOverride,
  onActiveChange,
  showPreview,
  autoOpenFirst = true,
  editablePaths = [],
  unlockDurationMs = 10 * 60 * 1000,
  onOpenGithub,
  initialActivePath = null,
}: ExplorerProps = {}) {
  const panelFrame = "rounded-2xl border border-primary/25 bg-background/60 shadow-[0_28px_65px_rgba(15,118,255,0.18)] backdrop-blur-md";
  const baseFiles = useMemo(() => {
    const a = import.meta.glob(
      [
        "/client/**/*.{ts,tsx,js,jsx,css,md,json}",
        "/shared/**/*.{ts,tsx,js,jsx,css,md,json}",
        "/server/**/*.{ts,tsx,js,jsx,css,md,json}",
        "/{README.md,readme.md,package.json,tsconfig.json,tailwind.config.ts,postcss.config.js,netlify.toml,vite.config.ts,vite.config.server.ts,index.html}",
      ],
      { eager: true, query: "?raw", import: "default" },
    ) as Record<string, string>;
    const entries = Object.entries(a).filter(
      ([p]) => !/\.(map|lock|png|jpg|jpeg|gif|svg|webp)$/i.test(p),
    );
    return Object.fromEntries(entries);
  }, []);

  const files = useMemo(() => {
    if (!filesOverride) return baseFiles;
    return { ...baseFiles, ...filesOverride };
  }, [baseFiles, filesOverride]);

  type Node = { name: string; path: string; children?: Node[]; file?: boolean };
  const tree = useMemo<Node>(() => {
    const root: Node = { name: "root", path: "/", children: [] };
    for (const p of Object.keys(files)) {
      const parts = p.replace(/^\//, "").split("/");
      let cur = root;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;
        let next = cur.children!.find((n) => n.name === part);
        if (!next) {
          next = {
            name: part,
            path: "/" + parts.slice(0, i + 1).join("/"),
            children: [],
            file: isFile,
          };
          cur.children!.push(next);
        }
        cur = next;
        if (isFile) cur.file = true;
      }
    }
    const sort = (n: Node) => {
      if (!n.children) return;
      n.children.sort(
        (a, b) =>
          (a.file ? 1 : 0) - (b.file ? 1 : 0) || a.name.localeCompare(b.name),
      );
      n.children.forEach(sort);
    };
    sort(root);
    return root;
  }, [files]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "/client": true,
    "/client/projects": true,
    "/shared": true,
    "/server": true,
  });
  const [tabs, setTabs] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>("");
  const [filter, setFilter] = useState<string>("");
  const [menu, setMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    path: string | null;
    kind: "file" | "dir";
  }>({ open: false, x: 0, y: 0, path: null, kind: "file" });

  const readStoredNumber = (key: string, fallback: number) => {
    if (typeof window === "undefined") return fallback;
    try {
      const stored = window.localStorage.getItem(key);
      if (!stored) return fallback;
      const parsed = parseInt(stored, 10);
      return Number.isFinite(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  };

  const readStoredFlag = (key: string, fallback: boolean) => {
    if (typeof window === "undefined") return fallback;
    try {
      const stored = window.localStorage.getItem(key);
      if (stored === null) return fallback;
      return stored !== "off";
    } catch {
      return fallback;
    }
  };

  const readStoredString = (key: string, fallback: string) => {
    if (typeof window === "undefined") return fallback;
    try {
      const stored = window.localStorage.getItem(key);
      return stored ?? fallback;
    } catch {
      return fallback;
    }
  };

  const [sidebarW, setSidebarW] = useState<number>(() => readStoredNumber("code.sidebarW", 220));
  const dragRef = useRef<HTMLDivElement | null>(null);
  const [unlockUntil, setUnlockUntil] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    try {
      const stored = window.localStorage.getItem("code.unlock.until");
      const parsed = stored ? parseInt(stored, 10) : 0;
      return Number.isFinite(parsed) ? parsed : 0;
    } catch {
      return 0;
    }
  });
  const editorRef = useRef<EditorRefApi | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [showMinimap, setShowMinimap] = useState<boolean>(() => readStoredFlag("code.minimap", true));
  const [showOutline, setShowOutline] = useState(false);
  const [outline, setOutline] = useState<{name:string; line:number}[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<{path:string; line:number; column:number; preview:string}[]>([]);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [problemsOpen, setProblemsOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [markers, setMarkers] = useState<any[]>([]);
  const [cursor, setCursor] = useState<{line:number; col:number; sel:number}>({ line: 1, col: 1, sel: 0 });
  const [termHistory, setTermHistory] = useState<{role:"user"|"assistant"; text:string; time:number}[]>([]);
  const [termInput, setTermInput] = useState("");
  const [termBusy, setTermBusy] = useState(false);
  const [logTail, setLogTail] = useState<string[]>([]);

  const commands = useMemo(()=>[
    { id:"format", name:"Format document", run: async ()=> { await editorRef.current?.format(); }},
    { id:"toggleMinimap", name:"Toggle minimap", run: ()=> setShowMinimap(v=>!v)},
    { id:"toggleDiff", name:"Toggle diff view", run: ()=> setShowDiff(v=>!v)},
    { id:"toggleOutline", name:"Toggle outline", run: ()=> setShowOutline(v=>!v)},
    { id:"find", name:"Find in file", run: ()=> editorRef.current?.getEditor()?.trigger("kb","actions.find",{})},
    { id:"replace", name:"Replace in file", run: ()=> editorRef.current?.getEditor()?.trigger("kb","editor.action.startFindReplaceAction",{})},
    { id:"rename", name:"Rename symbol", run: ()=> editorRef.current?.getEditor()?.trigger("kb","editor.action.rename",{})},
    { id:"searchProject", name:"Search in project", run: ()=> setSearchOpen(true)},
  ],[]);
  const filteredCmds = useMemo(()=>{
    const q = cmdQuery.trim().toLowerCase();
    if(!q) return commands;
    return commands.filter(c=> c.name.toLowerCase().includes(q));
  },[cmdQuery, commands]);
  useEffect(()=>{
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') { e.preventDefault(); setCmdOpen(true); setTimeout(()=> { const el = document.getElementById('cmd-input'); (el as HTMLInputElement|undefined)?.focus(); }, 10);} }
    window.addEventListener('keydown', onKey as any);
    return ()=> window.removeEventListener('keydown', onKey as any);
  },[]);

  useEffect(() => {
    if (!searchOpen) return;
    const q = searchQ.trim();
    const h = setTimeout(async () => {
      if (q.length < 2) { setSearchResults([]); return; }
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const j = await r.json();
        if (r.ok) setSearchResults(j.results || []);
      } catch {}
    }, 300);
    return () => clearTimeout(h);
  }, [searchQ, searchOpen]);

  // Track Monaco diagnostics and cursor for status bar
  useEffect(() => {
    const m = editorRef.current?.getMonaco();
    const ed = editorRef.current?.getEditor();
    const model = editorRef.current?.getModel();
    if (!m || !ed || !model) return;
    function updateMarkers() {
      try {
        const arr = m.editor.getModelMarkers({ resource: model.uri });
        setMarkers(arr || []);
      } catch {}
    }
    updateMarkers();
    const subMk = m.editor.onDidChangeMarkers(() => updateMarkers());
    const subPos = ed.onDidChangeCursorPosition((e) => setCursor((c)=>({ ...c, line: e.position.lineNumber, col: e.position.column })));
    const subSel = ed.onDidChangeCursorSelection((e) => {
      const text = ed.getModel()?.getValueInRange(e.selection) || "";
      setCursor((c)=> ({ ...c, sel: text.length }));
    });
    return () => { subMk.dispose(); subPos.dispose(); subSel.dispose(); };
  }, [active, editing, showDiff]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("code.sidebarW", String(sidebarW));
    } catch {}
  }, [sidebarW]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("code.minimap", showMinimap ? "on" : "off");
    } catch {}
  }, [showMinimap]);

  // Poll logs when terminal open
  useEffect(() => {
    if (!terminalOpen) return;
    let mounted = true;
    const load = async () => {
      try {
        const r = await fetch("/api/logs/search");
        const j = await r.json().catch(() => ({}));
        if (mounted && r.ok) setLogTail(j.results || []);
      } catch {}
    };
    load();
    const t = setInterval(load, 3000);
    return () => { mounted = false; clearInterval(t); };
  }, [terminalOpen]);

  function isArchived(p: string) {
    return /\/(client|shared|server)\/unused\//.test(p);
  }
  function archiveDest(p: string) {
    const m = p.match(/^\/(client|shared|server)\/(.*)$/);
    if (!m) return null;
    const base = m[1],
      rest = m[2];
    if (isArchived(p)) return `/${base}/${rest.replace(/^unused\//, "")}`;
    return `/${base}/unused/${rest}`;
  }

  function buildOutline(src: string, path: string): { name: string; line: number }[] {
    const lang = (path.split(".").pop() || "").toLowerCase();
    const lines = src.split(/\r?\n/);
    const out: { name: string; line: number }[] = [];
    const push = (name: string, line: number) => out.push({ name, line });
    if (["ts", "tsx", "js", "jsx"].includes(lang)) {
      lines.forEach((ln, i) => {
        let m;
        if ((m = ln.match(/\bfunction\s+([A-Za-z0-9_]+)/))) push(`fn ${m[1]}`, i + 1);
        if ((m = ln.match(/\bclass\s+([A-Za-z0-9_]+)/))) push(`class ${m[1]}`, i + 1);
        if ((m = ln.match(/\binterface\s+([A-Za-z0-9_]+)/))) push(`interface ${m[1]}`, i + 1);
        if ((m = ln.match(/\btype\s+([A-Za-z0-9_]+)/))) push(`type ${m[1]}`, i + 1);
        if ((m = ln.match(/\bconst\s+([A-Za-z0-9_]+)\s*=\s*\(/))) push(`const ${m[1]}()`, i + 1);
        if ((m = ln.match(/\bconst\s+([A-Za-z0-9_]+)\s*=\s*async\s*\(/))) push(`const ${m[1]}()`, i + 1);
        if ((m = ln.match(/\bexport\s+default\b/))) push("export default", i + 1);
      });
    } else if (["css", "scss", "less"].includes(lang)) {
      lines.forEach((ln, i) => {
        const m = ln.match(/^(\.|#)?([A-Za-z0-9_-]+)\s*\{/);
        if (m) push(`${m[1] || ""}${m[2]}`, i + 1);
      });
    } else if (["html", "htm", "md", "markdown"].includes(lang)) {
      lines.forEach((ln, i) => {
        let m;
        if ((m = ln.match(/^\s*<h([1-6])[^>]*>(.*?)<\/h\1>/i))) push(`${"#".repeat(parseInt(m[1], 10))} ${m[2].replace(/<[^>]+>/g, "").trim()}`, i + 1);
        if ((m = ln.match(/^\s*#+\s+(.*)/))) push(m[0], i + 1);
      });
    }
    return out.slice(0, 200);
  }

  useEffect(() => {
    // Prefer explicit initialActivePath if provided and exists
    if (!active && initialActivePath && files[initialActivePath]) {
      const p = initialActivePath;
      setTabs((prev) => (prev.includes(p) ? prev : [p, ...prev]));
      setActive(p);
      setEditing(false);
      setDraft(files[p] || "");
      onActiveChange?.(p);
      return;
    }
    if (autoOpenFirst && !active) {
      const keys = Object.keys(files);
      if (keys.length > 0) {
        let first = keys[0];
        const preferred = ["/client/projects/Playground.tsx", ...editablePaths];
        for (const p of preferred) {
          if (files[p]) { first = p; break; }
        }
        setTabs((prev)=> prev.includes(first) ? prev : [first, ...prev]);
        setActive(first);
        setEditing(false);
        setDraft(files[first] || "");
        onActiveChange?.(first);
      }
    }
  }, [files, autoOpenFirst, editablePaths, initialActivePath]);
  useEffect(() => {
    const onClick = () => setMenu((m) => ({ ...m, open: false }));
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  function toggle(path: string) {
    setExpanded((e) => ({ ...e, [path]: !e[path] }));
  }
  function canEdit(path: string | null): boolean {
    if (!path) return false;
    if (editablePaths.includes(path)) return true;
    return Date.now() < unlockUntil;
  }
  async function requestUnlock(): Promise<boolean> {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Editing protected files can impact the running workspace. Enable edits for the next session?",
      );
      if (!confirmed) return false;
    }
    const until = Date.now() + unlockDurationMs;
    setUnlockUntil(until);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("code.unlock.until", String(until));
      }
    } catch {}
    try {
      await fetch("/api/logs/append", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line: `[UNLOCK] until=${new Date(until).toISOString()}` }),
      });
    } catch {}
    const minutes = Math.max(Math.round(unlockDurationMs / 60000), 1);
    toast({
      title: "Editing enabled",
      description: `Protected files are editable for the next ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    });
    return true;
  }
  function openFile(path: string) {
    setTabs((t) => (t.includes(path) ? t : [...t, path]));
    setActive(path);
    onActiveChange?.(path);
    if (path !== active) {
      setEditing(false);
      setDraft(files[path] || "");
    } else if (!editing) {
      setDraft(files[path] || "");
    }
  }
  function closeTab(path: string) {
    setTabs((t) => t.filter((p) => p !== path));
    if (active === path) {
      setActive((prev) => {
        const next = tabs.find((p) => p !== path) ?? null;
        return next;
      });
    }
  }

  // Connections panel state
  const [connOpen, setConnOpen] = useState(false);
  const [connFor, setConnFor] = useState<string | null>(null);
  const [importsOf, setImportsOf] = useState<string[]>([]);
  const [importedBy, setImportedBy] = useState<string[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [intentOpen, setIntentOpen] = useState(false);
  const [intentFor, setIntentFor] = useState<string | null>(null);
  const [intentText, setIntentText] = useState<string>("");
  const [scanOpen, setScanOpen] = useState(false);
  const [scanFor, setScanFor] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<"green" | "yellow" | "red">(
    "green",
  );
  const [scanText, setScanText] = useState<string>("");

  function resolveSpec(from: string, spec: string): string | null {
    const baseDir =
      "/" + from.replace(/^\//, "").split("/").slice(0, -1).join("/");
    const join = (a: string, b: string) =>
      a.replace(/\/$/, "") + "/" + b.replace(/^\//, "");
    let target = spec;
    if (spec.startsWith("@/")) target = "/client/" + spec.slice(2);
    else if (spec.startsWith("@shared/")) target = "/shared/" + spec.slice(8);
    else if (spec.startsWith("./") || spec.startsWith("../"))
      target = join(baseDir, spec);
    else if (spec.startsWith("/")) target = spec;
    else return null; // external package

    const candidates = [
      target,
      target + ".ts",
      target + ".tsx",
      target + ".js",
      target + ".jsx",
      target + ".json",
      join(target, "index.tsx"),
      join(target, "index.ts"),
      join(target, "index.js"),
      join(target, "index.jsx"),
    ];
    for (const c of candidates) {
      if (files[c]) return c;
    }
    return null;
  }

  function analyzeConnections(path: string) {
    const src = files[path] || "";
    const specs = new Set<string>();
    const importRe =
      /(?:import\s+[^'";]+from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)|export\s+[^'";]+from\s*['"]([^'"]+)['"]).*/g;
    for (const m of src.matchAll(importRe)) {
      const spec = m[1] || m[2] || m[3] || m[4];
      const resolved = resolveSpec(path, spec);
      if (resolved) specs.add(resolved);
    }
    const outImports = [...specs].sort();

    const incoming: string[] = [];
    for (const [p, text] of Object.entries(files)) {
      if (p === path) continue;
      for (const m of text.matchAll(importRe)) {
        const res = resolveSpec(p, m[1] || m[2] || m[3] || m[4]);
        if (res === path) {
          incoming.push(p);
          break;
        }
      }
    }
    const outImportedBy = incoming.sort();

    setImportsOf(outImports);
    setImportedBy(outImportedBy);

    const toExpand = new Set<string>();
    function addParents(p: string) {
      const parts = p.replace(/^\//, "").split("/");
      for (let i = 1; i < parts.length; i++) {
        toExpand.add("/" + parts.slice(0, i).join("/"));
      }
    }
    addParents(path);
    outImports.forEach(addParents);
    outImportedBy.forEach(addParents);
    setExpanded((e) => ({
      ...e,
      ...Object.fromEntries([...toExpand].map((p) => [p, true])),
    }));
  }

  function summarize(path: string) {
    const src = files[path] || "";
    const first = (
      src.split(/\r?\n/).find((l) => l.trim().length > 0) || ""
    ).slice(0, 200);
    const exp =
      src.match(/export\s+default\s+function\s+(\w+)/)?.[1] ||
      src.match(/export\s+function\s+(\w+)/)?.[1] ||
      "";
    setSummary(
      [exp ? `Exports: ${exp}` : "", first ? `First: ${first}` : ""]
        .filter(Boolean)
        .join(" • "),
    );
  }
  function inferIntent(path: string, text: string): string {
    const p = path.toLowerCase();
    if (/(\.md|markdown|txt)$/.test(p)) return "Documentation/readme";
    if (p.endsWith(".sh")) return "CLI script";
    if (p.includes("/server/") || /\.cjs$/.test(p)) {
      if (
        p.includes("/routes/") ||
        p.endsWith("index.cjs") ||
        p.endsWith("index.ts") ||
        p.endsWith("index.js")
      )
        return "Server route or entry";
      return "Server library";
    }
    if (/(\.tsx|jsx)$/.test(p)) return "Frontend component";
    if (/(\.ts|js|json)$/.test(p)) return "Utility/config";
    return "Other";
  }
  function showIntent(path: string) {
    const src = files[path] || "";
    const role = inferIntent(path, src);
    const first = src.split(/\r?\n/).slice(0, 40).join("\n").slice(0, 2000);
    setIntentFor(path);
    setIntentText(`Intent: ${role}\n\nPreview:\n` + first);
    setIntentOpen(true);
  }
  function isBinary(str: string): boolean {
    if (!str) return false;
    let nonPrintable = 0;
    const len = Math.min(str.length, 2000);
    for (let i = 0; i < len; i++) {
      const c = str.charCodeAt(i);
      if (c === 65533 || c <= 8) {
        nonPrintable++;
      }
    }
    return nonPrintable / Math.max(1, len) > 0.02;
  }
  function scanOne(path: string) {
    const src = files[path] || "";
    const p = path.toLowerCase();
    const issues: { severity: "red" | "yellow"; reason: string }[] = [];
    const add = (severity: "red" | "yellow", reason: string) =>
      issues.push({ severity, reason });
    if (/(\.exe|\.dll|\.dylib|\.so|\.bin)$/.test(p))
      add("red", "Binary/executable file");
    if (isBinary(src)) add("red", "File appears binary");
    if (p.endsWith(".sh")) {
      if (
        /(rm\s+-rf\s+\/?\w+|curl\s+[^\n]+\|\s*sh|wget\s+[^\n]+\|\s*sh|dd\s+if=|mkfs\.|:\(\)\{:\|:&\};:)/.test(
          src,
        )
      )
        add("red", "Dangerous shell command");
    }
    if (/(\.js|ts|jsx|tsx)$/.test(p)) {
      if (/child_process\.(exec|spawn)/.test(src) && /(curl|wget)/.test(src))
        add("red", "Downloads and executes via child_process");
      if (
        /eval\s*\(/.test(src) &&
        /(atob|Buffer\.from\([^,]+,'base64')/.test(src)
      )
        add("yellow", "Obfuscated eval");
      if (/new\s+Function\s*\(/.test(src))
        add("yellow", "Dynamic code generation");
      if (/http:\/\//.test(src) && /(fetch|axios|request|curl)/.test(src))
        add("yellow", "Uses insecure HTTP");
      if (
        /crypto\.(createCipher|createDecipher)/.test(src) ||
        /md5\(/i.test(src)
      )
        add("yellow", "Weak/legacy crypto");
    }
    if (p.endsWith("package.json")) {
      try {
        const pkg = JSON.parse(src);
        const scripts = pkg.scripts || {};
        const bad = ["preinstall", "install", "postinstall"];
        for (const k of bad) {
          const v = scripts[k];
          if (typeof v === "string" && /(curl|wget).+\|\s*sh/.test(v))
            add("red", `Suspicious ${k} script`);
        }
      } catch {}
    }
    const severe = issues.filter((i) => i.severity === "red").length;
    const warnings = issues.filter((i) => i.severity === "yellow").length;
    const status: "green" | "yellow" | "red" =
      severe > 0 ? "red" : warnings > 0 ? "yellow" : "green";
    setScanFor(path);
    setScanStatus(status);
    const list = issues
      .map((i) => `- [${i.severity.toUpperCase()}] ${i.reason}`)
      .join("\n");
    setScanText(
      `Status: ${status.toUpperCase()}\nIssues: ${issues.length}` +
        (list ? `\n\n${list}` : "\n\nNo issues found."),
    );
    setScanOpen(true);
  }

  function showConnections(path: string) {
    setConnFor(path);
    analyzeConnections(path);
    summarize(path);
    setConnOpen(true);
  }

  // Echo control hooks: open files and show connections from voice commands
  useEffect(() => {
    const onOpen = (e: any) => {
      const p = e?.detail?.path;
      if (typeof p === "string" && files[p]) openFile(p);
    };
    const onConn = (e: any) => {
      const p = e?.detail?.path;
      if (typeof p === "string" && files[p]) showConnections(p);
    };
    window.addEventListener("code:open", onOpen as any);
    window.addEventListener("code:connections", onConn as any);
    return () => {
      window.removeEventListener("code:open", onOpen as any);
      window.removeEventListener("code:connections", onConn as any);
    };
  }, [files]);

  function renderNode(n: Node, depth = 0): JSX.Element | null {
    if (!n.children || n.name === "root")
      return (
        <div key={n.path} className="space-y-1">
          {n.children?.map((c) => renderNode(c, depth))}
        </div>
      );
    const isFile = !!n.file && (!n.children || n.children.length === 0);
    if (isFile) {
      const isImport = importsOf.includes(n.path);
      const isImportedBy = importedBy.includes(n.path);
      const isAnchor = connFor === n.path;
      const cls = cn(
        "w-full text-left rounded-md border border-transparent px-2 py-1 transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary",
        connOpen &&
          (isAnchor
            ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 font-semibold"
            : isImportedBy
              ? "bg-red-50 dark:bg-red-950/30 text-red-600 font-semibold"
              : isImport
                ? "bg-green-50 dark:bg-green-950/30 text-green-600"
                : ""),
      );
      const archived = isArchived(n.path);
      const extra = archived ? "text-yellow-500" : undefined;
      return (
        <div key={n.path} className="pl-4 text-sm">
          <button
            className={cn(cls, extra)}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", n.path);
            }}
            onClick={() => openFile(n.path)}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu({
                open: true,
                x: e.clientX,
                y: e.clientY,
                path: n.path,
                kind: "file",
              });
            }}
            title="Right‑click for menu"
          >
            {n.name}
          </button>
        </div>
      );
    }
    const isOpen = !!expanded[n.path];
    return (
      <div
        key={n.path}
        className="text-sm"
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={async (e) => {
          e.preventDefault();
          const src = e.dataTransfer.getData("text/plain");
          if (!src || src === n.path) return;
          const dest = n.path + "/" + src.split("/").pop();
          const res = await fetch("/api/move-file", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              srcRelPath: src.replace(/^\//, ""),
              destRelPath: dest.replace(/^\//, ""),
            }),
          });
          if (res.ok) {
            location.reload();
          } else {
            const j = await res.json().catch(() => ({}));
            alert(j.error ? `Move failed: ${j.error}` : "Move failed");
          }
        }}
      >
        <div
          className="flex items-center gap-1 cursor-pointer select-none rounded-md px-1.5 py-1 transition-colors hover:bg-primary/10 hover:text-primary"
          onClick={() => toggle(n.path)}
          onContextMenu={(e) => {
            e.preventDefault();
            setMenu({
              open: true,
              x: e.clientX,
              y: e.clientY,
              path: n.path,
              kind: "dir",
            });
          }}
        >
          <span className="inline-block w-4">{isOpen ? "▾" : "▸"}</span>
          <span className="font-medium">{n.name}</span>
        </div>
        {isOpen && (
          <div className="pl-4 space-y-1">
            {n.children!.map((c) => renderNode(c, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  const activeSource = active ? (editing ? draft : files[active]) : "";
  const lines = useMemo(
    () => (activeSource ? activeSource.split(/\r?\n/) : []),
    [activeSource],
  );

  const matches = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return [] as string[];
    return Object.keys(files)
      .filter((p) => p.toLowerCase().includes(q))
      .sort((a, b) => a.localeCompare(b));
  }, [filter, files]);

  const errorCount = markers.filter((m) => (m.severity || 0) >= 8).length;
  const warnCount = markers.filter((m) => (m.severity || 0) === 4).length;
  const infoCount = markers.filter((m) => (m.severity || 0) === 2).length;

  async function sendTerminal() {
    const prompt = termInput.trim();
    if (!prompt) return;
    setTermHistory((h) => [...h, { role: "user", text: prompt, time: Date.now() }]);
    setTermBusy(true);
    setTermInput("");
    try {
      const r = await fetch("/api/echo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, locale: navigator.language || "en-US" }),
      });
      const j = await r.json().catch(() => ({}));
      const text = r.ok ? (j.text || "(no response)") : (j.error || "Request failed");
      setTermHistory((h) => [...h, { role: "assistant", text, time: Date.now() }]);
    } catch (e: any) {
      setTermHistory((h) => [...h, { role: "assistant", text: e?.message || String(e), time: Date.now() }]);
    } finally {
      setTermBusy(false);
    }
  }

  return (
    <>
      <div className="flex gap-4 h-[calc(100vh-96px)] min-h-[620px]">
        <aside
          className={`${panelFrame} shrink-0 overflow-auto p-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
          style={{ width: sidebarW }}
        >
          <div className="mb-2 flex items-center justify-between gap-1">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && matches.length) openFile(matches[0]);
              }}
              placeholder="Search files..."
              className="w-full rounded-md border border-primary/30 bg-background/80 px-2 py-1 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            />
            {onOpenGithub && (
              <button
                className="ml-1 shrink-0 rounded-md border border-primary/30 bg-background/80 px-2 py-1 text-xs shadow-sm transition hover:bg-primary/15"
                title="Import from GitHub"
                onClick={() => onOpenGithub?.()}
              >
                {/* simple GH mark */}
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false" className="opacity-80"><path fill="currentColor" d="M8 .2a8 8 0 0 0-2.53 15.6c.4.08.55-.17.55-.38v-1.33c-2.24.49-2.71-1.08-2.71-1.08-.36-.93-.89-1.18-.89-1.18-.73-.5.06-.49.06-.49.81.06 1.24.83 1.24.83.72 1.23 1.88.88 2.34.67.07-.52.28-.88.5-1.08-1.79-.2-3.68-.9-3.68-3.98 0-.88.31-1.6.82-2.17-.08-.2-.36-1.01.08-2.1 0 0 .67-.21 2.2.83a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.83 2.2-.83.44 1.09.16 1.9.08 2.1.51.57.82 1.29.82 2.17 0 3.09-1.9 3.78-3.71 3.98.29.25.54.74.54 1.5v2.22c0 .21.14.46.55.38A8 8 0 0 0 8 .2Z"/></svg>
              </button>
            )}
          </div>
          {filter.trim() ? (
            <div className="space-y-1">
              {matches.length === 0 && (
                <div className="text-[11px] text-muted-foreground">No matches</div>
              )}
              {matches.map((p) => (
                <div key={p} className="text-xs">
                  <button
                    className="w-full text-left rounded-md border border-transparent px-2 py-1 transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                    onClick={() => openFile(p)}
                    title={p}
                  >
                    {p.replace(/^\//, "")}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <>{renderNode(tree)}</>
          )}
        </aside>
        <div
          ref={dragRef}
          className="w-1 cursor-col-resize select-none bg-gradient-to-b from-transparent via-primary/40 to-transparent opacity-60 transition hover:opacity-100"
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startW = sidebarW;
            const onMove = (ev: MouseEvent) => {
              const dx = ev.clientX - startX;
              const next = Math.max(120, Math.min(480, startW + dx));
              setSidebarW(next);
            };
            const onUp = () => {
              window.removeEventListener("mousemove", onMove as any);
              window.removeEventListener("mouseup", onUp as any);
              try { window.localStorage.setItem("code.sidebarW", String(sidebarW)); } catch {}
            };
            window.addEventListener("mousemove", onMove as any);
            window.addEventListener("mouseup", onUp as any);
          }}
        />
        <section
          className={`${panelFrame} flex-1 min-w-0 flex flex-col`}
        >
          <div
            ref={tabsRef}
            title="Scroll with mouse wheel"
            onWheel={(e)=>{ if (tabsRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { tabsRef.current.scrollLeft += e.deltaY; e.preventDefault(); } }}
            className="flex items-center gap-2 border-b border-primary/30 bg-background/60 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shrink-0 rounded-t-2xl px-3"
          >
            {tabs.map((p) => {
              const locked = !canEdit(p);
              return (
                <div
                  key={p}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-xs whitespace-nowrap transition",
                    active === p
                      ? locked
                        ? "bg-amber-100/40 dark:bg-amber-900/20"
                        : "bg-primary/15 text-primary"
                      : "hover:bg-primary/10",
                  )}
                  title={locked ? "Protected (click lock to unlock)" : "Editable"}
                >
                  <button onClick={() => setActive(p)} className="font-medium">
                    {p.replace(/^\//, "")}
                  </button>
                  {locked && (
                    <button
                      onClick={async () => {
                        const ok = await requestUnlock();
                        if (ok) setEditing(false);
                      }}
                      className="opacity-80 hover:opacity-100"
                      title="Unlock"
                    >
                      🔒
                    </button>
                  )}
                  <button
                    onClick={() => closeTab(p)}
                    className="opacity-60 hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              );
            })}
            {tabs.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                Select a file from the tree
              </div>
            )}
          </div>
          <div className="flex-1 overflow-auto">
            {active ? (
              <>
                <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-primary/30 bg-background/85 px-3 py-2 text-[11px] text-muted-foreground backdrop-blur">
                  <div className="flex items-center gap-2">
                    {!editing ? (
                      <button
                        className="rounded border px-2 py-0.5 text-xs"
                        onClick={async () => {
                          if (!canEdit(active)) {
                            const ok = await requestUnlock();
                            if (!ok) return;
                          }
                          setEditing(true);
                          setDraft(files[active] || "");
                          try {
                            const r = await fetch("/api/zaro/snapshot", {
                              method: "POST",
                            });
                            const j = await r.json();
                            if (r.ok) {
                              toast({
                                title: "Snapshot saved",
                                description:
                                  j.snapshotPath?.replace(/^.*\//, "") || "OK",
                              });
                            }
                          } catch {}
                        }}
                      >
                        Edit
                      </button>
                    ) : (
                      <>
                        <button
                          className="rounded border px-2 py-0.5 text-xs"
                          onClick={() => setEditing(false)}
                          title="Exit edit mode"
                        >
                          Cancel
                        </button>
                        <button
                          className="rounded border px-2 py-0.5 text-xs"
                          onClick={async () => { await editorRef.current?.format(); }}
                          title="Format (Prettier)"
                        >
                          Format
                        </button>
                        <button title="Find (Ctrl/Cmd+F)" className="rounded border px-2 py-0.5 text-xs" onClick={()=> editorRef.current?.getEditor()?.trigger("keyboard","actions.find",{})}>Find</button>
                        <button title="Replace (Ctrl/Cmd+H)" className="rounded border px-2 py-0.5 text-xs" onClick={()=> editorRef.current?.getEditor()?.trigger("keyboard","editor.action.startFindReplaceAction",{})}>Replace</button>
                        <button title="Rename symbol (F2)" className="rounded border px-2 py-0.5 text-xs" onClick={()=> editorRef.current?.getEditor()?.trigger("keyboard","editor.action.rename",{})}>Rename</button>
                        <button title="Go to Definition (F12)" className="rounded border px-2 py-0.5 text-xs" onClick={()=> editorRef.current?.getEditor()?.trigger("keyboard","editor.action.revealDefinition",{})}>Go to Def</button>
                        <button title="Peek Definition (Alt+F12)" className="rounded border px-2 py-0.5 text-xs" onClick={()=> editorRef.current?.getEditor()?.trigger("keyboard","editor.action.peekDefinition",{})}>Peek</button>
                        <button title="Extract function (Refactor)" className="rounded border px-2 py-0.5 text-xs" onClick={()=> editorRef.current?.getEditor()?.trigger("keyboard","editor.action.codeAction",{ kind: "refactor.extract.function" })}>Extract</button>
                        <button title="Command Palette (Ctrl/Cmd+Shift+P)" className="rounded border px-2 py-0.5 text-xs" onClick={()=> editorRef.current?.getEditor()?.trigger("keyboard","editor.action.quickCommand",{})}>Palette</button>
                        <button title="Shortcuts" className="rounded border px-2 py-0.5 text-xs" onClick={()=> alert(`Shortcuts:\n• Multi-cursor: Alt+Click or Ctrl/Cmd+Alt+Arrow\n• Go to definition: F12\n• Peek definition: Alt+F12\n• Rename: F2\n• Find: Ctrl/Cmd+F\n• Replace: Ctrl/Cmd+H\n• Command palette: Ctrl/Cmd+Shift+P`)}>Cheatsheet</button>
                        <label className="inline-flex items-center gap-1 text-xs">
                          <input type="checkbox" checked={showMinimap} onChange={(e)=>{ setShowMinimap(e.target.checked); try{localStorage.setItem("code.minimap", e.target.checked?"on":"off");}catch{}}} />
                          Minimap
                        </label>
                        <button
                          className={"rounded border px-2 py-0.5 text-xs "+(showDiff?"bg-muted":"")}
                          onClick={() => setShowDiff((v)=>!v)}
                          title="Toggle diff view"
                        >
                          Diff
                        </button>
                        <button
                          className={"rounded border px-2 py-0.5 text-xs "+(showOutline?"bg-muted":"")}
                          onClick={()=> setShowOutline(v=>!v)}
                          title="Toggle outline"
                        >
                          Outline
                        </button>
                        <button
                          className={"rounded border px-2 py-0.5 text-xs "+(searchOpen?"bg-muted":"")}
                          onClick={()=> setSearchOpen(v=>!v)}
                          title="Project-wide search (Ctrl/Cmd+Shift+F)"
                        >
                          Search
                        </button>
                        <button
                          className={"rounded border px-2 py-0.5 text-xs "+(problemsOpen?"bg-muted":"")}
                          onClick={()=> setProblemsOpen(v=>!v)}
                          title="Problems panel"
                        >
                          Problems ({errorCount + warnCount + infoCount})
                        </button>
                        <button
                          className={"rounded border px-2 py-0.5 text-xs "+(terminalOpen?"bg-muted":"")}
                          onClick={()=> setTerminalOpen(v=>!v)}
                          title="Terminal (Echo + Logs)"
                        >
                          Terminal
                        </button>
                        <button
                          className="rounded border px-2 py-0.5 text-xs bg-primary text-primary-foreground"
                          onClick={async () => {
                            try {
                              const integ = await fetch("/api/zaro/integrity", {
                                method: "POST",
                              });
                              const ji = await integ.json().catch(() => ({}));
                              if (
                                !integ.ok ||
                                (Array.isArray(ji.changes) &&
                                  ji.changes.length > 0)
                              ) {
                                alert(
                                  "Green light required. Pending changes since snapshot.",
                                );
                                return;
                              }
                              const role = readStoredString("studio.role", "editor");
                              const adminToken = readStoredString("studio.adminToken", "");
                              const changes = [
                                {
                                  relPath: active.replace(/^\//, ""),
                                  contents: draft,
                                },
                              ];
                              const r = await fetch("/api/apply", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  "X-Role": role,
                                  ...(adminToken
                                    ? { "X-Admin-Token": adminToken }
                                    : {}),
                                },
                                body: JSON.stringify({
                                  changes,
                                  runChecks: true,
                                  message: `EchoCoder save ${active}`,
                                }),
                              });
                              const j = await r.json().catch(() => ({}));
                              if (r.ok && j.ok) {
                                toast({
                                  title: "Saved",
                                  description: `${active.replace(/^\//, "")}`,
                                });
                                location.reload();
                              } else {
                                alert(
                                  j.error
                                    ? `Save failed: ${j.error}`
                                    : "Save failed",
                                );
                              }
                            } catch (e: any) {
                              alert(e?.message || String(e));
                            }
                          }}
                        >
                          Save
                        </button>
                      </>
                    )}
                  </div>
                  <div className="ml-auto inline-flex items-center gap-3 text-muted-foreground">
                    <span title="Errors" className={errorCount?"text-red-600 dark:text-red-400":""}>E:{errorCount}</span>
                    <span title="Warnings" className={warnCount?"text-amber-600 dark:text-amber-400":""}>W:{warnCount}</span>
                    <span title="Info" className={infoCount?"text-sky-600 dark:text-sky-400":""}>I:{infoCount}</span>
                  </div>
                </div>
                {editing ? (
                  <div>
                    <div className="min-h-[420px]">
                      <MonacoCodeEditor
                        ref={editorRef as any}
                        path={active}
                        value={draft}
                        original={files[active] || ""}
                        onChange={(v)=>{ setDraft(v); if (showOutline) setOutline(buildOutline(v, active)); }}
                        minimap={showMinimap}
                        diff={showDiff}
                        allFiles={files}
                        className="h-full"
                      />
                    </div>
                    {showOutline && (
                      <div className="border-t max-h-40 overflow-auto text-[11px]">
                        <div className="px-3 py-1 font-medium">Outline</div>
                        <ul className="px-3 pb-2 space-y-1">
                          {outline.map((s,i)=> (
                            <li key={i}>
                              <button className="hover:underline" onClick={()=> editorRef.current?.reveal(s.line,1)}>{s.name} <span className="opacity-60">(L{ s.line })</span></button>
                            </li>
                          ))}
                          {outline.length===0 && <li className="text-muted-foreground">No symbols</li>}
                        </ul>
                      </div>
                    )}
                    {searchOpen && (
                      <div className="border-t max-h-56 overflow-auto text-[11px]">
                        <div className="px-3 py-1 flex items-center gap-2">
                          <input value={searchQ} onChange={(e)=> setSearchQ(e.target.value)} placeholder="Find in project…" className="rounded border bg-background px-2 py-1 text-[11px] w-72" />
                          <span className="opacity-60">{searchResults.length} results</span>
                        </div>
                        <ul className="px-3 pb-2 space-y-1">
                          {searchResults.map((r, i) => (
                            <li key={i} className="">
                              <button className="hover:underline text-left" onClick={()=>{ openFile(r.path); setTimeout(()=> editorRef.current?.reveal(r.line, r.column || 1), 50); }}>
                                <span className="font-medium">{r.path.replace(/^\//, "")}</span> <span className="opacity-60">L{r.line}</span>
                                <div className="opacity-80 truncate">{r.preview}</div>
                              </button>
                            </li>
                          ))}
                          {searchResults.length===0 && searchQ.trim().length<2 && (<li className="text-muted-foreground">Type at least 2 characters</li>)}
                        </ul>
                      </div>
                    )}
                    {problemsOpen && (
                      <div className="border-t max-h-40 overflow-auto text-[11px]">
                        <div className="px-3 py-1 font-medium">Problems</div>
                        <ul className="px-3 pb-2 space-y-1">
                          {markers.map((m,i)=> (
                            <li key={i}>
                              <button className="w-full text-left hover:underline" onClick={()=> editorRef.current?.reveal(m.startLineNumber || 1, m.startColumn || 1)}>
                                <span className={m.severity>=8?"text-red-600 dark:text-red-400": m.severity===4?"text-amber-600 dark:text-amber-400":"text-foreground"}>
                                  L{m.startLineNumber}:{m.startColumn}
                                </span>
                                <span className="ml-2">{m.message}</span>
                                {m.source && <span className="ml-2 opacity-60">[{m.source}]</span>}
                              </button>
                            </li>
                          ))}
                          {markers.length===0 && <li className="text-muted-foreground">No issues</li>}
                        </ul>
                      </div>
                    )}
                    {terminalOpen && (
                      <div className="border-t max-h-56 overflow-auto text-[11px]">
                        <div className="px-3 py-1 font-medium">Terminal</div>
                        <div className="px-3 pb-2 grid gap-3 md:grid-cols-2">
                          <div className="rounded border bg-muted/10 p-2 max-h-40 overflow-auto">
                            {termHistory.map((h,i)=> (
                              <div key={i} className={h.role==='user'?"text-foreground":"text-primary"}>
                                <span className="opacity-60">[{new Date(h.time).toLocaleTimeString()}]</span> {h.text}
                              </div>
                            ))}
                            {termHistory.length===0 && <div className="text-muted-foreground">Type a prompt below and press Send.</div>}
                          </div>
                          <div className="rounded border bg-muted/10 p-2 max-h-40 overflow-auto">
                            {logTail.map((ln,i)=> <div key={i} className="opacity-90">{ln}</div>)}
                            {logTail.length===0 && <div className="text-muted-foreground">Logs will appear here.</div>}
                          </div>
                        </div>
                        <div className="px-3 pb-2 flex items-center gap-2">
                          <input value={termInput} onChange={(e)=> setTermInput(e.target.value)} onKeyDown={(e)=> { if(e.key==='Enter') sendTerminal(); }} placeholder="Type a prompt…" className="flex-1 rounded border bg-background px-2 py-1" />
                          <button disabled={termBusy} className="rounded border px-3 py-1 text-xs" onClick={sendTerminal}>{termBusy?"…":"Send"}</button>
                        </div>
                      </div>
                    )}
                    <div className="sticky bottom-0 w-full border-t bg-background/70 backdrop-blur px-2 py-1 text-[11px] flex items-center justify-between">
                      <div>Ln {cursor.line}, Col {cursor.col}{cursor.sel?` • Sel ${cursor.sel}`:""}</div>
                      <div className="opacity-70 truncate max-w-[60%]">{active?.replace(/^\//, "")}</div>
                      <div className="inline-flex items-center gap-2"><span title="Errors" className={errorCount?"text-red-600 dark:text-red-400":""}>E:{errorCount}</span><span title="Warnings" className={warnCount?"text-amber-600 dark:text-amber-400":""}>W:{warnCount}</span><span title="Info" className={infoCount?"text-sky-600 dark:text-sky-400":""}>I:{infoCount}</span></div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="min-h-[420px]">
                      <MonacoCodeEditor
                        ref={editorRef as any}
                        path={active}
                        value={files[active] || ""}
                        original={files[active] || ""}
                        onChange={() => {}}
                        minimap={showMinimap}
                        diff={false}
                        readOnly={true}
                        allFiles={files}
                        className="h-full"
                      />
                    </div>
                    <pre
                    className="hidden text-xs leading-5 font-mono p-3 grid overflow-auto"
                    style={{
                      gridTemplateColumns: "auto 1fr",
                      counterReset: "line",
                    }}
                  >
                    {lines.map((ln, i) => (
                      <code key={i} className="contents">
                        <span
                          className="select-none pr-4 text-muted-foreground/60"
                          style={{ counterIncrement: "line" }}
                        >
                          {String(i + 1).padStart(3, " ")} {" "}
                        </span>
                        <span className="whitespace-pre-wrap break-words">{ln || "\u00A0"}</span>
                      </code>
                    ))}
                    </pre>
                  </div>
                )}
                {showPreview &&
                  active?.toLowerCase().endsWith(".html") &&
                  !editing && (
                    <div className="border-t">
                      <div className="px-3 py-1 text-[11px] text-muted-foreground">
                        Preview
                      </div>
                      <iframe
                        title="preview"
                        className="w-full h-56 bg-white rounded-b-md"
                        srcDoc={files[active] || ""}
                      />
                    </div>
                  )}
              </>
            ) : (
              <div className="p-6 text-sm text-muted-foreground">
                No file selected.
              </div>
            )}
          </div>
        </section>
      </div>

      {cmdOpen && (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={()=> setCmdOpen(false)}>
          <div className="mx-auto mt-24 max-w-lg rounded-md border bg-background p-2 text-sm shadow-xl" onClick={(e)=> e.stopPropagation()}>
            <input id="cmd-input" value={cmdQuery} onChange={(e)=> setCmdQuery(e.target.value)} placeholder="Type a command…" className="w-full rounded border bg-background px-2 py-1 text-xs mb-2" />
            <div className="max-h-64 overflow-auto">
              {filteredCmds.map((c)=> (
                <button key={c.id} className="w-full text-left px-2 py-1 rounded hover:bg-accent/40" onClick={()=> { setCmdOpen(false); c.run(); }}>{c.name}</button>
              ))}
              {filteredCmds.length===0 && <div className="px-2 py-4 text-xs text-muted-foreground">No matches</div>}
            </div>
          </div>
        </div>
      )}

      {menu.open && menu.path && (
        <div
          style={{ left: menu.x, top: menu.y }}
          className="fixed z-50 min-w-[220px] rounded-md border bg-popover p-1 text-xs shadow-lg"
        >
          {menu.kind === "file" ? (
            <>
              <button
                className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                onClick={() => {
                  openFile(menu.path!);
                  setMenu((m) => ({ ...m, open: false }));
                }}
              >
                Open
              </button>
              <button
                className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                onClick={() => {
                  showIntent(menu.path!);
                  setMenu((m) => ({ ...m, open: false }));
                }}
              >
                Show intent
              </button>
              <button
                className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                onClick={() => {
                  scanOne(menu.path!);
                  setMenu((m) => ({ ...m, open: false }));
                }}
              >
                Security scan
              </button>
              <button
                className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                onClick={() => {
                  showConnections(menu.path!);
                  setMenu((m) => ({ ...m, open: false }));
                }}
              >
                Show connections
              </button>
              <button
                className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                onClick={() => {
                  navigator.clipboard?.writeText(menu.path!);
                  setMenu((m) => ({ ...m, open: false }));
                }}
              >
                Copy path
              </button>
              <button
                className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                onClick={() => {
                  const text = files[menu.path!];
                  const blob = new Blob([text || ""], { type: "text/plain" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = menu.path!.split("/").pop() || "file.txt";
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
                  setMenu((m) => ({ ...m, open: false }));
                }}
              >
                Download
              </button>
              <button
                className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                onClick={async () => {
                  const newName = prompt(
                    "Rename to:",
                    menu.path!.split("/").pop() || "",
                  );
                  if (!newName) return;
                  const dest = menu
                    .path!.split("/")
                    .slice(0, -1)
                    .concat([newName])
                    .join("/");
                  const res = await fetch("/api/move-file", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      srcRelPath: menu.path!.replace(/^\//, ""),
                      destRelPath: dest.replace(/^\//, ""),
                    }),
                  });
                  if (res.ok) location.reload();
                  else alert("Rename failed");
                  setMenu((m) => ({ ...m, open: false }));
                }}
              >
                Rename
              </button>
              <div className="h-px my-1 bg-muted" />
              <button
                className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                onClick={async () => {
                  const dest = archiveDest(menu.path!);
                  if (!dest) return;
                  const res = await fetch("/api/move-file", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      srcRelPath: menu.path!.replace(/^\//, ""),
                      destRelPath: dest.replace(/^\//, ""),
                    }),
                  });
                  if (res.ok) location.reload();
                  else alert("Archive failed");
                  setMenu((m) => ({ ...m, open: false }));
                }}
              >
                {isArchived(menu.path!)
                  ? "Restore from archive"
                  : "Archive file"}
              </button>
            </>
          ) : (
            <>
              <button
                className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                onClick={async () => {
                  const name = prompt("New file name (e.g. index.tsx)", "");
                  if (!name) return;
                  const rel = (menu.path! + "/" + name).replace(/^\//, "");
                  const role = readStoredString("studio.role", "editor");
                  const adminToken = readStoredString("studio.adminToken", "");
                  const r = await fetch("/api/apply", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "X-Role": role,
                      ...(adminToken ? { "X-Admin-Token": adminToken } : {}),
                    },
                    body: JSON.stringify({
                      changes: [{ relPath: rel, contents: "" }],
                      runChecks: true,
                      message: `EchoCoder new file ${rel}`,
                    }),
                  });
                  if (r.ok) location.reload();
                  else {
                    const j = await r.json().catch(() => ({}));
                    alert(j.error || "Create failed");
                  }
                  setMenu((m) => ({ ...m, open: false }));
                }}
              >
                New file…
              </button>
              <button
                className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                onClick={async () => {
                  const name = prompt("New folder name", "");
                  if (!name) return;
                  const rel = (menu.path! + "/" + name + "/.keep").replace(
                    /^\//,
                    "",
                  );
                  const role = readStoredString("studio.role", "editor");
                  const adminToken = readStoredString("studio.adminToken", "");
                  const r = await fetch("/api/apply", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "X-Role": role,
                      ...(adminToken ? { "X-Admin-Token": adminToken } : {}),
                    },
                    body: JSON.stringify({
                      changes: [{ relPath: rel, contents: "" }],
                      runChecks: true,
                      message: `EchoCoder new folder ${rel}`,
                    }),
                  });
                  if (r.ok) location.reload();
                  else {
                    const j = await r.json().catch(() => ({}));
                    alert(j.error || "Create folder failed");
                  }
                  setMenu((m) => ({ ...m, open: false }));
                }}
              >
                New folder…
              </button>
            </>
          )}
        </div>
      )}

      {intentOpen && (
        <div className="fixed bottom-16 right-4 z-40 w-[520px] max-w-[95vw] rounded-lg border bg-background/95 shadow-lg p-3 text-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">
              Intent {" "}
              {intentFor && (
                <span className="text-xs font-normal text-muted-foreground">
                  {intentFor.replace(/^\//, "")}
                </span>
              )}
            </div>
            <button
              onClick={() => setIntentOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
          <div className="max-h-64 overflow-auto whitespace-pre-wrap">
            {intentText}
          </div>
        </div>
      )}

      {scanOpen && (
        <div className="fixed bottom-16 right-4 z-40 w-[520px] max-w-[95vw] rounded-lg border bg-background/95 shadow-lg p-3 text-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">
              Security {" "}
              {scanFor && (
                <span className="text-xs font-normal text-muted-foreground">
                  {scanFor.replace(/^\//, "")}
                </span>
              )} {" "}
              <span
                className={`ml-2 text-[11px] px-2 py-0.5 rounded ${scanStatus === "green" ? "bg-emerald-600/20 text-emerald-700 dark:text-emerald-300" : scanStatus === "yellow" ? "bg-amber-600/20 text-amber-700 dark:text-amber-300" : "bg-red-600/20 text-red-700 dark:text-red-300"}`}
              >
                {scanStatus.toUpperCase()}
              </span>
            </div>
            <button
              onClick={() => setScanOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
          <div className="max-h-64 overflow-auto whitespace-pre-wrap">
            {scanText}
          </div>
        </div>
      )}

      {connOpen && (
        <div className="fixed bottom-16 right-4 z-40 w-[520px] max-w-[95vw] rounded-lg border bg-background/95 shadow-lg p-3 text-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">
              Connections {" "}
              {connFor && (
                <span className="text-xs font-normal text-muted-foreground">
                  {connFor.replace(/^\//, "")}
                </span>
              )} {" "}
              {summary && (
                <span className="ml-2 text-muted-foreground">• {summary}</span>
              )}
            </div>
            <button
              onClick={() => setConnOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="font-semibold mb-1">Imports</div>
              <ul className="space-y-1 max-h-60 overflow-auto">
                {importsOf.length === 0 && (
                  <li className="text-muted-foreground">None</li>
                )}
                {importsOf.map((p) => (
                  <li key={p}>
                    <button
                      className="hover:underline"
                      onClick={() => {
                        openFile(p);
                        setConnOpen(false);
                      }}
                    >
                      {p.replace(/^\//, "")}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-1">Imported by</div>
              <ul className="space-y-1 max-h-60 overflow-auto">
                {importedBy.length === 0 && (
                  <li className="text-muted-foreground">None</li>
                )}
                {importedBy.map((p) => (
                  <li key={p}>
                    <button
                      className="hover:underline"
                      onClick={() => {
                        openFile(p);
                        setConnOpen(false);
                      }}
                    >
                      {p.replace(/^\//, "")}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
