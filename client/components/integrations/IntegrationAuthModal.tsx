import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/glass";
import { IntegrationsAuthManager } from "@/lib/integrations-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface IntegrationAuthModalProps {
  service: "outlook" | "teams" | "gmail";
  isOpen: boolean;
  onClose: () => void;
}

const SERVICE_CONFIG = {
  outlook: {
    name: "Outlook",
    bgGradient: "from-blue-400 to-blue-600",
    accentColor: "text-blue-600",
    borderColor: "border-blue-400/30",
    description:
      "Connect your Microsoft Outlook account to sync emails and calendar",
    letter: "O",
    imageUrl: "https://cdn.builder.io/api/v1/image/assets%2F8b8d61942d1d4680bbfcbe7aa6b127f4%2F4c6465324a434eddb3181a75fd645834?format=webp&width=800",
  },
  teams: {
    name: "Microsoft Teams",
    bgGradient: "from-purple-400 to-indigo-700",
    accentColor: "text-purple-600",
    borderColor: "border-purple-400/30",
    description: "Connect your Teams account to see chats and notifications",
    letter: "T",
    imageUrl: "https://cdn.builder.io/api/v1/image/assets%2F8b8d61942d1d4680bbfcbe7aa6b127f4%2F7937bf8c505241c6b3ebd8436506c981?format=webp&width=800",
  },
  gmail: {
    name: "Gmail",
    bgGradient: "from-red-400 via-blue-500 to-yellow-400",
    accentColor: "text-red-600",
    borderColor: "border-red-400/30",
    description: "Connect your Gmail account to sync emails and labels",
    letter: "M",
  },
};

export default function IntegrationAuthModal({
  service,
  isOpen,
  onClose,
}: IntegrationAuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const config = SERVICE_CONFIG[service];

  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setPassword("");
      setError("");
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // TODO: Replace with actual OAuth flow
      // For now, we'll simulate successful auth after a delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simulate successful authentication
      const mockTokenData = {
        access_token: `mock-token-${service}-${Date.now()}`,
        refresh_token: `mock-refresh-${Date.now()}`,
        email: email,
        expires_at: Date.now() + 3600000,
      };

      IntegrationsAuthManager.completeOAuthFlow(service, mockTokenData);
      onClose();
    } catch (err) {
      setError("Failed to authenticate. Please check your credentials.");
      console.error("[Integration Auth]", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[98000] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "relative bg-background/95 backdrop-blur-xl border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-6",
          config.borderColor,
        )}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 hover:bg-muted rounded-lg transition-colors"
        >
          <X size={20} className="text-foreground/60" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-center">
          {(config as any).imageUrl ? (
            <img
              src={(config as any).imageUrl}
              alt={config.name}
              className="w-20 h-20 object-contain"
            />
          ) : (
            <div
              className={cn(
                "p-4 rounded-xl bg-gradient-to-br",
                config.bgGradient,
              )}
            >
              <div className="text-4xl font-bold text-white">{config.letter}</div>
            </div>
          )}
        </div>

        {/* Title & Description */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Connect {config.name}</h2>
          <p className="text-sm text-foreground/60">{config.description}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Email Address</label>
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !email || !password}
          >
            {isLoading && <Loader2 size={16} className="mr-2 animate-spin" />}
            {isLoading ? "Connecting..." : "Connect Account"}
          </Button>
        </form>

        {/* Info */}
        <div className="p-3 bg-muted/30 rounded-lg text-xs text-foreground/60 space-y-1">
          <p>
            <strong>Note:</strong> Your credentials are encrypted and only used
            to authenticate with {config.name}.
          </p>
          <p>
            For enhanced security, we recommend using{" "}
            <strong>{service === "gmail" ? "App Passwords" : "OAuth"}</strong>{" "}
            instead of your main account password.
          </p>
        </div>
      </div>
    </div>
  );
}
