import type { UserSkillState, LearningProgram, ProgramProgress } from "./types";

export function evaluateProgramProgress(
  program: LearningProgram,
  userId: string,
  allSkills: UserSkillState[],
): ProgramProgress {
  const userSkills = allSkills.filter((s) => s.userId === userId);
  const required = program.requiredSkillIds;

  if (!required.length) {
    return {
      programId: program.id,
      userId,
      completion: 0,
      eligibleForCertificate: false,
    };
  }

  const completedCount = required.filter((skillId) =>
    userSkills.some((s) => s.skillId === skillId && s.level >= 2),
  ).length;

  const completion = completedCount / required.length;
  const totalXp = userSkills.reduce((sum, s) => sum + s.xp, 0);
  const eligibleForCertificate = completion >= 0.8 && totalXp >= program.minTotalXp;

  return {
    programId: program.id,
    userId,
    completion,
    eligibleForCertificate,
  };
}
