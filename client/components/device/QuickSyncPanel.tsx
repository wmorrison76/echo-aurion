import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Zap, Wifi, ShieldCheck, Smartphone } from "lucide-react";

type PairedDevice = {
  id: string;
  name: string;
  outlet: string;
  role: string;
  lastSync: string;
  status: "ready" | "syncing";
};

const STORAGE_KEY = "quickSync.pairedDevices";
const CODE_KEY = "quickSync.pairingCode";

const getPairingCode = () => {
  try {
    const stored = localStorage.getItem(CODE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as { code: string; expiresAt: number };
      if (parsed && typeof parsed.expiresAt === "number" && Date.now() < parsed.expiresAt) {
        return parsed;
      }
    }
  } catch {
    // Ignore corrupted localStorage data
  }
  const code = `${Math.floor(100000 + Math.random() * 900000)}`;
  const next = { code, expiresAt: Date.now() + 10 * 60 * 1000 };
  try {
    localStorage.setItem(CODE_KEY, JSON.stringify(next));
  } catch {
    // Ignore localStorage write failures
  }
  return next;
};

export default function QuickSyncPanel() {
  const [devices, setDevices] = useState<PairedDevice[]>([]);
  const [pairing, setPairing] = useState(getPairingCode);
  const [showPairDialog, setShowPairDialog] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [deviceOutlet, setDeviceOutlet] = useState("");
  const [deviceRole, setDeviceRole] = useState("Operator");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setDevices(parsed);
        }
      }
    } catch {
      // Ignore corrupted localStorage data
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
    } catch (error) {
      console.error("Failed to save devices:", error);
    }
  }, [devices]);

  const timeRemaining = useMemo(() => {
    if (!pairing || typeof pairing.expiresAt !== "number") {
      return "0:00";
    }
    const diff = Math.max(0, pairing.expiresAt - Date.now());
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, [pairing.expiresAt]);

  const refreshCode = () => {
    const next = getPairingCode();
    setPairing(next);
  };

  const addDevice = () => {
    if (!deviceName.trim() || !deviceOutlet.trim()) return;
    const newDevice: PairedDevice = {
      id: `device-${Date.now()}`,
      name: deviceName,
      outlet: deviceOutlet,
      role: deviceRole,
      lastSync: new Date().toLocaleString(),
      status: "ready",
    };
    setDevices((prev) => [newDevice, ...prev]);
    setDeviceName("");
    setDeviceOutlet("");
    setDeviceRole("Operator");
    setShowPairDialog(false);
  };

  return (
    <Card className="border border-slate-200/70 bg-white/80 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-indigo-500" />
            Quick Sync for Handheld Devices
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Seamless handoff like a new iPhone setup.
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => setShowPairDialog(true)}
        >
          Pair new device
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Pairing Code
            </p>
            <div className="mt-2 flex items-center gap-3">
              <div className="text-3xl font-semibold tracking-[0.3em] text-slate-900">
                {pairing.code}
              </div>
              <Badge variant="outline" className="bg-white">
                Expires in {timeRemaining}
              </Badge>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <Wifi className="h-4 w-4" />
              Keep both devices nearby and on the same network.
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-4 rounded-full"
              onClick={refreshCode}
            >
              Refresh code
            </Button>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white px-4 py-4">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Quick Sync Flow
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-slate-400" />
                Open Settings → Pair New Device
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                Confirm outlet access and role
              </li>
              <li className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-slate-400" />
                Sync preferences, templates, and approvals
              </li>
            </ul>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">
            Paired Devices
          </p>
          <div className="mt-3 space-y-2">
            {devices.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
                No devices paired yet. Pair a handheld to sync templates, outlets,
                and shortcuts instantly.
              </div>
            )}
            {devices.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between rounded-lg border border-slate-200/70 bg-white px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {device.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {device.outlet} • {device.role}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={device.status === "syncing" ? "bg-amber-50" : "bg-emerald-50"}
                >
                  {device.status === "syncing" ? "Syncing" : "Ready"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      <Dialog open={showPairDialog} onOpenChange={setShowPairDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pair new handheld device</DialogTitle>
            <DialogDescription>
              Assign an outlet and role so the device inherits the right workflows.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Device name (e.g., Dock iPad)"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
            />
            <Input
              placeholder="Outlet / Department"
              value={deviceOutlet}
              onChange={(e) => setDeviceOutlet(e.target.value)}
            />
            <Input
              placeholder="Role (e.g., Receiver, Prep Lead)"
              value={deviceRole}
              onChange={(e) => setDeviceRole(e.target.value)}
            />
          </div>
          <div className="flex justify-end pt-4">
            <Button className="rounded-full" onClick={addDevice}>
              Pair device
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
