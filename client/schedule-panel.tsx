/**
 * Schedule panel entry used by the panel registry.
 * Re-exports the Schedule module so the dynamic import path is /client/schedule-panel.tsx
 * instead of /client/modules/Schedule/index.tsx (avoids dev-server fetch issues on nested paths).
 */
export { default } from "@/modules/Schedule";
