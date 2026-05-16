/** * Shift-level or period performance rating * Entered by manager; averaged into Employee.rating_avg */
export interface Rating {
  id: string;
  employee_id: string;
  outlet_id: string;
  shift_date: string;
  punctuality: number; // 1-5 quality: number; // 1-5 teamwork: number; // 1-5 guest_feedback?: number; // optional 1-5 total_score: number; // computed average reviewer_id: string; notes?: string; created_at?: string;
}
