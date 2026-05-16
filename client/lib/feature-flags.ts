/**
 * Feature flags for Whiteboard / VideoConference and other modules.
 * Read from import.meta.env so deployments can enable/disable per environment.
 * Missing or "true" = enabled; "false" = disabled.
 */
export function isFeatureEnabled(key: string): boolean {
  const v = (import.meta.env as Record<string, string | undefined>)[`VITE_FEATURE_${key}`];
  return v !== "false" && v !== "0";
}

export const FEATURES = {
  OPEN_WHITEBOARD_FROM_VIDEO: "OPEN_WHITEBOARD_FROM_VIDEO",
  JITSI_INTERVIEW: "JITSI_INTERVIEW",
  VIDEO_RECORDING: "VIDEO_RECORDING",
} as const;
