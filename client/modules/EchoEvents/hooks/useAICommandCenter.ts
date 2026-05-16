import { useState, useCallback } from "react";
interface Move {
  id: string;
  sequence: number;
  action: string;
  description: string;
  status: "pending" | "executing" | "completed" | "failed";
  result?: Record<string, any>;
}
interface Command {
  id: string;
  commandText: string;
  parsedIntent: string;
}
interface UseAICommandCenterReturn {
  loading: boolean;
  error: string | null;
  sendCommand: (
    userId: string,
    commandText: string,
  ) => Promise<{ command: Command; moves: Move[] } | null>;
  getMoves: (commandId: string) => Promise<Move[]>;
  executeMove: (moveId: string) => Promise<Move | null>;
  overrideMove: (moveId: string, newAction: string) => Promise<Move | null>;
}
export const useAICommandCenter = (): UseAICommandCenterReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sendCommand = useCallback(
    async (
      userId: string,
      commandText: string,
    ): Promise<{ command: Command; moves: Move[] } | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/v1/ai-command-center/command", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ userId, commandText }),
        });
        if (!response.ok) {
          throw new Error(`Failed to send command: ${response.statusText}`);
        }
        const result = await response.json();
        return result.data;
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const getMoves = useCallback(async (commandId: string): Promise<Move[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/ai-command-center/moves/${commandId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch moves: ${response.statusText}`);
      }
      const result = await response.json();
      return result.data || [];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);
  const executeMove = useCallback(
    async (moveId: string): Promise<Move | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/v1/ai-command-center/moves/${moveId}/execute`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        if (!response.ok) {
          throw new Error(`Failed to execute move: ${response.statusText}`);
        }
        const result = await response.json();
        return result.data;
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const overrideMove = useCallback(
    async (moveId: string, newAction: string): Promise<Move | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/v1/ai-command-center/moves/${moveId}/override`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({ newAction }),
          },
        );
        if (!response.ok) {
          throw new Error(`Failed to override move: ${response.statusText}`);
        }
        const result = await response.json();
        return result.data;
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  return { loading, error, sendCommand, getMoves, executeMove, overrideMove };
};
