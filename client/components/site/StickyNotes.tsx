import { useState, useEffect, useRef } from "react";
import { Trash2, Bell, Copy, Pin, Minus } from "lucide-react";
import { cn } from "@/lib/glass";

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  color: string;
  reminder?: {
    time: number;
    notified: boolean;
  };
  pinned: boolean;
  isMinimized: boolean;
  position?: { x: number; y: number };
}

const DEFAULT_COLOR = "#fef3c7"; // Yellow
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

function getReminderStatus(reminder?: { time: number; notified: boolean }) {
  if (!reminder) return { isOverdue: false, isPast: false };
  
  const now = Date.now();
  const isPast = now >= reminder.time;
  const isOverdue = isPast && !reminder.notified;
  
  return { isOverdue, isPast };
}

function getAgeColor(createdAt: number, baseColor: string, reminder?: { time: number; notified: boolean }): string {
  const { isOverdue } = getReminderStatus(reminder);
  
  if (isOverdue) {
    return "#fca5a5";
  }

  const ageMs = Date.now() - createdAt;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageDays > 30) {
    return "#d1d5db";
  } else if (ageDays > 14) {
    return "#9ca3af";
  } else if (ageDays > 7) {
    return "#c4b5fd";
  }

  return baseColor;
}

function FloatingNote({
  note,
  onUpdate,
  onDelete,
  onDuplicate,
  onSetReminder,
}: {
  note: Note;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onSetReminder: (id: string, hours: number) => void;
}) {
  const [isHovering, setIsHovering] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingReminder, setEditingReminder] = useState(false);
  const [tempTitle, setTempTitle] = useState(note.title);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const titleInputRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const { isOverdue } = getReminderStatus(note.reminder);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('input, textarea, button')) return;
    
    const rect = noteRef.current?.getBoundingClientRect();
    if (rect) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (noteRef.current) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        noteRef.current.style.position = 'fixed';
        noteRef.current.style.left = `${newX}px`;
        noteRef.current.style.top = `${newY}px`;
      }
    };

    const handleMouseUp = () => {
      if (noteRef.current) {
        const rect = noteRef.current.getBoundingClientRect();
        onUpdate(note.id, {
          position: { x: rect.left, y: rect.top },
        });
      }
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, note.id, onUpdate]);

  const handleSnooze = () => {
    const snoozeUntil = Date.now() + 15 * 60 * 1000;
    onUpdate(note.id, {
      reminder: { time: snoozeUntil, notified: false },
    });
  };

  const bgColor = getAgeColor(note.createdAt, note.color, note.reminder);

  // Minimized state - small draggable icon
  if (note.isMinimized) {
    return (
      <div
        ref={noteRef}
        onMouseDown={handleMouseDown}
        className={cn(
          "w-12 h-12 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-lg cursor-move flex-shrink-0",
          isDragging && "shadow-2xl"
        )}
        style={{
          position: 'fixed',
          left: note.position?.x ? `${note.position.x}px` : '20px',
          top: note.position?.y ? `${note.position.y}px` : '100px',
          backgroundColor: bgColor,
          zIndex: 40,
        }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        title={note.title || "Untitled note"}
      >
        <button
          onClick={() => onUpdate(note.id, { isMinimized: false })}
          className="w-full h-full flex items-center justify-center hover:scale-110 transition-transform"
          onMouseDown={(e) => e.stopPropagation()}
        >
          📝
        </button>

        {/* Hover preview */}
        <div
          className={cn(
            "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 rounded-lg shadow-xl border-2 border-black/10 backdrop-blur-sm pointer-events-none z-50 transition-opacity whitespace-normal",
            isHovering ? "opacity-100" : "opacity-0"
          )}
          style={{ backgroundColor: bgColor }}
        >
          <p className="font-semibold text-xs text-gray-800 truncate">
            {note.title || "Untitled"}
          </p>
          <p className="text-xs text-gray-700 mt-1 line-clamp-3">
            {note.content || "(empty note)"}
          </p>
        </div>
      </div>
    );
  }

  // Expanded floating note
  return (
    <div
      ref={noteRef}
      onMouseDown={handleMouseDown}
      className={cn(
        "w-64 flex flex-col h-80 p-3 rounded shadow-lg transition-all cursor-move flex-shrink-0",
        isDragging && "shadow-2xl",
        isOverdue && "animate-pulse"
      )}
      style={{
        position: 'fixed',
        left: note.position?.x ? `${note.position.x}px` : 'auto',
        top: note.position?.y ? `${note.position.y}px` : 'auto',
        backgroundColor: bgColor,
        transform: note.position ? 'none' : "rotate(-1deg)",
        boxShadow: isOverdue 
          ? "0 0 20px rgba(252, 165, 165, 0.6), 0 4px 12px rgba(0, 0, 0, 0.15)"
          : "0 4px 12px rgba(0, 0, 0, 0.15), 2px 2px 0px rgba(0, 0, 0, 0.1)",
        zIndex: 40,
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Title */}
      <div className="flex-shrink-0 mb-2">
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={tempTitle}
            onChange={(e) => setTempTitle(e.target.value)}
            onBlur={() => {
              onUpdate(note.id, { title: tempTitle });
              setIsEditingTitle(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onUpdate(note.id, { title: tempTitle });
                setIsEditingTitle(false);
              }
            }}
            className="w-full bg-transparent border-b border-gray-400 text-sm font-semibold text-gray-800 outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <button
            onClick={() => setIsEditingTitle(true)}
            className="text-left text-sm font-semibold text-gray-800 hover:underline"
            title="Click to edit"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {note.title || "Untitled note"}
          </button>
        )}
      </div>

      {/* Content textarea */}
      <textarea
        value={note.content}
        onChange={(e) => onUpdate(note.id, { content: e.target.value })}
        placeholder="What's on your mind?"
        className="flex-1 bg-transparent text-sm text-gray-800 resize-none outline-none placeholder-gray-500 leading-relaxed"
        style={{
          fontFamily: "'Comic Sans MS', 'Segoe UI', cursive, sans-serif",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      />

      {/* Reminder indicator */}
      {note.reminder && (
        <div className={cn(
          "text-xs mb-2 px-2 py-1 rounded flex items-center justify-between",
          isOverdue ? "bg-red-200 text-red-800" : "bg-blue-100 text-blue-800"
        )}>
          <span className="flex items-center gap-1">
            <Bell size={12} />
            {new Date(note.reminder.time).toLocaleDateString([], {
              month: "short",
              day: "numeric",
            })}{" "}
            {new Date(note.reminder.time).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {isOverdue && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSnooze();
              }}
              className="text-xs font-semibold hover:underline ml-2"
              title="Snooze for 15 minutes"
            >
              Snooze
            </button>
          )}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center gap-1 justify-between mt-auto pt-2 border-t border-gray-300/50 flex-shrink-0">
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(note.id, { pinned: !note.pinned });
            }}
            className="p-1 hover:bg-black/10 rounded transition-colors"
            title={note.pinned ? "Unpin" : "Pin"}
          >
            <Pin
              size={14}
              className={cn("text-gray-700", note.pinned && "fill-current")}
            />
          </button>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingReminder(!editingReminder);
              }}
              className="p-1 hover:bg-black/10 rounded transition-colors"
              title="Set reminder"
            >
              <Bell
                size={14}
                className={cn(
                  "text-gray-700",
                  isOverdue && "fill-current text-red-600",
                  note.reminder && !isOverdue && "fill-current text-blue-600",
                )}
              />
            </button>

            {editingReminder && (
              <div className="absolute bottom-full right-0 mb-2 bg-white border-2 border-gray-300 rounded-lg shadow-lg p-2 min-w-[120px] z-50">
                <p className="text-xs font-semibold text-gray-800 mb-2">
                  Remind in:
                </p>
                <div className="space-y-1">
                  {REMINDER_OPTIONS.map((opt) => (
                    <button
                      key={opt.hours}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetReminder(note.id, opt.hours);
                        setEditingReminder(false);
                      }}
                      className="w-full text-left px-2 py-1 rounded text-xs hover:bg-yellow-100 text-gray-800 transition-colors"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(note.id);
            }}
            className="p-1 hover:bg-black/10 rounded transition-colors"
            title="Duplicate"
          >
            <Copy size={14} className="text-gray-700" />
          </button>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onUpdate(note.id, { isMinimized: true });
          }}
          className="p-1 hover:bg-black/10 rounded transition-colors"
          title="Minimize"
        >
          <Minus size={14} className="text-gray-700" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(note.id);
          }}
          className="p-1 hover:bg-red-200 rounded transition-colors"
          title="Delete"
        >
          <Trash2 size={14} className="text-red-600" />
        </button>
      </div>
    </div>
  );
}

