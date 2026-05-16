/**
 * Supabase Client Configuration
 * Handles connection to Supabase for design sessions and collaboration
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[Supabase] Missing configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
  );
}

export const supabase = createClient(
  supabaseUrl || "",
  supabaseAnonKey || ""
);

/**
 * Test connection to Supabase
 */
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("design_sessions")
      .select("id")
      .limit(1);

    if (error) {
      console.error("[Supabase] Connection test failed:", error);
      return false;
    }

    console.log("[Supabase] Connection successful");
    return true;
  } catch (error) {
    console.error("[Supabase] Connection test error:", error);
    return false;
  }
}
