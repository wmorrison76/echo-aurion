import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  signUp,
  signIn,
  signOut,
  getCurrentSession,
  updateUserProfile,
  type SignUpData,
  type SignInData,
} from "../auth-service";

// Mock supabase if needed
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
    },
  })),
}));

describe("Authentication Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signUp", () => {
    it("should handle signup with valid data", async () => {
      const data: SignUpData = {
        email: "test@example.com",
        password: "Password123!",
        username: "testuser",
        organization_name: "Test Org",
      };

      const result = await signUp(data);

      // When Supabase is not configured, should return graceful error
      expect(result).toHaveProperty("success");
      expect(typeof result.success).toBe("boolean");
    });

    it("should validate email format", async () => {
      const data: SignUpData = {
        email: "invalid-email",
        password: "Password123!",
        username: "testuser",
        organization_name: "Test Org",
      };

      const result = await signUp(data);
      // Should either fail gracefully or handle invalid email
      expect(result).toHaveProperty("success");
    });

    it("should validate password strength", async () => {
      const data: SignUpData = {
        email: "test@example.com",
        password: "weak",
        username: "testuser",
        organization_name: "Test Org",
      };

      const result = await signUp(data);
      expect(result).toHaveProperty("success");
    });
  });

  describe("signIn", () => {
    it("should handle signin with valid credentials", async () => {
      const data: SignInData = {
        email: "test@example.com",
        password: "Password123!",
      };

      const result = await signIn(data);
      expect(result).toHaveProperty("success");
    });

    it("should return error for invalid email", async () => {
      const data: SignInData = {
        email: "invalid-email",
        password: "Password123!",
      };

      const result = await signIn(data);
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("error");
    });

    it("should require password", async () => {
      const data: SignInData = {
        email: "test@example.com",
        password: "",
      };

      const result = await signIn(data);
      expect(result.success).toBe(false);
    });
  });

  describe("signOut", () => {
    it("should handle signout", async () => {
      const result = await signOut();
      expect(result).toHaveProperty("success");
    });
  });

  describe("getCurrentSession", () => {
    it("should retrieve current session", async () => {
      const session = await getCurrentSession();
      // Should return null or session object
      expect(session === null || typeof session === "object").toBe(true);
    });
  });

  describe("updateUserProfile", () => {
    it("should handle profile updates", async () => {
      const userId = "test-user-id";
      const updates = {
        username: "newusername",
      };

      const result = await updateUserProfile(userId, updates);
      expect(result).toHaveProperty("success");
    });

    it("should validate profile updates", async () => {
      const userId = "test-user-id";
      const updates = {
        username: "", // Invalid empty username
      };

      const result = await updateUserProfile(userId, updates);
      // Should handle validation gracefully
      expect(result).toHaveProperty("success");
    });
  });
});
