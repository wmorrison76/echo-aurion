import { useEffect, useState } from "react";
import {
  interactionEngine,
  type ActionType,
  type AnimationType,
  type Interaction,
  type TriggerType,
} from "@/services/InteractionEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Plus, Trash2, Film, MousePointer2, Workflow } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const triggerOptions: TriggerType[] = [
  "click",
  "hover",
  "double-click",
  "long-press",
  "scroll",
  "keyboard",
];

const actionOptions: ActionType[] = [
  "navigate",
  "toggle-visibility",
  "animate",
  "toggle-state",
  "update-text",
  "custom",
];

const animationOptions: AnimationType[] = [
  "fade",
  "slide",
  "scale",
  "rotate",
  "bounce",
  "shake",
];

const easingOptions = ["ease-in", "ease-out", "ease-in-out", "linear", "cubic-bezier"] as const;

function buildAnimation(
  animationType: AnimationType,
  duration: number,
  delay: number,
  easing: (typeof easingOptions)[number],
) {
  switch (animationType) {
    case "slide":
      return {
        type: animationType,
        duration,
        delay,
        easing,
        repeat: 0,
        direction: "normal" as const,
      };
    case "scale":
      return {
        type: animationType,
        duration,
        delay,
        easing,
        repeat: 0,
        direction: "normal" as const,
      };
    case "rotate":
      return {
        type: animationType,
        duration,
        delay,
        easing,
        repeat: 0,
        direction: "normal" as const,
      };
    case "bounce":
    case "shake":
    case "fade":
    default:
      return {
        type: animationType,
        duration,
        delay,
        easing,
        repeat: 0,
        direction: "normal" as const,
      };
  }
}

