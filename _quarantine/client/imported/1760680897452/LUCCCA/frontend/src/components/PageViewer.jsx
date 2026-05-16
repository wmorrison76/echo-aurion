// src/components/PageViewer.jsx
import React, { useState, useEffect, Suspense } from "react";

/**
 * PageViewer
 * - Loads a list of files from the LUCCCA project
 * - Lets you pick one from a dropdown
 * - Dynamically imports and renders it inside a safe boundary
 */
const PageViewer = () => {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [Component, setComponent] = useState(null);

  useEffect(() => {
    // Hardcoded list for now — can be replaced by auto-generated tree
    setFiles([
      { name: "Dashboard", path: "../components/DashboardWelcome.jsx" },
      { name: "RecipeInputPage", path: "../components/RecipeInputPage.jsx" },
      { name: "PastryRecipeInputPage", path: "../components/PastryRecipeInputPage.jsx" },
      { name: "CakeBuilder", path: "../components/CakeBuilder.jsx" },
    ]);
  }, []);

  const handleChange = async (e) => {
    const filePath = e.target.value;
    setSelectedFile(filePath);

    try {
      const mod = await import(/* @vite-ignore */ filePath);
      setComponent(() => mod.default || (() => <div>⚠️ No default export</div>));
    } catch (err) {
      console.error("Failed to load file:", err);
      setComponent(() => () => <div>Error loading {filePath}</div>);
    }
  };

  return (
    <div className="p-4">
      <h2 className="font-bold mb-2">Page Viewer</h2>
      <select
        value={selectedFile}
        onChange={handleChange}
        className="border p-2 rounded mb-4"
      >
        <option value="">-- Select a file --</option>
        {files.map((f) => (
          <option key={f.path} value={f.path}>
            {f.name}
          </option>
        ))}
      </select>

      <div className="border rounded p-4 min-h-[300px] bg-gray-50">
        <Suspense fallback={<div>Loading…</div>}>
          {Component ? <Component /> : <div>Select a file to view</div>}
        </Suspense>
      </div>
    </div>
  );
};

export default PageViewer;
