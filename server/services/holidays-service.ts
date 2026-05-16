/**
 * Holidays Service
 * Provides US federal holidays and religious holidays for the calendar
 */

export interface HolidayEvent {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  outlet_id: string;
  description?: string;
  is_all_day: boolean;
}

/**
 * Get US federal holidays for a given year
 */
export function getUSHolidays(year: number): HolidayEvent[] {
  const holidays: HolidayEvent[] = [
    {
      id: `us-holiday-${year}-01-01`,
      title: "New Year's Day",
      date: `${year}-01-01`,
      start_time: `${year}-01-01T00:00:00Z`,
      end_time: `${year}-01-01T23:59:59Z`,
      outlet_id: "us-holidays",
      is_all_day: true,
    },
    {
      id: `us-holiday-${year}-07-04`,
      title: "Independence Day",
      date: `${year}-07-04`,
      start_time: `${year}-07-04T00:00:00Z`,
      end_time: `${year}-07-04T23:59:59Z`,
      outlet_id: "us-holidays",
      is_all_day: true,
    },
    {
      id: `us-holiday-${year}-11-11`,
      title: "Veterans Day",
      date: `${year}-11-11`,
      start_time: `${year}-11-11T00:00:00Z`,
      end_time: `${year}-11-11T23:59:59Z`,
      outlet_id: "us-holidays",
      is_all_day: true,
    },
    {
      id: `us-holiday-${year}-12-25`,
      title: "Christmas Day",
      date: `${year}-12-25`,
      start_time: `${year}-12-25T00:00:00Z`,
      end_time: `${year}-12-25T23:59:59Z`,
      outlet_id: "us-holidays",
      is_all_day: true,
    },
    // MLK Day (3rd Monday of January)
    {
      id: `us-holiday-${year}-mlk`,
      title: "Martin Luther King Jr. Day",
      date: getMartinLutherKingDay(year),
      start_time: `${getMartinLutherKingDay(year)}T00:00:00Z`,
      end_time: `${getMartinLutherKingDay(year)}T23:59:59Z`,
      outlet_id: "us-holidays",
      is_all_day: true,
    },
    // Presidents Day (3rd Monday of February)
    {
      id: `us-holiday-${year}-pres`,
      title: "Presidents Day",
      date: getPresidentsDay(year),
      start_time: `${getPresidentsDay(year)}T00:00:00Z`,
      end_time: `${getPresidentsDay(year)}T23:59:59Z`,
      outlet_id: "us-holidays",
      is_all_day: true,
    },
    // Memorial Day (last Monday of May)
    {
      id: `us-holiday-${year}-memorial`,
      title: "Memorial Day",
      date: getMemorialDay(year),
      start_time: `${getMemorialDay(year)}T00:00:00Z`,
      end_time: `${getMemorialDay(year)}T23:59:59Z`,
      outlet_id: "us-holidays",
      is_all_day: true,
    },
    // Labor Day (1st Monday of September)
    {
      id: `us-holiday-${year}-labor`,
      title: "Labor Day",
      date: getLaborDay(year),
      start_time: `${getLaborDay(year)}T00:00:00Z`,
      end_time: `${getLaborDay(year)}T23:59:59Z`,
      outlet_id: "us-holidays",
      is_all_day: true,
    },
    // Thanksgiving (4th Thursday of November)
    {
      id: `us-holiday-${year}-thanksgiving`,
      title: "Thanksgiving",
      date: getThanksgivingDay(year),
      start_time: `${getThanksgivingDay(year)}T00:00:00Z`,
      end_time: `${getThanksgivingDay(year)}T23:59:59Z`,
      outlet_id: "us-holidays",
      is_all_day: true,
    },
  ];

  return holidays;
}

/**
 * Get religious holidays (major Christian, Jewish, and Muslim holidays)
 */
