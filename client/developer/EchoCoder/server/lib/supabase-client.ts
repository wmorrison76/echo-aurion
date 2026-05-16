import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client safely, returning a dummy client if credentials are missing
 * This allows modules to load without errors even when environment variables aren't set
 */
export function createClient(url: string, key: string): SupabaseClient {
  // If credentials are missing, return a dummy client to prevent initialization errors
  if (!url || !key) {
    console.warn("Supabase credentials not found. Using dummy client.");
    return {
      from: () => ({
        select: () => Promise.resolve({ data: null, error: { message: "No credentials" } }),
        insert: () => Promise.resolve({ data: null, error: { message: "No credentials" } }),
        update: () => Promise.resolve({ data: null, error: { message: "No credentials" } }),
        delete: () => Promise.resolve({ data: null, error: { message: "No credentials" } }),
        upsert: () => Promise.resolve({ data: null, error: { message: "No credentials" } }),
      }),
      auth: { getSession: () => Promise.resolve({ data: { session: null }, error: null }) },
    } as any;
  }

  try {
    return createSupabaseClient(url, key);
  } catch (error) {
    console.warn("Failed to create Supabase client:", error);
    return {
      from: () => ({
        select: () => Promise.resolve({ data: null, error: { message: "Client initialization failed" } }),
        insert: () => Promise.resolve({ data: null, error: { message: "Client initialization failed" } }),
        update: () => Promise.resolve({ data: null, error: { message: "Client initialization failed" } }),
        delete: () => Promise.resolve({ data: null, error: { message: "Client initialization failed" } }),
        upsert: () => Promise.resolve({ data: null, error: { message: "Client initialization failed" } }),
      }),
    } as any;
  }
}

export { createSupabaseClient };
