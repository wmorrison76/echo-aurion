import { useQuery } from "@tanstack/react-query";
export interface ProfitAndLossData {
  revenue: {
    roomRevenue: number;
    foodBeverage: number;
    otherOperatingRevenue: number;
    total: number;
  };
  costOfRevenue: {
    costOfFoodBeverage: number;
    costOfRoomServices: number;
    otherCostOfRevenue: number;
    total: number;
  };
  grossProfit: number;
  grossProfitMargin: number;
  operatingExpenses: {
    salariesAndWages: number;
    utilities: number;
    maintenance: number;
    marketing: number;
    administrative: number;
    depreciation: number;
    otherOperatingExpenses: number;
    total: number;
  };
  operatingIncome: number;
  operatingMargin: number;
  otherIncomeExpense: {
    interestIncome: number;
    interestExpense: number;
    gainOnSale: number;
    miscellaneous: number;
    total: number;
  };
  incomeBeforeTax: number;
  incomeTax: number;
  netIncome: number;
  netMargin: number;
  priorPeriod?: ProfitAndLossData;
  variance?: {
    revenueVariance: number;
    revenueVariancePercent: number;
    grossProfitVariance: number;
    grossProfitVariancePercent: number;
    operatingIncomeVariance: number;
    operatingIncomeVariancePercent: number;
    netIncomeVariance: number;
    netIncomeVariancePercent: number;
  };
}
export function useProfitAndLoss(
  entityId: string,
  periodDate: string,
  includePrior: boolean = true,
) {
  return useQuery({
    queryKey: ["profitAndLoss", entityId, periodDate, includePrior],
    queryFn: async () => {
      const response = await fetch(
        `/api/aurum/reports/profit-loss?entityId=${entityId}&periodDate=${periodDate}&includePrior=${includePrior}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch P&L data");
      }
      const data: ProfitAndLossData = await response.json();
      return data;
    },
  });
}
export function useProfitAndLossHistory(
  entityId: string,
  startDate: string,
  endDate: string,
) {
  return useQuery({
    queryKey: ["profitAndLossHistory", entityId, startDate, endDate],
    queryFn: async () => {
      const response = await fetch(
        `/api/aurum/reports/profit-loss/history?entityId=${entityId}&startDate=${startDate}&endDate=${endDate}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch P&L history");
      }
      const data: Array<ProfitAndLossData & { periodDate: string }> =
        await response.json();
      return data;
    },
  });
}
