// src/components/settings/ZAROAdminPanel.jsx
import React from "react";

export default function ZAROAdminPanel() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-red-400">ZARO Admin Panel</h2>
      <p className="text-sm text-white/70">
        Drag and drop LUCCCA module archives (.tar.gz) below. ZARO will auto-extract and connect.
      </p>

      <div className="border border-dashed border-white/30 p-10 rounded-xl bg-white/5 text-center">
        <input
          type="file"
          accept=".tar,.tar.gz"
          className="hidden"
          id="upload-zaro"
          onChange={(e) => {
            alert(`Module "${e.target.files[0].name}" uploaded. ZARO will process.`);
          }}
        />
        <label htmlFor="upload-zaro" className="cursor-pointer">
          <div className="text-white/80 hover:underline">Click or drag to upload module</div>
        </label>
      </div>
    </div>
  );
}
