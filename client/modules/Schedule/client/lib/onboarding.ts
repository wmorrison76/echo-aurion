export interface OnboardingData {
  homeDept?: string;
  departments?: string[];
  shares?: Record<string, number>; // percentages 0-100 jobShare?: boolean; title?: string;
}
const KEY = "shiftflow:onboarding";
function loadAll(): Record<string, OnboardingData> {
  try {
    const s = localStorage.getItem(KEY);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}
function saveAll(map: Record<string, OnboardingData>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {}
}
export function getOnboarding(empId: string): OnboardingData {
  const all = loadAll();
  return all[empId] || {};
}
export function saveOnboarding(empId: string, data: OnboardingData) {
  const all = loadAll();
  all[empId] = data;
  saveAll(all);
}
