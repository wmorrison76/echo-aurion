import { initializeAuth, installAuthFetchInterceptor } from "./auth-init";

// Install fetch interceptor immediately - wrap in try-catch to prevent blocking
try {
  installAuthFetchInterceptor();
} catch (err) {
  // Silently fail - auth interceptor is non-critical
  console.debug("[Auth Interceptor] Failed to install:", err);
}

// Initialize auth - wrap in try-catch to prevent blocking
void initializeAuth().catch((err) => {
  // Silently fail - auth initialization is non-critical
  console.debug("[Auth Interceptor] Failed to initialize:", err);
});
