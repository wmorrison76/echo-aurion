import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Maximize2,
  Minimize2,
  Trash2,
  Download,
  Copy,
  Plus,
  X,
  Save,
} from "lucide-react";
import { toast } from "sonner";

interface WhiteboardEntry {
  id: string;
  type: "hypothesis" | "step" | "observation" | "measurement" | "note";
  content: string;
  timestamp: Date;
  animated?: boolean;
}

interface LabWhiteboardProps {
  isVisible: boolean;
  projectName: string;
  onClose?: () => void;
  onExport?: (data: WhiteboardEntry[]) => void;
  projectContext?: {
    conversation: string;
    track: string;
    mode: string;
  };
}

export function LabWhiteboard({
  isVisible,
  projectName,
  onClose,
  onExport,
  projectContext,
}: LabWhiteboardProps) {
  const [entries, setEntries] = useState<WhiteboardEntry[]>([]);
  const [isMaximized, setIsMaximized] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Initialize with project hypothesis
  useEffect(() => {
    if (!isVisible) return;

    const initializeWhiteboard = async () => {
      try {
        const response = await fetch("/api/rdlabs/whiteboard/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectName,
            context: projectContext?.conversation || "",
            track: projectContext?.track || "fine-dining",
            mode: projectContext?.mode || "culinary",
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.entries) {
            // Add entries with staggered animation
            data.entries.forEach((entry: any, index: number) => {
              setTimeout(() => {
                // Ensure timestamp is a Date object
                const timestamp = entry.timestamp
                  ? (typeof entry.timestamp === 'string'
                      ? new Date(entry.timestamp)
                      : entry.timestamp)
                  : new Date();

                const processedEntry: WhiteboardEntry = {
                  id: `entry_${Date.now()}_${index}`,
                  type: entry.type || "note",
                  content: entry.content || "",
                  timestamp,
                  animated: false,
                };

                setEntries((prev) => [...prev, processedEntry]);
                setAnimatingId(processedEntry.id);
              }, index * 800);
            });
          }
        }
      } catch (err) {
        console.error("Failed to initialize whiteboard:", err);
      }
    };

    initializeWhiteboard();
  }, [isVisible, projectName, projectContext]);

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
    setAnimatingId(entry.id);
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
    setAnimatingId(entry.id);
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

  const whiteboardContent = (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header with controls */}
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="flex items-center justify-between p-4 border-b border-[#c8a97e]/15 bg-gradient-to-r from-slate-900/50 via-[#c8a97e]/30/20 to-slate-900/50 rounded-t-lg cursor-move"
      >
        <div>
          <h2 className="font-bold text-white/80 text-lg">{projectName}</h2>
          <p className="text-xs text-[#c8a97e]/50">
            Lab Whiteboard • {entries.length} entries
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopyAll}
            className="text-[#c8a97e] hover:bg-[#c8a97e]/08"
            title="Copy all notes"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleExport}
            className="text-[#c8a97e] hover:bg-[#c8a97e]/08"
            title="Export as text"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsMaximized(!isMaximized)}
            className="text-[#c8a97e] hover:bg-[#c8a97e]/08"
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
              className="text-[#c8a97e] hover:bg-red-500/10 hover:text-red-400"
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Entries area */}
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="space-y-3 p-4">
          {entries.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-[#c8a97e]/40">
              <p className="text-sm">
                Whiteboard initialized. Add notes as you work...
              </p>
            </div>
          ) : (
            entries.map((entry, index) => (
              <div
                key={entry.id}
                className={`group relative p-3 rounded-lg border border-[#c8a97e]/15 bg-slate-900/40 backdrop-blur-sm transition-all duration-500 ${
                  animatingId === entry.id
                    ? "animate-in fade-in slide-in-from-bottom-2"
                    : ""
                }`}
                style={{
                  animation:
                    animatingId === entry.id
                      ? "slideInUp 0.6s ease-out"
                      : "none",
                }}
              >
                {/* Entry Type Badge */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded ${
                        entry.type === "hypothesis"
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          : entry.type === "step"
                            ? "bg-[#c8a97e]/15 text-[#c8a97e] border border-[#c8a97e]/25"
                            : entry.type === "observation"
                              ? "bg-green-500/20 text-green-300 border border-green-500/30"
                              : entry.type === "measurement"
                                ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                                : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      }`}
                    >
                      {entry.type.toUpperCase()}
                    </span>
                    <span className="text-xs text-[#c8a97e]/40">
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
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:bg-red-500/10 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {/* Entry Content */}
                <p className="text-sm text-white/80 leading-relaxed break-words">
                  {entry.content}
                </p>
              </div>
            ))
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-[#c8a97e]/15 p-4 space-y-3 bg-gradient-to-t from-slate-900/50 to-transparent rounded-b-lg">
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
            placeholder="Add a note, observation, or measurement..."
            className="bg-slate-800/50 border-[#c8a97e]/15 text-white/80 placeholder:text-[#c8a97e]/30 focus:border-[#c8a97e]/50"
          />
          <Button
            onClick={handleAddNote}
            disabled={!newNote.trim()}
            className="bg-[#c8a97e] hover:bg-[#b8976c] text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>

        {/* Quick add buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const obs = prompt("Observation:");
              if (obs) handleAddEntry("observation", obs);
            }}
            className="border-green-500/30 text-green-300 hover:bg-green-500/10"
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
            className="border-orange-500/30 text-orange-300 hover:bg-orange-500/10"
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
            className="border-red-500/30 text-red-300 hover:bg-red-500/10 ml-auto"
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
        <Card className="w-full h-full max-w-4xl bg-slate-950 border-[#c8a97e]/25 flex flex-col">
          {whiteboardContent}
        </Card>
      </div>
    );
  }

  return (
    <Card
      ref={containerRef}
      className="fixed bottom-4 right-4 w-96 h-96 bg-slate-950 border-[#c8a97e]/25 shadow-2xl shadow-[#c8a97e]-500/10 flex flex-col z-40 rounded-lg overflow-hidden"
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
