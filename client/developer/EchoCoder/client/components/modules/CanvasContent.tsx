import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Download, RefreshCw, Eye, EyeOff, Grid3x3 } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface VisualizationObject {
  id: string;
  name: string;
  type: "cube" | "sphere" | "plate" | "glass";
  x: number;
  y: number;
  z: number;
  scale: number;
  color: string;
  opacity: number;
  visible: boolean;
}

const defaultObjects: VisualizationObject[] = [
  {
    id: "1",
    name: "Dinner Plate",
    type: "plate",
    x: 0,
    y: 0,
    z: 0,
    scale: 1.2,
    color: "#ffffff",
    opacity: 1,
    visible: true,
  },
  {
    id: "2",
    name: "Glass",
    type: "glass",
    x: 2,
    y: 0,
    z: 0,
    scale: 0.8,
    color: "#87ceeb",
    opacity: 0.5,
    visible: true,
  },
  {
    id: "3",
    name: "Plated Food",
    type: "sphere",
    x: 0,
    y: 1.5,
    z: 0,
    scale: 0.6,
    color: "#ff6b6b",
    opacity: 1,
    visible: true,
  },
  {
    id: "4",
    name: "Garnish",
    type: "cube",
    x: -1.5,
    y: 1,
    z: 0,
    scale: 0.3,
    color: "#51cf66",
    opacity: 1,
    visible: true,
  },
];

