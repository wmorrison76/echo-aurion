import type { UUID } from "./purchasing";
export type HACCPTaskFrequency = "per_delivery" | "daily" | "weekly";
export interface HACCPChecklistTask {
  id: string;
  category: string;
  frequency: HACCPTaskFrequency;
  title: string;
  description: string;
  roles: string[];
  criticalControlPoint?: boolean;
  criticalLimit?: string | null;
  verification?: string | null;
  documentation?: string | null;
}
export interface HACCPReminder {
  id: string;
  frequency: "per_delivery" | "daily" | "weekly" | "monthly";
  title: string;
  description: string;
  timeWindow?: string | null;
  relatedTaskIds?: string[];
  escalation?: string | null;
  roles: string[];
}
export interface HACCPTrainingResource {
  label: string;
  url?: string;
}
export interface HACCPTrainingModule {
  id: string;
  title: string;
  description: string;
  objectives: string[];
  cadence: "onboarding" | "quarterly" | "biannual" | "annual" | "monthly";
  durationMinutes: number;
  delivery: "in_person" | "video" | "quiz" | "self_paced";
  roles: string[];
  resources: HACCPTrainingResource[];
}
export interface HACCPTaskStatus {
  taskId: string;
  periodKey: string;
  completedAt: string;
  count?: number;
  completedBy?: UUID | string | null;
}
export interface HACCPTrainingStatus {
  moduleId: string;
  completedAt?: string | null;
  completedBy?: UUID | string | null;
  expiresOn?: string | null;
}
