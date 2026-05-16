import { supabase } from "../lib/db";
export async function logEvent({
  org_id,
  outlet_id,
  dept_id,
  actor_id,
  action,
  entity,
  entity_id,
  details = {},
}: {
  org_id: string;
  outlet_id?: string;
  dept_id?: string;
  actor_id: string;
  action: string;
  entity: string;
  entity_id: string;
  details?: Record<string, any>;
}) {
  try {
    const { error } = await supabase.from("audit_logs").insert({
      org_id,
      outlet_id: outlet_id || null,
      dept_id: dept_id || null,
      actor_id,
      action,
      entity,
      entity_id,
      details: JSON.stringify(details),
      created_at: new Date().toISOString(),
    });
    if (error) {
      console.error("Audit log error:", error);
    }
  } catch (err) {
    console.error("Audit logging error:", err);
  }
}
