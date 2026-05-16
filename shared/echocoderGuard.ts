import state from "../scripts/echocoder/echocoder.state.json";

export function canUseEchoCoder(): boolean {
  if (!state?.enabled) return false;
  if (!state?.expiresAt) return false;
  return Date.now() < state.expiresAt;
}
