import React, { useState } from "react";
import type { DoorArc } from "@/lib/egress_rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
interface Props {
  doorArcs: DoorArc[];
  setDoorArcs: (arcs: DoorArc[]) => void;
}
export default function DoorArcForm({ doorArcs, setDoorArcs }: Props) {
  const [cx, setCx] = useState(0);
  const [cy, setCy] = useState(0);
  const [radius, setRadius] = useState(3); // feet (36") const [startDeg, setStartDeg] = useState(0); const [endDeg, setEndDeg] = useState(90); const [label, setLabel] = useState("Door"); const addArc = () => { const arc: DoorArc = { id:"arc-" + Date.now().toString(36), cx, cy, radius, startDeg, endDeg, label, } as any; setDoorArcs([...doorArcs, arc]); }; return ( <div className="space-y-2"> <div className="text-sm font-semibold">Door Swing Arcs</div> <div className="grid grid-cols-2 gap-2 text-xs"> <label className="text-[10px] text-muted-foreground"> Center X (ft) </label> <Input value={cx} onChange={(e) => setCx(Number(e.target.value) || 0)} className="h-8" /> <label className="text-[10px] text-muted-foreground"> Center Y (ft) </label> <Input value={cy} onChange={(e) => setCy(Number(e.target.value) || 0)} className="h-8" /> <label className="text-[10px] text-muted-foreground">Radius</label> <div className="flex gap-2"> <Button size="sm" variant={radius === 3 ?"default" :"secondary"} onClick={() => setRadius(3)} > 36" </Button> <Button size="sm" variant={radius === 3.5 ?"default" :"secondary"} onClick={() => setRadius(3.5)} > 42" </Button> <Button size="sm" variant={radius === 4 ?"default" :"secondary"} onClick={() => setRadius(4)} > 48" </Button> </div> <label className="text-[10px] text-muted-foreground">Start °</label> <Input value={startDeg} onChange={(e) => setStartDeg(Number(e.target.value) || 0)} className="h-8" /> <label className="text-[10px] text-muted-foreground">End °</label> <Input value={endDeg} onChange={(e) => setEndDeg(Number(e.target.value) || 0)} className="h-8" /> <label className="text-[10px] text-muted-foreground">Label</label> <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-8" /> </div> <Button size="sm" className="w-full" onClick={addArc}> Add Door Arc </Button> <div className="text-[10px] text-muted-foreground"> After adding arcs, run Egress Check to validate swings. </div> </div> );
}
