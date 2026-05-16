/** * User Preferences Manager * Stores and retrieves user-specific preferences like recent searches per outlet */ import type { GLCodeCategory } from "@shared/types/invoices";
export interface RecentSearch {
  vendorId?: string;
  glCategory?: GLCodeCategory;
  searchTerm?: string;
  timestamp: string;
}
export interface OutletPreferences {
  recentSearches: RecentSearch[];
}
const STORAGE_KEY_PREFIX = "echo_user_prefs_";
function getStorageKey(userId: string, outletId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}_${outletId}`;
}
export function getOutletPreferences(
  userId: string,
  outletId: string,
): OutletPreferences {
  const key = getStorageKey(userId, outletId);
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { recentSearches: [] };
    }
  }
  return { recentSearches: [] };
}
export function saveOutletPreferences(
  userId: string,
  outletId: string,
  prefs: OutletPreferences,
): void {
  const key = getStorageKey(userId, outletId);
  localStorage.setItem(key, JSON.stringify(prefs));
}
export function addRecentSearch(
  userId: string,
  outletId: string,
  search: Omit<RecentSearch, "timestamp">,
): void {
  const prefs = getOutletPreferences(userId, outletId);
  const newSearch: RecentSearch = {
    ...search,
    timestamp: new Date().toISOString(),
  }; // Add to front of list prefs.recentSearches.unshift(newSearch); // Keep only last 20 searches, avoid duplicates const seen = new Set<string>(); prefs.recentSearches = prefs.recentSearches.filter((s) => { const key = `${s.vendorId}|${s.glCategory}|${s.searchTerm}`; if (seen.has(key)) return false; seen.add(key); return true; }); prefs.recentSearches = prefs.recentSearches.slice(0, 20); saveOutletPreferences(userId, outletId, prefs);
}
export function getRecentSearches(
  userId: string,
  outletId: string,
  limit = 10,
): RecentSearch[] {
  const prefs = getOutletPreferences(userId, outletId);
  return prefs.recentSearches.slice(0, limit);
}
export function clearRecentSearches(userId: string, outletId: string): void {
  const prefs = getOutletPreferences(userId, outletId);
  prefs.recentSearches = [];
  saveOutletPreferences(userId, outletId, prefs);
} // Get searches grouped by frequency for display purposes
export function getGroupedRecentSearches(
  userId: string,
  outletId: string,
): { category: string; searches: RecentSearch[] }[] {
  const searches = getRecentSearches(userId, outletId);
  const grouped: Record<string, RecentSearch[]> = {
    "Recent Food": [],
    "Recent Beverages": [],
    "Recent Supplies": [],
    "Recent Searches": [],
  };
  searches.forEach((search) => {
    if (search.glCategory === "FOOD") {
      grouped["Recent Food"].push(search);
    } else if (search.glCategory === "BEVERAGES") {
      grouped["Recent Beverages"].push(search);
    } else if (
      search.glCategory === "PAPER_SUPPLIES" ||
      search.glCategory === "NON_FOOD"
    ) {
      grouped["Recent Supplies"].push(search);
    } else if (search.searchTerm) {
      grouped["Recent Searches"].push(search);
    }
  });
  return Object.entries(grouped)
    .filter(([_, items]) => items.length > 0)
    .map(([category, searches]) => ({ category, searches }));
}
