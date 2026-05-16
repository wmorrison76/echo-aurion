import { create } from "zustand";
import { supabase } from "@services/supabaseClient";
export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "receiver" | "chef" | "finance";
  outlet_ids: string[];
  current_outlet_id: string;
}
interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isInitialized: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  switchOutlet: (outletId: string) => void;
  clearError: () => void;
}
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,
  isInitialized: false,
  initialize: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.session.user.id)
          .single();
        if (profile) {
          set({
            user: {
              id: profile.id,
              email: profile.email,
              name: profile.name,
              role: profile.role,
              outlet_ids: profile.outlet_ids || [],
              current_outlet_id: profile.current_outlet_id,
            },
            isInitialized: true,
          });
        }
      } else {
        set({ isInitialized: true });
      }
    } catch (error) {
      console.error("Auth initialization error:", error);
      set({ isInitialized: true });
    }
  },
  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();
        if (profile) {
          set({
            user: {
              id: profile.id,
              email: profile.email,
              name: profile.name,
              role: profile.role,
              outlet_ids: profile.outlet_ids || [],
              current_outlet_id: profile.current_outlet_id,
            },
            loading: false,
          });
        }
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  register: async (email: string, password: string, name: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) throw error;
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: data.user.id,
            email,
            name,
            role: "receiver",
            outlet_ids: [],
          })
          .select()
          .single();
        if (profileError) throw profileError;
        if (profile) {
          set({
            user: {
              id: profile.id,
              email: profile.email,
              name: profile.name,
              role: profile.role,
              outlet_ids: profile.outlet_ids || [],
              current_outlet_id: profile.current_outlet_id,
            },
            loading: false,
          });
        }
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  logout: async () => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  switchOutlet: (outletId: string) => {
    set((state) => {
      if (state.user && state.user.outlet_ids.includes(outletId)) {
        return { user: { ...state.user, current_outlet_id: outletId } };
      }
      return state;
    });
  },
  clearError: () => set({ error: null }),
}));
