import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Maximize2,
  Minimize2,
  Trash2,
  Download,
  Copy,
  Plus,
  X,
  Settings,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import type { LabExperiment } from "@/stores/rdLabStore";
import { generateAISuggestionsForExperiment } from "@/lib/rdlab-ai-suggestions";

export type FontStyle = "chalkboard" | "teletype";

interface WhiteboardEntry {
  id: string;
  type: "hypothesis" | "step" | "observation" | "measurement" | "note" | "ai-insight";
  content: string;
  timestamp: Date;
}

interface EnhancedLabWhiteboardProps {
  isVisible: boolean;
  projectName: string;
  projectId: string;
  onClose?: () => void;
  onExport?: (data: WhiteboardEntry[]) => void;
  entries?: WhiteboardEntry[];
  onEntriesChange?: (entries: WhiteboardEntry[]) => void;
  fontStyle?: FontStyle;
  onFontStyleChange?: (style: FontStyle) => void;
  blackboardImage?: string;
  currentExperiment?: LabExperiment;
  allExperiments?: LabExperiment[];
}

export function EnhancedLabWhiteboard({
  isVisible,
  projectName,
  projectId,
  onClose,
  onExport,
  entries: externalEntries = [],
  onEntriesChange,
  fontStyle = "chalkboard",
  onFontStyleChange,
  blackboardImage,
  currentExperiment,
  allExperiments = [],
}: EnhancedLabWhiteboardProps) {
  const [entries, setEntries] = useState<WhiteboardEntry[]>(externalEntries);
  const [isMaximized, setIsMaximized] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate AI suggestions
  const aiSuggestions = useMemo(() => {
    if (!currentExperiment || allExperiments.length === 0) return [];
    return generateAISuggestionsForExperiment(currentExperiment, allExperiments);
  }, [currentExperiment, allExperiments]);

  // Sync external entries
  useEffect(() => {
    setEntries(externalEntries);
  }, [externalEntries]);

  // Notify parent of changes
  useEffect(() => {
    if (onEntriesChange) {
      onEntriesChange(entries);
    }
  }, [entries, onEntriesChange]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [entries]);

  const handleAddNote = () => {
    if (!newNote.trim()) return;

    const entry: WhiteboardEntry = {
      id: `note_${Date.now()}`,
      type: "note",
      content: newNote,
      timestamp: new Date(),
    };

    setEntries((prev) => [...prev, entry]);
    setNewNote("");
  };

  const handleAddEntry = (
    type: "observation" | "measurement",
    content: string,
  ) => {
    const entry: WhiteboardEntry = {
      id: `${type}_${Date.now()}`,
      type,
      content,
      timestamp: new Date(),
    };

    setEntries((prev) => [...prev, entry]);
  };

  const handleDeleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleExport = () => {
    const text = entries
      .map((e) => {
        const timestamp = e.timestamp instanceof Date
          ? e.timestamp
          : (typeof e.timestamp === 'string' ? new Date(e.timestamp) : new Date());
        const time = timestamp.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        return `[${time}] ${e.type.toUpperCase()}: ${e.content}`;
      })
      .join("\n");

    const dataStr = `PROJECT: ${projectName}\n${"=".repeat(50)}\n\n${text}`;
    const blob = new Blob([dataStr], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, "_")}_whiteboard.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (onExport) onExport(entries);
    toast.success("Whiteboard exported");
  };

  const handleCopyAll = () => {
    const text = entries.map((e) => e.content).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, input, [contenteditable]"))
      return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || isMaximized) return;
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!isVisible) return null;

  const fontClass =
    fontStyle === "teletype"
      ? "font-mono tracking-tight text-xs sm:text-sm"
      : "font-[Georgia] italic text-sm sm:text-base";

  const whiteboardContent = (
    <div
      className="space-y-4 h-full flex flex-col relative"
      style={{
        backgroundImage: blackboardImage ? `url(${blackboardImage})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay for readability */}
      {blackboardImage && (
        <div className="absolute inset-0 bg-black/20 rounded-t-lg pointer-events-none" />
      )}

      {/* Header with controls */}
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="relative z-10 flex items-center justify-between p-4 border-b border-amber-100/20 bg-gradient-to-r from-slate-900/60 via-amber-900/30 to-slate-900/60 rounded-t-lg cursor-move"
      >
        <div>
          <h2 className="font-bold text-amber-100 text-lg drop-shadow-lg">
            {projectName}
          </h2>
          <p className="text-xs text-amber-100/60 drop-shadow">
            Lab Whiteboard • {entries.length} entries
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowSettings(!showSettings)}
            className="text-amber-200 hover:bg-amber-500/10"
            title="Font settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopyAll}
            className="text-amber-200 hover:bg-amber-500/10"
            title="Copy all notes"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleExport}
            className="text-amber-200 hover:bg-amber-500/10"
            title="Export as text"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsMaximized(!isMaximized)}
            className="text-amber-200 hover:bg-amber-500/10"
            title={isMaximized ? "Minimize" : "Maximize"}
          >
            {isMaximized ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          {onClose && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="text-amber-200 hover:bg-red-500/10 hover:text-red-200"
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Font Settings Panel */}
      {showSettings && (
        <div className="relative z-20 p-4 border-b border-amber-100/20 bg-slate-900/80 backdrop-blur-sm space-y-3">
          <p className="text-xs font-semibold text-amber-100">Font Style</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={fontStyle === "chalkboard" ? "default" : "outline"}
              onClick={() => onFontStyleChange?.("chalkboard")}
              className={
                fontStyle === "chalkboard"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "border-amber-500/30 text-amber-200 hover:bg-amber-500/10"
              }
            >
              Chalkboard
            </Button>
            <Button
              size="sm"
              variant={fontStyle === "teletype" ? "default" : "outline"}
              onClick={() => onFontStyleChange?.("teletype")}
              className={
                fontStyle === "teletype"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "border-amber-500/30 text-amber-200 hover:bg-amber-500/10"
              }
            >
              Teletype
            </Button>
          </div>
        </div>
      )}

      {/* Entries area */}
      <ScrollArea className="relative z-10 flex-1 overflow-hidden">
        <div className="space-y-3 p-4">
          {entries.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-amber-100/40">
              <p className="text-sm drop-shadow">
                Whiteboard initialized. Add notes as you work...
              </p>
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className={`group relative p-3 rounded-lg border border-amber-100/20 bg-slate-950/60 backdrop-blur-sm transition-all duration-300 hover:border-amber-100/40 hover:bg-slate-900/70 animate-in fade-in slide-in-from-bottom-2 ${fontClass}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded drop-shadow ${
                        entry.type === "hypothesis"
                          ? "bg-purple-500/20 text-purple-200 border border-purple-500/30"
                          : entry.type === "step"
                            ? "bg-amber-500/20 text-amber-200 border border-amber-500/30"
                            : entry.type === "observation"
                              ? "bg-green-500/20 text-green-200 border border-green-500/30"
                              : entry.type === "measurement"
                                ? "bg-orange-500/20 text-orange-200 border border-orange-500/30"
                                : "bg-blue-500/20 text-blue-200 border border-blue-500/30"
                      }`}
                    >
                      {entry.type.toUpperCase()}
                    </span>
                    <span className="text-xs text-amber-100/40 drop-shadow">
                      {(() => {
                        const timestamp = entry.timestamp instanceof Date
                          ? entry.timestamp
                          : (typeof entry.timestamp === 'string' ? new Date(entry.timestamp) : new Date());
                        return timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        });
                      })()}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-300 hover:bg-red-500/10 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <p className="text-amber-50 leading-relaxed break-words drop-shadow">
                  {entry.content}
                </p>
              </div>
            ))
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* AI Suggestions */}
      {showAISuggestions && aiSuggestions.length > 0 && (
        <div className="relative z-10 border-t border-amber-100/20 p-3 bg-slate-900/60 max-h-24 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-[#c8a97e]/80 flex items-center gap-1">
              <Lightbulb className="h-3 w-3" /> AI Insights
            </p>
            <button
              onClick={() => setShowAISuggestions(false)}
              className="text-xs text-amber-100/50 hover:text-amber-100"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1">
            {aiSuggestions.slice(0, 2).map((suggestion) => (
              <div
                key={suggestion.id}
                className="text-xs p-2 rounded bg-[#c8a97e]/08 border border-[#c8a97e]/15 text-white/80 cursor-pointer hover:bg-[#c8a97e]/15 transition-colors"
                title={suggestion.reasoning}
              >
                💡 {suggestion.content}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="relative z-10 border-t border-amber-100/20 p-4 space-y-3 bg-gradient-to-t from-slate-950/80 via-slate-900/70 to-transparent rounded-b-lg">
        <div className="flex gap-2">
          <Input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAddNote();
              }
            }}
            placeholder="Add a note..."
            className="bg-slate-800/70 border-amber-500/20 text-amber-100 placeholder:text-amber-300/30 focus:border-amber-500/50"
          />
          <Button
            onClick={handleAddNote}
            disabled={!newNote.trim()}
            className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const obs = prompt("Observation:");
              if (obs) handleAddEntry("observation", obs);
            }}
            className="border-green-500/30 text-green-200 hover:bg-green-500/10"
          >
            + Observation
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const meas = prompt("Measurement:");
              if (meas) handleAddEntry("measurement", meas);
            }}
            className="border-orange-500/30 text-orange-200 hover:bg-orange-500/10"
          >
            + Measurement
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEntries([]);
              toast.success("Whiteboard cleared");
            }}
            className="border-red-500/30 text-red-200 hover:bg-red-500/10 ml-auto"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear
          </Button>
        </div>
      </div>
    </div>
  );

  if (isMaximized) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full h-full max-w-5xl bg-slate-950 border-amber-500/30 flex flex-col rounded-lg overflow-hidden">
          {whiteboardContent}
        </Card>
      </div>
    );
  }

  return (
    <Card
      ref={containerRef}
      className="fixed bottom-4 right-4 w-96 h-96 bg-slate-950 border-amber-500/30 shadow-2xl shadow-amber-500/10 flex flex-col z-40 rounded-lg overflow-hidden"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: isDragging ? "none" : "transform 0.2s ease-out",
      }}
    >
      {whiteboardContent}

      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </Card>
  );
}
