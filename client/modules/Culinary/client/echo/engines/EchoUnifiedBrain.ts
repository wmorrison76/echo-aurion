import {
  CulinaryScienceEngine,
  IngredientAmount,
  IngredientChemistryProfile,
  ThermalPhase,
} from "./CulinaryScienceEngine";
import {
  PastryScienceEngine,
  BakersPercentageFormula,
} from "./PastryScienceEngine";
import {
  BeverageComponent,
  BeverageFlavorEngine,
} from "./BeverageFlavorEngine";
import { MixologyEngine } from "./MixologyEngine";
import { SommelierEngine, WineProfile, DishProfile } from "./SommelierEngine";
import { HospitalityOpsEngine, SeatingPattern } from "./HospitalityOpsEngine";
import { BanquetOpsEngine, BanquetCoursePlan } from "./BanquetOpsEngine";
import { FinanceEngine, RecipeCostLine, PnLSnapshot } from "./FinanceEngine";
import { InventoryEngine, InventoryItemSnapshot } from "./InventoryEngine";
import { LaborEngine, LaborPlanInput } from "./LaborEngine";
import { CRMEngine, GuestVisit } from "./CRMEngine";
import { ForecastEngine, HistoricalDataPoint } from "./ForecastEngine";

export type UnifiedQueryType =
  | "flavor_balance"
  | "thermal_profile"
  | "pastry_texture"
  | "pastry_defects"
  | "pastry_shelf_life"
  | "beverage_profile"
  | "cocktail_analysis"
  | "wine_pairing"
  | "recipe_cost"
  | "pnl_analysis"
  | "inventory_reorder"
  | "labor_plan"
  | "forecast"
  | "guest_profile"
  | "hospitality_load"
  | "banquet_timing";

export interface UnifiedRequest {
  type: UnifiedQueryType;
  payload: any;
}

export interface UnifiedResponse {
  type: UnifiedQueryType;
  result: any;
  engine: string;
  timestamp: string;
}

export class EchoUnifiedBrain {
  static async handle(request: UnifiedRequest): Promise<UnifiedResponse> {
    const timestamp = new Date().toISOString();

    switch (request.type) {
      case "flavor_balance": {
        const { ingredients, profiles } = request.payload as {
          ingredients: IngredientAmount[];
          profiles: Record<string, IngredientChemistryProfile>;
        };
        const result = CulinaryScienceEngine.assessFlavorBalance(
          ingredients,
          profiles,
        );
        return {
          type: request.type,
          result,
          engine: "CulinaryScienceEngine",
          timestamp,
        };
      }

      case "thermal_profile": {
        const phases: ThermalPhase[] = request.payload.phases;
        const result = CulinaryScienceEngine.assessThermalProfile(phases);
        return {
          type: request.type,
          result,
          engine: "CulinaryScienceEngine",
          timestamp,
        };
      }

      case "pastry_texture": {
        const formula: BakersPercentageFormula = request.payload.formula;
        const result = PastryScienceEngine.predictTexture(formula);
        return {
          type: request.type,
          result,
          engine: "PastryScienceEngine",
          timestamp,
        };
      }

      case "pastry_defects": {
        const { observations, formula } = request.payload as {
          observations: string[];
          formula: BakersPercentageFormula;
        };
        const result = PastryScienceEngine.diagnoseDefects(
          observations,
          formula,
        );
        return {
          type: request.type,
          result,
          engine: "PastryScienceEngine",
          timestamp,
        };
      }

      case "pastry_shelf_life": {
        const formula: BakersPercentageFormula = request.payload.formula;
        const result = PastryScienceEngine.estimateShelfLife(formula);
        return {
          type: request.type,
          result,
          engine: "PastryScienceEngine",
          timestamp,
        };
      }

      case "beverage_profile": {
        const { components, iceMeltMl } = request.payload;
        const result = BeverageFlavorEngine.computeProfile(
          components,
          iceMeltMl,
        );
        return {
          type: request.type,
          result,
          engine: "BeverageFlavorEngine",
          timestamp,
        };
      }

      case "cocktail_analysis": {
        const { components, iceMeltMl } = request.payload;
        const result = MixologyEngine.analyzeCocktail(components, iceMeltMl);
        return {
          type: request.type,
          result,
          engine: "MixologyEngine",
          timestamp,
        };
      }

      case "wine_pairing": {
        const wine: WineProfile = request.payload.wine;
        const dish: DishProfile = request.payload.dish;
        const result = SommelierEngine.assessPairing(wine, dish);
        return {
          type: request.type,
          result,
          engine: "SommelierEngine",
          timestamp,
        };
      }

      case "recipe_cost": {
        const { lines, portions } = request.payload as {
          lines: RecipeCostLine[];
          portions: number;
        };
        const result = FinanceEngine.calculateRecipeCost(lines, portions);
        return {
          type: request.type,
          result,
          engine: "FinanceEngine",
          timestamp,
        };
      }

      case "pnl_analysis": {
        const pnl: PnLSnapshot = request.payload.pnl;
        const result = FinanceEngine.analyzePnL(pnl);
        return {
          type: request.type,
          result,
          engine: "FinanceEngine",
          timestamp,
        };
      }

      case "inventory_reorder": {
        const items: InventoryItemSnapshot[] = request.payload.items;
        const result = InventoryEngine.recommendReorders(items);
        return {
          type: request.type,
          result,
          engine: "InventoryEngine",
          timestamp,
        };
      }

      case "labor_plan": {
        const plan: LaborPlanInput = request.payload.plan;
        const result = LaborEngine.assessLaborPlan(plan);
        return { type: request.type, result, engine: "LaborEngine", timestamp };
      }

      case "forecast": {
        const { history, horizonDays } = request.payload as {
          history: HistoricalDataPoint[];
          horizonDays: number;
        };
        const result = ForecastEngine.forecastFromHistory(history, horizonDays);
        return {
          type: request.type,
          result,
          engine: "ForecastEngine",
          timestamp,
        };
      }

      case "guest_profile": {
        const visits: GuestVisit[] = request.payload.visits;
        const result = CRMEngine.summarizeGuest(visits);
        return { type: request.type, result, engine: "CRMEngine", timestamp };
      }

      case "hospitality_load": {
        const pattern: SeatingPattern = request.payload.pattern;
        const result = HospitalityOpsEngine.assessServiceLoad(pattern);
        return {
          type: request.type,
          result,
          engine: "HospitalityOpsEngine",
          timestamp,
        };
      }

      case "banquet_timing": {
        const { plan, targetMinutes } = request.payload as {
          plan: BanquetCoursePlan;
          targetMinutes: number;
        };
        const result = BanquetOpsEngine.assessCourseTiming(plan, targetMinutes);
        return {
          type: request.type,
          result,
          engine: "BanquetOpsEngine",
          timestamp,
        };
      }

      default:
        throw new Error(`Unsupported unified query type: ${request.type}`);
    }
  }
}
