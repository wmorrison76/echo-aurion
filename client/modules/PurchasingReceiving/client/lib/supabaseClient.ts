import { createClient } from "@supabase/supabase-js";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
} /** * Supabase client instance * Used for all database operations with RLS policies enforced */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: { params: { eventsPerSecond: 10 } },
}); /** * Helper function for handling Supabase errors */
export function handleSupabaseError(error: any): string {
  console.error("Supabase error:", error);
  if (error?.message) {
    return error.message;
  }
  if (error?.status) {
    return `Error ${error.status}: ${error.statusText || "Unknown error"}`;
  }
  return "An unexpected error occurred";
} /** * Helper function to ensure authenticated user */
export async function getAuthenticatedUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("User not authenticated");
  }
  return user;
} /** * Helper function to get organization ID from user session * Assumes org_id is stored in user metadata or needs to be queried */
export async function getUserOrganization() {
  const user = await getAuthenticatedUser();
  const { data, error } = await supabase
    .from("org_memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();
  if (error) {
    throw new Error("Failed to retrieve user organization");
  }
  return data.organization_id;
} /** * Helper to execute a query with automatic error handling */
export async function executeQuery<T>(
  query: Promise<{ data: T | null; error: any }>,
): Promise<T> {
  const { data, error } = await query;
  if (error) {
    throw new Error(handleSupabaseError(error));
  }
  if (data === null) {
    throw new Error("No data returned from query");
  }
  return data;
} /** * Subscribe to real-time changes on a table * Usage: subscribeToTable('purchase_orders', handlePOChange) */
export function subscribeToTable(
  table: string,
  callback: (payload: any) => void,
  filter?: { column: string; operator: string; value: any },
) {
  const subscription = supabase
    .channel(`public:${table}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: table },
      callback,
    )
    .subscribe();
  return subscription;
}
export default supabase;
