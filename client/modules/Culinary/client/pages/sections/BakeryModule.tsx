import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Thermometer, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Dough {
  id: string;
  name: string;
  weight: number;
  hydration: number;
  temperature: number;
  fermentationStart: Date;
  fermentationEnd?: Date;
  notes: string;
  readings: TemperatureReading[];
}

interface TemperatureReading {
  timestamp: Date;
  temperature: number;
  humidity: number;
}

interface OvenLoad {
  id: string;
  time: Date;
  doughs: Dough[];
  temperature: number;
  steamDuration: number;
  notes: string;
}

/**
 * Fermentation Tracker
 * Monitor dough fermentation with temperature logging
 */
export function FermentationTracker() {
  const [doughs, setDoughs] = useState<Dough[]>([]);

  const addDough = () => {
    const newDough: Dough = {
      id: Date.now().toString(),
      name: `Dough ${doughs.length + 1}`,
      weight: 500,
      hydration: 75,
      temperature: 26,
      fermentationStart: new Date(),
      notes: '',
      readings: []
    };
    setDoughs([...doughs, newDough]);
  };

  const addTemperatureReading = (doughId: string, temp: number, humidity: number) => {
    setDoughs(
      doughs.map(d =>
        d.id === doughId
          ? {
              ...d,
              readings: [...d.readings, { timestamp: new Date(), temperature: temp, humidity }]
            }
          : d
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Fermentation Tracker</h2>
        <Button onClick={addDough} size="sm">
          <Plus className="w-4 h-4 mr-2" /> Add Dough
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {doughs.map(dough => (
          <div key={dough.id} className="p-6 border rounded-lg space-y-4">
            {/* Dough Info */}
            <div>
              <input
                type="text"
                value={dough.name}
                onChange={(e) =>
                  setDoughs(
                    doughs.map(d => (d.id === dough.id ? { ...d, name: e.target.value } : d))
                  )
                }
                className="text-lg font-semibold border-0 bg-transparent p-0 mb-2"
                placeholder="Dough name"
              />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Weight</label>
                  <div className="text-base font-semibold">{dough.weight}g</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Hydration</label>
                  <div className="text-base font-semibold">{dough.hydration}%</div>
                </div>
              </div>
            </div>

            {/* Temperature */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-2 mb-2">
                <Thermometer className="w-4 h-4" /> Current Temp
              </label>
              <div className="text-2xl font-bold text-blue-600">
                {dough.readings[dough.readings.length - 1]?.temperature || dough.temperature}°C
              </div>
            </div>

            {/* Fermentation Time */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4" /> Fermentation
              </label>
              <div className="text-sm">
                {dough.fermentationStart.toLocaleTimeString()}
                {dough.fermentationEnd && ` - ${dough.fermentationEnd.toLocaleTimeString()}`}
              </div>
            </div>

            {/* Temperature Log */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Temperature Log</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-2 rounded text-xs">
                {dough.readings.length > 0 ? (
                  dough.readings.map((reading, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{reading.timestamp.toLocaleTimeString()}</span>
                      <span className="font-semibold">{reading.temperature}°C</span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No readings yet</p>
                )}
              </div>
            </div>

            {/* Quick Add Temperature */}
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Temp (°C)"
                className="flex-1 px-2 py-1 border rounded text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addTemperatureReading(
                      dough.id,
                      parseFloat((e.target as HTMLInputElement).value),
                      45
                    );
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const input = document.querySelector(
                    `input[placeholder="Temp (°C)"]`
                  ) as HTMLInputElement;
                  if (input?.value) {
                    addTemperatureReading(dough.id, parseFloat(input.value), 45);
                    input.value = '';
                  }
                }}
              >
                Log
              </Button>
            </div>

            {/* Notes */}
            <textarea
              value={dough.notes}
              onChange={(e) =>
                setDoughs(
                  doughs.map(d => (d.id === dough.id ? { ...d, notes: e.target.value } : d))
                )
              }
              placeholder="Notes on fermentation..."
              className="w-full px-2 py-1 border rounded text-xs"
              rows={2}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Oven Scheduler
 * Plan and manage oven loads and bake schedules
 */
export function OvenScheduler() {
  const [schedule, setSchedule] = useState<OvenLoad[]>([]);

  const addOvenLoad = () => {
    const newLoad: OvenLoad = {
      id: Date.now().toString(),
      time: new Date(),
      doughs: [],
      temperature: 220,
      steamDuration: 15,
      notes: ''
    };
    setSchedule([...schedule, newLoad]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Oven Schedule</h2>
        <Button onClick={addOvenLoad} size="sm">
          <Plus className="w-4 h-4 mr-2" /> Schedule Bake
        </Button>
      </div>

      <div className="space-y-4">
        {schedule.map(load => (
          <div key={load.id} className="p-4 border rounded-lg space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Time</label>
                <input
                  type="time"
                  value={load.time.toTimeString().slice(0, 5)}
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value.split(':');
                    const newTime = new Date(load.time);
                    newTime.setHours(parseInt(hours), parseInt(minutes));
                    setSchedule(
                      schedule.map(l => (l.id === load.id ? { ...l, time: newTime } : l))
                    );
                  }}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Temp (°C)</label>
                <input
                  type="number"
                  value={load.temperature}
                  onChange={(e) =>
                    setSchedule(
                      schedule.map(l =>
                        l.id === load.id ? { ...l, temperature: parseInt(e.target.value) } : l
                      )
                    )
                  }
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Steam (min)</label>
                <input
                  type="number"
                  value={load.steamDuration}
                  onChange={(e) =>
                    setSchedule(
                      schedule.map(l =>
                        l.id === load.id ? { ...l, steamDuration: parseInt(e.target.value) } : l
                      )
                    )
                  }
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
            </div>

            <textarea
              value={load.notes}
              onChange={(e) =>
                setSchedule(
                  schedule.map(l => (l.id === load.id ? { ...l, notes: e.target.value } : l))
                )
              }
              placeholder="Bake notes (doneness cues, color, sound, etc)..."
              className="w-full px-2 py-1 border rounded text-xs"
              rows={2}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Main Bakery Module
 */
export default function BakeryModule() {
  return (
    <Tabs defaultValue="fermentation" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="fermentation">🌡️ Fermentation</TabsTrigger>
        <TabsTrigger value="oven">🔥 Oven Schedule</TabsTrigger>
        <TabsTrigger value="recipes">📖 Recipes</TabsTrigger>
      </TabsList>

      <TabsContent value="fermentation" className="space-y-4">
        <FermentationTracker />
      </TabsContent>

      <TabsContent value="oven" className="space-y-4">
        <OvenScheduler />
      </TabsContent>

      <TabsContent value="recipes" className="space-y-4">
        <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Bakery Recipes</h2>
          <p className="text-muted-foreground">
            Save and organize bakery formulas with baker's percentages, hydration ratios, and
            fermentation schedules.
          </p>
          <Button className="mt-4">Create Bakery Recipe</Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}