interface StickyNotesProps {
  defaultColor?: string;
}

export default function StickyNotes({
  defaultColor = DEFAULT_COLOR,
}: StickyNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedColorForNew, setSelectedColorForNew] = useState(defaultColor);

  // Load notes from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sticky-notes");
    if (saved) {
      try {
        setNotes(JSON.parse(saved));
      } catch {
        setNotes([]);
      }
    }
  }, []);

  // Save notes to localStorage
  useEffect(() => {
    localStorage.setItem("sticky-notes", JSON.stringify(notes));
  }, [notes]);

  // Check for reminders
  useEffect(() => {
    const interval = setInterval(() => {
      setNotes((prevNotes) =>
        prevNotes.map((note) => {
          if (
            note.reminder &&
            !note.reminder.notified &&
            Date.now() >= note.reminder.time
          ) {
            if (
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              new Notification("🔔 Reminder", {
                body: note.title
                  ? `${note.title}: ${note.content.substring(0, 50)}`
                  : note.content.substring(0, 100),
                icon: "📝",
                tag: `reminder-${note.id}`,
              });
            }

            return {
              ...note,
              reminder: { ...note.reminder, notified: true },
            };
          }
          return note;
        }),
      );
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Listen for add note event from toolbar
  useEffect(() => {
    const handleAddNote = () => {
      addNote();
    };

    window.addEventListener("add-sticky-note", handleAddNote);
    return () => window.removeEventListener("add-sticky-note", handleAddNote);
  }, []);

  const addNote = () => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: "New Note",
      content: "",
      createdAt: Date.now(),
      color: selectedColorForNew,
      pinned: false,
      isMinimized: false,
      position: { x: 20 + Math.random() * 100, y: 100 + Math.random() * 100 },
    };

    setNotes((prev) => [newNote, ...prev]);
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, ...updates } : note)),
    );
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
  };

  const duplicateNote = (id: string) => {
    const noteToDuplicate = notes.find((n) => n.id === id);
    if (noteToDuplicate) {
      const newNote: Note = {
        ...noteToDuplicate,
        id: `note-${Date.now()}`,
        createdAt: Date.now(),
        title: `${noteToDuplicate.title} (copy)`,
        reminder: undefined,
        isMinimized: false,
        position: {
          x: (noteToDuplicate.position?.x || 20) + 30,
          y: (noteToDuplicate.position?.y || 100) + 30,
        },
      };
      setNotes((prev) => [newNote, ...prev]);
    }
  };

  const setReminder = (id: string, hours: number) => {
    const reminderTime = Date.now() + hours * 60 * 60 * 1000;
    updateNote(id, {
      reminder: { time: reminderTime, notified: false },
    });
  };

  return (
    <>
      {/* Render all floating notes */}
      {notes.map((note) => (
        <FloatingNote
          key={note.id}
          note={note}
          onUpdate={updateNote}
          onDelete={deleteNote}
          onDuplicate={duplicateNote}
          onSetReminder={setReminder}
        />
      ))}
    </>
  );
}
