import { useEffect, useState } from "react";
import {
  interactionEngine,
  type AnimationKeyframe,
  type AnimationSequence,
  type AnimationType,
  type EasingType,
} from "@/services/InteractionEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, SlidersHorizontal } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const animationTypes: AnimationType[] = ["fade", "slide", "scale", "rotate", "bounce", "shake"];
const easingOptions: EasingType[] = ["ease-in", "ease-out", "ease-in-out", "linear", "cubic-bezier"];

function createKeyframes(type: AnimationType): AnimationKeyframe[] {
  switch (type) {
    case "slide":
      return [
        { time: 0, properties: { x: -24, opacity: 0 }, easing: "ease-out" },
        { time: 100, properties: { x: 0, opacity: 1 }, easing: "ease-out" },
      ];
    case "scale":
      return [
        { time: 0, properties: { scale: 0.85, opacity: 0 }, easing: "ease-in-out" },
        { time: 100, properties: { scale: 1, opacity: 1 }, easing: "ease-in-out" },
      ];
    case "rotate":
      return [
        { time: 0, properties: { rotate: -15, opacity: 0 }, easing: "linear" },
        { time: 100, properties: { rotate: 0, opacity: 1 }, easing: "linear" },
      ];
    case "bounce":
      return [
        { time: 0, properties: { scale: 0.8, y: 12 }, easing: "ease-out" },
        { time: 60, properties: { scale: 1.08, y: -4 }, easing: "ease-out" },
        { time: 100, properties: { scale: 1, y: 0 }, easing: "ease-out" },
      ];
    case "shake":
      return [
        { time: 0, properties: { x: 0 }, easing: "linear" },
        { time: 25, properties: { x: -8 }, easing: "linear" },
        { time: 50, properties: { x: 8 }, easing: "linear" },
        { time: 75, properties: { x: -4 }, easing: "linear" },
        { time: 100, properties: { x: 0 }, easing: "linear" },
      ];
    case "fade":
    default:
      return [
        { time: 0, properties: { opacity: 0 }, easing: "ease-in" },
        { time: 100, properties: { opacity: 1 }, easing: "ease-in" },
      ];
  }
}

