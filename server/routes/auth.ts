/**
 * Authentication Routes
 * Handles user signup, login, OAuth, and session management
 */

import { Router, Request, Response, RequestHandler } from "express";
import { randomBytes } from "crypto";
import { PasswordService, JWTService, RateLimitService } from "../lib/auth";
import { azureAuthClient } from "../integrations/azure-auth";
import { logger } from "../lib/logger";
import { supabase } from "../lib/supabase";

const router = Router();

/**
 * Get mock Supabase database client for user queries
 */
function getSupabaseDb() {
  return supabase;
}

/**
 * POST /api/auth/signup
 * Create new user account with email/password
 */
const signup: RequestHandler = async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: "INVALID_INPUT",
        message: "Email and password are required",
      });
    }

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({
        error: "INVALID_EMAIL",
        message: "Invalid email format",
      });
    }

    // Check password complexity
    const pwValidation = PasswordService.validatePasswordComplexity(password);
    if (!pwValidation.valid) {
      return res.status(400).json({
        error: "WEAK_PASSWORD",
        message: "Password does not meet requirements",
        details: pwValidation.errors,
      });
    }

    // Rate limiting
    if (RateLimitService.isRateLimited(`signup:${email}`, 5, 3600)) {
      return res.status(429).json({
        error: "RATE_LIMITED",
        message: "Too many signup attempts. Try again later.",
      });
    }

    // Hash password
    const passwordHash = PasswordService.hashPassword(password);

    // Create organization (auto-create for each user)
    const orgSlug = email.split("@")[0] + "-" + randomBytes(4).toString("hex");

    // Use Supabase client
    const supabase = getSupabaseDb();

    // Create organization
    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: full_name || email.split("@")[0],
        slug: orgSlug,
        owner_id: null, // Will update after user creation
      })
      .select()
      .single();

    if (orgError) {
      logger.error("[Auth] Org creation failed", { error: orgError.message });
      return res.status(500).json({
        error: "ORG_CREATION_FAILED",
        message: "Failed to create organization",
      });
    }

    // Create user
    const { data: userData, error: userError } = await supabase
      .from("users")
      .insert({
        email,
        password_hash: passwordHash,
        full_name,
        org_id: orgData.id,
        role: "owner", // First user is owner
        email_verified: false,
      })
      .select()
      .single();

    if (userError) {
      logger.error("[Auth] User creation failed", {
        error: userError.message,
        email,
      });

      if (userError.code === "23505") {
        // Unique constraint violation
        return res.status(409).json({
          error: "EMAIL_EXISTS",
          message: "Email already registered",
        });
      }

      return res.status(500).json({
        error: "USER_CREATION_FAILED",
        message: "Failed to create user account",
      });
    }

    // Update org owner_id
    await supabase
      .from("organizations")
      .update({ owner_id: userData.id })
      .eq("id", orgData.id);

    // Generate JWT
    const token = JWTService.generateToken(
      userData.id,
      orgData.id,
      userData.email,
      30, // 30 days
      userData.role, // Include role from signup
    );

    // Log audit event
    await supabase.from("auth_audit_log").insert({
      user_id: userData.id,
      org_id: orgData.id,
      action: "signup",
      status: "success",
      auth_method: "email_password",
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    logger.info("[Auth] User signup successful", {
      userId: userData.id,
      orgId: orgData.id,
      email,
    });

    res.status(201).json({
      status: "success",
      user: {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
      },
      organization: {
        id: orgData.id,
        name: orgData.name,
      },
      token,
      expires_in: 30 * 24 * 60 * 60, // 30 days in seconds
    });
  } catch (error) {
    logger.error("[Auth] Signup error", {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: "SIGNUP_ERROR",
      message: "An error occurred during signup",
    });
  }
};

/**
 * POST /api/auth/login
 * Authenticate user with email/password
 */
