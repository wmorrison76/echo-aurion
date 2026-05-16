import React, { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/glass";
import { FileText, Loader, Download, Copy, Check } from "lucide-react";
import { CanvasState } from "./types";

interface SessionSummary {
  title: string;
  duration: string;
  keyPoints: string[];
  actionItems: string[];
  participants?: string[];
  nextSteps: string;
  sessionNotes: string;
  exportTime: number;
}

interface SmartSessionSummarizationProps {
  sessionTitle: string;
  canvasState: CanvasState;
  sessionDuration?: number;
  participants?: string[];
  onSummaryGenerated?: (summary: SessionSummary) => void;
  onError?: (error: string) => void;
}

function formatSummaryForExport(summary: SessionSummary): string {
  const lines: string[] = [];
  lines.push("SESSION SUMMARY");
  lines.push("===============");
  lines.push("");
  lines.push(`Title: ${summary.title}`);
  lines.push(`Duration: ${summary.duration}`);
  if (summary.participants && summary.participants.length > 0) {
    lines.push(`Participants: ${summary.participants.join(",")}`);
  }
  lines.push(`Generated: ${new Date(summary.exportTime).toLocaleString()}`);
  lines.push("");
  if (summary.keyPoints.length > 0) {
    lines.push("KEY POINTS");
    lines.push("----------");
    summary.keyPoints.forEach((point) => lines.push(`• ${point}`));
    lines.push("");
  }
  if (summary.actionItems.length > 0) {
    lines.push("ACTION ITEMS");
    lines.push("------------");
    summary.actionItems.forEach((item) => lines.push(`✓ ${item}`));
    lines.push("");
  }
  if (summary.nextSteps) {
    lines.push("NEXT STEPS");
    lines.push("----------");
    lines.push(summary.nextSteps);
    lines.push("");
  }
  if (summary.sessionNotes) {
    lines.push("NOTES");
    lines.push("-----");
    lines.push(summary.sessionNotes);
  }
  return lines.join("\n");
}

export const SmartSessionSummarization: React.FC<
  SmartSessionSummarizationProps
> = ({
  sessionTitle,
  canvasState,
  sessionDuration = 0,
  participants = [],
  onSummaryGenerated,
  onError,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const generateSessionSummary = useCallback(async () => {
    setIsGenerating(true);
    try {
      const shapes = Array.isArray((canvasState as any)?.shapes)
        ? (canvasState as any).shapes.map((s: any) => ({
            type: s.type,
            color: s.color,
            x: s.x,
            y: s.y,
          }))
        : [];
      const texts = Array.isArray((canvasState as any)?.texts)
        ? (canvasState as any).texts.map((t: any) => ({
            text: t.text,
            x: t.x,
            y: t.y,
            fontSize: t.fontSize,
          }))
        : [];

      const response = await fetch("/api/session/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionTitle,
          content: {
            shapes,
            texts,
            totalElements: shapes.length + texts.length,
          },
          duration: sessionDuration,
          participants,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate summary");
      }

      const result = (await response.json()) as SessionSummary;
      setSummary(result);
      onSummaryGenerated?.(result);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Summarization failed";
      onError?.(errorMsg);
      console.error("Error generating session summary:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [canvasState, sessionTitle, sessionDuration, participants, onSummaryGenerated, onError]);

  const handleCopyText = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleExportSummary = () => {
    if (!summary) return;
    const exportText = formatSummaryForExport(summary);
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(exportText));
    element.setAttribute(
      "download",
      `${sessionTitle}-summary-${new Date().toISOString().split("T")[0]}.txt`,
    );
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className={cn(
          "gap-2 rounded-lg",
          "border-indigo-400/30 hover:border-indigo-400",
          "text-indigo-600 dark:text-indigo-400",
        )}
      >
        <FileText size={16} /> Summary
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-20 left-4 bg-background dark:bg-slate-800",
        "border border-slate-200 dark:border-border rounded-lg",
        "shadow-2xl p-6 z-50 max-w-2xl w-[600px] max-h-[600px] overflow-y-auto",
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground dark:text-white flex items-center gap-2">
          <FileText size={20} className="text-indigo-600 dark:text-indigo-400" />
          Session Summary
        </h3>
        <Button
          onClick={() => setIsOpen(false)}
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
        >
          ✕
        </Button>
      </div>

      {!summary && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-3">
            Generate an AI-powered summary of this whiteboard session including key
            points, action items, and recommendations.
          </p>
          <Button
            onClick={generateSessionSummary}
            disabled={isGenerating}
            className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            {isGenerating ? (
              <>
                <Loader size={16} className="animate-spin" /> Generating Summary...
              </>
            ) : (
              <>
                <FileText size={16} /> Generate Summary
              </>
            )}
          </Button>
        </div>
      )}

      {summary && (
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-foreground uppercase mb-1">
              Session Title
            </h4>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground dark:text-white">
                {summary.title}
              </p>
              <Button
                onClick={() => handleCopyText(summary.title, "title")}
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground dark:hover:text-white"
              >
                {copiedField === "title" ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              </Button>
            </div>
          </div>

          {summary.keyPoints.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase mb-2">
                Key Points
              </h4>
              <ul className="space-y-1 text-sm text-foreground">
                {summary.keyPoints.map((point, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                      •
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.actionItems.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase mb-2">
                Action Items
              </h4>
              <ul className="space-y-1 text-sm text-foreground">
                {summary.actionItems.map((item, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-orange-600 dark:text-orange-400 flex-shrink-0">
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.nextSteps && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded">
              <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase mb-1">
                Next Steps
              </h4>
              <p className="text-sm text-blue-700 dark:text-primary">{summary.nextSteps}</p>
            </div>
          )}

          {summary.sessionNotes && (
            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase mb-2">
                Session Notes
              </h4>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {summary.sessionNotes}
              </p>
            </div>
          )}

          <div className="border-t border-slate-200 dark:border-border pt-3 text-xs text-muted-foreground space-y-1">
            <p>Duration: {summary.duration}</p>
            {summary.participants && summary.participants.length > 0 && (
              <p>Participants: {summary.participants.join(",")}</p>
            )}
            <p>Generated: {new Date(summary.exportTime).toLocaleString()}</p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleExportSummary}
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
            >
              <Download size={14} /> Export Summary
            </Button>
            <Button
              onClick={() => {
                setSummary(null);
              }}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              Generate New
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartSessionSummarization;
