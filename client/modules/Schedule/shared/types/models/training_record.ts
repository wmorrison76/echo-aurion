/** * Tracks training or certification sessions */
export interface TrainingRecord {
  id: string;
  employee_id: string;
  training_name: string;
  provider: string;
  start_date: string;
  end_date?: string;
  completion_status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "EXPIRED";
  score?: number;
  certificate_url?: string;
  verified_by?: string;
  created_at?: string;
}
