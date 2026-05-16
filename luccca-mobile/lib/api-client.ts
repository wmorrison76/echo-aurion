/**
 * API Client
 * Handles HTTP requests with authentication, offline detection, and error handling
 */

import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import * as SecureStore from "expo-secure-store";
import NetInfo from "@react-native-community/netinfo";

// Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: any;
  isOffline?: boolean;
}

// Constants
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api";
const TOKEN_KEY = "auth_tokens";
const ORG_ID_KEY = "org_id";
const USER_ID_KEY = "user_id";

// State
let apiClient: AxiosInstance | null = null;
let isOnline = true;
let currentOrgId: string | null = null;
let currentUserId: string | null = null;

/**
 * Initialize API client
 */
export async function initializeApiClient(): Promise<void> {
  try {
    // Check network status
    const state = await NetInfo.fetch();
    isOnline = state.isConnected ?? false;

    // Restore auth tokens from secure storage
    const tokensJson = await SecureStore.getItemAsync(TOKEN_KEY);
    const tokens = tokensJson ? JSON.parse(tokensJson) : null;

    // Create axios instance
    apiClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add request interceptor
    apiClient.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        // Add authorization header
        if (tokens?.accessToken) {
          config.headers.Authorization = `Bearer ${tokens.accessToken}`;
        }

        // Add organization header
        const orgId = await SecureStore.getItemAsync(ORG_ID_KEY);
        if (orgId) {
          config.headers["X-Org-ID"] = orgId;
        }

        return config;
      },
      (error) => Promise.reject(error),
    );

    // Add response interceptor
    apiClient.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Handle unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Try to refresh token
            const refreshed = await refreshAccessToken();
            if (refreshed && apiClient) {
              // Retry original request
              return apiClient(originalRequest);
            }
          } catch (refreshError) {
            // Logout user
            await logout();
            throw new Error("Session expired");
          }
        }

        // Handle offline
        if (!isOnline && error.request) {
          const err: ApiError = {
            statusCode: 0,
            message: "No internet connection",
            isOffline: true,
          };
          throw err;
        }

        throw error;
      },
    );

    // Set up network listener
    NetInfo.addEventListener((state) => {
      isOnline = state.isConnected ?? false;
      console.log(
        `[API] Network status changed: ${isOnline ? "online" : "offline"}`,
      );
    });

    console.log("[API] Client initialized");
  } catch (error) {
    console.error("[API] Initialization failed:", error);
    throw error;
  }
}

/**
 * Get API client instance
 */
export function getApiClient(): AxiosInstance {
  if (!apiClient) {
    throw new Error("API client not initialized");
  }
  return apiClient;
}

/**
 * Login with credentials
 */
export async function login(
  email: string,
  password: string,
): Promise<AuthTokens> {
  try {
    const response = await getApiClient().post<
      ApiResponse<{
        access_token: string;
        refresh_token: string;
        expires_in: number;
        user_id: string;
        org_id: string;
      }>
    >("/auth/login", { email, password });

    if (!response.data.data) {
      throw new Error("Invalid response from server");
    }

    const { access_token, refresh_token, expires_in, user_id, org_id } =
      response.data.data;
    const expiresAt = Date.now() + expires_in * 1000;

    // Store tokens securely
    const tokens: AuthTokens = {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt,
    };

    await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
    await SecureStore.setItemAsync(USER_ID_KEY, user_id);
    await SecureStore.setItemAsync(ORG_ID_KEY, org_id);

    currentUserId = user_id;
    currentOrgId = org_id;

    console.log("[API] Login successful");
    return tokens;
  } catch (error) {
    console.error("[API] Login failed:", error);
    throw handleApiError(error);
  }
}

/**
 * Register new account
 */
