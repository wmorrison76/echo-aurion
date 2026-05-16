/**
 * useSupabaseAuth - Compatibility layer for Supabase-style auth.
 * Re-exports useAuth from the root AuthContext for hooks that expect
 * a Supabase-like interface (user, session, isLoading).
 */
import { useAuth } from "@/context/AuthContext";

export function useSupabaseAuth() {
  const auth = useAuth();
  return {
    user: auth.user
      ? {
          ...auth.user,
          organization_id: auth.user.org_id,
        }
      : null,
    session: null,
    isLoading: auth.isLoading,
  };
}
