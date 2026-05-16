/** * Database connection pool using Supabase PostgreSQL */
import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "";
if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase credentials not configured. Using local mock DB.");
}
export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
); /** * Wrapper for executing raw SQL queries (admin context) */
export async function queryDb(sql: string, params: any[] = []) {
  try {
    const { data, error } = await supabase.rpc("execute_query", {
      query: sql,
      params,
    });
    if (error) throw error;
    return { rows: data || [], error: null };
  } catch (err) {
    console.error("DB Query Error:", err);
    return { rows: [], error: err };
  }
} /** * Simple mock database for development (if Supabase not available) */
export const mockDb = {
  query: async (sql: string, params: any[] = []) => {
    console.log("Mock DB Query:", sql, params);
    return { rows: [], rowCount: 0 };
  },
}; // Use Supabase if available, otherwise mock
export const db = supabaseUrl ? supabase : mockDb;
