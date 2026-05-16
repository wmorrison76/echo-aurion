import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function useProjectFiles(){
  const files = useMemo(()=>{
    const a = import.meta.glob([
      "/client/**/*.{ts,tsx,js,jsx,css,md,json}",
      "/shared/**/*.{ts,tsx,js,jsx,css,md,json}",
    ], { eager: true, query: "?raw", import: "default" }) as Record<string, string>;
    return a;
  },[]);
  return files;
}

function analyze(files: Record<string,string>){
  const entries = Object.entries(files);
  let loc = 0; let imports = 0; const pkgs = new Set<string>();
  const fileStats = entries.map(([p,src])=>{
    const lines = (src.match(/\r?\n/g)||[]).length + 1; loc += lines;
    const im = Array.from(src.matchAll(/import\s+[^'";]+from\s*['"]([^'\"]+)['"]|require\(\s*['"]([^'\"]+)['"]\s*\)/g));
    const cnt = im.length; imports += cnt;
    im.forEach((m:any)=>{ const spec = (m[1]||m[2]||""); if(spec && !spec.startsWith('.') && !spec.startsWith('/') && !spec.startsWith('@/') && !spec.startsWith('@shared/')) pkgs.add(spec.split('/')[0]); });
    const complexity = (src.match(/\b(if|for|while|case|&&|\|\|)\b/g)||[]).length;
    return { path:p, lines, imports:cnt, complexity };
  });
  fileStats.sort((a,b)=> b.lines - a.lines);

  const weights = { fit:30, complexity:15, deps:10, perf:15, a11y:10, observability:10, security:10, bundle:10 };
  const avgComplexity = fileStats.length ? fileStats.reduce((s,f)=>s+f.complexity,0)/fileStats.length : 0;
  const complexityScore = Math.max(0, 1 - Math.min(1, avgComplexity/20));
  const depsScore = Math.max(0, 1 - Math.min(1, pkgs.size/30));
  const perfScore = Math.max(0, 1 - Math.min(1, loc/50000));
  const a11yScore = Math.min(1, entries.filter(([_,s])=> /aria-|role=/.test(s)).length/(entries.length||1)+0.2);
  const observabilityScore = Math.min(1, entries.filter(([_,s])=> /console\./.test(s)).length>0 ? 0.6 : 0.8);
  const securityScore = 0.8; // baseline until Semgrep wiring
  const bundleScore = perfScore;
  const fitScore = 0.9;
  const total = fitScore*weights.fit + complexityScore*weights.complexity + depsScore*weights.deps + perfScore*weights.perf + a11yScore*weights.a11y + observabilityScore*weights.observability + securityScore*weights.security + bundleScore*weights.bundle;
  const maxTotal = Object.values(weights).reduce((a,b)=>a+b,0);
  const pct = Math.round((total/maxTotal)*100);
  const risk = pct >= 85 ? 'Low' : pct >= 65 ? 'Medium' : 'High';
  const suggestions: string[] = [];
  if(risk !== 'Low') suggestions.push('Refactor large files into smaller components');
  if(pkgs.size > 20) suggestions.push('Reduce third‑party dependencies');
  if(loc > 40000) suggestions.push('Split code and enable lazy routes');
  if(entries.some(([_,s])=>/\bany\b/.test(s))) suggestions.push('Tighten TypeScript types');

  return { files: entries.length, loc, imports, packages: pkgs.size, top: fileStats.slice(0,10), score: pct, risk, suggestions };
}

export default function ScorecardPanel(){
  const files = useProjectFiles();
  const stats = useMemo(()=> analyze(files),[files]);
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Scorecard</CardTitle>
        <CardDescription>Project health overview with risk assessment.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center">
          <div className="rounded-md border p-3"><div className="text-2xl font-semibold">{stats.score}%</div><div className="text-[11px] opacity-70">Overall</div></div>
          <div className="rounded-md border p-3"><div className="text-xl font-semibold">{stats.risk}</div><div className="text-[11px] opacity-70">Risk</div></div>
          <div className="rounded-md border p-3"><div className="text-xl font-semibold">{stats.files}</div><div className="text-[11px] opacity-70">Files</div></div>
          <div className="rounded-md border p-3"><div className="text-xl font-semibold">{stats.loc}</div><div className="text-[11px] opacity-70">Lines</div></div>
          <div className="rounded-md border p-3"><div className="text-xl font-semibold">{stats.packages}</div><div className="text-[11px] opacity-70">External deps</div></div>
          <div className="rounded-md border p-3"><div className="text-xl font-semibold">{stats.imports}</div><div className="text-[11px] opacity-70">Total imports</div></div>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {stats.suggestions.length>0 && (
            <div>
              <div className="font-semibold mb-1">Suggestions</div>
              <ul className="list-disc pl-5 text-[12px] space-y-1">
                {stats.suggestions.map((s,i)=> <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          <div>
            <div className="font-semibold mb-1">Largest files</div>
            <ul className="text-[12px] space-y-1">
              {stats.top.map(f=> (
                <li key={f.path} className="flex justify-between gap-2"><span className="truncate">{f.path.replace(/^\//,'')}</span><span className="opacity-70">{f.lines} loc</span></li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
