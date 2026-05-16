import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useOfflineStatus } from "@/hooks/use-offline-status";

const TASK_STORAGE_KEY = "collab.tasks.v1";
const THREAD_STORAGE_KEY = "collab.threads.v1";
const VERSION_STORAGE_KEY = "collab.versions.v1";
const ACTION_STORAGE_KEY = "collab.pendingActions.v1";
const SYNC_STORAGE_KEY = "collab.lastSyncedAt";

type TaskStatus = "todo" | "in_progress" | "done";

export type TeamTask = {
  id: string;
  title: string;
  description?: string;
  assignee: string;
  status: TaskStatus;
  dueDate?: string;
  relatedIngredient?: string | null;
  createdAt: number;
  updatedAt: number;
};

type FeedbackMessage = {
  id: string;
  author: string;
  message: string;
  createdAt: number;
  offline: boolean;
};

export type FeedbackThread = {
  id: string;
  topic: string;
  status: "open" | "resolved";
  relatedIngredient?: string | null;
  createdAt: number;
  updatedAt: number;
  messages: FeedbackMessage[];
};

export type VersionSnapshot = {
  id: string;
  summary: string;
  createdAt: number;
  createdBy?: string;
  auto: boolean;
  offline: boolean;
  payload: unknown;
};

type PendingAction = {
  id: string;
  type: string;
  createdAt: number;
  status: "pending" | "synced";
  payload: unknown;
  syncedAt?: number;
};

type AddTaskInput = {
  title: string;
  description?: string;
  assignee?: string;
  dueDate?: string;
  relatedIngredient?: string | null;
};

type AddFeedbackInput = {
  threadId: string;
  author: string;
  message: string;
};

type CreateThreadInput = {
  topic: string;
  relatedIngredient?: string | null;
  author: string;
  message: string;
};

type VersionInput = {
  summary: string;
  payload: unknown;
  auto?: boolean;
  createdBy?: string;
};

type CollaborationStore = {
  isOffline: boolean;
  lastChangedAt: number;
  lastSyncedAt: number | null;
  tasks: TeamTask[];
  feedback: FeedbackThread[];
  versions: VersionSnapshot[];
  pendingActions: PendingAction[];
  addTask: (input: AddTaskInput) => TeamTask;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  assignTask: (id: string, assignee: string) => void;
  addFeedbackMessage: (input: AddFeedbackInput) => void;
  createFeedbackThread: (input: CreateThreadInput) => string | null;
  resolveFeedbackThread: (threadId: string) => void;
  recordVersionSnapshot: (input: VersionInput) => VersionSnapshot | null;
};

const CollaborationContext = createContext<CollaborationStore | null>(null);

function readStorage<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Failed to persist", key, error);
  }
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const defaultTasks: TeamTask[] = [
  {
    id: uid("task"),
    title: "Validate yield on roasted carrots",
    description: "Confirm new ready-made supplier yield matches lab results.",
    assignee: "Riley",
    status: "in_progress",
    dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    relatedIngredient: "Heirloom carrots, peeled",
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 3600000,
  },
];

const defaultThreads: FeedbackThread[] = [
  {
    id: uid("thread"),
    topic: "Scale guidance for coconut panna cotta",
    status: "open",
    relatedIngredient: "coconut milk",
    createdAt: Date.now() - 7200000,
    updatedAt: Date.now() - 1800000,
    messages: [
      {
        id: uid("msg"),
        author: "Avery",
        message: "Need confirmation that agar ratio holds at triple batch.",
        createdAt: Date.now() - 7200000,
        offline: false,
      },
      {
        id: uid("msg"),
        author: "Jordan",
        message: "Lab run scheduled for tomorrow morning.",
        createdAt: Date.now() - 1800000,
        offline: false,
      },
    ],
  },
];

