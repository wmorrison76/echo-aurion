/**
 * Re-export useUserPreferences from EchoEvents module.
 * This allows @/hooks/useUserPreferences imports to work system-wide.
 */
export {
  useUserPreferences,
  preferencesCategories,
  type UserPreferences,
  type PreferenceCategory,
} from "@/modules/EchoEvents/hooks/useUserPreferences";

export { default } from "@/modules/EchoEvents/hooks/useUserPreferences";
