import type {
  BudgetDriver,
  BudgetAccount,
  BudgetPlan,
  BudgetAnalysis,
  BudgetVariance,
  DriverMetric,
} from "@shared/budget";
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomAmount(base: number, variance: number): number {
  const varyAmount = base * (variance / 100);
  return base + (Math.random() - 0.5) * 2 * varyAmount;
}
const BUDGET_DRIVERS: Omit<BudgetDriver, "id">[] = [
  {
    code: "DRV-001",
    name: "Average Room Rate",
    description: "Expected nightly room rate",
    metricType: "currency",
    unit: "USD",
    baselineValue: 185,
    weightingFactor: 0.25,
  },
  {
    code: "DRV-002",
    name: "Occupancy Rate",
    description: "Percentage of rooms occupied",
    metricType: "percentage",
    baselineValue: 78,
    weightingFactor: 0.3,
  },
  {
    code: "DRV-003",
    name: "Labor Cost per Revenue Dollar",
    description: "Labor expense ratio to revenue",
    metricType: "ratio",
    baselineValue: 0.28,
    weightingFactor: 0.25,
  },
  {
    code: "DRV-004",
    name: "Food Cost Percentage",
    description: "Food and beverage cost ratio",
    metricType: "percentage",
    baselineValue: 32,
    weightingFactor: 0.2,
  },
  {
    code: "DRV-005",
    name: "Utility Cost per Square Foot",
    description: "Monthly utility expense per sqft",
    metricType: "currency",
    unit: "USD",
    baselineValue: 2.5,
    weightingFactor: 0.15,
  },
  {
    code: "DRV-006",
    name: "Average Check Size",
    description: "Average guest check in restaurant",
    metricType: "currency",
    unit: "USD",
    baselineValue: 62,
    weightingFactor: 0.2,
  },
  {
    code: "DRV-007",
    name: "Covers per Day",
    description: "Number of restaurant covers daily",
    metricType: "quantity",
    baselineValue: 185,
    weightingFactor: 0.18,
  },
];
const BUDGET_ACCOUNTS: Omit<
  BudgetAccount,
  | "actualAmount"
  | "committedAmount"
  | "availableAmount"
  | "variance"
  | "variancePercent"
  | "flag"
