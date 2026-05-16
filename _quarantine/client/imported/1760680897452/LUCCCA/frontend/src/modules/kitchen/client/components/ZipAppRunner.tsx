import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";

function isTextFile(name: string) {
  return /(\.html?|\.css|\.js|\.json|\.txt|\.md)$/i.test(name);
}

function joinUrl(base: string, rel: string) {
  if (/^https?:\/\//i.test(rel) || rel.startsWith("data:")) return rel;
  if (rel.startsWith("/")) return rel.slice(1);
  return new URL(rel, "https://local/" + base).pathname.slice(1);
}

export default function ZipAppRunner() {
  const [status, setStatus] = useState<string | null>(null);
  const [srcDoc, setSrcDoc] = useState<string | null>(null);
  const urlsRef = useRef<string[]>([]);

  useEffect(() => () => { urlsRef.current.forEach((u) => URL.revokeObjectURL(u)); urlsRef.current = []; }, []);

  const buildFromZip = useCallback(async (zip: JSZip) => {
    setStatus("Preparing app...");
    const fileEntries = Object.values(zip.files).filter((f) => !f.dir);
    if (!fileEntries.length) throw new Error("Empty ZIP");

    const urlMap = new Map<string, string>();
    for (const entry of fileEntries) {
      const name = entry.name.replace(/^\.+\//, "");
      const blob = await entry.async("blob");
      const url = URL.createObjectURL(blob);
      urlsRef.current.push(url);
      urlMap.set(name, url);
    }

    const indexEntry = fileEntries.find((f) => /(^|\/)index\.html?$/i.test(f.name)) || fileEntries.find((f) => /\.html?$/i.test(f.name));
    if (!indexEntry) throw new Error("No index.html found");
    const baseDir = indexEntry.name.split("/").slice(0, -1).join("/") + (indexEntry.name.includes("/") ? "/" : "");

    const html = await indexEntry.async("string");

    const replaced = html.replace(/(<script[^>]*src=")([^"]+)("[^>]*>\s*<\/script>)/gi, (m, a, p, c) => {
      const key = joinUrl(baseDir, p);
      const u = urlMap.get(key) || p;
      return `${a}${u}${c}`;
    })
    .replace(/(<link[^>]*href=")([^"]+)("[^>]*>)/gi, (m, a, p, c) => {
      const key = joinUrl(baseDir, p);
      const u = urlMap.get(key) || p;
      return `${a}${u}${c}`;
    })
    .replace(/(<img[^>]*src=")([^"]+)("[^>]*>)/gi, (m, a, p, c) => {
      const key = joinUrl(baseDir, p);
      const u = urlMap.get(key) || p;
      return `${a}${u}${c}`;
    });

    setSrcDoc(replaced);
    setStatus("App loaded.");
  }, []);

  const loadFromFile = useCallback(async (file: File) => {
    setStatus("Reading ZIP...");
    const zip = await JSZip.loadAsync(file);
    await buildFromZip(zip);
  }, [buildFromZip]);

  const loadFromUrl = useCallback(async (url: string) => {
    setStatus("Downloading ZIP...");
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    const zip = await JSZip.loadAsync(blob);
    await buildFromZip(zip);
  }, [buildFromZip]);

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">Embed a static web app from a ZIP (HTML/CSS/JS)</div>
      {status && <div className="rounded border p-2 text-xs">{status}</div>}
      <div className="rounded-lg border overflow-hidden">
        {srcDoc ? (
          <iframe title="Embedded App" className="w-full h-[600px] bg-white" srcDoc={srcDoc} />
        ) : (
          <div className="p-6 text-sm text-muted-foreground">Load a ZIP to preview here.</div>
        )}
      </div>
      <ZipControls onFile={loadFromFile} onUrl={loadFromUrl} />
    </div>
  );
}

function ZipControls({ onFile, onUrl }: { onFile: (f: File) => void; onUrl: (u: string) => void }) {
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <input value={url} onChange={(e)=>setUrl(e.target.value)} placeholder="https://example.com/app.zip" className="flex-1 min-w-[240px] rounded-md border bg-background px-3 py-2" />
      <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary text-primary-foreground h-10 px-4" onClick={()=>url && onUrl(url)}>Load ZIP URL</button>
      <input ref={inputRef} type="file" accept=".zip,application/zip" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if(f) onFile(f); }} />
      <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border h-10 px-4" onClick={()=>inputRef.current?.click()}>Upload ZIP</button>
    </div>
  );
}
