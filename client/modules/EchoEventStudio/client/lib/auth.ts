import { createClient } from "@supabase/supabase-js";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
export const supabase = createClient(supabaseUrl, supabaseKey);
export type User = {
  id: string;
  email?: string;
  user_metadata?: { name?: string; avatar_url?: string; organization?: string };
};
export async function signUpWithEmail(
  email: string,
  password: string,
  metadata?: Record<string, any>,
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { data, error };
}
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  return { data, error };
}
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}
export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  return { data, error };
}
export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { data, error };
}
export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata as any,
  };
}
export async function updateUserProfile(updates: {
  name?: string;
  avatar_url?: string;
  organization?: string;
}) {
  const { data, error } = await supabase.auth.updateUser({ data: updates });
  return { data, error };
}
export function onAuthStateChange(callback: (user: User | null) => void) {
  const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
    const user = session?.user
      ? {
          id: session.user.id,
          email: session.user.email,
          user_metadata: session.user.user_metadata as any,
        }
      : null;
    callback(user);
  });
  return data.subscription.unsubscribe;
}
