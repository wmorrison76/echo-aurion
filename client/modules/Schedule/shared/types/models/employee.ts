/** * Employee master record * Includes identity, position, pay data, and skill references */
export interface Employee {
  id: string; // UUID org_id: string; // tenant/org link outlet_id: string; // outlet or department first_name: string; last_name: string; role_title: string; // e.g. 'Server', 'Pastry Chef' position_tier: number; // 1-5 for seniority hourly_rate: number; overtime_mult?: number; // e.g. 1.5 for OT rate status:"ACTIVE" |"INACTIVE"; hire_date: string; certifications?: string[]; // e.g. ['Food Safety', 'TIPS'] availability: Record<string, boolean>; // { mon_am: true, tue_pm: false } skills: string[]; // FK -> Skill.slug rating_avg?: number; // cached avg from Rating table next_review_date?: string; created_at?: string; updated_at?: string;
}
