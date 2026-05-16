import { useMemo } from "react";
import { Volume2, VolumeX } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface SarcasmSliderProps {
  value: number;
  onChange?: (value: number) => void;
  enabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  min?: number;
  max?: number;
  step?: number;
}

const descriptors = [
  { threshold: 0, label: "Stone-serious service", tone: "text-muted-foreground" },
  { threshold: 25, label: "Subtle wink", tone: "text-emerald-500" },
  { threshold: 50, label: "Playful banter", tone: "text-sky-500" },
  { threshold: 75, label: "Full Gordon Ramsay", tone: "text-amber-500" },
  { threshold: 90, label: "Dangerously spicy", tone: "text-destructive" },
];

export function SarcasmSlider({
  value,
  onChange,
  enabled = true,
  onToggle,
  min = 0,
  max = 100,
  step = 5,
}: SarcasmSliderProps) {
  const descriptor = useMemo(() => {
    const sorted = [...descriptors].sort((a, b) => b.threshold - a.threshold);
    return sorted.find((entry) => value >= entry.threshold) ?? descriptors[0];
  }, [value]);

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between gap-4">
        <CardTitle className="text-xl">Empathy Dial · Sarcasm</CardTitle>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={onToggle} aria-label="Toggle sarcasm responses" />
          <Label htmlFor="sarcasm-slider" className="text-sm text-muted-foreground">
            {enabled ? "Enabled" : "Muted"}
          </Label>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-3">
          {enabled ? <Volume2 className="h-5 w-5 text-sky-500" /> : <VolumeX className="h-5 w-5 text-muted-foreground" />}
          <p className={cn("text-sm", descriptor.tone)}>{descriptor.label}</p>
        </div>
        <Slider
          id="sarcasm-slider"
          value={[value]}
          min={min}
          max={max}
          step={step}
          disabled={!enabled}
          onValueChange={(vals) => onChange?.(vals[0] ?? value)}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{min}</span>
          <span>{value}</span>
          <span>{max}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Echo adapts tone per guest. Keep the dial below 60 for VIP banquets; nudge higher for late-night expo morale.
        </p>
      </CardContent>
    </Card>
  );
}
