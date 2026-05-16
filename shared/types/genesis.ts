export type OperationScale =
  | "SINGLE_OUTLET"
  | "MULTI_OUTLET"
  | "RESORT"
  | "PORTFOLIO";

export type ForecastHorizon = "DAYS_7" | "DAYS_30" | "DAYS_60" | "DAYS_90";

export type GenesisAProfile = {
  version: 1;

  propertyName: string | null;
  goLiveDateISO: string | null;

  scale: OperationScale;

  kitchensCount: number;
  hasOvernightBaker: boolean;
  hasOvernightCook: boolean;

  defaultForecastHorizon: ForecastHorizon;

  createdAtISO: string;
  updatedAtISO: string;
};
