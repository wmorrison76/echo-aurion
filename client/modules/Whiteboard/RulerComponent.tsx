import React, { useMemo } from "react";
interface RulerComponentProps {
  viewportX: number;
  viewportY: number;
  zoomLevel: number;
  width: number;
  height: number;
  showRulers: boolean;
}
const RULER_SIZE = 30;
const SMALL_TICK = 5;
const MEDIUM_TICK = 8;
const LARGE_TICK = 12;
export const RulerComponent: React.FC<RulerComponentProps> = ({
  viewportX,
  viewportY,
  zoomLevel,
  width,
  height,
  showRulers,
}) => {
  if (!showRulers) return null;
  const pixelsPerUnit = 20 * zoomLevel; // Calculate major tick interval based on zoom level const majorTickInterval = useMemo(() => { if (zoomLevel > 1.5) return 20; if (zoomLevel > 1) return 50; if (zoomLevel > 0.5) return 100; return 200; }, [zoomLevel]); const minorTickInterval = majorTickInterval / 4; // Render horizontal ruler const HorizontalRuler = () => { const ticks = []; const startPixel = Math.floor(viewportX / minorTickInterval) * minorTickInterval; const endPixel = startPixel + width / zoomLevel + minorTickInterval * 2; for (let px = startPixel; px < endPixel; px += minorTickInterval) { const screenX = (px - viewportX) * zoomLevel; const isMajor = px % majorTickInterval === 0; const tickHeight = isMajor ? LARGE_TICK : SMALL_TICK; ticks.push( <div key={`h-${px}`} className="absolute" style={{ left: `${screenX}px`, top: `${RULER_SIZE - tickHeight}px`, width:"1px", height: `${tickHeight}px`, backgroundColor: isMajor ?"#333" :"#999", }} > {isMajor && ( <span className="absolute text-xs text-foreground whitespace-nowrap" style={{ left:"2px", top:"0px", fontSize:"10px", }} > {px} </span> )} </div>, ); } return ( <div className="absolute top-0 left-0 bg-secondary border-b border-border/50" style={{ width: `${width}px`, height: `${RULER_SIZE}px`, zIndex: 20, }} > {ticks} </div> ); }; // Render vertical ruler const VerticalRuler = () => { const ticks = []; const startPixel = Math.floor(viewportY / minorTickInterval) * minorTickInterval; const endPixel = startPixel + height / zoomLevel + minorTickInterval * 2; for (let py = startPixel; py < endPixel; py += minorTickInterval) { const screenY = (py - viewportY) * zoomLevel; const isMajor = py % majorTickInterval === 0; const tickWidth = isMajor ? LARGE_TICK : SMALL_TICK; ticks.push( <div key={`v-${py}`} className="absolute" style={{ left: `${RULER_SIZE - tickWidth}px`, top: `${screenY}px`, width: `${tickWidth}px`, height:"1px", backgroundColor: isMajor ?"#333" :"#999", }} > {isMajor && ( <span className="absolute text-xs text-foreground whitespace-nowrap" style={{ left:"-20px", top:"2px", fontSize:"10px", width:"18px", textAlign:"right", }} > {py} </span> )} </div>, ); } return ( <div className="absolute left-0 top-0 bg-secondary border-r border-border/50" style={{ width: `${RULER_SIZE}px`, height: `${height}px`, zIndex: 20, }} > {ticks} </div> ); }; // Corner square const CornerSquare = () => ( <div className="absolute bg-secondary border-b border-r border-border/50" style={{ left: 0, top: 0, width: `${RULER_SIZE}px`, height: `${RULER_SIZE}px`, zIndex: 25, }} /> ); return ( <> <HorizontalRuler /> <VerticalRuler /> <CornerSquare /> </> );
};
