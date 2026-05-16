// src/modules/pastry/cake/components/CakeStandUploader.jsx

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const CakeStandUploader = ({ onUpload }) => {
  const [preview, setPreview] = useState(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
      // Placeholder: Here we would call an actual background remover service or use CSS masking
      onUpload(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Card className="p-4 space-y-3">
      <label className="text-sm font-medium">Upload Stand (3/4 angle)</label>
      <input type="file" accept="image/*" onChange={handleImageUpload} />
      {preview && (
        <div className="rounded shadow overflow-hidden">
          <img
            src={preview}
            alt="Stand Preview"
            className="object-contain max-h-40 bg-checkerboard rounded"
          />
        </div>
      )}
      <Button disabled={!preview}>Confirm Stand</Button>
    </Card>
  );
};
