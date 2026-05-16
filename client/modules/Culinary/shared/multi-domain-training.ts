/** * Shared types for multi-domain training system * Used by both client and server */ export interface TrainingProfile {
  id: string;
  name: string;
  engine: string;
  domain: string;
  description: string;
  focusAreas: string[];
  learningObjectives: string[];
  exchangeCount: number;
  keywords: string[];
}
export interface DomainTrainingState {
  profileId: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  exchangesCompleted: number;
  totalExchanges: number;
  knowledgeItemsLearned: number;
  error?: string;
}
export interface MultiDomainTrainingSession {
  id: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  domainStates: Record<string, DomainTrainingState>;
  totalKnowledgeLearned: number;
  overallProgress: number;
}
