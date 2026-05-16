import React from 'react';
import { exportPNG, exportSVG, exportJSON } from '../utils/exporters';
import usePanels from '../state/usePanels';
export default function ExportBar(){
  const state = (usePanels?.getState && usePanels.getState()) || null;
  return (
    <div className="wb-export-bar" role="region" aria-label="Export">
      <button onClick={()=>exportPNG({selector:'canvas.excalidraw__canvas, #whiteboard-stage canvas'})}>Export PNG</button>
      <button onClick={()=>exportSVG({width:1600,height:900})}>Export SVG</button>
      <button onClick={()=>exportJSON(state)}>Export JSON</button>
    </div>
  );
}
