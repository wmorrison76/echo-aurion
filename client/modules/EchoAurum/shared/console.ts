export interface ConsoleMetric {
  label: string;
  value: string;
  change: string;
}
export interface ConsoleQuickAction {
  title: string;
  description: string;
  action: string;
  to: string;
}
export interface ConsoleModuleMetric {
  label: string;
  value: string;
}
export interface ConsoleModuleDetail {
  id: string;
  badge: string;
  name: string;
  summary: string;
  metrics: ConsoleModuleMetric[];
  controls: string[];
  workflows: string[];
}
export interface ConsoleActivityItem {
  time: string;
  title: string;
  detail: string;
  actor: string;
}
export interface ConsoleGuardrail {
  title: string;
  description: string;
}
export interface ConsoleOverview {
  hero: { title: string; subtitle: string; description: string } | null;
  metrics: ConsoleMetric[];
  quickActions: ConsoleQuickAction[];
  modules: ConsoleModuleDetail[];
  activity: ConsoleActivityItem[];
  guardrails: ConsoleGuardrail[];
  complianceBadges: string[];
}
