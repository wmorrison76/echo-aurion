/** * EchoLayoutPanel * Enhanced main panel wrapper for the immersive 3D dining layout designer * Includes: HUD stack, numeric wiring, chair instancing, Presenter lock, Enterprise SaaS UX */ import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import EchoLayoutScene from "../scenes/EchoLayoutScene";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SnapBar } from "../components/SnapBar";
import { ViewCube } from "../components/ViewCube";
import { CameraBookmarks } from "../components/CameraBookmarks";
import { ScopeKPI } from "../components/ScopeKPI";
import { ComplianceHUD } from "../components/ComplianceHUD";
import { ScanHealthHUD } from "../components/ScanHealthHUD";
import { GizmoNumeric } from "../components/GizmoNumeric";
import { ToolkitLauncher } from "../components/ToolkitLauncher";
import { BEOButton } from "../components/BEOButton";
import { collectChairPositions } from "../lib/seating";
import { CAMERA_PRESETS, applyCameraPreset } from "../lib/camera";
import { validateAda } from "../lib/adaRules";
import { useEchoBuilderConfig } from "../hooks/useEchoBuilderConfig";
import { useSceneStore } from "../store/sceneStore";
import { toast } from "../hooks/use-toast";
interface EchoLayoutPanelProps {
  roomWidth?: number;
  roomLength?: number;
  roomType?: string;
  covers?: number;
  onClose?: () => void;
}
export default function EchoLayoutPanel({
  roomWidth = 24,
  roomLength = 36,
  roomType = "banquet",
  covers = 120,
  onClose,
}: EchoLayoutPanelProps) {
  const session = `${roomType}_${Date.now()}`;
  const [presenterLocked, setPresenterLocked] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [objects, setObjects] = useState<any[]>([]);
  const [snap, setSnap] = useState({ grid: true, angle: true, object: false });
  const { setObjects: setGlobalObjects } = useSceneStore();
  const builderConfig = useEchoBuilderConfig(session);
  const lastCamRef = React.useRef<{ camera: any; controls: any } | null>(null); // Keep global store in sync for Outliner/Variants useEffect(() => { setGlobalObjects(objects); }, [objects, setGlobalObjects]); // ADA/egress compliance checking const compliance = useMemo(() => { return validateAda({ aisles: [], doors: [], tables: objects.filter((o) => o.type.startsWith("table")), buffets: objects.filter((o) => o.type ==="buffet"), }); }, [objects]); // Summary stats const stats = useMemo(() => { return { tables: objects.filter((o) => o.type.startsWith("table")).length, buffets: objects.filter((o) => o.type ==="buffet").length, seats: objects.reduce((s, o) => s + (o.seats ?? 0), 0), }; }, [objects]); // Numeric popover handler: patch selected object const onApplyNumeric = useCallback( (patch: any) => { if (!selectedId) { toast({ title:"No object selected", variant:"destructive" }); return; } setObjects((prev) => prev.map((o) => { if (o.id !== selectedId) return o; const pos = [...(o.position ?? [0, 0, 0])] as [number, number, number]; const rot = [...(o.rotation ?? [0, 0, 0])] as [number, number, number]; if (patch.x !== undefined) pos[0] = patch.x; if (patch.y !== undefined) pos[1] = patch.y; if (patch.z !== undefined) pos[2] = patch.z; if (patch.rx !== undefined) rot[0] = patch.rx; if (patch.ry !== undefined) rot[1] = patch.ry; if (patch.rz !== undefined) rot[2] = patch.rz; return { ...o, position: pos, rotation: rot }; }) ); toast({ title:"Transform applied" }); }, [selectedId] ); // Camera helpers const onView = (v:"top" |"front" |"right" |"persp") => { if (!lastCamRef.current) return; applyCameraPreset(lastCamRef.current, CAMERA_PRESETS[v]); }; const onSaveBookmark = (i: number) => { if (!lastCamRef.current) return; const { camera, controls } = lastCamRef.current; const state = { pos: [camera.position.x, camera.position.y, camera.position.z], target: [controls?.target.x ?? 0, controls?.target.y ?? 0, controls?.target.z ?? 0], }; localStorage.setItem(`cam:${session}:${i}`, JSON.stringify(state)); toast({ title: `Camera saved to slot ${i}` }); }; const onGoBookmark = (i: number) => { const raw = localStorage.getItem(`cam:${session}:${i}`); if (!raw || !lastCamRef.current) { toast({ title:"No bookmark in this slot", variant:"destructive" }); return; } applyCameraPreset(lastCamRef.current, JSON.parse(raw)); }; return ( <div className="relative w-full h-full flex flex-col bg-background"> {/* Header */} <div className="border-b border-border/40 bg-card/40 backdrop-blur-sm px-4 py-3"> <div className="flex items-center justify-between gap-3"> <div className="flex-1"> <h2 className="text-base font-semibold"> EchoLayout • Immersive Designer {presenterLocked && <span className="ml-2 text-xs text-red-500">🔒 PRESENTER</span>} </h2> <p className="text-xs text-muted-foreground mt-0.5"> {presenterLocked ?"Presenter Mode (Locked)" :"Planner · Studio · Walkthrough"} </p> </div> <div className="flex items-center gap-2"> <Badge variant="secondary">Immersive 3D</Badge> {onClose && ( <Button size="sm" variant="ghost" onClick={onClose}> ��� </Button> )} </div> </div> {/* Inline toolbar */} <div className="mt-2 flex items-center gap-2 border-t border-border/20 pt-2 text-xs"> <span className="text-muted-foreground">Tools:</span> <Button size="sm" variant={presenterLocked ?"destructive" :"outline"} onClick={() => setPresenterLocked((v) => !v)} className="text-xs h-7" > {presenterLocked ?"🔒 Unlock" :"🔓 Lock"} </Button> <BEOButton session={session} objects={objects} summary={stats} /> <ToolkitLauncher onOpenOutliner={() => toast({ title:"Opening Outliner..." })} onOpenVariants={() => toast({ title:"Opening Variants..." })} onOpenEvents={() => toast({ title:"Opening Events..." })} onOpenEquipment={() => toast({ title:"Opening Equipment..." })} /> <div className="ml-auto text-muted-foreground"> {roomWidth}m × {roomLength}m </div> </div> </div> {/* Main scene area with HUD overlays */} <div className="flex-1 relative min-h-0"> {/* HUD stack (left side) */} <div className="absolute left-4 top-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-auto"> <SnapBar onChange={setSnap} /> <ViewCube onView={onView} /> <CameraBookmarks onSave={onSaveBookmark} onJump={onGoBookmark} slots={4} saved={[]} /> <GizmoNumeric onApply={onApplyNumeric} /> <ScopeKPI data={{ throughput: stats.seats / (roomWidth * roomLength || 1), avgPathM: (roomWidth + roomLength) / 2, seatsPerM2: stats.seats / (roomWidth * roomLength || 1), }} /> <ComplianceHUD findings={compliance} /> <ScanHealthHUD phase="idle" coverage={0.95} holes={0.05} /> </div> {/* 3D Scene */} <EchoLayoutScene roomWidth={roomWidth} roomLength={roomLength} aiParams={{ covers, roomType, flowPreference: builderConfig?.flowPreference ??"counter-clockwise", theme: builderConfig?.theme ??"modern", }} presenterLocked={presenterLocked} snap={snap} onSelectionChange={setSelectedId} onLayoutChange={setObjects} onApplyNumeric={onApplyNumeric} onCreated={(ctx) => { lastCamRef.current = ctx; }} /> </div> {/* Footer info */} <Card className="m-2 p-2 bg-muted/30"> <div className="flex items-center justify-between text-xs"> <span className="text-muted-foreground"> {stats.tables} tables • {stats.seats} seats • {stats.buffets} buffets </span> <span className="text-muted-foreground">{session}</span> </div> </Card> </div> );
}
