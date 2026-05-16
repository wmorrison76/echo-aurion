import { useState, useCallback } from "react";
import type { UserSkillState } from "@shared/echo/help/types";

interface SkillAwardResponse {
  success: boolean;
  userSkill: UserSkillState;
  message: string;
}

interface SkillProgressResponse {
  userId: string;
  skills: UserSkillState[];
  totalXp: number;
  level: number;
}

export function useEchoSkills(userId?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skills, setSkills] = useState<UserSkillState[]>([]);

  // Award XP for a skill
  const awardXp = useCallback(
    async (
      skillId: string,
      xpDelta: number,
      source: "mission" | "article" | "badge" | "manual" | "admin" = "manual",
      sourceId?: string,
      notes?: string,
    ): Promise<UserSkillState | null> => {
      if (!userId) {
        setError("No user ID provided");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/help/skill/award", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            skillId,
            xpDelta,
            source,
            sourceId,
            notes,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Failed to award XP");
          return null;
        }

        const data = (await response.json()) as SkillAwardResponse;
        return data.userSkill;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [userId],
  );

  // Get user's skill progress
  const getProgress = useCallback(async () => {
    if (!userId) {
      setError("No user ID provided");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/help/skill/progress?userId=${userId}`);

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to fetch progress");
        return null;
      }

      const data = (await response.json()) as SkillProgressResponse;
      setSkills(data.skills);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Log telemetry event (non-blocking, errors are silent)
  const logEvent = useCallback(
    (
      eventType: string,
      payload?: any,
      opts?: { module?: string; route?: string; role?: string },
    ) => {
      // Fire and forget - don't await
      fetch("/api/help/telemetry/log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          eventType,
          payload,
          ...opts,
        }),
      }).catch((err) => {
        // Silently fail - telemetry is not critical
        console.debug("[EchoSkills] Telemetry log failed:", err);
      });
    },
    [userId],
  );

  return {
    skills,
    loading,
    error,
    awardXp,
    getProgress,
    logEvent,
  };
}
