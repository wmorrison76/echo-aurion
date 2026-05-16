import { createClient } from "@supabase/supabase-js";
import { UserRole } from "@/types/roles-permissions";

// Supabase client initialization
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Only initialize Supabase if valid credentials are provided
export const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Authentication types
export type AuthUser = {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  role: UserRole;
  organization_id: string;
  created_at: number;
  updated_at: number;
};

export type AuthSession = {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

export type SignUpData = {
  email: string;
  password: string;
  username: string;
  organization_name: string;
  role?: UserRole;
};

export type SignInData = {
  email: string;
  password: string;
};

/**
 * Sign up a new user with organization
 */
export async function signUp(data: SignUpData): Promise<{
  success: boolean;
  error?: string;
  user?: AuthUser;
}> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }
  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          username: data.username,
          role: data.role || "staff",
        },
      },
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: "User creation failed" };
    }

    // Create organization
    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: data.organization_name,
        owner_id: authData.user.id,
      })
      .select()
      .single();

    if (orgError) {
      return { success: false, error: orgError.message };
    }

    // Create user profile
    const { data: profileData, error: profileError } = await supabase
      .from("users")
      .insert({
        id: authData.user.id,
        email: data.email,
        username: data.username,
        role: data.role || "staff",
        organization_id: orgData.id,
        avatar_url: null,
      })
      .select()
      .single();

    if (profileError) {
      return { success: false, error: profileError.message };
    }

    return {
      success: true,
      user: profileData,
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Sign in with email and password
 */
export async function signIn(data: SignInData): Promise<{
  success: boolean;
  error?: string;
  session?: AuthSession;
}> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }
  try {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!authData.session || !authData.user) {
      return { success: false, error: "Sign in failed" };
    }

    // Get user profile
    const { data: userProfile, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (userError) {
      return { success: false, error: userError.message };
    }

    return {
      success: true,
      session: {
        user: userProfile,
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token || "",
        expires_at: authData.session.expires_at || Date.now(),
      },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }
  try {
    const { error } = await supabase.auth.signOut();
    return { success: !error, error: error?.message };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get current session
 */
export async function getCurrentSession(): Promise<AuthSession | null> {
  if (!supabase) {
    return null;
  }
  try {
    const { data } = await supabase.auth.getSession();

    if (!data.session || !data.session.user) {
      return null;
    }

    const { data: userProfile } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.session.user.id)
      .single();

    if (!userProfile) {
      return null;
    }

    return {
      user: userProfile,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token || "",
      expires_at: data.session.expires_at || Date.now(),
    };
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

/**
 * Refresh auth token
 */
export async function refreshToken(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }
  try {
    const { error } = await supabase.auth.refreshSession();
    return { success: !error, error: error?.message };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<AuthUser>,
): Promise<{
  success: boolean;
  error?: string;
  user?: AuthUser;
}> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }
  try {
    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, user: data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Reset password
 */
export async function resetPassword(email: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    return { success: !error, error: error?.message };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    return { success: !error, error: error?.message };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getCurrentSession();
  return !!session;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<AuthUser | null> {
  if (!supabase) {
    return null;
  }
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    return error ? null : data;
  } catch {
    return null;
  }
}

/**
 * List organization members
 */
export async function getOrganizationMembers(
  organizationId: string,
): Promise<AuthUser[]> {
  if (!supabase) {
    return [];
  }
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("organization_id", organizationId);

    return error ? [] : data || [];
  } catch {
    return [];
  }
}

/**
 * Invite user to organization
 */
export async function inviteUserToOrganization(
  organizationId: string,
  email: string,
  role: "admin" | "chef" | "manager" | "staff",
): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }
  try {
    // Create invitation record
    const { error } = await supabase.from("organization_invitations").insert({
      organization_id: organizationId,
      email,
      role,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    });

    return { success: !error, error: error?.message };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Accept organization invitation
 */
export async function acceptOrganizationInvitation(
  invitationId: string,
  userId: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }
  try {
    // Get invitation
    const { data: invitation, error: fetchError } = await supabase
      .from("organization_invitations")
      .select("*")
      .eq("id", invitationId)
      .single();

    if (fetchError || !invitation) {
      return { success: false, error: "Invitation not found" };
    }

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      return { success: false, error: "Invitation expired" };
    }

    // Add user to organization
    const { error: updateError } = await supabase
      .from("users")
      .update({
        organization_id: invitation.organization_id,
        role: invitation.role,
      })
      .eq("id", userId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Mark invitation as accepted
    await supabase
      .from("organization_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitationId);

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Session refresh and management utilities
 */
export async function setupSessionRefreshListener(
  onSessionChange: (session: AuthSession | null) => void,
): Promise<() => void> {
  if (!supabase) {
    return () => {};
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      const currentSession = await getCurrentSession();
      onSessionChange(currentSession);
    } else {
      onSessionChange(null);
    }
  });

  return () => {
    subscription?.unsubscribe();
  };
}

/**
 * Exchange password reset token for new password
 */
export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
  email?: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }
  try {
    // Get current session to extract email if not provided
    const currentSession = await getCurrentSession();
    const userEmail = email || currentSession?.user?.email;

    if (!userEmail) {
      return { success: false, error: "Email is required for password reset" };
    }

    const { error } = await supabase.auth.verifyOtp({
      email: userEmail,
      token,
      type: "recovery",
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const updateResult = await updatePassword(newPassword);
    return updateResult;
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Validate session token
 */
export async function validateSession(): Promise<boolean> {
  if (!supabase) {
    return false;
  }
  try {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  } catch {
    return false;
  }
}

/**
 * Get organization info
 */
export async function getOrganization(orgId: string): Promise<any | null> {
  if (!supabase) {
    return null;
  }
  try {
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .single();

    return error ? null : data;
  } catch {
    return null;
  }
}

/**
 * Check if user is organization owner
 */
export async function isOrganizationOwner(
  userId: string,
  orgId: string,
): Promise<boolean> {
  if (!supabase) {
    return false;
  }
  try {
    const { data, error } = await supabase
      .from("organizations")
      .select("owner_id")
      .eq("id", orgId)
      .single();

    return !error && data?.owner_id === userId;
  } catch {
    return false;
  }
}
