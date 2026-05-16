// =============================================================================
// STEP 4: FLOORPLAN
// ============================================================================= import React from"react";
import { FloorplanCanvas } from "../floorplan/FloorplanCanvas";
import { CapacityWarnings } from "../floorplan/CapacityWarnings";
interface StepProps {
  onNext: () => void;
  onBack: () => void;
}
export const StepFloorplan: React.FC<StepProps> = ({ onNext, onBack }) => {
  return (
    <div>
      {" "}
      <h2 className="text-xl font-semibold mb-4">Floorplan Designer</h2>{" "}
      <FloorplanCanvas /> <CapacityWarnings />{" "}
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
