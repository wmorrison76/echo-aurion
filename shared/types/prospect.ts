export type ProspectStage =
  | "prospect"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "beo_created"
  | "lost";

export type ProspectEventTypeCode = "WED" | "COR" | "BAN" | "SEM" | "OTH";

export interface Prospect {
  id: string;
  org_id?: string;
  outlet_id?: string;
  owner_id?: string | null;
  name: string;
  contact_name?: string | null;
  email: string;
  phone?: string | null;
  status: ProspectStage;
  event_type_code: ProspectEventTypeCode;
  event_date: string;
  guest_count?: number | null;
  estimated_revenue?: number | null;
  description?: string | null;
  scheduling_conflicts?: any;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProspectCalendarEvent {
  id: string;
  type: "potential" | "confirmed";
  prospect_id: string;
  event_id?: string;
  title: string;
  date: string;
  dateTime?: string;
  outlet_id?: string;
  guest_count?: number;
  estimated_revenue?: number;
  event_type_code: ProspectEventTypeCode | string;
  status: ProspectStage;
  contact_email: string;
  risk_level: "low" | "medium" | "high";
  scheduling_conflicts?: any;
}