export function CollaborationProvider({ children }: { children: React.ReactNode }) {
  const offlineState = useOfflineStatus();
  const [tasks, setTasks] = useState<TeamTask[]>(() =>
    readStorage(TASK_STORAGE_KEY, defaultTasks),
  );
  const [threads, setThreads] = useState<FeedbackThread[]>(() =>
    readStorage(THREAD_STORAGE_KEY, defaultThreads),
  );
  const [versions, setVersions] = useState<VersionSnapshot[]>(() =>
    readStorage(VERSION_STORAGE_KEY, [] as VersionSnapshot[]),
  );
  const [pendingActions, setPendingActions] = useState<PendingAction[]>(() =>
    readStorage(ACTION_STORAGE_KEY, [] as PendingAction[]),
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(() =>
    readStorage<number | null>(SYNC_STORAGE_KEY, null),
  );
  const pendingFlushRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => writeStorage(TASK_STORAGE_KEY, tasks), [tasks]);
  useEffect(() => writeStorage(THREAD_STORAGE_KEY, threads), [threads]);
  useEffect(() => writeStorage(VERSION_STORAGE_KEY, versions), [versions]);
  useEffect(() => writeStorage(ACTION_STORAGE_KEY, pendingActions), [pendingActions]);
  useEffect(() => writeStorage(SYNC_STORAGE_KEY, lastSyncedAt), [lastSyncedAt]);

  useEffect(() => {
    if (!offlineState.isOffline) {
      setPendingActions((actions) =>
        actions.map((action) =>
          action.status === "pending"
            ? { ...action, status: "synced", syncedAt: Date.now() }
            : action,
        ),
      );
      setLastSyncedAt(Date.now());
    }
  }, [offlineState.isOffline]);

  const registerAction = useCallback((type: string, payload: unknown) => {
    setPendingActions((prev) => [
      ...prev,
      {
        id: uid("action"),
        type,
        payload,
        createdAt: Date.now(),
        status: offlineState.isOffline ? "pending" : "synced",
        syncedAt: offlineState.isOffline ? undefined : Date.now(),
      },
    ]);
  }, [offlineState.isOffline]);

  const addTask = useCallback(
    ({ title, description, assignee, dueDate, relatedIngredient }: AddTaskInput): TeamTask => {
      const task: TeamTask = {
        id: uid("task"),
        title,
        description,
        assignee: (assignee || "Unassigned").trim() || "Unassigned",
        status: "todo",
        dueDate: dueDate?.trim() || undefined,
        relatedIngredient: relatedIngredient || null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setTasks((prev) => [task, ...prev].slice(0, 100));
      registerAction("addTask", task);
      return task;
    },
    [registerAction],
  );

  const updateTaskStatus = useCallback(
    (id: string, status: TaskStatus) => {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id ? { ...task, status, updatedAt: Date.now() } : task,
        ),
      );
      registerAction("updateTaskStatus", { id, status });
    },
    [registerAction],
  );

  const assignTask = useCallback(
    (id: string, assignee: string) => {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id
            ? {
                ...task,
                assignee: assignee.trim() || task.assignee,
                updatedAt: Date.now(),
              }
            : task,
        ),
      );
      registerAction("assignTask", { id, assignee });
    },
    [registerAction],
  );

  const addFeedbackMessage = useCallback(
    ({ threadId, author, message }: AddFeedbackInput) => {
      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === threadId
            ? {
                ...thread,
                updatedAt: Date.now(),
                messages: [
                  ...thread.messages,
                  {
                    id: uid("msg"),
                    author: author.trim() || "Unknown",
                    message,
                    createdAt: Date.now(),
                    offline: offlineState.isOffline,
                  },
                ].slice(-40),
              }
            : thread,
        ),
      );
      registerAction("addFeedback", { threadId, author, message });
    },
    [offlineState.isOffline, registerAction],
  );

  const createFeedbackThread = useCallback(
    ({ topic, relatedIngredient, author, message }: CreateThreadInput) => {
      const thread: FeedbackThread = {
        id: uid("thread"),
        topic,
        status: "open",
        relatedIngredient: relatedIngredient || null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [
          {
            id: uid("msg"),
            author: author.trim() || "Unknown",
            message,
            createdAt: Date.now(),
            offline: offlineState.isOffline,
          },
        ],
      };
      setThreads((prev) => [thread, ...prev].slice(0, 50));
      registerAction("createThread", thread);
      return thread.id;
    },
    [offlineState.isOffline, registerAction],
  );

  const resolveFeedbackThread = useCallback(
    (threadId: string) => {
      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === threadId
            ? { ...thread, status: "resolved", updatedAt: Date.now() }
            : thread,
        ),
      );
      registerAction("resolveThread", { threadId });
    },
    [registerAction],
  );

  const recordVersionSnapshot = useCallback(
    ({ summary, payload, auto, createdBy }: VersionInput): VersionSnapshot | null => {
      try {
        const sanitized = JSON.parse(JSON.stringify(payload));
        const snapshot: VersionSnapshot = {
          id: uid("ver"),
          summary,
          createdAt: Date.now(),
          createdBy,
          auto: Boolean(auto),
          offline: offlineState.isOffline,
          payload: sanitized,
        };
        setVersions((prev) => [snapshot, ...prev].slice(0, 40));
        registerAction("recordVersion", { summary, auto, createdBy });

        if (!auto && pendingFlushRef.current) {
          clearTimeout(pendingFlushRef.current);
          pendingFlushRef.current = null;
        }

        return snapshot;
      } catch (error) {
        console.warn("Unable to record snapshot", error);
        return null;
      }
    },
    [offlineState.isOffline, registerAction],
  );

  useEffect(() => {
    if (!offlineState.isOffline) return;
    if (pendingFlushRef.current) return;
    pendingFlushRef.current = setTimeout(() => {
      setPendingActions((prev) => prev.slice(-50));
      pendingFlushRef.current = null;
    }, 30000);
    return () => {
      if (pendingFlushRef.current) {
        clearTimeout(pendingFlushRef.current);
        pendingFlushRef.current = null;
      }
    };
  }, [offlineState.isOffline]);

  const value = useMemo<CollaborationStore>(
    () => ({
      isOffline: offlineState.isOffline,
      lastChangedAt: offlineState.lastChangedAt,
      lastSyncedAt,
      tasks,
      feedback: threads,
      versions,
      pendingActions,
      addTask,
      updateTaskStatus,
      assignTask,
      addFeedbackMessage,
      createFeedbackThread,
      resolveFeedbackThread,
      recordVersionSnapshot,
    }),
    [
      addTask,
      assignTask,
      updateTaskStatus,
      addFeedbackMessage,
      createFeedbackThread,
      resolveFeedbackThread,
      recordVersionSnapshot,
      offlineState.isOffline,
      offlineState.lastChangedAt,
      lastSyncedAt,
      tasks,
      threads,
      versions,
      pendingActions,
    ],
  );

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaboration() {
  const ctx = useContext(CollaborationContext);
  if (!ctx) throw new Error("useCollaboration must be used within CollaborationProvider");
  return ctx;
}
