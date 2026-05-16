import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL as string | undefined;
const anon = process.env.SUPABASE_ANON_KEY as string | undefined;

export function getSupabase(){
  if (!url || !anon) return null;
  return createClient(url, anon, { auth: { persistSession: false } });
}