>[] = [
  {
    accountCode: "4010",
    accountName: "Room Revenue - Nightly",
    budgetedAmount: 185000,
    drivers: [
      {
        ...BUDGET_DRIVERS[0],
        id: "drv-arr-001",
        baselineValue: 185,
        forecastValue: 192,
      },
      {
        ...BUDGET_DRIVERS[1],
        id: "drv-occ-001",
        baselineValue: 78,
        forecastValue: 82,
      },
    ],
  },
  {
    accountCode: "4020",
    accountName: "Room Revenue - Group",
    budgetedAmount: 95000,
    drivers: [
      {
        ...BUDGET_DRIVERS[0],
        id: "drv-arr-002",
        baselineValue: 168,
        forecastValue: 172,
      },
    ],
  },
  {
    accountCode: "4110",
    accountName: "Restaurant Revenue",
    budgetedAmount: 120000,
    drivers: [
      {
        ...BUDGET_DRIVERS[5],
        id: "drv-check-001",
        baselineValue: 62,
        forecastValue: 65,
      },
      {
        ...BUDGET_DRIVERS[6],
        id: "drv-covers-001",
        baselineValue: 185,
        forecastValue: 195,
      },
    ],
  },
  {
    accountCode: "4120",
    accountName: "Banquet Revenue",
    budgetedAmount: 85000,
    drivers: [
      {
        ...BUDGET_DRIVERS[5],
        id: "drv-check-002",
        baselineValue: 95,
        forecastValue: 98,
      },
    ],
  },
  {
    accountCode: "5100",
    accountName: "Food Cost",
    budgetedAmount: 38400,
    drivers: [
      {
        ...BUDGET_DRIVERS[3],
        id: "drv-food-001",
        baselineValue: 32,
        forecastValue: 31.5,
      },
    ],
  },
  {
    accountCode: "5310",
    accountName: "Hourly Labor",
    budgetedAmount: 98000,
    drivers: [
      {
        ...BUDGET_DRIVERS[2],
        id: "drv-labor-001",
        baselineValue: 0.28,
        forecastValue: 0.27,
      },
    ],
  },
  {
    accountCode: "5410",
    accountName: "Utilities",
    budgetedAmount: 18500,
    drivers: [
      {
        ...BUDGET_DRIVERS[4],
        id: "drv-util-001",
        baselineValue: 2.5,
        forecastValue: 2.45,
      },
    ],
  },
  {
    accountCode: "5420",
    accountName: "Repairs & Maintenance",
    budgetedAmount: 25000,
    drivers: [],
  },
  {
    accountCode: "5430",
    accountName: "Supplies & Materials",
    budgetedAmount: 15000,
    drivers: [],
  },
  {
    accountCode: "5440",
    accountName: "Marketing & Advertising",
    budgetedAmount: 20000,
    drivers: [],
  },
];
function generateActualAmounts(budgeted: number): {
  actual: number;
  variance: number;
} {
  const variance = randomInt(-15, 20);
  const actual = budgeted * (1 + variance / 100);
  return { actual: Math.round(actual), variance };
}
function generateBudgetAccounts(): BudgetAccount[] {
  return BUDGET_ACCOUNTS.map((account) => {
    const { actual, variance } = generateActualAmounts(account.budgetedAmount);
    const committed = (actual * randomInt(40, 80)) / 100;
    const available = account.budgetedAmount - committed;
    return {
      ...account,
      actualAmount: actual,
      committedAmount: Math.round(committed),
      availableAmount: Math.round(available),
      variance: Math.round(variance * (account.budgetedAmount / 100)),
      variancePercent: variance,
      flag:
        variance > 5 ? "unfavorable" : variance < -5 ? "favorable" : "neutral",
    };
  });
}
function generateVariances(accounts: BudgetAccount[]): BudgetVariance[] {
  return accounts
    .map((account) => ({
      accountCode: account.accountCode,
      accountName: account.accountName,
      budgeted: account.budgetedAmount,
      actual: account.actualAmount || account.budgetedAmount,
      variance: account.variance || 0,
      variancePercent: account.variancePercent || 0,
      flag: account.flag || "neutral",
      contributingDrivers: account.drivers.map((d) => d.name),
      explanation: generateExplanation(account),
    }))
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
}
function generateExplanation(account: BudgetAccount): string {
  if (!account.variancePercent) return "On track";
  if (account.variancePercent > 10) {
    return `Unfavorable variance due to higher than expected ${account.accountName.toLowerCase()}`;
  } else if (account.variancePercent < -10) {
    return `Favorable variance - ${account.accountName.toLowerCase()} trending below budget`;
  }
  return "Minor variance from baseline forecast";
}
export function generateBudgetPlan(outletId?: string): BudgetPlan {
  const accounts = generateBudgetAccounts();
  const totalBudgeted = accounts.reduce((sum, a) => sum + a.budgetedAmount, 0);
  const totalActual = accounts.reduce(
    (sum, a) => sum + (a.actualAmount || 0),
    0,
  );
  const totalVariance = totalActual - totalBudgeted;
  return {
    id: `budget-${outletId || "consolidated"}`,
    name: `${outletId ? `${outletId} ` : ""}Budget Plan - FY 2025`,
    period: "annual",
    fiscalYear: 2025,
    status: "active",
    startDate: "2025-01-01T00:00:00Z",
    endDate: "2025-12-31T23:59:59Z",
    currency: "USD",
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    approvedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    approvedBy: "Controller",
    outletId,
    accounts,
    drivers: BUDGET_DRIVERS.map((d, i) => ({ ...d, id: `drv-${i}` })),
    totalBudgeted,
    totalActual: Math.round(totalActual),
    totalVariance: Math.round(totalVariance),
  };
}
export function generateBudgetAnalysis(): BudgetAnalysis {
  const budget = generateBudgetPlan();
  const variances = generateVariances(budget.accounts);
  const topUnfavorable = variances
    .filter((v) => v.flag === "unfavorable")
    .slice(0, 3);
  const topFavorable = variances
    .filter((v) => v.flag === "favorable")
    .slice(0, 3);
  const driverContributions: Record<string, number> = {};
  for (const driver of budget.drivers) {
    driverContributions[driver.name] = randomInt(5, 25);
  }
  return {
    period: "annual",
    fiscalYear: 2025,
    asOf: new Date().toISOString(),
    totalBudgeted: budget.totalBudgeted,
    totalActual: budget.totalActual || 0,
    totalVariance: budget.totalVariance || 0,
    totalVariancePercent:
      ((budget.totalVariance || 0) / budget.totalBudgeted) * 100,
    variances,
    topFavorableVariances: topFavorable,
    topUnfavorableVariances: topUnfavorable,
    driverContributions,
  };
}
export function generateDriverMetrics(): DriverMetric[] {
  return BUDGET_DRIVERS.map((driver, index) => ({
    driverId: `drv-${index}`,
    driverName: driver.name,
    driverType: driver.metricType,
    value: driver.baselineValue + randomInt(-5, 5),
    unit: driver.unit,
    period: "November 2024",
    trend:
      randomInt(0, 2) === 0 ? "up" : randomInt(0, 1) === 0 ? "down" : "stable",
    impact: ["high", "medium", "low"][randomInt(0, 2)] as
      | "high"
      | "medium"
      | "low",
    affectedAccounts: [
      "4010",
      "4020",
      "4110",
      "4120",
      "5100",
      "5310",
      "5410",
    ].slice(0, randomInt(2, 5)),
  }));
}
export function generateBudgetForecast(accountCode: string) {
  const accounts = generateBudgetAccounts();
  const account = accounts.find((a) => a.accountCode === accountCode);
  if (!account) {
    throw new Error(`Account ${accountCode} not found`);
  }
  const ytoActual = account.actualAmount || 0;
  const remaining = account.budgetedAmount - ytoActual;
  const forecastedYear = account.actualAmount
    ? Math.round(account.actualAmount * 1.1)
    : account.budgetedAmount;
  return {
    accountCode: account.accountCode,
    accountName: account.accountName,
    currentBudget: account.budgetedAmount,
    ytoActual,
    remaining,
    forecastedYear,
    confidence:
      remaining < 0
        ? "low"
        : remaining < account.budgetedAmount / 4
          ? "medium"
          : "high",
    drivers: account.drivers,
  };
}
export function generateBudgetVarianceDetail(accountCode: string) {
  const accounts = generateBudgetAccounts();
  const account = accounts.find((a) => a.accountCode === accountCode);
  if (!account) {
    throw new Error(`Account ${accountCode} not found`);
  }
  const variance = account.variance || 0;
  const variancePercent = account.variancePercent || 0;
  const months = [
    {
      month: "January",
      budgeted: account.budgetedAmount / 12,
      actual: randomAmount(account.budgetedAmount / 12, 15),
    },
    {
      month: "February",
      budgeted: account.budgetedAmount / 12,
      actual: randomAmount(account.budgetedAmount / 12, 15),
    },
    {
      month: "March",
      budgeted: account.budgetedAmount / 12,
      actual: randomAmount(account.budgetedAmount / 12, 15),
    },
    {
      month: "April",
      budgeted: account.budgetedAmount / 12,
      actual: randomAmount(account.budgetedAmount / 12, 15),
    },
    {
      month: "May",
      budgeted: account.budgetedAmount / 12,
      actual: randomAmount(account.budgetedAmount / 12, 15),
    },
    {
      month: "June",
      budgeted: account.budgetedAmount / 12,
      actual: randomAmount(account.budgetedAmount / 12, 15),
    },
    {
      month: "July",
      budgeted: account.budgetedAmount / 12,
      actual: randomAmount(account.budgetedAmount / 12, 15),
    },
    {
      month: "August",
      budgeted: account.budgetedAmount / 12,
      actual: randomAmount(account.budgetedAmount / 12, 15),
    },
    {
      month: "September",
      budgeted: account.budgetedAmount / 12,
      actual: randomAmount(account.budgetedAmount / 12, 15),
    },
    {
      month: "October",
      budgeted: account.budgetedAmount / 12,
      actual: randomAmount(account.budgetedAmount / 12, 15),
    },
    {
      month: "November",
      budgeted: account.budgetedAmount / 12,
      actual: account.actualAmount
        ? Math.round(account.actualAmount / 11)
        : randomAmount(account.budgetedAmount / 12, 15),
    },
  ];
  return {
    accountCode: account.accountCode,
    accountName: account.accountName,
    totalBudgeted: account.budgetedAmount,
    totalActual: account.actualAmount || 0,
    variance,
    variancePercent,
    flag: account.flag,
    months: months.map((m) => ({
      ...m,
      variance: m.actual - m.budgeted,
      variancePercent: ((m.actual - m.budgeted) / m.budgeted) * 100,
    })),
    contributors: account.drivers,
  };
}
