import { promises as fs } from "fs";
import path from "path";

type ResortForecastDay = {
  date: string;
  dow?: string;
  capacity?: number;
  ooo?: number;
  occPct?: number;
  rooms?: number;
  revenue?: number;
  adr?: number;
  arrivals?: number;
  departures?: number;
  guestCount?: number;
  forecastOccPct?: number;
  pickupRooms?: number;
  pickupRevenue?: number;
  pickupAdr?: number;
  otbGuests?: number;
  otbAdults?: number;
  otbChildren?: number;
};

type ResortGroupBlock = {
  groupName: string;
  date: string;
  rooms: number;
  guests: number;
};

export type ResortForecastReport = {
  startDate: string;
  endDate: string;
  days: ResortForecastDay[];
  groupBlocks: ResortGroupBlock[];
  totals: {
    rooms?: number;
    revenue?: number;
    guestCount?: number;
    forecastRooms?: number;
    forecastRevenue?: number;
  };
};

function toNumber(value?: string) {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.-]/g, "");
  if (!cleaned) return 0;
  return Number(cleaned);
}

function normalizeDate(value?: string) {
  if (!value) return "";
  if (value.includes("T")) {
    return value.split("T")[0];
  }
  return value.trim();
}

function splitRow(line: string) {
  return line.split(",").map((cell) => cell.trim());
}

function buildDays(dates: string[], rowMap: Record<string, string[]>) {
  return dates.map((date, idx) => {
    const day: ResortForecastDay = {
      date: normalizeDate(date),
    };
    const dow = rowMap["DOW"]?.[idx];
    if (dow) day.dow = dow;
    day.capacity = toNumber(rowMap["Capacity"]?.[idx]);
    day.ooo = toNumber(rowMap["OOO"]?.[idx]);
    day.occPct = toNumber(rowMap["Occ %"]?.[idx]);
    day.rooms = toNumber(rowMap["Rooms"]?.[idx]);
    day.revenue = toNumber(rowMap["Revenue"]?.[idx]);
    day.adr = toNumber(rowMap["ADR"]?.[idx]);
    day.forecastOccPct = toNumber(rowMap["Forecast OCC%"]?.[idx]);
    day.arrivals = toNumber(rowMap["Arrivals"]?.[idx]);
    day.departures = toNumber(rowMap["Departures"]?.[idx]);
    day.guestCount = toNumber(rowMap["Guest Count"]?.[idx]);
    day.pickupRooms = toNumber(rowMap["PickupRooms"]?.[idx]);
    day.pickupRevenue = toNumber(rowMap["PickupRevenue"]?.[idx]);
    day.pickupAdr = toNumber(rowMap["PickupADR"]?.[idx]);
    day.otbGuests = toNumber(rowMap["Total Guests OTB"]?.[idx]);
    day.otbAdults = toNumber(rowMap["Total Adults OTB"]?.[idx]);
    day.otbChildren = toNumber(rowMap["Total Children OTB"]?.[idx]);
    return day;
  });
}

export async function parseResortForecastCsv(
  relativePath = "Weekly_Ops_Forecast_01.19.26.csv",
): Promise<ResortForecastReport> {
  const filePath = path.resolve(process.cwd(), relativePath);

  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch (error) {
    // Return a default empty forecast if file doesn't exist
    const today = new Date().toISOString().split("T")[0];
    const endDate = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    return {
      startDate: today,
      endDate,
      days: [],
      groupBlocks: [],
      totals: {},
    };
  }

  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const rows = lines.map(splitRow);

  const dateRow = rows.find((r) => r[1] === "Date");
  const dates = (dateRow || []).slice(2).filter((d) => d && d.toLowerCase() !== "total");

  const rowMap: Record<string, string[]> = {};
  rows.forEach((row) => {
    const label = row[1];
    if (!label) return;
    if (label === "Rooms" && rowMap["Forecast OCC%"]) {
      rowMap["ForecastRooms"] = row.slice(2);
      return;
    }
    if (label === "Revenue" && rowMap["Forecast OCC%"] && rowMap["ForecastRooms"]) {
      rowMap["ForecastRevenue"] = row.slice(2);
      return;
    }
    if (label === "ADR" && rowMap["PickupRevenue"]) {
      rowMap["PickupADR"] = row.slice(2);
      return;
    }
    if (label === "Rooms" && rowMap["Pickup"]) {
      rowMap["PickupRooms"] = row.slice(2);
      return;
    }
    if (label === "Revenue" && rowMap["PickupRooms"]) {
      rowMap["PickupRevenue"] = row.slice(2);
      return;
    }
    if (label === "Pickup") {
      rowMap["Pickup"] = row.slice(2);
      return;
    }
    rowMap[label] = row.slice(2);
  });

  const days = buildDays(dates, rowMap);

  const groupBlocks: ResortGroupBlock[] = [];
  const blockStart = rows.findIndex((r) => r[1]?.startsWith("DEFINITE BLOCKS"));
  const blockTotalIdx = rows.findIndex((r) => r[1] === "TOTAL GROUPS");
  if (blockStart !== -1 && blockTotalIdx !== -1) {
    for (let i = blockStart + 2; i < blockTotalIdx; i += 1) {
      const row = rows[i];
      const groupName = row?.[1]?.trim();
      if (!groupName) continue;
      const values = row.slice(2);
      values.forEach((value, idx) => {
        const count = toNumber(value);
        if (!count) return;
        const date = normalizeDate(dates[idx]);
        if (!date) return;
        groupBlocks.push({
          groupName,
          date,
          rooms: count,
          guests: count,
        });
      });
    }
  }

  const totalGuests = days.reduce((sum, d) => sum + (d.guestCount || 0), 0);
  const totalRooms = days.reduce((sum, d) => sum + (d.rooms || 0), 0);
  const totalRevenue = days.reduce((sum, d) => sum + (d.revenue || 0), 0);
  const totalForecastRooms = (rowMap["ForecastRooms"] || []).reduce(
    (sum, value) => sum + toNumber(value),
    0,
  );
  const totalForecastRevenue = (rowMap["ForecastRevenue"] || []).reduce(
    (sum, value) => sum + toNumber(value),
    0,
  );

  return {
    startDate: days[0]?.date || "",
    endDate: days[days.length - 1]?.date || "",
    days,
    groupBlocks,
    totals: {
      rooms: totalRooms || undefined,
      revenue: totalRevenue || undefined,
      guestCount: totalGuests || undefined,
      forecastRooms: totalForecastRooms || undefined,
      forecastRevenue: totalForecastRevenue || undefined,
    },
  };
}
