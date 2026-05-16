import React, { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/glass";
import { Ruler, RotateCw } from "lucide-react";

interface MeasurementToolsProps {
  canvasScale: number;
  onMeasure?: (measurement: MeasurementResult) => void;
}

interface MeasurementResult {
  type: "distance" | "angle";
  value: number;
  unit: "px" | "cm" | "in" | "deg";
  points: Array<{ x: number; y: number }>;
}

const PX_TO_CM = 0.02645;
const PX_TO_IN = 0.01042;

export const MeasurementTools: React.FC<MeasurementToolsProps> = ({
  canvasScale,
  onMeasure,
}) => {
  const [activeTool, setActiveTool] = useState<"ruler" | "protractor" | null>(null);
  const [measuring, setMeasuring] = useState(false);
  const [points, setPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [measurement, setMeasurement] = useState<MeasurementResult | null>(null);
  const [unit, setUnit] = useState<"px" | "cm" | "in">("px");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const calculateDistance = useCallback(
    (p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const distance = Math.sqrt(dx * dx + dy * dy) / canvasScale;
      switch (unit) {
        case "cm":
          return Math.round(distance * PX_TO_CM * 100) / 100;
        case "in":
          return Math.round(distance * PX_TO_IN * 100) / 100;
        default:
          return Math.round(distance);
      }
    },
    [canvasScale, unit],
  );

  const calculateAngle = useCallback((p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    return Math.round(angle * 100) / 100;
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!activeTool) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const newPoints = [...points, { x, y }];
      setPoints(newPoints);

      if (activeTool === "ruler" && newPoints.length === 2) {
        const value = calculateDistance(newPoints[0], newPoints[1]);
        const result: MeasurementResult = {
          type: "distance",
          value,
          unit,
          points: newPoints,
        };
        setMeasurement(result);
        onMeasure?.(result);
        setPoints([]);
        setMeasuring(false);
      }

      if (activeTool === "protractor" && newPoints.length === 3) {
        const angle = calculateAngle(newPoints[0], newPoints[2]);
        const result: MeasurementResult = {
          type: "angle",
          value: angle,
          unit: "deg",
          points: newPoints,
        };
        setMeasurement(result);
        onMeasure?.(result);
        setPoints([]);
        setMeasuring(false);
      }
    },
    [activeTool, points, calculateDistance, calculateAngle, unit, onMeasure],
  );

  const reset = () => {
    setPoints([]);
    setMeasurement(null);
    setMeasuring(false);
    setActiveTool(null);
  };

  return (
    <div className={cn("space-y-3", "p-3 rounded border bg-background") }>
      <div className="flex items-center gap-2">
        <Button
          variant={activeTool === "ruler" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setActiveTool(activeTool === "ruler" ? null : "ruler");
            setMeasuring(true);
          }}
        >
          <Ruler className="mr-1 h-4 w-4" /> Ruler
        </Button>
        <Button
          variant={activeTool === "protractor" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setActiveTool(activeTool === "protractor" ? null : "protractor");
            setMeasuring(true);
          }}
        >
          <RotateCw className="mr-1 h-4 w-4" /> Protractor
        </Button>
        <Button variant="ghost" size="sm" onClick={reset}>
          Reset
        </Button>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Unit:</span>
        <Button variant={unit === "px" ? "default" : "outline"} size="sm" onClick={() => setUnit("px")}>px</Button>
        <Button variant={unit === "cm" ? "default" : "outline"} size="sm" onClick={() => setUnit("cm")}>cm</Button>
        <Button variant={unit === "in" ? "default" : "outline"} size="sm" onClick={() => setUnit("in")}>in</Button>
      </div>

      {measurement && (
        <div className="rounded border p-2 text-sm">
          {measurement.type === "distance" ? (
            <div>Distance: {measurement.value} {measurement.unit}</div>
          ) : (
            <div>Angle: {measurement.value}°</div>
          )}
        </div>
      )}

      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full h-40 rounded border"
      />

      {measuring && <div className="text-xs text-muted-foreground">Click points on the canvas to measure.</div>}
    </div>
  );
};

export default MeasurementTools;
