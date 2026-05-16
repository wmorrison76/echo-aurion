/** * Individual employee growth roadmap * Echo AI will read this to recommend training paths */
export interface DevelopmentPlan {
  id: string;
  employee_id: string;
  goal_title: string; // e.g. 'Move to Banquet Captain' description: string; target_date: string; status:"PLANNED" |"IN_PROGRESS" |"COMPLETED"; milestones: { label: string; due_date: string; completed: boolean; }[]; ai_recommendation?: string; // auto-filled by Echo created_at?: string; updated_at?: string;
}