export default function CanvasContent() {
  const [objects, setObjects] = useState<VisualizationObject[]>(defaultObjects);
  const [selectedObject, setSelectedObject] =
    useState<VisualizationObject | null>(objects[0] || null);
  const [rotation, setRotation] = useState({ x: -20, y: 45, z: 0 });

  const handleObjectChange = (
    id: string,
    changes: Partial<VisualizationObject>,
  ) => {
    setObjects(
      objects.map((obj) => (obj.id === id ? { ...obj, ...changes } : obj)),
    );

    if (selectedObject?.id === id) {
      setSelectedObject({ ...selectedObject, ...changes });
    }
  };

  const toggleVisibility = (id: string) => {
    handleObjectChange(id, {
      visible: !objects.find((o) => o.id === id)?.visible,
    });
  };

  const handleExportImage = () => {
    // In a real implementation, this would capture the canvas
    const link = document.createElement("a");
    link.href =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    link.download = "scene.png";
    link.click();
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      cube: "▮",
      sphere: "●",
      plate: "◯",
      glass: "◇",
    };
    return icons[type] || "○";
  };

  return (
    <div className="grid grid-cols-4 gap-4 h-full">
      {/* 3D Canvas Area */}
      <div className="col-span-3 flex flex-col gap-4">
        {/* Canvas */}
        <div className="flex-1 bg-gradient-to-b from-slate-900 to-slate-800 rounded-lg border-2 border-blue-500 relative overflow-hidden flex items-center justify-center">
          {/* SVG 3D Representation */}
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 800 600"
            className="max-w-full"
          >
            {/* Background */}
            <defs>
              <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1a1a2e" />
                <stop offset="100%" stopColor="#0f3460" />
              </linearGradient>
              <perspective>
                <style>{`
                  .scene {
                    transform-style: preserve-3d;
                    transform: rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg);
                  }
                `}</style>
              </perspective>
            </defs>

            <rect width="800" height="600" fill="url(#bgGradient)" />

            {/* Grid */}
            <g stroke="#333" strokeWidth="1" opacity="0.3">
              {[...Array(10)].map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1={i * 80}
                  y1="400"
                  x2={i * 80}
                  y2="500"
                />
              ))}
              {[...Array(6)].map((_, i) => (
                <line
                  key={`v-${i}`}
                  x1="0"
                  y1={400 + i * 20}
                  x2="800"
                  y2={400 + i * 20}
                />
              ))}
            </g>

            {/* 3D Objects - Simplified 2D Representation */}
            {objects.map((obj) => {
              const baseX = 400 + obj.x * 100;
              const baseY = 300 + obj.y * 80 - obj.z * 40;
              const size = 60 * obj.scale;

              if (!obj.visible) return null;

              switch (obj.type) {
                case "plate":
                  return (
                    <ellipse
                      key={obj.id}
                      cx={baseX}
                      cy={baseY}
                      rx={size}
                      ry={size * 0.3}
                      fill={obj.color}
                      stroke="#999"
                      strokeWidth="2"
                      opacity={obj.opacity}
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedObject(obj)}
                    />
                  );
                case "sphere":
                  return (
                    <circle
                      key={obj.id}
                      cx={baseX}
                      cy={baseY}
                      r={size}
                      fill={obj.color}
                      stroke="#999"
                      strokeWidth="2"
                      opacity={obj.opacity}
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedObject(obj)}
                    />
                  );
                case "cube":
                  return (
                    <rect
                      key={obj.id}
                      x={baseX - size}
                      y={baseY - size}
                      width={size * 2}
                      height={size * 2}
                      fill={obj.color}
                      stroke="#999"
                      strokeWidth="2"
                      opacity={obj.opacity}
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedObject(obj)}
                    />
                  );
                case "glass":
                  return (
                    <path
                      key={obj.id}
                      d={`M ${baseX - size} ${baseY - size} L ${baseX + size} ${baseY - size} L ${baseX + size * 0.8} ${baseY + size} L ${baseX - size * 0.8} ${baseY + size} Z`}
                      fill={obj.color}
                      stroke="#999"
                      strokeWidth="2"
                      opacity={obj.opacity}
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedObject(obj)}
                    />
                  );
                default:
                  return null;
              }
            })}

            {/* Light indicators */}
            <circle cx="100" cy="50" r="8" fill="#ffff00" opacity="0.8" />
            <text x="115" y="55" fill="#fff" fontSize="12">
              Light
            </text>
          </svg>

          {/* Rotation Controls */}
          <div className="absolute bottom-4 left-4 bg-black/70 p-3 rounded flex gap-2 text-white text-xs">
            <div>X: {rotation.x}°</div>
            <div>Y: {rotation.y}°</div>
            <div>Z: {rotation.z}°</div>
          </div>
        </div>

        {/* Rotation Sliders */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Rotation X</label>
              <input
                type="range"
                min="-360"
                max="360"
                value={rotation.x}
                onChange={(e) =>
                  setRotation({ ...rotation, x: parseInt(e.target.value) })
                }
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Rotation Y</label>
              <input
                type="range"
                min="-360"
                max="360"
                value={rotation.y}
                onChange={(e) =>
                  setRotation({ ...rotation, y: parseInt(e.target.value) })
                }
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Rotation Z</label>
              <input
                type="range"
                min="-360"
                max="360"
                value={rotation.z}
                onChange={(e) =>
                  setRotation({ ...rotation, z: parseInt(e.target.value) })
                }
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Object List & Properties */}
      <div className="col-span-1 flex flex-col gap-4">
        {/* Objects List */}
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Grid3x3 className="h-4 w-4" />
              Objects
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-y-auto flex-1 space-y-2">
            {objects.map((obj) => (
              <div
                key={obj.id}
                className={`p-2 rounded cursor-pointer border-2 transition-colors ${
                  selectedObject?.id === obj.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                    : "border-transparent bg-slate-50 dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
                onClick={() => setSelectedObject(obj)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">{obj.name}</span>
                  <button
                    onClick={() => toggleVisibility(obj.id)}
                    className="text-muted-foreground"
                  >
                    {obj.visible ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <Badge variant="outline" className="text-xs">
                  {getTypeIcon(obj.type)} {obj.type}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Properties Panel */}
        {selectedObject && (
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Properties</CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto space-y-3 flex-1">
              <div>
                <label className="text-xs text-muted-foreground">Scale</label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={selectedObject.scale}
                  onChange={(e) =>
                    handleObjectChange(selectedObject.id, {
                      scale: parseFloat(e.target.value),
                    })
                  }
                  className="w-full"
                />
                <p className="text-xs font-semibold mt-1">
                  {selectedObject.scale.toFixed(1)}x
                </p>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Opacity</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={selectedObject.opacity}
                  onChange={(e) =>
                    handleObjectChange(selectedObject.id, {
                      opacity: parseFloat(e.target.value),
                    })
                  }
                  className="w-full"
                />
                <p className="text-xs font-semibold mt-1">
                  {(selectedObject.opacity * 100).toFixed(0)}%
                </p>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Color</label>
                <input
                  type="color"
                  value={selectedObject.color}
                  onChange={(e) =>
                    handleObjectChange(selectedObject.id, {
                      color: e.target.value,
                    })
                  }
                  className="w-full h-10 rounded border cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">X</p>
                  <p className="font-semibold">{selectedObject.x.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Y</p>
                  <p className="font-semibold">{selectedObject.y.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Z</p>
                  <p className="font-semibold">{selectedObject.z.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Export */}
        <Button onClick={handleExportImage} className="w-full gap-2">
          <Download className="h-4 w-4" /> Export
        </Button>
      </div>
    </div>
  );
}