export async function register(
  email: string,
  password: string,
  name: string,
): Promise<AuthTokens> {
  try {
    const response = await getApiClient().post<
      ApiResponse<{
        access_token: string;
        refresh_token: string;
        expires_in: number;
        user_id: string;
        org_id: string;
      }>
    >("/auth/register", { email, password, name });

    if (!response.data.data) {
      throw new Error("Invalid response from server");
    }

    const { access_token, refresh_token, expires_in, user_id, org_id } =
      response.data.data;
    const expiresAt = Date.now() + expires_in * 1000;

    const tokens: AuthTokens = {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt,
    };

    await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
    await SecureStore.setItemAsync(USER_ID_KEY, user_id);
    await SecureStore.setItemAsync(ORG_ID_KEY, org_id);

    currentUserId = user_id;
    currentOrgId = org_id;

    console.log("[API] Registration successful");
    return tokens;
  } catch (error) {
    console.error("[API] Registration failed:", error);
    throw handleApiError(error);
  }
}

/**
 * Refresh access token
 */
async function refreshAccessToken(): Promise<boolean> {
  try {
    const tokensJson = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!tokensJson) return false;

    const tokens = JSON.parse(tokensJson) as AuthTokens;

    const response = await axios.post<
      ApiResponse<{
        access_token: string;
        expires_in: number;
      }>
    >(`${API_BASE_URL}/auth/refresh`, {
      refresh_token: tokens.refreshToken,
    });

    if (!response.data.data) {
      return false;
    }

    const { access_token, expires_in } = response.data.data;
    const expiresAt = Date.now() + expires_in * 1000;

    const newTokens: AuthTokens = {
      ...tokens,
      accessToken: access_token,
      expiresAt,
    };

    await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(newTokens));
    console.log("[API] Token refreshed");
    return true;
  } catch (error) {
    console.error("[API] Token refresh failed:", error);
    return false;
  }
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  try {
    // Call logout endpoint if online
    if (isOnline) {
      try {
        await getApiClient().post("/auth/logout");
      } catch {
        // Ignore logout API errors
      }
    }

    // Clear stored credentials
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_ID_KEY);
    await SecureStore.deleteItemAsync(ORG_ID_KEY);

    currentUserId = null;
    currentOrgId = null;

    console.log("[API] Logout successful");
  } catch (error) {
    console.error("[API] Logout error:", error);
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const tokensJson = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!tokensJson) return false;

    const tokens = JSON.parse(tokensJson) as AuthTokens;

    // Check if token is expired
    if (Date.now() > tokens.expiresAt) {
      // Try to refresh
      return refreshAccessToken();
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Get current user ID
 */
export async function getCurrentUserId(): Promise<string | null> {
  if (currentUserId) return currentUserId;
  return await SecureStore.getItemAsync(USER_ID_KEY);
}

/**
 * Get current organization ID
 */
export async function getCurrentOrgId(): Promise<string | null> {
  if (currentOrgId) return currentOrgId;
  return await SecureStore.getItemAsync(ORG_ID_KEY);
}

/**
 * Check if online
 */
export function isConnected(): boolean {
  return isOnline;
}

/**
 * Make GET request
 */
export async function get<T>(
  endpoint: string,
  params?: Record<string, any>,
): Promise<T> {
  try {
    const response = await getApiClient().get<ApiResponse<T>>(endpoint, {
      params,
    });
    return response.data.data as T;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Make POST request
 */
export async function post<T>(
  endpoint: string,
  data?: Record<string, any>,
): Promise<T> {
  try {
    const response = await getApiClient().post<ApiResponse<T>>(endpoint, data);
    return response.data.data as T;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Make PATCH request
 */
export async function patch<T>(
  endpoint: string,
  data?: Record<string, any>,
): Promise<T> {
  try {
    const response = await getApiClient().patch<ApiResponse<T>>(endpoint, data);
    return response.data.data as T;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Make DELETE request
 */
export async function remove<T>(endpoint: string): Promise<T> {
  try {
    const response = await getApiClient().delete<ApiResponse<T>>(endpoint);
    return response.data.data as T;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Handle API errors
 */
function handleApiError(error: any): ApiError {
  if (error.response) {
    // Server responded with error status
    return {
      statusCode: error.response.status,
      message: error.response.data?.error || "Server error",
      error: error.response.data,
    };
  } else if (error.request) {
    // Request was made but no response
    return {
      statusCode: 0,
      message: error.message || "Network error",
      isOffline: !isOnline,
    };
  } else if (error.isOffline) {
    // Custom offline error
    return error;
  }

  // Other errors
  return {
    statusCode: 0,
    message: error.message || "Unknown error",
  };
}
