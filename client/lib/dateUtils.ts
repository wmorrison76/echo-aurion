/**
 * Date Utilities for Genesis Procurement
 * ISO date parsing, manipulation, and window calculations
 */

/**
 * Format a Date to ISO string
 */
export function toISO(date: Date): string {
  return date.toISOString();
}

/**
 * Parse ISO string to Date
 */
export function fromISO(iso: string): Date {
  return new Date(iso);
}

/**
 * Get today's date in ISO format (UTC)
 */
export function todayISO(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Get a date N days from now (in ISO format)
 */
export function addDaysISO(startISO: string, days: number): string {
  const d = fromISO(startISO);
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}

/**
 * Get a date N hours from now (in ISO format)
 */
export function addHoursISO(startISO: string, hours: number): string {
  const d = fromISO(startISO);
  d.setUTCHours(d.getUTCHours() + hours);
  return toISO(d);
}

/**
 * Calculate cutoff time (e.g., "14:00") on a given date
 */
export function calculateCutoffISO(
  dateISO: string,
  cutoffTimeUTC: string,
): string {
  const [hours, minutes] = cutoffTimeUTC.split(":").map(Number);
  const d = fromISO(dateISO);
  d.setUTCHours(hours, minutes, 0, 0);
  return toISO(d);
}

/**
 * Check if current time has passed a cutoff
 */
export function isCutoffPassed(cutoffISO: string): boolean {
  return new Date().getTime() > fromISO(cutoffISO).getTime();
}

/**
 * Calculate order date (today - lead time days)
 * Used to determine when to order for a delivery date
 */
export function calculateOrderDateISO(
  deliveryDateISO: string,
  leadTimeDays: number,
): string {
  const d = fromISO(deliveryDateISO);
  d.setUTCDate(d.getUTCDate() - leadTimeDays);
  return toISO(d);
}

/**
 * Find next occurrence of a day of week
 * @param targetDayName "MONDAY" | "TUESDAY" | etc.
 * @param startFromISO Start date (default today)
 */
export function nextOccurrenceOfDay(
  targetDayName: string,
  startFromISO?: string,
): string {
  const dayNames = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];
  const targetDayIndex = dayNames.indexOf(targetDayName);
  if (targetDayIndex === -1)
    throw new Error(`Invalid day name: ${targetDayName}`);

  const startDate = startFromISO ? fromISO(startFromISO) : new Date();
  const currentDayIndex = startDate.getUTCDay();

  let daysToAdd = targetDayIndex - currentDayIndex;
  if (daysToAdd <= 0) daysToAdd += 7; // next week if day already passed

  startDate.setUTCDate(startDate.getUTCDate() + daysToAdd);
  startDate.setUTCHours(0, 0, 0, 0);
  return toISO(startDate);
}

/**
 * Calculate business days between two dates
 */
export function businessDaysBetween(startISO: string, endISO: string): number {
  const start = fromISO(startISO);
  const end = fromISO(endISO);
  let days = 0;

  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // not Sunday or Saturday
      days++;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return days;
}

/**
 * Format ISO date for display
 */
export function formatDateShort(iso: string): string {
  const d = fromISO(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format ISO date + time for display
 */
export function formatDateTime(iso: string): string {
  const d = fromISO(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Check if a date is in the past
 */
export function isPastISO(dateISO: string): boolean {
  return new Date().getTime() > fromISO(dateISO).getTime();
}

/**
 * Check if a date is in the future
 */
export function isFutureISO(dateISO: string): boolean {
  return new Date().getTime() < fromISO(dateISO).getTime();
}