export default function AnimationTimeline() {
  const [sequences, setSequences] = useState<AnimationSequence[]>(interactionEngine.getAllAnimationSequences());
  const [sequenceName, setSequenceName] = useState("Fade in");
  const [sequenceType, setSequenceType] = useState<AnimationType>("fade");
  const [duration, setDuration] = useState(500);
  const [delay, setDelay] = useState(0);
  const [loop, setLoop] = useState(false);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string>("");
  const [keyframeTime, setKeyframeTime] = useState(50);
  const [keyframeOpacity, setKeyframeOpacity] = useState(1);
  const [keyframeX, setKeyframeX] = useState(0);
  const [keyframeY, setKeyframeY] = useState(0);
  const [keyframeScale, setKeyframeScale] = useState(1);
  const [keyframeRotate, setKeyframeRotate] = useState(0);
  const [keyframeEasing, setKeyframeEasing] = useState<EasingType>("ease-in-out");

  const refresh = () => {
    const all = interactionEngine.getAllAnimationSequences();
    setSequences(all);
    if (!selectedSequenceId && all.length > 0) {
      setSelectedSequenceId(all[0].id);
    }
  };

  useEffect(() => {
    refresh();
    const events = ["animation-added", "animation-updated", "animation-deleted"];
    events.forEach((event) => interactionEngine.on(event, refresh));
    return () => {
      events.forEach((event) => interactionEngine.off(event, refresh));
    };
  }, []);

  const handleAddSequence = () => {
    if (!sequenceName.trim()) {
      toast({ title: "Missing information", description: "Enter an animation name", variant: "destructive" });
      return;
    }

    const sequence = interactionEngine.addAnimationSequence({
      name: sequenceName.trim(),
      duration,
      keyframes: createKeyframes(sequenceType),
      loop,
      delay,
    });

    setSelectedSequenceId(sequence.id);
    toast({ title: "Animation created", description: `${sequenceName} was added to the timeline` });
    setSequenceName("");
  };

  const handleAddKeyframe = () => {
    if (!selectedSequenceId) {
      toast({ title: "Select an animation", description: "Choose a sequence before adding keyframes", variant: "destructive" });
      return;
    }

    interactionEngine.addKeyframe(selectedSequenceId, {
      time: keyframeTime,
      properties: {
        opacity: keyframeOpacity,
        x: keyframeX,
        y: keyframeY,
        scale: keyframeScale,
        rotate: keyframeRotate,
      },
      easing: keyframeEasing,
    });

    toast({ title: "Keyframe added", description: "Timeline updated with a new keyframe" });
  };

  return (
    <Card className="border border-primary/20 bg-background/75 backdrop-blur h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          Animation Timeline
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col gap-3">
        <div className="grid gap-3 lg:grid-cols-2">
          <Card className="border-primary/10 bg-background/70">
            <CardContent className="space-y-3 pt-4">
              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input className="h-8 text-xs" value={sequenceName} onChange={(e) => setSequenceName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <select className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs" value={sequenceType} onChange={(e) => setSequenceType(e.target.value as AnimationType)}>
                    {animationTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Duration</Label>
                  <Input className="h-8 text-xs" type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Delay</Label>
                  <Input className="h-8 text-xs" type="number" value={delay} onChange={(e) => setDelay(Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Loop</Label>
                  <select className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs" value={String(loop)} onChange={(e) => setLoop(e.target.value === "true")}>
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
              </div>
              <Button className="w-full" onClick={handleAddSequence}>
                <Plus className="w-4 h-4 mr-2" />
                Add Sequence
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/10 bg-background/70">
            <CardContent className="space-y-3 pt-4">
              <div className="space-y-1">
                <Label className="text-xs">Selected Sequence</Label>
                <select
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                  value={selectedSequenceId}
                  onChange={(e) => setSelectedSequenceId(e.target.value)}
                >
                  <option value="">Select an animation</option>
                  {sequences.map((sequence) => (
                    <option key={sequence.id} value={sequence.id}>{sequence.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Time</Label>
                  <Input className="h-8 text-xs" type="number" min={0} max={100} value={keyframeTime} onChange={(e) => setKeyframeTime(Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Easing</Label>
                  <select className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs" value={keyframeEasing} onChange={(e) => setKeyframeEasing(e.target.value as EasingType)}>
                    {easingOptions.map((easing) => (
                      <option key={easing} value={easing}>{easing}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Opacity</Label>
                  <Input className="h-8 text-xs" type="number" step="0.1" value={keyframeOpacity} onChange={(e) => setKeyframeOpacity(Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Scale</Label>
                  <Input className="h-8 text-xs" type="number" step="0.1" value={keyframeScale} onChange={(e) => setKeyframeScale(Number(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">X</Label>
                  <Input className="h-8 text-xs" type="number" value={keyframeX} onChange={(e) => setKeyframeX(Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Y</Label>
                  <Input className="h-8 text-xs" type="number" value={keyframeY} onChange={(e) => setKeyframeY(Number(e.target.value))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Rotate</Label>
                <Input className="h-8 text-xs" type="number" value={keyframeRotate} onChange={(e) => setKeyframeRotate(Number(e.target.value))} />
              </div>
              <Button className="w-full" variant="outline" onClick={handleAddKeyframe}>
                Add Keyframe
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="border-primary/10 bg-background/70 flex-1 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Timeline View
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden pt-0">
            <ScrollArea className="h-[340px] pr-4">
              <div className="space-y-3">
                {sequences.length === 0 ? (
                  <div className="rounded-md border border-dashed border-primary/10 p-4 text-xs text-muted-foreground">
                    No animation sequences yet.
                  </div>
                ) : (
                  sequences.map((sequence) => (
                    <div key={sequence.id} className="rounded-md border border-primary/10 p-3 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold">{sequence.name}</p>
                          <p className="text-[11px] text-muted-foreground">{sequence.duration}ms • delay {sequence.delay}ms</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">{sequence.keyframes.length} keyframes</Badge>
                      </div>

                      <div className="relative h-16 rounded-md border border-primary/10 bg-gradient-to-r from-background to-secondary/20 overflow-hidden">
                        <div className="absolute left-0 right-0 top-1/2 h-px bg-primary/15" />
                        {sequence.keyframes.map((keyframe, index) => (
                          <div
                            key={`${sequence.id}-${index}`}
                            className="absolute top-1/2 flex -translate-y-1/2 flex-col items-center"
                            style={{ left: `${Math.min(keyframe.time, 100)}%`, transform: "translate(-50%, -50%)" }}
                          >
                            <div className="h-3 w-3 rounded-full bg-primary shadow" />
                            <span className="mt-1 text-[10px] text-muted-foreground">{keyframe.time}%</span>
                          </div>
                        ))}
                      </div>

                      <div className="grid gap-2 text-[11px] text-muted-foreground md:grid-cols-2">
                        {sequence.keyframes.map((keyframe, index) => (
                          <div key={`${sequence.id}-details-${index}`} className="rounded-md border border-primary/10 p-2">
                            <p className="font-medium text-foreground">Keyframe {index + 1}</p>
                            <p>Time: {keyframe.time}%</p>
                            <p>Easing: {keyframe.easing}</p>
                            <p>
                              Properties:{" "}
                              {Object.entries(keyframe.properties)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(", ") || "none"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