const login: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "INVALID_INPUT",
        message: "Email and password are required",
      });
    }

    // Rate limiting
    if (RateLimitService.isRateLimited(`login:${email}`, 10, 900)) {
      return res.status(429).json({
        error: "RATE_LIMITED",
        message: "Too many login attempts. Try again in 15 minutes.",
      });
    }

    const supabase = getSupabaseDb();

    // Get user by email
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .eq("status", "active")
      .single();

    if (userError || !userData) {
      logger.warn("[Auth] Login failed - user not found", { email });
      return res.status(401).json({
        error: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }

    // Check password
    if (!userData.password_hash) {
      logger.warn("[Auth] Login failed - user has no password", { email });
      return res.status(401).json({
        error: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }

    const passwordValid = PasswordService.verifyPassword(
      password,
      userData.password_hash,
    );

    if (!passwordValid) {
      // Log failed attempt
      await supabase.from("auth_audit_log").insert({
        user_id: userData.id,
        org_id: userData.org_id,
        action: "login",
        status: "failure",
        reason: "Invalid password",
        auth_method: "email_password",
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
      });

      logger.warn("[Auth] Login failed - invalid password", { email });
      return res.status(401).json({
        error: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }

    // Generate JWT
    const token = JWTService.generateToken(
      userData.id,
      userData.org_id,
      userData.email,
      30, // 30 days
      userData.role, // Include role from database
    );

    // Update last_login_at
    await supabase
      .from("users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", userData.id);

    // Log successful login
    await supabase.from("auth_audit_log").insert({
      user_id: userData.id,
      org_id: userData.org_id,
      action: "login",
      status: "success",
      auth_method: "email_password",
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    logger.info("[Auth] User login successful", {
      userId: userData.id,
      email,
    });

    res.json({
      status: "success",
      user: {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
      },
      organization: {
        id: userData.org_id,
      },
      token,
      expires_in: 30 * 24 * 60 * 60,
    });
  } catch (error) {
    logger.error("[Auth] Login error", {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: "LOGIN_ERROR",
      message: "An error occurred during login",
    });
  }
};

/**
 * GET /api/auth/authorize/azure
 * Initiate Azure AD OAuth flow
 */
const authorizeAzure: RequestHandler = async (req, res) => {
  try {
    if (!azureAuthClient.isConfigured()) {
      return res.status(503).json({
        error: "AZURE_NOT_CONFIGURED",
        message: "Azure AD is not configured",
      });
    }

    // Generate state for CSRF protection
    const state = randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store state in cache (in production, use Redis or database)
    const stateCache = new Map<string, any>();
    stateCache.set(state, {
      state,
      created_at: Date.now(),
      expires_at: expiresAt,
    });

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${new URLSearchParams(
      {
        client_id: process.env.OUTLOOK_CLIENT_ID || "",
        response_type: "code",
        redirect_uri: `${process.env.FRONTEND_URL || "http://localhost:5173"}/auth/azure/callback`,
        scope: "openid profile email",
        state,
        prompt: "select_account",
      },
    ).toString()}`;

    logger.info("[Auth] Azure auth initiated");

    res.json({
      status: "success",
      authorization_url: authUrl,
    });
  } catch (error) {
    logger.error("[Auth] Azure auth initiation error", {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: "AUTH_ERROR",
      message: "Failed to initiate authentication",
    });
  }
};

/**
 * GET /api/auth/callback/azure
 * Handle Azure AD OAuth callback
 */
const callbackAzure: RequestHandler = async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      logger.warn("[Auth] Azure callback error", {
        error,
        error_description,
      });

      return res.status(400).json({
        error: String(error),
        message: String(error_description || "Authentication failed"),
      });
    }

    if (!code || !state) {
      return res.status(400).json({
        error: "INVALID_REQUEST",
        message: "Missing authorization code or state",
      });
    }

    // TODO: Exchange code for token with Azure
    // TODO: Get user info from token
    // TODO: Create/update user in database
    // TODO: Generate app JWT

    logger.info("[Auth] Azure callback processed", {
      state: String(state).substring(0, 8),
    });

    res.json({
      status: "success",
      message: "Azure authentication processed",
      // TODO: Return JWT token
    });
  } catch (error) {
    logger.error("[Auth] Azure callback error", {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: "CALLBACK_ERROR",
      message: "Failed to process authentication",
    });
  }
};

/**
 * POST /api/auth/logout
 * Logout user (revoke token)
 */
const logout: RequestHandler = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(400).json({
        error: "INVALID_REQUEST",
        message: "No token provided",
      });
    }

    const payload = JWTService.verifyToken(token);
    if (!payload) {
      return res.status(401).json({
        error: "INVALID_TOKEN",
        message: "Invalid token",
      });
    }

    logger.info("[Auth] User logged out", {
      userId: payload.sub,
    });

    res.json({
      status: "success",
      message: "Logged out successfully",
    });
  } catch (error) {
    logger.error("[Auth] Logout error", {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: "LOGOUT_ERROR",
      message: "Failed to logout",
    });
  }
};

/**
 * GET /api/auth/me
 * Get current user info (requires authentication)
 */
const getCurrentUser: RequestHandler = async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    const supabase = getSupabaseDb();

    const { data: userData, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", req.user.id)
      .single();

    if (error || !userData) {
      return res.status(404).json({
        error: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    res.json({
      status: "success",
      user: {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        avatar_url: userData.avatar_url,
      },
      organization: {
        id: userData.org_id,
      },
    });
  } catch (error) {
    logger.error("[Auth] Get current user error", {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: "USER_FETCH_ERROR",
      message: "Failed to fetch user info",
    });
  }
};

/**
 * POST /api/auth/dev/login
 * Development-only endpoint for generating mock JWT tokens
 * SECURITY: Only available in development mode
 */
const devLogin: RequestHandler = async (req, res) => {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({
      error: "FORBIDDEN",
      message: "Development endpoint not available in production",
    });
  }

  try {
    const { userId = "admin-user" } = req.body;

    // Mock test users for development
    const testUsers: Record<string, any> = {
      "admin-user": {
        id: "admin-user",
        org_id: "org-test-001",
        email: "william@admin.local",
        name: "William Morrison",
        role: "admin",
      },
      "manager-user": {
        id: "manager-user",
        org_id: "org-test-001",
        email: "manager@test.local",
        name: "Manager User",
        role: "manager",
      },
      "staff-user": {
        id: "staff-user",
        org_id: "org-test-001",
        email: "staff@test.local",
        name: "Staff User",
        role: "staff",
      },
    };

    const user = testUsers[userId];
    if (!user) {
      return res.status(400).json({
        error: "INVALID_USER",
        message: `Unknown test user: ${userId}`,
        availableUsers: Object.keys(testUsers),
      });
    }

    // Generate valid JWT using server's JWTService
    const token = JWTService.generateToken(
      user.id,
      user.org_id,
      user.email,
      30, // 30 days
      user.role, // Include role for RBAC
    );

    logger.info("[Auth Dev] Generated dev JWT token", {
      userId: user.id,
      orgId: user.org_id,
      role: user.role,
      hasRole: user.role !== undefined,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        org_id: user.org_id,
      },
    });
  } catch (error) {
    logger.error("[Auth Dev] Token generation error", {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: "TOKEN_GENERATION_FAILED",
      message: "Failed to generate development token",
    });
  }
};

// Register routes
router.post("/auth/signup", signup);
router.post("/auth/login", login);
router.get("/auth/authorize/azure", authorizeAzure);
router.get("/auth/callback/azure", callbackAzure);
router.post("/auth/logout", logout);
router.get("/auth/me", getCurrentUser);
// Development endpoint for generating mock JWTs
router.post("/auth/dev/login", devLogin);

export default router;
