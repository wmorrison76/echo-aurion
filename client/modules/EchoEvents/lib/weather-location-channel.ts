export type WeatherLocationSnapshot = {
  latitude: number;
  longitude: number;
  label?: string | null;
  updatedAt?: string;
};
const listeners = new Set<(location: WeatherLocationSnapshot) => void>();
let latest: WeatherLocationSnapshot | null = null;
const STORAGE_KEY = "weather:last-location";
function isBrowser(): boolean {
  return typeof window !== "undefined";
}
function persistLocation(location: WeatherLocationSnapshot): void {
  if (!isBrowser()) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch (error) {
    console.warn("Unable to persist weather location", error);
  }
}
function readPersistedLocation(): WeatherLocationSnapshot | null {
  if (!isBrowser()) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as WeatherLocationSnapshot;
    if (
      typeof parsed.latitude === "number" &&
      typeof parsed.longitude === "number"
    ) {
      return parsed;
    }
    return null;
  } catch (error) {
    console.warn("Unable to read persisted weather location", error);
    return null;
  }
}
export function getLatestWeatherLocation(): WeatherLocationSnapshot | null {
  if (latest) {
    return latest;
  }
  latest = readPersistedLocation();
  return latest;
}
export function publishWeatherLocation(
  location: WeatherLocationSnapshot,
): void {
  latest = {
    ...location,
    updatedAt: location.updatedAt ?? new Date().toISOString(),
  };
  persistLocation(latest);
  listeners.forEach((listener) => {
    try {
      listener(latest as WeatherLocationSnapshot);
    } catch (error) {
      console.error("Weather location listener error", error);
    }
  });
}
export function subscribeWeatherLocation(
  listener: (location: WeatherLocationSnapshot) => void,
): () => void {
  listeners.add(listener);
  const snapshot = getLatestWeatherLocation();
  if (snapshot) {
    try {
      listener(snapshot);
    } catch (error) {
      console.error("Weather location listener error", error);
    }
  }
  return () => {
    listeners.delete(listener);
  };
}
