export type HelpContextId = string;
export type KcsState = "draft" | "verified" | "flagged";
export type MissionDifficulty = "beginner" | "intermediate" | "expert";
export type HelpMissionActionType = "click" | "fill" | "read" | "navigate";

export interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  body: string;
  module: string;
  routePattern?: string;
  contextIds: HelpContextId[];
  audienceRoles: string[];
  kcsState: KcsState;
  tags: string[];
  lastUpdatedAt: string;
  createdBy?: string;
}

export interface HelpMissionStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  actionType: HelpMissionActionType;
  completionEvent?: string;
}

export interface HelpMission {
  id: string;
  slug: string;
  title: string;
  description: string;
  module: string;
  roles: string[];
  steps: HelpMissionStep[];
  difficulty: MissionDifficulty;
}

export interface HelpContextBinding {
  contextId: HelpContextId;
  title: string;
  description: string;
  module: string;
  routePattern?: string;
  primaryArticle?: HelpArticle;
  relatedArticles?: HelpArticle[];
}

export interface EchoHelpAnswer {
  answer: string;
  sourceArticles: { id: string; title: string; slug: string }[];
  confidence: number;
  followUps: string[];
}

export interface HelpSearchResult {
  articles: HelpArticle[];
  total: number;
}

export interface EchoHelpTelemetryEvent {
  type:
    | "help.search"
    | "help.ask"
    | "help.context.open"
    | "help.mission.start"
    | "help.mission.step"
    | "help.mission.complete"
    | "help.feedback";
  userId?: string;
  role?: string;
  module?: string;
  route?: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface SkillNode {
  id: string;
  name: string;
  domain: string;
  description: string;
  prerequisites: string[];
  maxXp: number;
  tags: string[];
}

export interface UserSkillState {
  userId: string;
  skillId: string;
  xp: number;
  level: number;
  lastUpdatedAt: string;
}

export interface SkillEvent {
  userId: string;
  skillId: string;
  xpDelta: number;
  source: "mission" | "quiz" | "assessment" | "system";
  metadata?: Record<string, unknown>;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  criteria: (skills: UserSkillState[]) => boolean;
}

export interface LearningProgram {
  id: string;
  name: string;
  description: string;
  domain: string;
  requiredSkillIds: string[];
  recommendedMissionIds: string[];
  minTotalXp: number;
}

export interface ProgramProgress {
  programId: string;
  userId: string;
  completion: number;
  eligibleForCertificate: boolean;
}

export interface GamificationSnapshot {
  userId: string;
  totalXp: number;
  level: number;
  badges: string[];
}

export interface FrictionCluster {
  id: string;
  module: string;
  routePattern?: string;
  workflowName: string;
  occurrences: number;
  avgFrictionScore: number;
  topEvents: string[];
  representativePath: string[];
  suggestedSelectors?: string[];
}
