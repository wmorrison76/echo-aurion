import type { SkillNode, UserSkillState, SkillEvent } from "./types";

export function calculateLevel(xp: number, maxXp: number): number {
  if (xp <= 0) return 0;
  const ratio = xp / maxXp;
  if (ratio >= 1) return 3;
  if (ratio >= 0.66) return 2;
  if (ratio >= 0.33) return 1;
  return 0;
}

export function applySkillEvent(
  state: UserSkillState | null,
  event: SkillEvent,
  skill: SkillNode,
): UserSkillState {
  const currentXp = state?.xp ?? 0;
  const newXp = Math.min(currentXp + event.xpDelta, skill.maxXp);
  const level = calculateLevel(newXp, skill.maxXp);

  return {
    userId: event.userId,
    skillId: event.skillId,
    xp: newXp,
    level,
    lastUpdatedAt: new Date().toISOString(),
  };
}