export default function InteractionPanel() {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [flows, setFlows] = useState(interactionEngine.getFlows());
  const [activeTab, setActiveTab] = useState("interactions");
  const [recording, setRecording] = useState(false);
  const [flowName, setFlowName] = useState("New Flow");

  const [name, setName] = useState("Open menu");
  const [trigger, setTrigger] = useState<TriggerType>("click");
  const [sourceElement, setSourceElement] = useState("menu-button");
  const [action, setAction] = useState<ActionType>("navigate");
  const [targetScreen, setTargetScreen] = useState("dashboard");
  const [toggleElements, setToggleElements] = useState("sidebar");
  const [customCode, setCustomCode] = useState("console.log('Interaction fired')");
  const [condition, setCondition] = useState("");
  const [animationType, setAnimationType] = useState<AnimationType>("fade");
  const [animationDuration, setAnimationDuration] = useState(300);
  const [animationDelay, setAnimationDelay] = useState(0);
  const [animationEasing, setAnimationEasing] = useState<(typeof easingOptions)[number]>("ease-in-out");

  const refresh = () => {
    const prototypeData = interactionEngine.getPrototypeData();
    setInteractions(prototypeData.interactions);
    setFlows(prototypeData.flows);
  };

  useEffect(() => {
    refresh();
    const events = [
      "interaction-added",
      "interaction-updated",
      "interaction-deleted",
      "animation-added",
      "animation-updated",
      "animation-deleted",
      "flow-recorded",
    ];

    events.forEach((event) => interactionEngine.on(event, refresh));
    return () => {
      events.forEach((event) => interactionEngine.off(event, refresh));
    };
  }, []);

  const handleAddInteraction = () => {
    if (!name.trim() || !sourceElement.trim()) {
      toast({
        title: "Missing information",
        description: "Enter a name and source element",
        variant: "destructive",
      });
      return;
    }

    interactionEngine.addInteraction({
      name: name.trim(),
      trigger,
      sourceElement: sourceElement.trim(),
      action,
      enabled: true,
      targetScreen: action === "navigate" ? targetScreen.trim() || undefined : undefined,
      toggleElements:
        action === "toggle-visibility"
          ? toggleElements.split(",").map((item) => item.trim()).filter(Boolean)
          : undefined,
      customCode: action === "custom" ? customCode.trim() || undefined : undefined,
      condition: condition.trim() || undefined,
      animation: action === "animate" ? buildAnimation(animationType, animationDuration, animationDelay, animationEasing) : undefined,
    });

    toast({ title: "Interaction created", description: `${name} has been added to the prototype` });
    setName("");
    setSourceElement("");
    setCondition("");
  };

  const handleToggleEnabled = (interaction: Interaction) => {
    interactionEngine.updateInteraction(interaction.id, { enabled: !interaction.enabled });
  };

  const handleDeleteInteraction = (interactionId: string) => {
    interactionEngine.deleteInteraction(interactionId);
    toast({ title: "Interaction removed", description: "The interaction was deleted" });
  };

  const handleRecording = () => {
    if (!recording) {
      if (!sourceElement.trim()) {
        toast({
          title: "Missing start element",
          description: "Provide a source element before recording",
          variant: "destructive",
        });
        return;
      }
      interactionEngine.startRecording(sourceElement.trim());
      setRecording(true);
      toast({ title: "Recording started", description: "Interaction flow recording is active" });
      return;
    }

    interactionEngine.stopRecording(flowName.trim() || "Prototype Flow");
    setRecording(false);
    setFlows(interactionEngine.getFlows());
    toast({ title: "Recording saved", description: `${flowName} was captured` });
  };

  return (
    <Card className="border border-primary/20 bg-background/75 backdrop-blur h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Workflow className="w-4 h-4" />
          Interactions
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="interactions" className="text-xs">Rules</TabsTrigger>
            <TabsTrigger value="flows" className="text-xs">Flows</TabsTrigger>
            <TabsTrigger value="record" className="text-xs">Recorder</TabsTrigger>
          </TabsList>

          <TabsContent value="interactions" className="flex-1 overflow-hidden pt-3 space-y-3">
            <div className="grid gap-3 lg:grid-cols-2">
              <Card className="border-primary/10 bg-background/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5" />
                    Add Interaction
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input className="h-8 text-xs" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Trigger</Label>
                      <select className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs" value={trigger} onChange={(e) => setTrigger(e.target.value as TriggerType)}>
                        {triggerOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Action</Label>
                      <select className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs" value={action} onChange={(e) => setAction(e.target.value as ActionType)}>
                        {actionOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Source Element</Label>
                    <Input className="h-8 text-xs" value={sourceElement} onChange={(e) => setSourceElement(e.target.value)} placeholder="menu-button" />
                  </div>

                  {action === "navigate" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Target Screen</Label>
                      <Input className="h-8 text-xs" value={targetScreen} onChange={(e) => setTargetScreen(e.target.value)} placeholder="dashboard" />
                    </div>
                  )}

                  {action === "toggle-visibility" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Toggle Elements</Label>
                      <Input className="h-8 text-xs" value={toggleElements} onChange={(e) => setToggleElements(e.target.value)} placeholder="sidebar, overlay" />
                    </div>
                  )}

                  {action === "animate" && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Animation</Label>
                          <select className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs" value={animationType} onChange={(e) => setAnimationType(e.target.value as AnimationType)}>
                            {animationOptions.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Easing</Label>
                          <select className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs" value={animationEasing} onChange={(e) => setAnimationEasing(e.target.value as typeof animationEasing)}>
                            {easingOptions.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Duration</Label>
                          <Input className="h-8 text-xs" type="number" value={animationDuration} onChange={(e) => setAnimationDuration(Number(e.target.value))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Delay</Label>
                          <Input className="h-8 text-xs" type="number" value={animationDelay} onChange={(e) => setAnimationDelay(Number(e.target.value))} />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-1">
                    <Label className="text-xs">Condition</Label>
                    <Textarea className="min-h-16 text-xs resize-none" value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="Optional JavaScript condition" />
                  </div>

                  {action === "custom" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Custom Code</Label>
                      <Textarea className="min-h-24 text-xs resize-none font-mono" value={customCode} onChange={(e) => setCustomCode(e.target.value)} placeholder="console.log('Hello')" />
                    </div>
                  )}

                  <Button className="w-full" onClick={handleAddInteraction}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Interaction
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-primary/10 bg-background/70 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs flex items-center gap-2">
                    <MousePointer2 className="w-3.5 h-3.5" />
                    Prototype Rules
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[560px] overflow-hidden pt-0">
                  <ScrollArea className="h-full pr-4">
                    <div className="space-y-2">
                      {interactions.length === 0 ? (
                        <div className="rounded-md border border-dashed border-primary/10 p-4 text-xs text-muted-foreground">
                          No interactions yet. Add one to define how the prototype should respond.
                        </div>
                      ) : (
                        interactions.map((interaction) => (
                          <div key={interaction.id} className="rounded-md border border-primary/10 p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1 min-w-0">
                                <p className="text-xs font-semibold truncate">{interaction.name}</p>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {interaction.trigger} → {interaction.action}
                                </p>
                              </div>
                              <Badge variant={interaction.enabled ? "default" : "secondary"} className="text-[10px]">
                                {interaction.enabled ? "Enabled" : "Disabled"}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                              <span>Source: {interaction.sourceElement}</span>
                              {interaction.targetScreen ? <span>Target: {interaction.targetScreen}</span> : null}
                              {interaction.toggleElements?.length ? <span>Toggle: {interaction.toggleElements.join(", ")}</span> : null}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleToggleEnabled(interaction)}>
                                {interaction.enabled ? "Disable" : "Enable"}
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => handleDeleteInteraction(interaction.id)}>
                                <Trash2 className="w-3.5 h-3.5 mr-2" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="flows" className="flex-1 overflow-hidden pt-3">
            <Card className="border-primary/10 bg-background/70 h-full flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <Workflow className="w-3.5 h-3.5" />
                  Recorded Flows
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden pt-0">
                <ScrollArea className="h-[560px] pr-4">
                  <div className="space-y-2">
                    {flows.length === 0 ? (
                      <div className="rounded-md border border-dashed border-primary/10 p-4 text-xs text-muted-foreground">
                        No recorded flows yet.
                      </div>
                    ) : (
                      flows.map((flow) => (
                        <div key={flow.id} className="rounded-md border border-primary/10 p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold">{flow.name}</p>
                              <p className="text-[11px] text-muted-foreground">Start: {flow.startElement}</p>
                            </div>
                            <Badge variant="secondary" className="text-[10px]">
                              {flow.flowPath.length} steps
                            </Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {flow.flowPath.map((step) => `${step.elementId} • ${step.action}`).join(" → ")}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="record" className="flex-1 overflow-hidden pt-3">
            <Card className="border-primary/10 bg-background/70 h-full flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <Film className="w-3.5 h-3.5" />
                  Flow Recorder
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Flow Name</Label>
                  <Input className="h-8 text-xs" value={flowName} onChange={(e) => setFlowName(e.target.value)} />
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>1. Set the source element on the interaction form.</p>
                  <p>2. Start recording to capture a flow.</p>
                  <p>3. Stop recording to save the interaction path.</p>
                </div>
                <Separator />
                <Button className="w-full" variant={recording ? "destructive" : "default"} onClick={handleRecording}>
                  <Play className="w-4 h-4 mr-2" />
                  {recording ? "Stop Recording" : "Start Recording"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
