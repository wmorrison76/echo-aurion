import React, { useState, useEffect } from "react";
import { X, Loader2, Mail, Calendar, Bell } from "lucide-react";
import { cn } from "@/lib/glass";
import { IntegrationsAuthManager } from "@/lib/integrations-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Email {
  id: string;
  from: string;
  subject: string;
  timestamp: number;
  isUnread: boolean;
}

interface LargeIntegrationPanelProps {
  service: "outlook" | "teams" | "gmail";
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

export default function LargeIntegrationPanel({
  service,
  onClose,
}: LargeIntegrationPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAuthForm, setShowAuthForm] = useState(true);
  const [emails, setEmails] = useState<Email[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(false);

  const config = SERVICE_CONFIG[service];

  useEffect(() => {
    // Check if already authenticated
    const authenticated = IntegrationsAuthManager.isAuthenticated(service);
    setIsAuthenticated(authenticated);
    setShowAuthForm(!authenticated);

    // Load data if already authenticated
    if (authenticated) {
      loadEmails();
    }

    // Listen for auth changes
    const handleAuthChange = (event: any) => {
      if (event.detail.service === service) {
        setIsAuthenticated(event.detail.isAuthenticated);
        setShowAuthForm(!event.detail.isAuthenticated);
        if (event.detail.isAuthenticated) {
          loadEmails();
        }
      }
    };

    window.addEventListener(
      "integration-auth-changed",
      handleAuthChange as EventListener,
    );
    return () => {
      window.removeEventListener(
        "integration-auth-changed",
        handleAuthChange as EventListener,
      );
    };
  }, [service]);

  const loadEmails = async () => {
    setEmailsLoading(true);
    try {
      const token = IntegrationsAuthManager.getToken(service);
      const orgId = localStorage.getItem("org-id") || "default-org";

      const endpointMap: Record<string, string> = {
        outlook: "/api/integrations/outlook/emails",
        gmail: "/api/integrations/gmail/emails",
        teams: "/api/integrations/teams/chats",
      };

      const response = await fetch(endpointMap[service], {
        headers: {
          Authorization: `Bearer ${token || "demo"}`,
          "X-Org-ID": orgId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (service === "teams") {
          // Map chats to email-like structure for display
          const chats = data.chats || [];
          setEmails(chats.map((c: any) => ({
            id: c.id,
            from: c.name,
            subject: c.lastMessage,
            timestamp: c.timestamp,
            isUnread: c.unreadCount > 0,
          })));
        } else {
          setEmails(data.emails || []);
        }
      } else {
        setEmails([]);
      }
    } catch (err) {
      console.error(`[${service}] Error loading data:`, err);
      setEmails([]);
    } finally {
      setEmailsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockTokenData = {
        access_token: `mock-token-${service}-${Date.now()}`,
        refresh_token: `mock-refresh-${Date.now()}`,
        email: email,
        expires_at: Date.now() + 3600000,
      };

      IntegrationsAuthManager.completeOAuthFlow(service, mockTokenData);
      setIsAuthenticated(true);
      setShowAuthForm(false);

      // Load data for all services
      await loadEmails();
    } catch (err) {
      setError("Failed to authenticate. Please check your credentials.");
      console.error("[Integration Auth]", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    IntegrationsAuthManager.clearAuth(service);
    setIsAuthenticated(false);
    setShowAuthForm(true);
    setEmail("");
    setPassword("");
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full w-full bg-background/95 backdrop-blur-xl rounded-lg border overflow-hidden",
        config.borderColor,
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between p-6 border-b bg-gradient-to-r",
          config.bgGradient + " bg-opacity-10",
        )}
      >
        <div className="flex items-center gap-4">
          {(config as any).imageUrl ? (
            <img
              src={(config as any).imageUrl}
              alt={config.name}
              className="w-12 h-12 object-contain"
            />
          ) : (
            <div
              className={cn(
                "w-12 h-12 bg-gradient-to-br rounded-lg flex items-center justify-center text-white font-bold text-2xl",
                config.bgGradient,
              )}
            >
              {config.letter}
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {config.name}
            </h2>
            <p className="text-sm text-foreground/60">{config.description}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-foreground/10 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {showAuthForm ? (
          <div className="max-w-md mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  disabled={isLoading}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  className="w-full"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || !email || !password}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  `Sign In to ${config.name}`
                )}
              </Button>

              <p className="text-xs text-foreground/60 text-center">
                We'll securely connect your {config.name} account
              </p>
            </form>
          </div>
        ) : (
          <div className="w-full space-y-4">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <p className="text-green-600 font-medium flex items-center gap-2">
                <span>✓</span> Connected
              </p>
              <p className="text-sm text-foreground/60 mt-1">{email}</p>
            </div>

            {/* Data display for all services */}
            {emails.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-foreground flex items-center gap-2">
                    <Mail size={16} /> {service === "teams" ? "Recent Chats" : "Recent Emails"}
                  </h3>
                  {emailsLoading && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {emails.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "p-3 rounded border border-border/20 cursor-pointer hover:bg-muted/50 transition-colors",
                          msg.isUnread && "bg-primary/10 border-primary/30"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {msg.from}
                            </p>
                            <p className="text-sm text-foreground/60 line-clamp-2">
                              {msg.subject}
                            </p>
                            <p className="text-xs text-foreground/40 mt-1">
                              {new Date(msg.timestamp).toLocaleString()}
                            </p>
                          </div>
                          {msg.isUnread && (
                            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))
                  }
                </div>
              </>
            )}

            {emails.length === 0 && !emailsLoading && (
              <div className="flex items-center justify-center py-4">
                <p className="text-sm text-foreground/60">No data to display</p>
              </div>
            )}

            {emailsLoading && emails.length === 0 && (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={16} className="animate-spin mr-2" />
                <p className="text-sm text-foreground/60">Loading...</p>
              </div>
            )}

            <div className="space-y-3 pt-4 border-t border-border/30">
              <h3 className="font-medium text-foreground">
                Connected Features
              </h3>
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2 text-foreground/70">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded"
                  />
                  Email sync
                </label>
                <label className="flex items-center gap-2 text-foreground/70">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded"
                  />
                  Calendar access
                </label>
                <label className="flex items-center gap-2 text-foreground/70">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded"
                  />
                  Notifications
                </label>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleDisconnect}
              className="w-full"
            >
              Disconnect Account
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
