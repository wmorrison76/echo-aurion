// =============================================================================
// STEP 5: FINANCIAL FORECAST & OPTIMIZATION
// ============================================================================= import React from"react";
import { ForecastPanel } from "../financial/ForecastPanel";
import { RecommendationsPanel } from "../financial/RecommendationsPanel";
interface StepProps {
  onNext: () => void;
  onBack: () => void;
}
export const StepForecast: React.FC<StepProps> = ({ onNext, onBack }) => {
  return (
    <div>
      {" "}
      <h2 className="text-xl font-semibold mb-4">Financial Forecast</h2>{" "}
      <ForecastPanel />{" "}
      <h3 className="text-md font-medium mt-6 mb-2">
        {" "}
        Optimization Suggestions{" "}
      </h3>{" "}
      <RecommendationsPanel />{" "}
      <div className="mt-6 flex justify-between">
        {" "}
        <button className="btn-ghost" onClick={onBack}>
          {" "}
          ← Back{" "}
        </button>{" "}
        <button className="btn-primary" onClick={onNext}>
          {" "}
          Continue →{" "}
        </button>{" "}
      </div>{" "}
    </div>
  );
};
