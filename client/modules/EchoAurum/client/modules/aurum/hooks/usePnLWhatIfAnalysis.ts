/** * usePnLWhatIfAnalysis Hook * Perform what-if scenario analysis on P&L */ import {
  useState,
  useCallback,
  useMemo,
} from "react";
import { DetailedPnL } from "@/shared/types/pnlTypes";
export interface PnLScenario {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  assumptions: {
    lineItemId: string;
    lineItemName: string;
    percentChange?: number;
    absoluteChange?: number;
    newValue?: number;
  }[];
  results?: {
    totalRevenue: number;
    totalCogs: number;
    grossProfit: number;
    operatingIncome: number;
    netIncome: number;
    impacts: {
      lineItemId: string;
      lineItemName: string;
      originalAmount: number;
      scenarioAmount: number;
      difference: number;
      percentDifference: number;
    }[];
  };
}
export function usePnLWhatIfAnalysis(basePnL: DetailedPnL) {
  const [scenarios, setScenarios] = useState<PnLScenario[]>([]);
  const createScenario = useCallback(
    (
      name: string,
      assumptions: PnLScenario["assumptions"],
      description?: string,
    ) => {
      const scenario: PnLScenario = {
        id: `scenario-${Date.now()}`,
        name,
        description,
        createdAt: new Date().toISOString(),
        assumptions,
      };
      const results = calculateScenarioResults(basePnL, assumptions);
      scenario.results = results;
      setScenarios((prev) => [...prev, scenario]);
      return scenario;
    },
    [basePnL],
  );
  const updateScenario = useCallback(
    (id: string, assumptions: PnLScenario["assumptions"]) => {
      setScenarios((prev) =>
        prev.map((s) => {
          if (s.id === id) {
            const results = calculateScenarioResults(basePnL, assumptions);
            return { ...s, assumptions, results };
          }
          return s;
        }),
      );
    },
    [basePnL],
  );
  const deleteScenario = useCallback((id: string) => {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  }, []);
  const compareScenarios = useCallback(
    (scenario1Id: string, scenario2Id: string) => {
      const s1 = scenarios.find((s) => s.id === scenario1Id);
      const s2 = scenarios.find((s) => s.id === scenario2Id);
      if (!s1 || !s2 || !s1.results || !s2.results) return null;
      return {
        scenario1: s1.name,
        scenario2: s2.name,
        differences: {
          revenue: s2.results.totalRevenue - s1.results.totalRevenue,
          grossProfit: s2.results.grossProfit - s1.results.grossProfit,
          operatingIncome:
            s2.results.operatingIncome - s1.results.operatingIncome,
          netIncome: s2.results.netIncome - s1.results.netIncome,
        },
      };
    },
    [scenarios],
  );
  const sensitivityAnalysis = useCallback(
    (
      lineItemId: string,
      minChange: number,
      maxChange: number,
      steps: number,
    ) => {
      const results = [];
      const stepSize = (maxChange - minChange) / steps;
      for (let i = 0; i <= steps; i++) {
        const change = minChange + stepSize * i;
        const assumptions: PnLScenario["assumptions"] = [
          { lineItemId, lineItemName: "Test", percentChange: change },
        ];
        const result = calculateScenarioResults(basePnL, assumptions);
        results.push({ change, ...result });
      }
      return results;
    },
    [basePnL],
  );
  return {
    scenarios,
    createScenario,
    updateScenario,
    deleteScenario,
    compareScenarios,
    sensitivityAnalysis,
  };
}
function calculateScenarioResults(
  basePnL: DetailedPnL,
  assumptions: PnLScenario["assumptions"],
): PnLScenario["results"] {
  // Create a copy of the base P&L const result = JSON.parse(JSON.stringify(basePnL)); // Apply assumptions const impacts: PnLScenario["results"]["impacts"] = []; assumptions.forEach((assumption) => { // Find the line item in the P&L let found = false; const processSection = (section: any) => { section.lineItems.forEach((item: any) => { if (item.id === assumption.lineItemId) { const originalAmount = item.variance?.budgetAmount || 0; let newAmount = originalAmount; if (assumption.percentChange !== undefined) { newAmount = originalAmount * (1 + assumption.percentChange / 100); } else if (assumption.absoluteChange !== undefined) { newAmount = originalAmount + assumption.absoluteChange; } else if (assumption.newValue !== undefined) { newAmount = assumption.newValue; } impacts.push({ lineItemId: item.id, lineItemName: item.name, originalAmount, scenarioAmount: newAmount, difference: newAmount - originalAmount, percentDifference: ((newAmount - originalAmount) / originalAmount) * 100, }); item.variance.budgetAmount = newAmount; found = true; } }); if (section.subsections) { section.subsections.forEach(processSection); } }; result.sections.forEach(processSection); }); // Recalculate totals let totalRevenue = 0; let totalCogs = 0; result.sections.forEach((section: any) => { const isRevenueSection = ["revenue","gross-profit","operating-income","net-income","ebitda", ].includes(section.type); section.lineItems.forEach((item: any) => { const amount = item.variance?.budgetAmount || 0; if (isRevenueSection && section.type ==="revenue") { totalRevenue += amount; } else if (section.type ==="cost-of-sales") { totalCogs += amount; } }); }); const grossProfit = totalRevenue - totalCogs; const grossMarginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0; return { totalRevenue, totalCogs, grossProfit, operatingIncome: result.operatingIncome || 0, netIncome: result.netIncome || 0, impacts, };
}
