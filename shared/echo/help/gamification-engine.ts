import type { UserSkillState, BadgeDefinition, GamificationSnapshot } from "./types";

export const DEFAULT_BADGES: BadgeDefinition[] = [
  {
    id: "first-steps",
    name: "First Steps",
    description: "Complete your first mission.",
    criteria: (skills) => skills.some((s) => s.xp > 0),
  },
  {
    id: "skill-explorer",
    name: "Skill Explorer",
    description: "Earn XP in 3 different skills.",
    criteria: (skills) => {
      const uniqueSkills = new Set(skills.map((s) => s.skillId));
      return uniqueSkills.size >= 3;
    },
  },
  {
    id: "level-up",
    name: "Level Up",
    description: "Reach level 2 in any skill.",
    criteria: (skills) => skills.some((s) => s.level >= 2),
  },
  {
    id: "master",
    name: "Master",
    description: "Reach level 3 in any skill.",
    criteria: (skills) => skills.some((s) => s.level >= 3),
  },
  {
    id: "polymath",
    name: "Polymath",
    description: "Reach level 2 in 5 different skills.",
    criteria: (skills) => {
      const level2Skills = skills.filter((s) => s.level >= 2);
      const unique = new Set(level2Skills.map((s) => s.skillId));
      return unique.size >= 5;
    },
  },
];

export function evaluateBadgesForUser(
  userId: string,
  skills: UserSkillState[],
  badges?: BadgeDefinition[],
): string[] {
  const badgeList = badges || DEFAULT_BADGES;
  return badgeList.filter((b) => b.criteria(skills)).map((b) => b.id);
}

export function calculateUserGamificationSnapshot(
  userId: string,
  skills: UserSkillState[],
  badges?: BadgeDefinition[],
): GamificationSnapshot {
  const totalXp = skills.reduce((sum, s) => sum + s.xp, 0);
  const level = totalXp >= 2000 ? 5 : totalXp >= 1000 ? 4 : totalXp >= 500 ? 3 : 1;
  const earnedBadges = evaluateBadgesForUser(userId, skills, badges);

  return {
    userId,
    totalXp,
    level,
    badges: earnedBadges,
  };
}
