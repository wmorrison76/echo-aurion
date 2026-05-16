import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Save, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CakeLayer {
  id: string;
  name: string;
  type: 'sponge' | 'mousse' | 'ganache' | 'filling' | 'frosting' | 'decoration';
  height: number;
  color: string;
  ingredients: string[];
  notes?: string;
}

interface CakeDesign {
  id: string;
  name: string;
  servings: number;
  layers: CakeLayer[];
  dimensions: { width: number; height: number };
  temperature: number;
  humidity: number;
  specialTechniques: string[];
  notes: string;
}

/**
 * Echo Canvas - Visual cake design tool
 * Allows bakers to visualize and document cake architecture
 */
export function EchoCanvas() {
  const [design, setDesign] = useState<CakeDesign>({
    id: '1',
    name: 'New Cake Design',
    servings: 12,
    layers: [],
    dimensions: { width: 20, height: 30 }, // cm
    temperature: 20,
    humidity: 45,
    specialTechniques: [],
    notes: ''
  });

  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);

  // Canvas dimensions (cm to px conversion)
  const pxPerCm = 4;
  const canvasWidth = design.dimensions.width * pxPerCm;
  const canvasHeight = Math.max(300, design.dimensions.height * pxPerCm);

  const layerTypeColors: Record<CakeLayer['type'], string> = {
    sponge: '#D2B48C',
    mousse: '#FFE4B5',
    ganache: '#3D2817',
    filling: '#FFB6C1',
    frosting: '#FFFACD',
    decoration: '#FFD700'
  };

  const addLayer = () => {
    const newLayer: CakeLayer = {
      id: Date.now().toString(),
      name: `Layer ${design.layers.length + 1}`,
      type: 'sponge',
      height: 3,
      color: layerTypeColors.sponge,
      ingredients: [],
      notes: ''
    };
    setDesign({ ...design, layers: [...design.layers, newLayer] });
  };

  const updateLayer = (layerId: string, updates: Partial<CakeLayer>) => {
    setDesign({
      ...design,
      layers: design.layers.map(l => (l.id === layerId ? { ...l, ...updates } : l))
    });
  };

  const deleteLayer = (layerId: string) => {
    setDesign({
      ...design,
      layers: design.layers.filter(l => l.id !== layerId)
    });
    setSelectedLayer(null);
  };

  // Calculate total height
  const totalHeight = design.layers.reduce((sum, l) => sum + l.height, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Echo Canvas - Cake Architecture</h2>
        <input
          type="text"
          value={design.name}
          onChange={(e) => setDesign({ ...design, name: e.target.value })}
          className="text-sm font-medium border rounded px-2 py-1"
          placeholder="Cake Name"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Canvas - Visual Design */}
        <div className="col-span-2 space-y-4">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center min-h-[400px]">
            <svg
              width={canvasWidth}
              height={canvasHeight}
              className="border border-gray-400 bg-white dark:bg-gray-800"
              viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
            >
              {/* Grid */}
              {Array.from({ length: Math.ceil(canvasHeight / 40) }).map((_, i) => (
                <line
                  key={`grid-${i}`}
                  x1={0}
                  y1={i * 40}
                  x2={canvasWidth}
                  y2={i * 40}
                  stroke="#e5e7eb"
                  strokeWidth={1}
                />
              ))}

              {/* Layers */}
              {design.layers.map((layer, idx) => {
                const yPos = design.layers.slice(0, idx).reduce((sum, l) => sum + l.height * pxPerCm, 0);
                const layerHeight = layer.height * pxPerCm;

                return (
                  <g
                    key={layer.id}
                    onClick={() => setSelectedLayer(layer.id)}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <rect
                      x={0}
                      y={yPos}
                      width={canvasWidth}
                      height={layerHeight}
                      fill={layer.color}
                      stroke={selectedLayer === layer.id ? '#ff0000' : '#000'}
                      strokeWidth={selectedLayer === layer.id ? 3 : 1}
                    />
                    <text
                      x={canvasWidth / 2}
                      y={yPos + layerHeight / 2}
                      textAnchor="middle"
                      dy="0.3em"
                      className="text-xs font-bold"
                      fill="#000"
                    >
                      {layer.name}
                    </text>
                  </g>
                );
              })}

              {/* Total Height Label */}
              <text x={canvasWidth + 10} y={20} className="text-xs" fill="#666">
                Total: {totalHeight}cm
              </text>
            </svg>
          </div>

          {/* Cake Properties */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div>
              <label className="text-xs font-semibold">Diameter (cm)</label>
              <input
                type="number"
                value={design.dimensions.width}
                onChange={(e) =>
                  setDesign({
                    ...design,
                    dimensions: { ...design.dimensions, width: parseInt(e.target.value) }
                  })
                }
                className="w-full px-2 py-1 border rounded text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">Temperature (°C)</label>
              <input
                type="number"
                value={design.temperature}
                onChange={(e) => setDesign({ ...design, temperature: parseInt(e.target.value) })}
                className="w-full px-2 py-1 border rounded text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">Humidity (%)</label>
              <input
                type="number"
                value={design.humidity}
                onChange={(e) => setDesign({ ...design, humidity: parseInt(e.target.value) })}
                className="w-full px-2 py-1 border rounded text-sm"
              />
            </div>
          </div>
        </div>

        {/* Sidebar - Layer Management */}
        <div className="space-y-4">
          <Button onClick={addLayer} className="w-full" size="sm">
            <Plus className="w-4 h-4 mr-2" /> Add Layer
          </Button>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {design.layers.map((layer, idx) => (
              <div
                key={layer.id}
                onClick={() => setSelectedLayer(layer.id)}
                className={cn(
                  'p-3 rounded-lg border-2 cursor-pointer transition-all',
                  selectedLayer === layer.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-gray-200 dark:border-gray-700'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: layer.color }}
                  />
                  <input
                    type="text"
                    value={layer.name}
                    onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
                    className="flex-1 text-sm font-semibold bg-transparent border-0 p-0"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {selectedLayer === layer.id && (
                  <div className="space-y-2 text-xs">
                    <div>
                      <label>Type:</label>
                      <select
                        value={layer.type}
                        onChange={(e) => {
                          const type = e.target.value as CakeLayer['type'];
                          updateLayer(layer.id, {
                            type,
                            color: layerTypeColors[type]
                          });
                        }}
                        className="w-full px-2 py-1 rounded border"
                      >
                        {Object.keys(layerTypeColors).map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label>Height (cm):</label>
                      <input
                        type="number"
                        step={0.5}
                        value={layer.height}
                        onChange={(e) => updateLayer(layer.id, { height: parseFloat(e.target.value) })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>

                    <button
                      onClick={() => deleteLayer(layer.id)}
                      className="w-full py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded text-xs font-semibold"
                    >
                      Delete Layer
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-950 rounded text-xs">
            <p className="font-semibold">Total Servings: {design.servings}</p>
            <p>Total Height: {totalHeight}cm</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Cake Builder - Step-by-step cake recipe builder
 */
export function CakeBuilder() {
  const [cakes, setCakes] = useState<CakeDesign[]>([]);
  const [selectedCake, setSelectedCake] = useState<CakeDesign | null>(null);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Cake Builder</h2>

      {selectedCake ? (
        <div>
          <button
            onClick={() => setSelectedCake(null)}
            className="mb-4 text-sm text-blue-600 hover:underline"
          >
            ← Back to Library
          </button>
          <EchoCanvas />
        </div>
      ) : (
        <div className="space-y-4">
          <Button className="w-full" size="sm" onClick={() => {
            const newCake: CakeDesign = {
              id: Date.now().toString(),
              name: 'New Cake',
              servings: 12,
              layers: [],
              dimensions: { width: 20, height: 30 },
              temperature: 20,
              humidity: 45,
              specialTechniques: [],
              notes: ''
            };
            setCakes([...cakes, newCake]);
            setSelectedCake(newCake);
          }}>
            <Plus className="w-4 h-4 mr-2" /> Create New Cake
          </Button>

          <div className="grid grid-cols-2 gap-4">
            {cakes.map(cake => (
              <div
                key={cake.id}
                onClick={() => setSelectedCake(cake)}
                className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                <h3 className="font-semibold mb-2">{cake.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">{cake.layers.length} layers</p>
                <p className="text-sm text-muted-foreground">{cake.servings} servings</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Pastry Module Main View
 */
export default function PastryModule() {
  return (
    <Tabs defaultValue="canvas" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="canvas">🎨 Echo Canvas</TabsTrigger>
        <TabsTrigger value="builder">🍰 Cake Builder</TabsTrigger>
        <TabsTrigger value="techniques">🎯 Techniques</TabsTrigger>
      </TabsList>

      <TabsContent value="canvas" className="space-y-4">
        <EchoCanvas />
      </TabsContent>

      <TabsContent value="builder" className="space-y-4">
        <CakeBuilder />
      </TabsContent>

      <TabsContent value="techniques" className="space-y-4">
        <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Advanced Pastry Techniques</h2>
          <div className="grid grid-cols-2 gap-4">
            {['Tempering', 'Lamination', 'Piping', 'Isomalt', 'Caramel', 'Gelatin Work'].map(
              technique => (
                <div key={technique} className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                  <h3 className="font-semibold mb-2">{technique}</h3>
                  <p className="text-sm text-muted-foreground">
                    Coming soon: Detailed technique guides and videos
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
