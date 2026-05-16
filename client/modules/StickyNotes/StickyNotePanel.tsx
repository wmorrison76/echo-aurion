import React, { useState, useEffect, useRef } from "react";
import { Trash2, Bell, Minus } from "lucide-react";
import { cn } from "@/lib/glass";

export interface StickyNote {
  id: string;
  title: string;
  content: string;
  color: string;
  createdAt: number;
  panelId: string;
  reminder?: { time: number; notified: boolean };
}

const COLORS = [
  { name: "Yellow", value: "#fef3c7" },
  { name: "Pink", value: "#fbcfe8" },
  { name: "Green", value: "#dcfce7" },
  { name: "Blue", value: "#dbeafe" },
  { name: "Purple", value: "#e9d5ff" },
  { name: "Orange", value: "#fed7aa" },
];

const REMINDER_OPTIONS = [
  { label: "15 min", hours: 0.25 },
  { label: "30 min", hours: 0.5 },
  { label: "1 hour", hours: 1 },
  { label: "2 hours", hours: 2 },
  { label: "8 hours", hours: 8 },
  { label: "1 day", hours: 24 },
];

const DEFAULT_COLOR = "#fef3c7";

function getReminderStatus(reminder?: { time: number; notified: boolean }) {
  if (!reminder) return { isOverdue: false, isPast: false };
  const now = Date.now();
  const isPast = now >= reminder.time;
  const isOverdue = isPast && !reminder.notified;
  return { isOverdue, isPast };
}

function getAgeColor(
  createdAt: number,
  baseColor: string,
  reminder?: { time: number; notified: boolean },
): string {
  const { isOverdue } = getReminderStatus(reminder);
  if (isOverdue) return "#fca5a5";
  const ageMs = Date.now() - createdAt;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays > 30) return "#d1d5db";
  if (ageDays > 14) return "#9ca3af";
  if (ageDays > 7) return "#c4b5fd";
  return baseColor;
}

/** Synchronous initial note from localStorage or default. Ensures no indefinite loading. */
function getInitialNote(panelId: string): StickyNote {
  if (typeof window === "undefined" || !panelId) {
    return {
      id: `note-${Date.now()}`,
      title: "New Note",
      content: "",
      color: DEFAULT_COLOR,
      createdAt: Date.now(),
      panelId: panelId || "notes",
    };
  }
  const saved = localStorage.getItem(`sticky-note-${panelId}`);
  if (saved) {
    try {
      const data = JSON.parse(saved) as StickyNote;
      if (
        data &&
        typeof data.id === "string" &&
        typeof data.panelId === "string"
      ) {
        return {
          id: data.id,
          title: data.title ?? "New Note",
          content: data.content ?? "",
          color: data.color ?? DEFAULT_COLOR,
          createdAt:
            typeof data.createdAt === "number" ? data.createdAt : Date.now(),
          panelId: data.panelId,
          reminder: data.reminder,
        };
      }
    } catch {
      // fall through to default
    }
  }
  return {
    id: `note-${Date.now()}`,
    title: "New Note",
    content: "",
    color: DEFAULT_COLOR,
    createdAt: Date.now(),
    panelId,
  };
}

export interface StickyNotePanelProps {
  panelId: string;
  onDelete: () => void;
  onUpdate?: (updates: Partial<StickyNote>) => void;
  onResize?: (size: { width: number; height: number }) => void;
}

