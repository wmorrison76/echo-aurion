/**
 * Builder.io removed app-wide. Stubs return no data and no network calls.
 */

/** No-op: never calls Builder.io. Returns empty result. */
export async function safeBuilderIOFetch<T = unknown>(
  _endpoint: string,
  _options?: RequestInit,
): Promise<{ data: T | null; error: Error | null; status: number }> {
  return {
    data: null,
    error: new Error("Builder.io has been removed from this app."),
    status: 0,
  };
} /** Stub: no network call. Returns empty installations. */
export async function getBuilderIOGitHubInstallations(
  _apiKey: string,
): Promise<{ installations: unknown[]; error: Error | null }> {
  return {
    installations: [],
    error: new Error("Builder.io has been removed from this app."),
  };
} /** Stub: no network call. Returns null project. */
export async function getBuilderIOProject(
  _projectId: string,
  _apiKey: string,
): Promise<{ project: unknown | null; error: Error | null }> {
  return {
    project: null,
    error: new Error("Builder.io has been removed from this app."),
  };
} /** * Check if a URL is a Builder.io API endpoint */
export function isBuilderIOEndpoint(url: string): boolean {
  return url.includes("api.builder.io") || url.includes("cdn.builder.io");
} /** * Handle Builder.io API errors safely * This can be used as an error boundary or error handler */
export function handleBuilderIOError(
  error: Error,
  context?: string,
): { handled: boolean; message: string } {
  const message = error.message || String(error);
  if (
    message.includes("Access-Control") ||
    message.includes("CORS") ||
    message.includes("github-installs")
  ) {
    console.warn(
      `Builder.io API CORS issue${context ? ` in ${context}` : ""}: ${message}`,
    );
    return {
      handled: true,
      message:
        "This feature is temporarily unavailable. Please try refreshing the page.",
    };
  }
  if (message.includes("api.builder.io")) {
    console.warn(
      `Builder.io API error${context ? ` in ${context}` : ""}: ${message}`,
    );
    return {
      handled: true,
      message:
        "Unable to connect to Builder.io services. Please try again later.",
    };
  }
  return { handled: false, message: message };
}
