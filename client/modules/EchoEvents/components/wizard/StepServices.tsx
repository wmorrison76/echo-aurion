// =============================================================================
// STEP 3: SERVICES / ENHANCEMENTS
// ============================================================================= import React from"react";
import { ServicesLibrary } from "../services/ServicesLibrary";
import { EventServicesPanel } from "../services/EventServicesPanel";
interface StepProps {
  onNext: () => void;
  onBack: () => void;
}
export const StepServices: React.FC<StepProps> = ({ onNext, onBack }) => {
  return (
    <div>
      {" "}
      <h2 className="text-xl font-semibold mb-4">
        Enhancements & Services
      </h2>{" "}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[480px]">
        {" "}
        <ServicesLibrary /> <EventServicesPanel />{" "}
      </div>{" "}
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
