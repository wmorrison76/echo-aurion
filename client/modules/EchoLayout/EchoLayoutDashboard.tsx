import * as React from "react";
const { useState, useMemo, useCallback, useEffect } = React;
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, LayoutGrid, Sparkles, Wand2, PenTool, Box, Camera, Upload, FileImage, ChefHat } from "lucide-react";
import EchoLayoutPanel from "./client/panels/EchoLayoutPanel";
import FloorPlan2D from "./client/components/FloorPlan2D";
// D5 — full kitchen-design tab
import KitchenDesigner from "./client/components/KitchenDesigner";

type View = "dashboard" | "immersive" | "floorplan2d" | "photo-scan" | "kitchen-design";

export default function EchoLayoutDashboard() {
  const [view, setView] = useState<View>("dashboard");
  const [roomWidth, setRoomWidth] = useState(60);
  const [roomLength, setRoomLength] = useState(80);
  const [eventName, setEventName] = useState("Tavistock Ballroom");
  const [venueName, setVenueName] = useState("LUCCCA Hospitality");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const header = useMemo(() => {
    switch (view) {
      case "immersive":
        return { title: "EchoLayout \u00b7 Immersive Designer", subtitle: "3D layout design, camera tools, compliance HUD" };
      case "floorplan2d":
        return { title: "EchoLayout \u00b7 2D Floor Plan", subtitle: "Professional seating chart with sections & capacity" };
      case "photo-scan":
        return { title: "EchoLayout \u00b7 Room Scanner", subtitle: "Upload a room photo for AI-powered layout analysis" };
      case "kitchen-design":
        return { title: "EchoLayout \u00b7 Kitchen Designer", subtitle: "Equipment library, thermal heat map, plumbing/gas, NSF/ADA compliance" };
      default:
        return { title: "EchoLayout", subtitle: "Floor plan optimization & capacity design" };
    }
  }, [view]);

  // Photo upload and scan
  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
    setScanResult(null);
  }, []);

  const handleScanPhoto = useCallback(async () => {
    if (!photoFile) return;
    setScanning(true);
    try {
      const formData = new FormData();
      formData.append("photo", photoFile);
      formData.append("room_width", String(roomWidth));
      formData.append("room_length", String(roomLength));
      const backendUrl = (import.meta as any).env?.VITE_BACKEND_URL || "";
      const res = await fetch(`${backendUrl}/api/echolayout/scan-room`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setScanResult(data);
      } else {
        setScanResult({ error: "Scan failed. Try a different photo." });
      }
    } catch {
      setScanResult({ error: "Could not connect to scanner service." });
    } finally {
      setScanning(false);
    }
  }, [photoFile, roomWidth, roomLength]);

  if (view === "immersive") {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/40 bg-background/70">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setView("dashboard")} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <div className="h-5 w-px bg-border/60" />
              <div className="min-w-0">
                <div className="font-semibold leading-tight truncate">{header.title}</div>
                <div className="text-xs text-muted-foreground truncate">{header.subtitle}</div>
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Wand2 className="h-3 w-3" /> Live
          </Badge>
        </div>
        <div className="flex-1 min-h-0">
          <EchoLayoutPanel roomWidth={Math.round(roomWidth * 0.3048)} roomLength={Math.round(roomLength * 0.3048)} />
        </div>
      </div>
    );
  }

  if (view === "floorplan2d") {
    return (
      <FloorPlan2D
        roomWidth={roomWidth}
        roomLength={roomLength}
        eventName={eventName}
        venueName={venueName}
        onBack={() => setView("dashboard")}
      />
    );
  }

  if (view === "kitchen-design") {
    return (
      <KitchenDesigner
        onBack={() => setView("dashboard")}
        initialRoomWidth={roomWidth}
        initialRoomLength={roomLength}
      />
    );
  }

  if (view === "photo-scan") {
    return (
      <div className="w-full h-full flex flex-col" data-testid="photo-scan-view">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/40 bg-background/70">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setView("dashboard")} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div className="h-5 w-px bg-border/60" />
            <div>
              <div className="font-semibold leading-tight">{header.title}</div>
              <div className="text-xs text-muted-foreground">{header.subtitle}</div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Camera className="h-4 w-4" /> Upload Room Photo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Take a photo of your event space. Our AI will analyze the room dimensions,
                  identify walls, doors, and obstacles, and suggest optimal table placement.
                </p>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload}
                  className="hidden" />
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2" data-testid="upload-photo-btn">
                    <Upload className="h-4 w-4" /> Choose Photo
                  </Button>
                  {photoFile && (
                    <Button onClick={handleScanPhoto} disabled={scanning} className="gap-2" data-testid="scan-photo-btn">
                      <FileImage className="h-4 w-4" /> {scanning ? "Analyzing..." : "Analyze Room"}
                    </Button>
                  )}
                </div>
                {photoPreview && (
                  <div className="rounded-lg border overflow-hidden">
                    <img src={photoPreview} alt="Room photo" className="w-full max-h-64 object-cover" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Est. Width (ft)</Label>
                    <Input type="number" value={roomWidth} onChange={(e) => setRoomWidth(Number(e.target.value) || 60)}
                      className="h-8 text-sm" data-testid="scan-room-width" />
                  </div>
                  <div>
                    <Label className="text-xs">Est. Length (ft)</Label>
                    <Input type="number" value={roomLength} onChange={(e) => setRoomLength(Number(e.target.value) || 80)}
                      className="h-8 text-sm" data-testid="scan-room-length" />
                  </div>
                </div>
                {scanResult && !scanResult.error && (
                  <Card className="bg-muted/30 border-primary/30">
                    <CardContent className="pt-4 space-y-2">
                      <div className="text-sm font-medium text-primary">AI Analysis Complete</div>
                      <div className="text-xs text-muted-foreground">{scanResult.description}</div>
                      {scanResult.suggestions && (
                        <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                          {scanResult.suggestions.map((s: string, i: number) => <li key={i}>{s}</li>)}
                        </ul>
                      )}
                      <Button size="sm" onClick={() => {
                        if (scanResult.room_width) setRoomWidth(scanResult.room_width);
                        if (scanResult.room_length) setRoomLength(scanResult.room_length);
                        setView("floorplan2d");
                      }} className="mt-2" data-testid="apply-scan-result">
                        Open in 2D Designer
                      </Button>
                    </CardContent>
                  </Card>
                )}
                {scanResult?.error && (
                  <div className="text-sm text-destructive">{scanResult.error}</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard view
  return (
    <div className="w-full h-full overflow-auto" data-testid="echolayout-dashboard">
      <div className="px-6 py-6 border-b border-border/40 bg-background/70">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center">
                <LayoutGrid className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold leading-tight">{header.title}</h1>
                <p className="text-sm text-muted-foreground">{header.subtitle}</p>
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="gap-2">
            <Sparkles className="h-3 w-3" /> Dashboard
          </Badge>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Room Setup */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Room Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Event Name</Label>
                <Input value={eventName} onChange={(e) => setEventName(e.target.value)}
                  className="h-8 text-sm mt-1" data-testid="event-name-input" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Venue</Label>
                <Input value={venueName} onChange={(e) => setVenueName(e.target.value)}
                  className="h-8 text-sm mt-1" data-testid="venue-name-input" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Width (ft)</Label>
                <Input type="number" value={roomWidth} onChange={(e) => setRoomWidth(Number(e.target.value) || 60)}
                  className="h-8 text-sm mt-1" data-testid="room-width-config" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Length (ft)</Label>
                <Input type="number" value={roomLength} onChange={(e) => setRoomLength(Number(e.target.value) || 80)}
                  className="h-8 text-sm mt-1" data-testid="room-length-config" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Designer Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border/50 hover:border-primary/40 transition-colors cursor-pointer group" onClick={() => setView("floorplan2d")} data-testid="open-2d-designer">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PenTool className="h-4 w-4 text-primary" /> 2D Floor Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Professional seating chart with drag-and-drop tables, section management,
                table numbering, capacity calculation, and PDF/PNG export.
              </p>
              <div className="text-[10px] text-muted-foreground/60">
                Industry-standard floor plan matching AllSeated & Social Tables
              </div>
              <Button className="w-full group-hover:bg-primary/90" data-testid="launch-2d-btn">
                Open 2D Designer
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 hover:border-primary/40 transition-colors cursor-pointer group" onClick={() => setView("immersive")} data-testid="open-3d-designer">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Box className="h-4 w-4 text-primary" /> 3D Immersive Designer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Full 3D room with table placement, ADA compliance checking,
                camera bookmarks, and presenter mode walkthrough.
              </p>
              <div className="text-[10px] text-muted-foreground/60">
                VR-ready immersive experience for client presentations
              </div>
              <Button className="w-full" variant="secondary" data-testid="launch-3d-btn">
                Open 3D Designer
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 hover:border-primary/40 transition-colors cursor-pointer group" onClick={() => setView("photo-scan")} data-testid="open-room-scanner">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" /> Room Scanner
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Upload a photo of your event space. AI analyzes the room
                and suggests optimal table configurations.
              </p>
              <div className="text-[10px] text-muted-foreground/60">
                Powered by Gemini Vision for intelligent room analysis
              </div>
              <Button className="w-full" variant="secondary" data-testid="launch-scanner-btn">
                Open Room Scanner
              </Button>
            </CardContent>
          </Card>

          {/* D5 — Kitchen Design tab. Equipment library + thermal heat map +
              plumbing/gas runs + NSF/ADA compliance HUD. Distinct from the
              event-room designers above; uses its own algorithm. */}
          <Card
            className="border-border/50 hover:border-primary/40 transition-colors cursor-pointer group"
            onClick={() => setView("kitchen-design")}
            data-testid="open-kitchen-designer"
          >
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ChefHat className="h-4 w-4 text-primary" /> Kitchen Designer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Full commercial-kitchen layout. Pick a workflow (line, banquet, pastry, bar, ghost),
                add equipment from a 30-item NSF-listed catalog, and the algorithm places stations,
                renders the thermal heat map, traces gas/water/electric runs, and flags NSF + ADA compliance.
              </p>
              <div className="text-[10px] text-muted-foreground/60">
                Heat map · plumbing/gas annotations · equipment library · compliance HUD
              </div>
              <Button className="w-full" variant="secondary" data-testid="launch-kitchen-btn">
                Open Kitchen Designer
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Feature checklist */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Capabilities</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                "Drag-and-drop table placement",
                "Round, rectangle, theatre layouts",
                "Table numbering & sections (A-F)",
                "Auto capacity calculation",
                "Stage, screen, bar, buffet elements",
                "Layout presets (Banquet, Theatre, etc.)",
                "PNG/PDF export with headers",
                "ADA/fire code compliance",
                "3D immersive walkthrough",
                "Room photo AI analysis",
                "Camera bookmarks & snapshots",
                "Real-time seat count",
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                  {f}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
