import { useEffect, useState } from "react";
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

type OutletProfile = {
  id: string;
  name: string;
  code: string;
  role: string;
  lastUsed: string;
};

const STORAGE_KEY = "outlet.profiles";
const DEFAULT_KEY = "outlet.defaultId";

export default function OutletProfilesPanel() {
  const [profiles, setProfiles] = useState<OutletProfile[]>([]);
  const [defaultId, setDefaultId] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [role, setRole] = useState("Manager");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const defaultStored = localStorage.getItem(DEFAULT_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setProfiles(parsed);
        }
      }
      if (defaultStored) {
        setDefaultId(defaultStored);
      }
    } catch {
      // Ignore corrupted localStorage data
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
      if (defaultId) {
        localStorage.setItem(DEFAULT_KEY, defaultId);
      }
    } catch (error) {
      console.error("Failed to save outlet profiles:", error);
    }
  }, [profiles, defaultId]);

  const addProfile = () => {
    if (!name.trim() || !code.trim()) return;
    const newProfile: OutletProfile = {
      id: `outlet-${Date.now()}`,
      name,
      code,
      role,
      lastUsed: new Date().toLocaleDateString(),
    };
    setProfiles((prev) => [newProfile, ...prev]);
    if (!defaultId) {
      setDefaultId(newProfile.id);
    }
    setName("");
    setCode("");
    setRole("Manager");
    setShowDialog(false);
  };

  return (
    <Card className="border border-slate-200/70 bg-white/80 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Multi-Outlet Login</CardTitle>
          <p className="text-sm text-muted-foreground">
            Keep multiple outlet profiles ready for fast sign-in.
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => setShowDialog(true)}
        >
          Add outlet
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {profiles.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
            Add outlets to enable one-tap switching across departments.
          </div>
        )}
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="flex items-center justify-between rounded-lg border border-slate-200/70 bg-white px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">
                {profile.name}
              </p>
              <p className="text-xs text-slate-500">
                Code {profile.code} • {profile.role}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {defaultId === profile.id ? (
                <Badge className="bg-indigo-50 text-indigo-700">Default</Badge>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setDefaultId(profile.id)}
                >
                  Set default
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add outlet profile</DialogTitle>
            <DialogDescription>
              Save an outlet for faster access on handheld devices.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Outlet name (e.g., Harbor Kitchen)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              placeholder="Outlet code (e.g., HBR-01)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Input
              placeholder="Role (e.g., Receiving Lead)"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
          <div className="flex justify-end pt-4">
            <Button className="rounded-full" onClick={addProfile}>
              Save outlet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
