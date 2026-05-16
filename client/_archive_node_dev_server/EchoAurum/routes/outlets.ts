import type { RequestHandler } from "express";
import type {
  Outlet,
  BudgetLineItem,
  OutletPnLReport,
  ConsolidatedPnL,
  LegacyPnLImport,
  PnLDriver,
} from "@shared/outlets";
export const createOutlet: RequestHandler = (req, res) => {
  const { code, name, type, location, currency, fiscalYearStart } = req.body;
  if (!code || !name || !type) {
    return res.status(400).json({ error: "code, name, and type are required" });
  }
  const outlet: Outlet = {
    id: `outlet_${Date.now()}`,
    code,
    name,
    type,
    location: location || "",
    currency: currency || "USD",
    fiscalYearStart: fiscalYearStart || 1,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return res.json({ outlet });
};
export const listOutlets: RequestHandler = (req, res) => {
  const outlets: Outlet[] = [
    {
      id: "outlet_hotel_1",
      code: "HTL-001",
      name: "Pacific Grove Resort - Main Hotel",
      type: "hotel",
      location: "California",
      currency: "USD",
      fiscalYearStart: 1,
      status: "active",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "outlet_restaurant_1",
      code: "REST-001",
      name: "Pacific Grove - Main Restaurant",
      type: "restaurant",
      parentId: "outlet_hotel_1",
      location: "California",
      currency: "USD",
      fiscalYearStart: 1,
      status: "active",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "outlet_restaurant_2",
      code: "REST-002",
      name: "Pacific Grove - Poolside Grill",
      type: "restaurant",
      parentId: "outlet_hotel_1",
      location: "California",
      currency: "USD",
      fiscalYearStart: 1,
      status: "active",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "outlet_spa_1",
      code: "SPA-001",
      name: "Pacific Grove - Wellness Spa",
      type: "spa",
      parentId: "outlet_hotel_1",
      location: "California",
      currency: "USD",
      fiscalYearStart: 1,
      status: "active",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
  ];
  return res.json({ outlets });
};
export const getOutlet: RequestHandler = (req, res) => {
  const { id } = req.params;
  const outlet: Outlet = {
    id,
    code: `OUT-${id.slice(0, 3).toUpperCase()}`,
    name: `Outlet ${id}`,
    type: "hotel",
    location: "Location",
    currency: "USD",
    fiscalYearStart: 1,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return res.json({ outlet });
};
export const updateOutlet: RequestHandler = (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const outlet: Outlet = {
    id,
    code: updates.code || `OUT-${id.slice(0, 3).toUpperCase()}`,
    name: updates.name || `Outlet ${id}`,
    type: updates.type || "hotel",
    location: updates.location || "Location",
    currency: updates.currency || "USD",
    fiscalYearStart: updates.fiscalYearStart || 1,
    status: updates.status || "active",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return res.json({ outlet });
};
export const deleteOutlet: RequestHandler = (req, res) => {
  const { id } = req.params;
  return res.json({ success: true, deletedId: id });
};
export const createBudgetLineItem: RequestHandler = (req, res) => {
  const {
    outletId,
    accountCode,
    accountName,
    accountType,
    month,
    budgetAmount,
    year,
  } = req.body;
  const item: BudgetLineItem = {
    id: `budget_${Date.now()}`,
    outletId,
    accountCode,
    accountName,
    accountType,
    month,
    budgetAmount,
    forecastAmount: budgetAmount * 1.05,
    actualAmount: budgetAmount * 0.98,
    year,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return res.json({ item });
};
export const getBudgetForOutlet: RequestHandler = (req, res) => {
  const { outletId, year } = req.query;
  const items: BudgetLineItem[] = [
    {
      id: "budget_1",
      outletId: outletId as string,
      accountCode: "4000",
      accountName: "Room Revenue",
      accountType: "revenue",
      month: 1,
      budgetAmount: 250000,
      forecastAmount: 252500,
      actualAmount: 245000,
      year: parseInt(year as string) || 2024,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "budget_2",
      outletId: outletId as string,
      accountCode: "4100",
      accountName: "Food & Beverage Revenue",
      accountType: "revenue",
      month: 1,
      budgetAmount: 150000,
      forecastAmount: 156000,
      actualAmount: 152000,
      year: parseInt(year as string) || 2024,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "budget_3",
      outletId: outletId as string,
      accountCode: "5000",
      accountName: "Cost of Goods Sold",
      accountType: "cogs",
      month: 1,
      budgetAmount: 45000,
      forecastAmount: 46800,
      actualAmount: 45600,
      year: parseInt(year as string) || 2024,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "budget_4",
      outletId: outletId as string,
      accountCode: "6000",
      accountName: "Labor Expense",
      accountType: "labor",
      month: 1,
      budgetAmount: 120000,
      forecastAmount: 122400,
      actualAmount: 119000,
      year: parseInt(year as string) || 2024,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
  ];
  return res.json({ items });
};
export const getOutletPnLReport: RequestHandler = (req, res) => {
  const { outletId, year } = req.query;
  const report: OutletPnLReport = {
    outletId: outletId as string,
    outletName: "Pacific Grove Resort - Main Hotel",
    year: parseInt(year as string) || 2024,
    currency: "USD",
    monthly: [
      {
        month: 1,
        monthName: "January",
        revenue: { budget: 400000, forecast: 408500, actual: 397000 },
        cogs: { budget: 45000, forecast: 46800, actual: 45600 },
        labor: { budget: 120000, forecast: 122400, actual: 119000 },
        otherExpenses: { budget: 60000, forecast: 61200, actual: 59500 },
        grossProfit: { budget: 175000, forecast: 177300, actual: 172900 },
        ebitda: { budget: 175000, forecast: 177300, actual: 172900 },
      },
      {
        month: 2,
        monthName: "February",
        revenue: { budget: 380000, forecast: 390700, actual: 385000 },
        cogs: { budget: 43000, forecast: 44290, actual: 43650 },
        labor: { budget: 115000, forecast: 117650, actual: 115500 },
        otherExpenses: { budget: 58000, forecast: 59290, actual: 57200 },
        grossProfit: { budget: 164000, forecast: 168470, actual: 168650 },
        ebitda: { budget: 164000, forecast: 168470, actual: 168650 },
      },
    ],
    ytd: {
      revenue: { budget: 4800000, forecast: 4992000, actual: 4752000 },
      cogs: { budget: 540000, forecast: 561600, actual: 547200 },
      labor: { budget: 1440000, forecast: 1497600, actual: 1428000 },
      otherExpenses: { budget: 720000, forecast: 748800, actual: 714000 },
      grossProfit: { budget: 2100000, forecast: 2183000, actual: 2062800 },
      ebitda: { budget: 2100000, forecast: 2183000, actual: 2062800 },
    },
    priorYear: {
      revenue: 4560000,
      cogs: 516000,
      labor: 1368000,
      otherExpenses: 684000,
      ebitda: 1992000,
    },
    variance: {
      budgetVsActual: -48000,
      budgetVsActualPercent: -1.0,
      forecastVsActual: 240000,
      forecastVsActualPercent: 4.8,
    },
  };
  return res.json({ report });
};
export const getConsolidatedPnL: RequestHandler = (req, res) => {
  const { year } = req.query;
  const consolidated: ConsolidatedPnL = {
    year: parseInt(year as string) || 2024,
    currency: "USD",
    outletCount: 4,
    totalOutlets: [],
    monthly: [
      {
        month: 1,
        monthName: "January",
        revenue: { budget: 1200000, forecast: 1225500, actual: 1191000 },
        cogs: { budget: 135000, forecast: 140400, actual: 136800 },
        labor: { budget: 360000, forecast: 373200, actual: 357000 },
        otherExpenses: { budget: 180000, forecast: 183600, actual: 178500 },
        grossProfit: { budget: 525000, forecast: 528300, actual: 518700 },
        ebitda: { budget: 525000, forecast: 528300, actual: 518700 },
      },
    ],
    ytd: {
      revenue: { budget: 14400000, forecast: 14976000, actual: 14256000 },
      cogs: { budget: 1620000, forecast: 1684800, actual: 1641600 },
      labor: { budget: 4320000, forecast: 4492800, actual: 4284000 },
      otherExpenses: { budget: 2160000, forecast: 2246400, actual: 2142000 },
      grossProfit: { budget: 6300000, forecast: 6552000, actual: 6188400 },
      ebitda: { budget: 6300000, forecast: 6552000, actual: 6188400 },
    },
    byOutlet: {},
  };
  return res.json({ consolidated });
};
export const setPnLDrivers: RequestHandler = (req, res) => {
  const { outletId } = req.params;
  const { drivers } = req.body;
  const created: PnLDriver[] = (drivers || []).map(
    (driver: Omit<PnLDriver, "id" | "createdAt" | "updatedAt">) => ({
      id: `driver_${Date.now()}`,
      ...driver,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  );
  return res.json({ drivers: created });
};
export const getPnLDrivers: RequestHandler = (req, res) => {
  const { outletId } = req.params;
  const drivers: PnLDriver[] = [
    {
      id: "driver_1",
      outletId: outletId as string,
      name: "Room Nights",
      description: "Total occupied room nights per month",
      unit: "nights",
      januaryValue: 800,
      februaryValue: 750,
      marchValue: 850,
      aprilValue: 920,
      mayValue: 950,
      juneValue: 1000,
      julyValue: 1050,
      augustValue: 1020,
      septemberValue: 900,
      octoberValue: 850,
      novemberValue: 800,
      decemberValue: 950,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "driver_2",
      outletId: outletId as string,
      name: "Average Daily Rate",
      description: "Average room rate per night",
      unit: "USD",
      januaryValue: 312.5,
      februaryValue: 330,
      marchValue: 340,
      aprilValue: 350,
      mayValue: 360,
      juneValue: 380,
      julyValue: 400,
      augustValue: 390,
      septemberValue: 370,
      octoberValue: 360,
      novemberValue: 340,
      decemberValue: 400,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
  ];
  return res.json({ drivers });
};
export const importLegacyPnL: RequestHandler = (req, res) => {
  const { fileName, year, importedData } = req.body;
  const importRecord: LegacyPnLImport = {
    id: `import_${Date.now()}`,
    fileName,
    year,
    importedData,
    status: "validated",
    validationErrors: [],
    createdAt: new Date().toISOString(),
  };
  return res.json({ import: importRecord });
};
export const analyzeLegacyPnL: RequestHandler = (req, res) => {
  const { importId } = req.params;
  const analysis = {
    importId,
    accountsDetected: 18,
    totalMonthsOfData: 12,
    revenueAccounts: 3,
    expenseAccounts: 15,
    seasonalPatterns: {
      revenueVariation: "High - Summer peaks, Winter lows",
      laborVariation: "Moderate - Correlates with revenue",
      cogsVariation: "High - Seasonal menu changes",
    },
    suggestedDrivers: [
      { name: "Room Nights", correlation: 0.94 },
      { name: "Occupancy Rate", correlation: 0.91 },
      { name: "Average Daily Rate", correlation: 0.87 },
    ],
  };
  return res.json(analysis);
};
