// src/modules/pastry/recipes/components/RecipeImportPanel.jsx

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const RecipeImportPanel = ({ onImport }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleDrop = async (e) => {
    e.preventDefault();
    const droppedFiles = [...e.dataTransfer.files].slice(0, 20);
    setFiles(droppedFiles);
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      onImport(droppedFiles.map((file) => file.name)); // Mock parse result
    }, 3000); // Simulate parsing time
  };

  return (
    <Card
      className="p-4 border-dashed border-2 border-blue-400 bg-blue-50 text-center"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <h3 className="text-sm font-bold text-blue-700 mb-2">Recipe Import</h3>

      {loading ? (
        <div className="animate-pulse flex items-center justify-center space-x-2">
          <img src="/assets/whisk-spin.svg" alt="Loading..." className="w-6 h-6 animate-spin" />
          <span className="text-xs text-blue-600">Parsing recipes…</span>
        </div>
      ) : (
        <div className="text-xs text-slate-600">
          Drag & drop up to <strong>20 recipe files</strong> (.pdf, .txt, .docx)<br />
          or copy-paste online recipe links here:
          <Input className="mt-2" placeholder="https://example.com/recipe" />
        </div>
      )}
    </Card>
  );
};

export default RecipeImportPanel;