export function getReligiousHolidays(year: number): HolidayEvent[] {
  const holidays: HolidayEvent[] = [
    // Christian holidays
    {
      id: `rel-holiday-${year}-epiphany`,
      title: "Epiphany (Christian)",
      date: `${year}-01-06`,
      start_time: `${year}-01-06T00:00:00Z`,
      end_time: `${year}-01-06T23:59:59Z`,
      outlet_id: "religious-holidays",
      is_all_day: true,
    },
    {
      id: `rel-holiday-${year}-ash-wed`,
      title: "Ash Wednesday (Christian)",
      date: getAshWednesday(year),
      start_time: `${getAshWednesday(year)}T00:00:00Z`,
      end_time: `${getAshWednesday(year)}T23:59:59Z`,
      outlet_id: "religious-holidays",
      is_all_day: true,
    },
    {
      id: `rel-holiday-${year}-good-fri`,
      title: "Good Friday (Christian)",
      date: getGoodFriday(year),
      start_time: `${getGoodFriday(year)}T00:00:00Z`,
      end_time: `${getGoodFriday(year)}T23:59:59Z`,
      outlet_id: "religious-holidays",
      is_all_day: true,
    },
    {
      id: `rel-holiday-${year}-easter`,
      title: "Easter (Christian)",
      date: getEaster(year),
      start_time: `${getEaster(year)}T00:00:00Z`,
      end_time: `${getEaster(year)}T23:59:59Z`,
      outlet_id: "religious-holidays",
      is_all_day: true,
    },
    // Jewish holidays
    {
      id: `rel-holiday-${year}-passover`,
      title: "Passover (Jewish)",
      date: "2024-04-23",
      start_time: "2024-04-23T00:00:00Z",
      end_time: "2024-05-01T23:59:59Z",
      outlet_id: "religious-holidays",
      is_all_day: true,
      description: "Multi-day holiday",
    },
    {
      id: `rel-holiday-${year}-yom-kippur`,
      title: "Yom Kippur (Jewish)",
      date: "2024-10-12",
      start_time: "2024-10-12T00:00:00Z",
      end_time: "2024-10-12T23:59:59Z",
      outlet_id: "religious-holidays",
      is_all_day: true,
    },
    // Islamic holidays (approximate dates)
    {
      id: `rel-holiday-${year}-eid-fitr`,
      title: "Eid al-Fitr (Islamic)",
      date: "2024-04-10",
      start_time: "2024-04-10T00:00:00Z",
      end_time: "2024-04-10T23:59:59Z",
      outlet_id: "religious-holidays",
      is_all_day: true,
      description: "Approximate date - lunar calendar",
    },
    {
      id: `rel-holiday-${year}-eid-adha`,
      title: "Eid al-Adha (Islamic)",
      date: "2024-06-16",
      start_time: "2024-06-16T00:00:00Z",
      end_time: "2024-06-16T23:59:59Z",
      outlet_id: "religious-holidays",
      is_all_day: true,
      description: "Approximate date - lunar calendar",
    },
  ];

  return holidays;
}

/**
 * Get all holidays for a date range
 */
export function getHolidaysForRange(
  startDate: string,
  endDate: string,
): HolidayEvent[] {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const holidays: HolidayEvent[] = [];

  // Get holidays for all years in range
  for (let year = start.getFullYear(); year <= end.getFullYear(); year++) {
    holidays.push(...getUSHolidays(year), ...getReligiousHolidays(year));
  }

  // Filter to range
  return holidays.filter((h) => {
    const hDate = new Date(h.date);
    return hDate >= start && hDate <= end;
  });
}

// =====================================================
// Helper functions for calculating moveable holidays
// =====================================================

function getMartinLutherKingDay(year: number): string {
  return getNthWeekday(year, 0, 0, 3); // 3rd Monday of January
}

function getPresidentsDay(year: number): string {
  return getNthWeekday(year, 1, 0, 3); // 3rd Monday of February
}

function getMemorialDay(year: number): string {
  // Last Monday of May
  const may31 = new Date(year, 4, 31);
  const lastMondayOfMay = new Date(may31);
  lastMondayOfMay.setDate(may31.getDate() - ((may31.getDay() + 6) % 7));
  return lastMondayOfMay.toISOString().split("T")[0];
}

function getLaborDay(year: number): string {
  return getNthWeekday(year, 8, 0, 1); // 1st Monday of September
}

function getThanksgivingDay(year: number): string {
  return getNthWeekday(year, 10, 4, 4); // 4th Thursday of November
}

function getNthWeekday(
  year: number,
  month: number,
  dayOfWeek: number,
  nth: number,
): string {
  let date = new Date(year, month, 1);
  let count = 0;

  while (count < nth) {
    if (date.getDay() === dayOfWeek) {
      count++;
      if (count === nth) {
        break;
      }
    }
    date.setDate(date.getDate() + 1);
  }

  return date.toISOString().split("T")[0];
}

/**
 * Get Ash Wednesday (46 days before Easter)
 */
function getAshWednesday(year: number): string {
  const easter = getEaster(year);
  const easterDate = new Date(easter);
  easterDate.setDate(easterDate.getDate() - 46);
  return easterDate.toISOString().split("T")[0];
}

/**
 * Get Good Friday (2 days before Easter)
 */
function getGoodFriday(year: number): string {
  const easter = getEaster(year);
  const easterDate = new Date(easter);
  easterDate.setDate(easterDate.getDate() - 2);
  return easterDate.toISOString().split("T")[0];
}

/**
 * Calculate Easter Sunday using Computus algorithm
 */
function getEaster(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  const monthStr = String(month).padStart(2, "0");
  const dayStr = String(day).padStart(2, "0");
  return `${year}-${monthStr}-${dayStr}`;
}