export default function StickyNotePanel({
  panelId,
  onDelete,
  onUpdate,
  onResize,
}: StickyNotePanelProps) {
  const safeOnDelete = typeof onDelete === "function" ? onDelete : () => {};
  const [note, setNote] = useState<StickyNote>(() => getInitialNote(panelId));
  const [editingReminder, setEditingReminder] = useState(false);
  const [showDeleteButton, setShowDeleteButton] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const noteRef = useRef<StickyNote>(note);
  noteRef.current = note;

  // When panelId changes (e.g. remount with different id), re-initialize from storage
  useEffect(() => {
    if (!panelId) return;
    const next = getInitialNote(panelId);
    setNote(next);
  }, [panelId]);

  // Auto-save to localStorage
  useEffect(() => {
    if (!panelId || typeof window === "undefined") return;
    localStorage.setItem(`sticky-note-${panelId}`, JSON.stringify(note));
    onUpdate?.(note);
  }, [note, panelId, onUpdate]);

  // Reminder check interval
  useEffect(() => {
    const check = () => {
      const current = noteRef.current;
      if (!current?.reminder || current.reminder.notified) return;
      const now = Date.now();
      if (now < current.reminder.time) return;
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification("🔔 Reminder", {
          body: current.title
            ? `${current.title}: ${(current.content || "").substring(0, 50)}`
            : (current.content || "").substring(0, 100),
          icon: "📝",
          tag: `reminder-${current.id}`,
        });
      }
      setNote((prev) =>
        prev && prev.reminder
          ? { ...prev, reminder: { ...prev.reminder, notified: true } }
          : prev,
      );
    };
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  const requestNotificationPermission = () => {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission().catch(() => {});
    }
  };

  const { isOverdue } = getReminderStatus(note.reminder);
  const bgColor = getAgeColor(note.createdAt, note.color, note.reminder);

  return (
    <div
      className={cn(
        "rounded-lg border border-border transition-all w-full h-full flex flex-col overflow-hidden relative group",
        isOverdue && "animate-pulse",
      )}
      style={{ backgroundColor: bgColor }}
      onMouseEnter={() => setShowDeleteButton(true)}
      onMouseLeave={() => setShowDeleteButton(false)}
    >
      {/* Empty state: placeholder when content is empty */}
      <textarea
        value={note.content}
        onChange={(e) => setNote({ ...note, content: e.target.value })}
        placeholder="What's on your mind?"
        className="flex-1 min-h-[80px] bg-transparent text-xs !text-foreground resize-none outline-none leading-relaxed p-3 placeholder:text-foreground/50"
        style={{
          fontFamily:
            "'Segoe Print', 'Marker Felt', 'Comic Sans MS', cursive, sans-serif",
          fontSize: "0.95rem",
          fontWeight: 500,
          color: "black",
        }}
      />
      <style>{`
        [data-panel-id*="sticky-note"] textarea::placeholder,
        [data-panel-id="notes"] textarea::placeholder {
          color: rgba(0,0,0,0.5) !important;
        }
      `}</style>

      {/* Top-right: color picker + resize + delete */}
      {showDeleteButton && (
        <div className="absolute top-2 right-2 flex items-center gap-1 z-50">
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors bg-background rounded-full w-6 h-6 flex items-center justify-center"
            title="Note color"
          >
            ●
          </button>
          {onResize && (
            <button
              type="button"
              onClick={() => {
                const selector = `[data-panel-id="sticky-note-${panelId}"], [data-panel-id="notes"]`;
                const parentPanel = document.querySelector(
                  selector,
                ) as HTMLElement;
                const currentWidth = parentPanel?.offsetWidth ?? 225;
                const newWidth = Math.max(100, Math.round(currentWidth * 0.7));
                onResize({ width: newWidth, height: 225 });
              }}
              className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors bg-background rounded-full w-6 h-6 flex items-center justify-center"
              title="Reduce width by 30%"
            >
              <Minus size={12} />
            </button>
          )}
          <button
            type="button"
            onClick={safeOnDelete}
            className="text-xs font-bold text-muted-foreground hover:text-red-600 transition-colors bg-background rounded-full w-6 h-6 flex items-center justify-center"
            title="Delete"
          >
            ×
          </button>
        </div>
      )}

      {showColorPicker && (
        <div className="absolute top-10 right-2 bg-background border-2 border-border rounded shadow-xl p-2 z-[9999] flex gap-1 flex-wrap max-w-[140px]">
          {COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => {
                setNote((prev) => ({ ...prev, color: c.value }));
                setShowColorPicker(false);
              }}
              className="w-6 h-6 rounded border-2 border-border hover:scale-110 transition-transform"
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
        </div>
      )}

      {/* Reminder footer */}
      <div
        className={cn(
          "text-xs px-2 py-1 flex items-center justify-between border-t relative pointer-events-auto",
          note.reminder
            ? isOverdue
              ? "bg-red-200 text-red-800"
              : "bg-blue-100 text-blue-800"
            : "bg-surface text-muted-foreground",
        )}
      >
        {note.reminder ? (
          <>
            <span
              className="flex items-center gap-0.5 truncate cursor-pointer hover:opacity-70"
              onClick={() => {
                requestNotificationPermission();
                setEditingReminder(!editingReminder);
              }}
            >
              <Bell size={10} />
              {new Date(note.reminder.time).toLocaleDateString([], {
                month: "short",
                day: "numeric",
              })}{" "}
              {new Date(note.reminder.time).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditingReminder(!editingReminder);
              }}
              className="text-xs ml-1 px-1 py-0.5 hover:bg-background rounded pointer-events-auto cursor-pointer"
              title="Edit reminder"
            >
              ⏰
            </button>
          </>
        ) : (
          <>
            <span
              className="flex items-center gap-0.5 cursor-pointer hover:opacity-70"
              onClick={() => {
                requestNotificationPermission();
                setEditingReminder(!editingReminder);
              }}
            >
              <Bell size={10} /> Set reminder
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                requestNotificationPermission();
                setEditingReminder(!editingReminder);
              }}
              className="text-xs ml-1 px-1 py-0.5 hover:bg-background rounded pointer-events-auto cursor-pointer"
              title="Add reminder"
            >
              ⏰
            </button>
          </>
        )}
        {editingReminder && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-background border-2 border-border rounded shadow-xl p-3 z-[9999] pointer-events-auto">
            <p className="text-xs font-bold text-gray-800 mb-2 block">
              Remind in:
            </p>
            <div className="space-y-1">
              {REMINDER_OPTIONS.map((opt) => (
                <button
                  key={opt.hours}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const reminderTime =
                      Date.now() + opt.hours * 60 * 60 * 1000;
                    setNote((prev) => ({
                      ...prev,
                      reminder: { time: reminderTime, notified: false },
                    }));
                    setEditingReminder(false);
                  }}
                  className="w-full text-left px-2 py-1 rounded text-xs hover:bg-yellow-200 text-gray-800 transition-colors pointer-events-auto cursor-pointer font-medium"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
