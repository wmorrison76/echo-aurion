import { useMemo } from "react";
import { Play, RefreshCcw, Copy } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DEFAULT_ECHO_SCRIPT, type ScriptBuildOutput } from "@/lib/echo-script";

type PlannerScriptPanelProps = {
  script: string;
  onScriptChange: (value: string) => void;
  onCompile: () => void;
  onReset: () => void;
  result: ScriptBuildOutput | null;
  error: string | null;
  compiling?: boolean;
  autoCompile: boolean;
  onToggleAutoCompile: (next: boolean) => void;
  currentFingerprint: string;
  compileDisabled?: boolean;
  compileDisabledReason?: string | null;
};

export default function PlannerScriptPanel({
  script,
  onScriptChange,
  onCompile,
  onReset,
  result,
  error,
  compiling = false,
  autoCompile,
  onToggleAutoCompile,
  currentFingerprint,
  compileDisabled = false,
  compileDisabledReason = null,
}: PlannerScriptPanelProps) {
  const lineCount = useMemo(() => script.split(/\r?\n/).length, [script]);
  const charCount = script.length;
  const isSynced = result?.sourceFingerprint === currentFingerprint;
  const compiledAt = useMemo(() => {
    if (!result) return null;
    return new Date(result.generatedAt).toLocaleString();
  }, [result]);
  const isDefaultScript = useMemo(() => {
    return script.trim() === DEFAULT_ECHO_SCRIPT.trim();
  }, [script]);

  const warnings = result?.summary.warnings ?? [];

  const copyToClipboard = (value: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(value).catch(() => {});
  };

  const handleCompileShortcut = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      onCompile();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Planner Script</CardTitle>
        <CardDescription>
          Author or paste an Echo script to generate a production-ready LUCCCA
          page file.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {lineCount} line{lineCount === 1 ? "" : "s"} · {charCount} character
            {charCount === 1 ? "" : "s"}
          </span>
          {result ? (
            <Badge
              variant={isSynced ? "default" : "outline"}
              className="uppercase tracking-wide"
            >
              {isSynced ? "In sync" : "Needs compile"}
            </Badge>
          ) : null}
        </div>
        <Textarea
          value={script}
          onChange={(event) => onScriptChange(event.target.value)}
          onKeyDown={handleCompileShortcut}
          spellCheck={false}
          className="h-72 font-mono text-xs leading-5"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={onCompile}
              disabled={compiling || compileDisabled}
            >
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Compile script
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              disabled={compiling || isDefaultScript}
            >
              <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset example
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(script)}
              disabled={!script.trim()}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copy script
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <label className="inline-flex items-center gap-2">
              <Switch
                checked={autoCompile}
                onCheckedChange={(checked) => onToggleAutoCompile(checked)}
              />
              Auto compile
            </label>
            {compileDisabled && compileDisabledReason ? (
              <span className="text-[11px] text-muted-foreground">
                {compileDisabledReason}
              </span>
            ) : null}
          </div>
        </div>
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Script error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {result ? (
          <div className="space-y-3 rounded-lg border border-border/60 bg-background/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <div className="min-w-0 space-y-1">
                <div className="text-sm font-semibold text-foreground">
                  {result.componentName}
                </div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  {result.destPath}
                </div>
              </div>
              {compiledAt ? <span>Compiled {compiledAt}</span> : null}
            </div>
            <dl className="grid gap-3 text-xs md:grid-cols-2">
              <div className="space-y-1">
                <dt className="text-muted-foreground">Destination</dt>
                <dd className="font-mono text-foreground">{result.destPath}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-muted-foreground">Project name</dt>
                <dd className="font-mono text-foreground">
                  {result.projectName}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-muted-foreground">Sections</dt>
                <dd className="font-semibold text-foreground">
                  {result.summary.sections}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-muted-foreground">Nodes</dt>
                <dd className="font-semibold text-foreground">
                  {result.summary.nodes}
                </dd>
              </div>
            </dl>
            {warnings.length ? (
              <Alert
                variant="default"
                className="border-amber-400/70 bg-amber-500/10"
              >
                <AlertTitle className="text-xs font-semibold">
                  Warnings
                </AlertTitle>
                <AlertDescription>
                  <ul className="list-disc space-y-1 pl-5 text-xs text-foreground">
                    {warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : null}
            <details className="text-xs">
              <summary className="cursor-pointer select-none text-muted-foreground">
                Generated code preview
              </summary>
              <div className="mt-2 space-y-2">
                <pre className="max-h-72 overflow-auto rounded border bg-muted/10 p-3 text-[11px] leading-5">
                  {result.code}
                </pre>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(result.code)}
                  >
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Copy code
                  </Button>
                  <span className="text-[11px] text-muted-foreground">
                    Imports: {result.imports.length}
                  </span>
                </div>
              </div>
            </details>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
