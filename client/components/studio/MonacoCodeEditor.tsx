import { useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from "react";
import { useTheme } from "next-themes";

type MonacoEditorModule = typeof import("monaco-editor/esm/vs/editor/editor.api");
type MonacoEditorInstance = import("monaco-editor").editor.IStandaloneCodeEditor;
type MonacoDiffEditorInstance = import("monaco-editor").editor.IStandaloneDiffEditor;
type MonacoTextModel = import("monaco-editor").editor.ITextModel;

export type MonacoApi = MonacoEditorModule;
export type EditorRefApi = {
  reveal: (lineNumber: number, column?: number) => void;
  getMonaco: () => MonacoApi | null;
  getEditor: () => MonacoEditorInstance | null;
  getModel: () => MonacoTextModel | null;
  format: () => Promise<void>;
};

function languageFromPath(path: string): string {
  const lower = path.toLowerCase();
  if (/(^|\.)tsx?$/.test(lower) || /\.tsx$/.test(lower)) return "typescript";
  if (/\.ts$/.test(lower)) return "typescript";
  if (/\.jsx$/.test(lower)) return "javascript";
  if (/\.js$/.test(lower)) return "javascript";
  if (/\.json$/.test(lower)) return "json";
  if (/\.css$/.test(lower)) return "css";
  if (/\.(htm|html)$/.test(lower)) return "html";
  if (/\.(md|markdown)$/.test(lower)) return "markdown";
  return "plaintext";
}

const worker = () => new Worker(new URL("../../workers/formatterWorker.ts", import.meta.url), { type: "module" });

export default forwardRef<EditorRefApi, {
  path: string;
  value: string;
  original?: string;
  onChange: (val: string) => void;
  minimap?: boolean;
  diff?: boolean;
  readOnly?: boolean;
  allFiles?: Record<string, string>;
  className?: string;
}>(function MonacoCodeEditor({ path, value, original, onChange, minimap = true, diff = false, readOnly = false, allFiles, className }, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [monaco, setMonaco] = useState<MonacoApi | null>(null);
  const [editor, setEditor] = useState<MonacoEditorInstance | null>(null);
  const [diffEditor, setDiffEditor] = useState<MonacoDiffEditorInstance | null>(null);
  const modelRef = useRef<MonacoTextModel | null>(null);
  const origModelRef = useRef<MonacoTextModel | null>(null);
  const lang = useMemo(() => languageFromPath(path), [path]);
  const workerRef = useRef<Worker | null>(null);
  const { resolvedTheme } = useTheme();

  // expose API
  useImperativeHandle(ref, () => ({
    reveal: (line, column = 1) => {
      const ed = editor ?? diffEditor?.getModifiedEditor() ?? null;
      if (!ed) return;
      ed.revealPositionInCenter({ lineNumber: line, column });
      ed.setPosition({ lineNumber: line, column });
      ed.focus();
    },
    getMonaco: () => monaco,
    getEditor: () => editor ?? diffEditor?.getModifiedEditor() ?? null,
    getModel: () => modelRef.current,
    format: async () => {
      if (!workerRef.current) workerRef.current = worker();
      const w = workerRef.current!;
      const code = (editor ?? diffEditor?.getModifiedEditor())?.getValue() ?? value;
      const msg = { code, path, language: lang } as const;
      const res: string = await new Promise((resolve) => {
        const onMsg = (e: MessageEvent) => {
          if (e.data && e.data.type === "formatted") {
            w.removeEventListener("message", onMsg as any);
            resolve(e.data.code as string);
          }
        };
        w.addEventListener("message", onMsg as any);
        w.postMessage({ type: "format", ...msg });
      });
      const ed = editor ?? diffEditor?.getModifiedEditor();
      if (res && ed) ed.setValue(res);
    },
  }), [editor, diffEditor, monaco, path, value, lang]);

  useEffect(() => {
    let canceled = false;
    (async () => {
      const m = await import("monaco-editor/esm/vs/editor/editor.api");
      // workers mapping
      const globalMonaco = self as unknown as {
        MonacoEnvironment?: {
          getWorker: (_: string, label: string) => Worker;
        };
      };
      globalMonaco.MonacoEnvironment = {
        getWorker: (_: string, label: string) => {
          if (label === "json") return new Worker(new URL("monaco-editor/esm/vs/language/json/json.worker.js", import.meta.url), { type: "module" });
          if (label === "css") return new Worker(new URL("monaco-editor/esm/vs/language/css/css.worker.js", import.meta.url), { type: "module" });
          if (label === "html") return new Worker(new URL("monaco-editor/esm/vs/language/html/html.worker.js", import.meta.url), { type: "module" });
          if (label === "typescript" || label === "javascript") return new Worker(new URL("monaco-editor/esm/vs/language/typescript/ts.worker.js", import.meta.url), { type: "module" });
          return new Worker(new URL("monaco-editor/esm/vs/editor/editor.worker.js", import.meta.url), { type: "module" });
        },
      };

      if (canceled) return;
      setMonaco(m);

      // Emmet for HTML/CSS/JSX
      try {
        const emmet = await import("emmet-monaco-es");
        (emmet as any).default?.(m); // newer versions export default
        if ((emmet as any).emmetHTML) {
          (emmet as any).emmetHTML(m);
          (emmet as any).emmetCSS(m);
          (emmet as any).emmetJSX(m);
        }
      } catch {}

      const dom = containerRef.current!;
      if (!dom) return;

      const uri = m.Uri.parse(`inmemory://${path}`);
      const existing = m.editor.getModel(uri);
      const model = existing ?? m.editor.createModel(value, lang, uri);
      modelRef.current = model;

      if (allFiles) {
        for (const [p, src] of Object.entries(allFiles)) {
          try {
            const u = m.Uri.parse(`inmemory://${p}`);
            if (!m.editor.getModel(u)) m.editor.createModel(src || "", languageFromPath(p), u);
          } catch {}
        }
      }

      if (!diff) {
        const ed = m.editor.create(dom, {
          model,
          automaticLayout: true,
          fontSize: 12,
          minimap: { enabled: minimap },
          folding: true,
          readOnly,
          scrollBeyondLastLine: false,
          wordWrap: "off",
          bracketPairColorization: { enabled: true },
          autoClosingBrackets: "always",
          autoSurround: "quotes",
          tabSize: 2,
          insertSpaces: true,
        });
        setEditor(ed);
        if (!readOnly) ed.onDidChangeModelContent(() => onChange(ed.getValue()));
      } else {
        const leftModel = m.editor.createModel(original ?? "", lang);
        origModelRef.current = leftModel;
        const ed = m.editor.createDiffEditor(dom, {
          automaticLayout: true,
          renderSideBySide: true,
          fontSize: 12,
          minimap: { enabled: minimap },
          ignoreTrimWhitespace: false,
        });
        ed.setModel({ original: leftModel, modified: model });
        setDiffEditor(ed);
        ed.getModifiedEditor().onDidChangeModelContent(() => onChange(ed.getModifiedEditor().getValue()));
      }
    })();
    return () => {
      canceled = true;
      if (editor) editor.dispose();
      if (diffEditor) diffEditor.dispose();
      if (modelRef.current) modelRef.current.dispose();
      if (origModelRef.current) origModelRef.current.dispose();
    };
  }, [path, diff]);

  // keep external value in sync if it changes due to save/format
  useEffect(() => {
    const ed = editor ?? diffEditor?.getModifiedEditor();
    if (!ed) return;
    if (ed.getValue() !== value) ed.setValue(value);
  }, [value, editor, diffEditor]);

  useEffect(() => {
    if (!monaco) return;
    if (resolvedTheme === "dark") {
      monaco.editor.defineTheme("luccca-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [{ token: "", foreground: "E2E8F0" }],
        colors: {
          "editor.background": "#050711",
          "editor.foreground": "#E2E8F0",
          "editorLineNumber.foreground": "#475569",
          "editorLineNumber.activeForeground": "#38BDF8",
          "editorCursor.foreground": "#38BDF8",
          "editor.selectionBackground": "#1E293B66",
          "editor.selectionHighlightBackground": "#1E293B33",
          "editor.wordHighlightBackground": "#1E293B4D",
          "editor.wordHighlightStrongBackground": "#1E293B66",
          "editorIndentGuide.background": "#1F2937",
          "editorIndentGuide.activeBackground": "#38BDF8",
        },
      });
      monaco.editor.setTheme("luccca-dark");
    } else {
      monaco.editor.setTheme("vs");
    }
  }, [monaco, resolvedTheme]);

  return (
    <div
      className={`relative w-full h-full overflow-hidden rounded-xl border border-primary/25 bg-background/60 shadow-[0_32px_70px_rgba(15,118,255,0.22)] backdrop-blur-sm ${className ? className : ""}`}
      style={{
        backgroundImage:
          "radial-gradient(circle at top, rgba(59,130,246,0.18), rgba(15,23,42,0) 68%)",
      }}
    >
      <div
        ref={containerRef}
        className="w-full min-h-[320px] h-full rounded-[inherit] overflow-hidden"
      />
    </div>
  );
});
