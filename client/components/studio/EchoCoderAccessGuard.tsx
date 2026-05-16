import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EchoCoderAccessGuardProps = {
  children: ReactNode;
};

export default function EchoCoderAccessGuard({
  children,
}: EchoCoderAccessGuardProps) {
  const [passcode, setPasscode] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("echocoder.admin.session");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.expiresAt && Date.now() < parsed.expiresAt) {
          setAuthorized(true);
        }
      }
    } catch {
      // Ignore storage failures
    }
  }, []);

  const persistSession = () => {
    try {
      localStorage.setItem(
        "echocoder.admin.session",
        JSON.stringify({
          expiresAt: Date.now() + 8 * 60 * 60 * 1000,
        }),
      );
    } catch {
      // Ignore storage failures
    }
  };

  const handleAuthorize = async () => {
    if (!passcode.trim()) {
      setStatus("Enter the super admin passcode.");
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch("/api/echocoder/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Access denied");
      }
      persistSession();
      setAuthorized(true);
      setStatus("Access granted. Creating snapshot...");
      await fetch("/api/zaro/snapshot", { method: "POST" });
      setStatus("Snapshot created. Ready to proceed.");
    } catch (error: any) {
      setStatus(error?.message || "Access failed");
    } finally {
      setBusy(false);
    }
  };

  if (!authorized) {
    return (
      <div className="space-y-3">
        <div className="text-sm font-semibold">Super Admin Access</div>
        <p className="text-xs text-muted-foreground">
          Enter the super admin passcode to unlock EchoCoder.
        </p>
        <Input
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Enter passcode"
        />
        <Button onClick={handleAuthorize} disabled={busy}>
          {busy ? "Authorizing..." : "Authorize"}
        </Button>
        {status && <div className="text-xs text-muted-foreground">{status}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {status && <div className="text-xs text-muted-foreground">{status}</div>}
      {children}
    </div>
  );
}
