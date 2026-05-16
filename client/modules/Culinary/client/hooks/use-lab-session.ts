import { useState, useEffect, useCallback } from "react";
import { FontStyle } from "@/components/RDLab/EnhancedLabWhiteboard";

interface WhiteboardEntry {
  id: string;
  type: "hypothesis" | "step" | "observation" | "measurement" | "note";
  content: string;
  timestamp: Date;
}

interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface LabSessionData {
  projectId: string;
  projectName: string;
  entries: WhiteboardEntry[];
  conversationHistory: ConversationMessage[];
  fontStyle: FontStyle;
  doorsOpen: boolean;
  createdAt: string;
  lastModified: string;
  labMode: "culinary" | "pastry";
  track: "fine-dining" | "manufacturing";
}

const STORAGE_PREFIX = "lab_session_";

export function useLabSession(projectId: string) {
  const [sessionData, setSessionData] = useState<LabSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load session from localStorage
  useEffect(() => {
    const loadSession = () => {
      try {
        const key = `${STORAGE_PREFIX}${projectId}`;
        const stored = localStorage.getItem(key);

        if (stored) {
          const parsed = JSON.parse(stored);
          // Convert timestamp strings back to Date objects
          const entries = (parsed.entries || []).map((entry: any) => ({
            ...entry,
            timestamp: new Date(entry.timestamp),
          }));
          setSessionData({
            ...parsed,
            entries,
          });
        } else {
          // Initialize new session
          const newSession: LabSessionData = {
            projectId,
            projectName: "",
            entries: [],
            conversationHistory: [],
            fontStyle: "chalkboard",
            doorsOpen: false,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            labMode: "culinary",
            track: "fine-dining",
          };
          setSessionData(newSession);
        }
      } catch (err) {
        console.error("Failed to load lab session:", err);
        setSessionData({
          projectId,
          projectName: "",
          entries: [],
          conversationHistory: [],
          fontStyle: "chalkboard",
          doorsOpen: false,
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          labMode: "culinary",
          track: "fine-dining",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [projectId]);

  // Save session to localStorage
  const saveSession = useCallback(
    (updates: Partial<LabSessionData>) => {
      setSessionData((prev) => {
        if (!prev) return null;

        const updated: LabSessionData = {
          ...prev,
          ...updates,
          lastModified: new Date().toISOString(),
        };

        try {
          const key = `${STORAGE_PREFIX}${projectId}`;
          localStorage.setItem(key, JSON.stringify(updated));
        } catch (err) {
          console.error("Failed to save lab session:", err);
        }

        return updated;
      });
    },
    [projectId]
  );

  // Update project info
  const updateProject = useCallback(
    (projectName: string, labMode: "culinary" | "pastry", track: "fine-dining" | "manufacturing") => {
      saveSession({ projectName, labMode, track });
    },
    [saveSession]
  );

  // Update whiteboard entries
  const updateEntries = useCallback(
    (entries: WhiteboardEntry[]) => {
      saveSession({ entries });
    },
    [saveSession]
  );

  // Add conversation message
  const addMessage = useCallback(
    (message: ConversationMessage) => {
      setSessionData((prev) => {
        if (!prev) return null;

        const updated: LabSessionData = {
          ...prev,
          conversationHistory: [...prev.conversationHistory, message],
          lastModified: new Date().toISOString(),
        };

        try {
          const key = `${STORAGE_PREFIX}${projectId}`;
          localStorage.setItem(key, JSON.stringify(updated));
        } catch (err) {
          console.error("Failed to save lab session:", err);
        }

        return updated;
      });
    },
    [projectId]
  );

  // Update font style
  const setFontStyle = useCallback(
    (fontStyle: FontStyle) => {
      saveSession({ fontStyle });
    },
    [saveSession]
  );

  // Toggle doors state
  const setDoorsOpen = useCallback(
    (doorsOpen: boolean) => {
      saveSession({ doorsOpen });
    },
    [saveSession]
  );

  // Clear session
  const clearSession = useCallback(() => {
    try {
      const key = `${STORAGE_PREFIX}${projectId}`;
      localStorage.removeItem(key);
      setSessionData({
        projectId,
        projectName: "",
        entries: [],
        conversationHistory: [],
        fontStyle: "chalkboard",
        doorsOpen: false,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        labMode: "culinary",
        track: "fine-dining",
      });
    } catch (err) {
      console.error("Failed to clear lab session:", err);
    }
  }, [projectId]);

  // Get all sessions (for cleanup, etc.)
  const getAllSessions = useCallback(() => {
    try {
      const sessions: LabSessionData[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_PREFIX)) {
          const stored = localStorage.getItem(key);
          if (stored) {
            sessions.push(JSON.parse(stored));
          }
        }
      }
      return sessions;
    } catch (err) {
      console.error("Failed to get all sessions:", err);
      return [];
    }
  }, []);

  return {
    sessionData,
    isLoading,
    saveSession,
    updateProject,
    updateEntries,
    addMessage,
    setFontStyle,
    setDoorsOpen,
    clearSession,
    getAllSessions,
  };
}
