import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  signIn,
  signUp,
  signOut,
  getCurrentSession,
  updateUserProfile,
  setupSessionRefreshListener,
  refreshToken,
  type AuthUser,
  type AuthSession,
} from "@/lib/auth-service";

type AuthContextType = {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (
    email: string,
    password: string,
    username: string,
    orgName: string,
  ) => Promise<boolean>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<AuthUser>) => Promise<boolean>;
  refreshSession: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(
    null,
  );

  // Initialize auth on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentSession = await getCurrentSession();
        if (currentSession) {
          setUser(currentSession.user);
          setSession(currentSession);
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Setup session change listener
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        unsubscribe = await setupSessionRefreshListener((newSession) => {
          if (newSession) {
            setUser(newSession.user);
            setSession(newSession);
          } else {
            setUser(null);
            setSession(null);
          }
        });
      } catch (err) {
        console.error("Failed to setup session listener:", err);
      }
    })();

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  // Setup periodic session refresh
  useEffect(() => {
    if (session && session.access_token) {
      const interval = setInterval(async () => {
        const refreshResult = await refreshToken();
        if (refreshResult.success) {
          const currentSession = await getCurrentSession();
          if (currentSession) {
            setSession(currentSession);
          }
        }
      }, SESSION_REFRESH_INTERVAL);

      setRefreshInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [session]);

  const handleSignIn = useCallback(async (email: string, password: string) => {
    setError(null);
    setLoading(true);

    try {
      const result = await signIn({ email, password });

      if (result.success && result.session) {
        setUser(result.session.user);
        setSession(result.session);
        return true;
      } else {
        setError(result.error || "Sign in failed");
        return false;
      }
    } catch (err) {
      const errorMsg = String(err);
      setError(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSignUp = useCallback(
    async (
      email: string,
      password: string,
      username: string,
      orgName: string,
    ) => {
      setError(null);
      setLoading(true);

      try {
        const result = await signUp({
          email,
          password,
          username,
          organization_name: orgName,
        });

        if (result.success && result.user) {
          setUser(result.user);
          // Sign in immediately after signup
          const signInResult = await signIn({ email, password });
          if (signInResult.success && signInResult.session) {
            setSession(signInResult.session);
          }
          return true;
        } else {
          setError(result.error || "Sign up failed");
          return false;
        }
      } catch (err) {
        const errorMsg = String(err);
        setError(errorMsg);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleSignOut = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const result = await signOut();

      if (result.success) {
        setUser(null);
        setSession(null);
      } else {
        setError(result.error || "Sign out failed");
      }
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUpdateProfile = useCallback(
    async (updates: Partial<AuthUser>) => {
      if (!user) return false;

      setError(null);

      try {
        const result = await updateUserProfile(user.id, updates);

        if (result.success && result.user) {
          setUser(result.user);
          return true;
        } else {
          setError(result.error || "Profile update failed");
          return false;
        }
      } catch (err) {
        setError(String(err));
        return false;
      }
    },
    [user],
  );

  const handleRefreshSession = useCallback(async () => {
    try {
      const refreshResult = await refreshToken();
      if (refreshResult.success) {
        const currentSession = await getCurrentSession();
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          return true;
        }
      } else {
        setError(refreshResult.error || "Session refresh failed");
        return false;
      }
    } catch (err) {
      setError(String(err));
      return false;
    }
    return false;
  }, []);

  const value: AuthContextType = {
    user,
    session,
    loading,
    error,
    isAuthenticated: !!user && !!session,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    updateProfile: handleUpdateProfile,
    refreshSession: handleRefreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
