// =============================================================================
// STEP 1: OUTLET + SPACE SELECTION
// ============================================================================= import React, { useState } from"react";
import { OutletSelect } from "../outlets/OutletSelect";
import { SpaceSelect } from "../spaces/SpaceSelect";
import { CapacitiesPanel } from "../spaces/CapacitiesPanel";
interface StepProps {
  onNext: () => void;
}
export const StepOutletAndSpace: React.FC<StepProps> = ({ onNext }) => {
  const [outlet, setOutlet] = useState<any | null>(null);
  const [space, setSpace] = useState<any | null>(null);
  const canProceed = Boolean(outlet && space);
  return (
    <div>
      {" "}
      <h2 className="text-xl font-semibold mb-4">Select Outlet & Space</h2>{" "}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {" "}
        <OutletSelect value={outlet} onChange={setOutlet} />{" "}
        <SpaceSelect
          outletId={outlet?.id}
          value={space}
          onChange={setSpace}
        />{" "}
      </div>{" "}
      {space && (
        <div className="mt-4">
          {" "}
          <CapacitiesPanel space={space} />{" "}
        </div>
      )}{" "}
      <div className="mt-6 flex justify-end">
        {" "}
        <button className="btn-primary" disabled={!canProceed} onClick={onNext}>
          {" "}
          Continue →{" "}
        </button>{" "}
      </div>{" "}
    </div>
  );
};
