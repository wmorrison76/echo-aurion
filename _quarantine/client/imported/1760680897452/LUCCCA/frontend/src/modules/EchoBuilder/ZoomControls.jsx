// ZoomControls.jsx
import React from "react";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";

export default function ZoomControls({ zoomIn, zoomOut, reset }) {
  return (
    <div className="flex space-x-2 p-2 rounded shadow bg-white/10 backdrop-blur-md">
      <button onClick={zoomOut}><ZoomOut size={18} /></button>
      <button onClick={reset}><Maximize size={18} /></button>
      <button onClick={zoomIn}><ZoomIn size={18} /></button>
    </div>
  );
}
