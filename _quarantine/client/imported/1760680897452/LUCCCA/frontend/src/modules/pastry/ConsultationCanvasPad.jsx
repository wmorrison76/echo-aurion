// src/modules/pastry/consultation/ConsultationCanvasPad.jsx

import React, { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import SignatureCanvas from "react-signature-canvas";
import { Input } from "@/components/ui/input";

export const ConsultationCanvasPad = ({ onSave }) => {
  const drawRef = useRef();
  const signRef = useRef();
  const [photoText, setPhotoText] = useState("");
  const [typedNotes, setTypedNotes] = useState("");

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    // Fake OCR logic (replace with real OCR in production)
    setTimeout(() => {
      setPhotoText("Example OCR Result: Notes converted from handwritten sketch.");
    }, 1000);
  };

  const handleSave = () => {
    const drawingData = drawRef.current?.toDataURL();
    const signatureData = signRef.current?.toDataURL();

    onSave({
      drawing: drawingData,
      typedNotes,
      scannedText: photoText,
      signature: signatureData,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <Card className="p-4 space-y-4 border border-green-500 bg-green-50">
      <h3 className="text-sm font-semibold text-green-700">iPad Consultation Pad</h3>

      <div>
        <label className="text-xs font-medium block">Freehand Drawing (stylus/finger):</label>
        <SignatureCanvas
          ref={drawRef}
          penColor="black"
          canvasProps={{
            width: 400,
            height: 200,
            className: "border border-slate-300 rounded",
          }}
        />
      </div>

      <div>
        <label className="text-xs font-medium block">Scan Handwritten Notes (OCR):</label>
        <Input type="file" accept="image/*" onChange={handlePhotoUpload} />
        {photoText && <p className="text-xs mt-1 text-slate-600 italic">{photoText}</p>}
      </div>

      <div>
        <label className="text-xs font-medium block">Typed Notes:</label>
        <textarea
          value={typedNotes}
          onChange={(e) => setTypedNotes(e.target.value)}
          rows={3}
          className="w-full p-1 border text-xs border-slate-300 rounded"
        />
      </div>

      <div>
        <label className="text-xs font-medium block">Client Signature:</label>
        <SignatureCanvas
          ref={signRef}
          penColor="darkblue"
          canvasProps={{
            width: 300,
            height: 100,
            className: "border border-slate-300 rounded",
          }}
        />
      </div>

      <button
        onClick={handleSave}
        className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
      >
        Save to Client File
      </button>
    </Card>
  );
};

export default ConsultationCanvasPad;
