// src/modules/pastry/session/CakeSessionFlow.jsx

import React, { useState } from "react";
import { CakeCanvasBuilder } from "../cake/CakeCanvasBuilder";
import { ConsultationCanvasPad } from "../consultation/ConsultationCanvasPad";
import { CakeCuttingDiagramGenerator } from "../cake/CakeCuttingDiagramGenerator";
import { CakeCreatorChargePanel } from "../cake/CakeCreatorChargePanel";
import { WorkOrderBuilder } from "../cake/WorkOrderBuilder";
import { CakeKnifeAddOnPanel } from "../cake/CakeKnifeAddOnPanel";

export const CakeSessionFlow = () => {
  const [cakeDesign, setCakeDesign] = useState(null);
  const [consultation, setConsultation] = useState(null);
  const [cuttingGuide, setCuttingGuide] = useState(null);
  const [workOrder, setWorkOrder] = useState(null);
  const [addOns, setAddOns] = useState({});
  const [finalRender, setFinalRender] = useState(null);
  const [finalPhoto, setFinalPhoto] = useState(null);

  const handleSocialPost = () => {
    const postPayload = {
      imageBefore: finalRender,
      imageAfter: finalPhoto,
      caption: `✨ Custom cake by LUCCCA ✨\n#CakeDesign #LUCCCA #CustomCake #BeforeAndAfter`,
      tagClient: true,
    };
    // Hook to external social media connector (future: Instagram API)
    console.log("Posting to Instagram:", postPayload);
  };

  return (
    <div className="space-y-6">
      <CakeCanvasBuilder cakeData={cakeDesign} onUpdate={setCakeDesign} />
      <ConsultationCanvasPad onSave={setConsultation} />
      <CakeCreatorChargePanel onSet={(info) => console.log("Charge:", info)} />
      <CakeKnifeAddOnPanel onAdd={setAddOns} />
      <CakeCuttingDiagramGenerator
        shape="round"
        diameter={10}
        servings={24}
        onExport={setCuttingGuide}
      />
      <WorkOrderBuilder cakeData={cakeDesign} onExport={setWorkOrder} />

      <div className="space-y-3">
        <label className="text-xs font-medium block">Upload Final Cake Photo:</label>
        <input type="file" accept="image/*" onChange={(e) => {
          const reader = new FileReader();
          reader.onload = () => setFinalPhoto(reader.result);
          reader.readAsDataURL(e.target.files[0]);
        }} />

        <label className="text-xs font-medium block">Upload Rendering Screenshot:</label>
        <input type="file" accept="image/*" onChange={(e) => {
          const reader = new FileReader();
          reader.onload = () => setFinalRender(reader.result);
          reader.readAsDataURL(e.target.files[0]);
        }} />
      </div>

      <button
        onClick={handleSocialPost}
        className="mt-4 bg-fuchsia-700 hover:bg-fuchsia-800 text-white px-4 py-2 text-sm rounded"
      >
        Post Before/After to Instagram
      </button>
    </div>
  );
};

export default CakeSessionFlow;
