/** * Skill or certification taxonomy * Shared across departments (Pastry, FOH, Banquets, etc.) */
export interface Skill {
  id: string;
  org_id: string;
  slug: string; // unique key e.g. 'latte_art', 'garde_manger' name: string; category:"SERVICE" |"PRODUCTION" |"MANAGEMENT"; description?: string; tier_levels: number; // e.g. 5 created_at?: string;
}
