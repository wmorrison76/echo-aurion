// Root: src/components/CulinaryLab/RecipeInputRND.jsx
import React from "react";
import BrainstormPanel from "./panels/BrainstormPanel";
import EchoMusePanel from "./panels/EchoMusePanel";
import TextureLabModule from "./panels/TextureLabModule";
import ProjectedPreviewPanel from "./panels/ProjectedPreviewPanel";
import RecipeFormPanel from "./panels/RecipeFormPanel";
import TextEditorToolbar from "../shared/TextEditorToolbar"; // New rich text editor toolbar component

export default function RecipeInputRND() {
  const handleExport = () => {
    window.print(); // Abstracted for future enhancements
  };

  return (
    <div className="flex flex-col h-full w-full space-y-4 p-4 bg-slate-950 text-white">
      <div className="flex w-full h-[80vh] gap-4">
        {/* Left Panel */}
        <div className="w-1/3 h-full overflow-auto">
          <BrainstormPanel />
          <EchoMusePanel />
          <TextureLabModule />
        </div>

        {/* Middle Panel */}
        <div className="w-1/3 h-full overflow-auto">
          <RecipeFormPanel />

          {/* Text Editor Toolbar Preview */}
          <div className="mt-4">
            <TextEditorToolbar />
          </div>

          {/* Export/Print button */}
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow"
            >
              🖨️ Export / Print
            </button>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-1/3 h-full overflow-auto">
          <ProjectedPreviewPanel />
        </div>
      </div>
    </div>
  );
}
