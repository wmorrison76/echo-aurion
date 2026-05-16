/** * Publish Workflow Service * Controls schedule publishing, acknowledgements, and audit trails */ import { getSupabase } from "../lib/supabase";
export async function publishSchedule({
  schedule_id,
  manager_id,
  notes,
}: {
  schedule_id: string;
  manager_id: string;
  notes?: string;
}) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not initialized"); // Insert or update publish audit const { error: auditError } = await supabase .from("publish_audits") .upsert( { schedule_id, manager_id, status:"PUBLISHED", notes: notes || null, published_at: new Date().toISOString(), }, { onConflict:"schedule_id" } ); if (auditError) throw auditError; // Mark schedule as published const { error: updateError } = await supabase .from("schedules") .update({ is_published: true, published_at: new Date().toISOString(), }) .eq("id", schedule_id); if (updateError) throw updateError; // TODO: Trigger notifications (SSE, email, SMS) console.log(`Schedule ${schedule_id} published by ${manager_id}`); return { ok: true, schedule_id };
}
export async function acknowledge({
  schedule_id,
  employee_id,
}: {
  schedule_id: string;
  employee_id: string;
}) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not initialized");
  const { error } = await supabase
    .from("publish_acknowledgements")
    .upsert(
      { schedule_id, employee_id, ack_ts: new Date().toISOString() },
      { onConflict: "schedule_id,employee_id" },
    );
  if (error) throw error;
  console.log(`Employee ${employee_id} acknowledged schedule ${schedule_id}`);
  return { ok: true };
}
export async function reopenSchedule({
  schedule_id,
  manager_id,
}: {
  schedule_id: string;
  manager_id: string;
}) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not initialized"); // Mark schedule as not published const { error: updateError } = await supabase .from("schedules") .update({ is_published: false }) .eq("id", schedule_id); if (updateError) throw updateError; // Insert reopened audit entry const { error: auditError } = await supabase .from("publish_audits") .insert({ schedule_id, manager_id, status:"REOPENED", published_at: new Date().toISOString(), }); if (auditError) throw auditError; console.log(`Schedule ${schedule_id} reopened by ${manager_id}`); return { ok: true };
}
export async function getAckStatus({
  schedule_id,
}: {
  schedule_id: string;
}): Promise<{
  total_employees: number;
  acknowledged: number;
  pending: number;
  ack_rate: number;
}> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not initialized"); // Get all employees for this schedule const { data: scheduleShifts } = await supabase .from("shifts") .select("employee_id") .eq("schedule_id", schedule_id); const empIds = [ ...new Set((scheduleShifts || []).map((s: any) => s.employee_id)), ]; if (empIds.length === 0) { return { total_employees: 0, acknowledged: 0, pending: 0, ack_rate: 0 }; } // Get acknowledgements const { data: acks } = await supabase .from("publish_acknowledgements") .select("employee_id") .eq("schedule_id", schedule_id); const ackCount = (acks || []).length; const totalCount = empIds.length; const pendingCount = totalCount - ackCount; return { total_employees: totalCount, acknowledged: ackCount, pending: pendingCount, ack_rate: totalCount > 0 ? (ackCount / totalCount) * 100 : 0, };
}
