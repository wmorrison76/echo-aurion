import { createClient, type SupabaseClient } from "@supabase/supabase-js";
let supabase: SupabaseClient | null = null;
export function getSupabaseClient(): SupabaseClient {
  if (supabase) {
    return supabase;
  }
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase client requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY",
    );
  }
  supabase = createClient(url, anonKey, { auth: { persistSession: false } });
  return supabase;
}
