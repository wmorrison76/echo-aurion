import { useState } from "react";
import { Lock, Users, Building2, Shield, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/glass";

type PermissionLevel = "none" | "local" | "company" | "network";

interface ChatPermission {
  id: string;
  name: string;
  level: PermissionLevel;
  enabled: boolean;
}

export default function ChatSettings() {
  const [displayName, setDisplayName] = useState(
    localStorage.getItem("network-chat-username") || "User"
  );
  const [tempDisplayName, setTempDisplayName] = useState(displayName);
  const [permissions, setPermissions] = useState<ChatPermission[]>([
    {
      id: "local-network",
      name: "Local Network Chat",
      level: "local",
      enabled: true,
    },
    {
      id: "company-chat",
      name: "Company Chat (Multi-unit)",
      level: "company",
      enabled: false,
    },
    {
      id: "direct-message",
      name: "Direct Peer-to-Peer Messages",
      level: "network",
      enabled: true,
    },
  ]);

  const handleSaveName = () => {
    if (tempDisplayName.trim()) {
      setDisplayName(tempDisplayName);
      localStorage.setItem("network-chat-username", tempDisplayName);
    }
  };

  const handlePermissionToggle = (id: string) => {
    setPermissions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );

    localStorage.setItem(
      "chat-permissions",
      JSON.stringify(
        permissions.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
      )
    );
  };

  const getPermissionIcon = (level: PermissionLevel) => {
    switch (level) {
      case "local":
        return <Globe size={16} />;
      case "company":
        return <Building2 size={16} />;
      case "network":
        return <Users size={16} />;
      default:
        return <Lock size={16} />;
    }
  };

  const getPermissionDescription = (level: PermissionLevel) => {
    switch (level) {
      case "local":
        return "Chat with users on your local network";
      case "company":
        return "Chat with other company locations and departments";
      case "network":
        return "Peer-to-peer direct messaging with authenticated users";
      default:
        return "No access";
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-background to-background/50">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border/30 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-primary" />
          <h2 className="text-lg font-semibold">Chat Settings</h2>
        </div>
        <p className="text-xs text-foreground/60">
          Configure your display name and network permissions
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Display Name Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Your Display Name</h3>
          <div className="flex gap-2">
            <Input
              value={tempDisplayName}
              onChange={(e) => setTempDisplayName(e.target.value)}
              placeholder="Enter your name..."
              className="h-9"
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
            />
            <Button
              onClick={handleSaveName}
              size="sm"
              className="h-9"
            >
              Save
            </Button>
          </div>
          <p className="text-xs text-foreground/50">
            Current name: <strong>{displayName}</strong>
          </p>
        </div>

        {/* Permissions Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Network Permissions</h3>
          <div className="space-y-2">
            {permissions.map((perm) => (
              <div
                key={perm.id}
                className={cn(
                  "p-3 rounded-lg border transition-colors",
                  perm.enabled
                    ? "bg-primary/10 border-primary/30"
                    : "bg-background/40 border-border/20"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3 flex-1">
                    <div className={cn(
                      "flex-shrink-0 mt-0.5",
                      perm.enabled ? "text-primary" : "text-foreground/40"
                    )}>
                      {getPermissionIcon(perm.level)}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">
                        {perm.name}
                      </div>
                      <div className="text-xs text-foreground/60 mt-1">
                        {getPermissionDescription(perm.level)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handlePermissionToggle(perm.id)}
                    className={cn(
                      "flex-shrink-0 w-10 h-6 rounded-full transition-colors",
                      perm.enabled ? "bg-primary" : "bg-foreground/20"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full bg-white transition-transform m-0.5",
                      perm.enabled ? "translate-x-4" : "translate-x-0"
                    )} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security Info */}
        <div className="p-3 rounded-lg bg-foreground/5 border border-border/20 space-y-2">
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-foreground/60" />
            <span className="text-xs font-medium text-foreground/70">Privacy Notice</span>
          </div>
          <p className="text-xs text-foreground/60 leading-relaxed">
            • All messages are stored locally and synced only to permitted networks
            <br />
            • Disable network permissions to prevent message synchronization
            <br />
            • Company chat requires authentication from your organization
            <br />
            • Peer-to-peer requires both users to be online
          </p>
        </div>

        {/* Advanced Options */}
        <div className="p-3 rounded-lg bg-background/40 border border-border/20 space-y-2">
          <h4 className="text-xs font-medium text-foreground">Advanced Options</h4>
          <div className="space-y-2">
            <Button
              variant="ghost"
              className="w-full h-8 justify-start text-xs"
              onClick={() => {
                localStorage.removeItem("chat-permissions");
                window.location.reload();
              }}
            >
              Reset Permissions
            </Button>
            <Button
              variant="ghost"
              className="w-full h-8 justify-start text-xs"
              onClick={() => {
                if (confirm("Clear all chat history?")) {
                  localStorage.removeItem("chat-messages");
                  window.dispatchEvent(new CustomEvent("chat:clear"));
                }
              }}
            >
              Clear Chat History
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
