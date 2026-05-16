/** * Shared data contracts for Events, Recipes, Tasks, Skills & Equipment */ export interface Event {
  id: string;
  outlet_id: string;
  dept_id: string;
  name: string;
  service_date: string; // ISO date service_time: string; // HH:MM guest_count: number; menus: string[]; // recipe IDs chef_in_charge: string; complexity_score: number;
}
export interface Recipe {
  id: string;
  name: string;
  yield_time_minutes: number;
  prep_station: string;
  equipment: string[];
  skills_required: string[];
  dependencies: string[];
}
export interface Task {
  id: string;
  event_id: string;
  recipe_id: string;
  scheduled_start: string; // ISO timestamp scheduled_end: string; // ISO timestamp assigned_employee?: string; status:"PLANNED" |"IN_PROGRESS" |"DONE"; labor_minutes: number;
}
export interface Skill {
  id: string;
  name: string;
  level: number; // 1–5
}
export interface Equipment {
  id: string;
  name: string;
  capacity: number; // number of simultaneous tasks type: string;
}
export interface LoadSummary {
  id?: string;
  dept_id: string;
  date: string; // ISO date total_minutes: number; available_minutes: number; deficit: number;
}
