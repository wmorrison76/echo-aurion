import React, { useState, useEffect } from "react";
import { Send, LogOut, Lock } from "lucide-react";
import { cn } from "@/lib/glass";
import { IntegrationsAuthManager } from "@/lib/integrations-auth";
import { Button } from "@/components/ui/button";

interface GmailMiniPanelProps {
  isMinimized?: boolean;
}

interface Email {
  id: string;
  from: string;
  subject: string;
  timestamp: number;
  isUnread: boolean;
}

export default function GmailMiniPanel({
  isMinimized = false,
}: GmailMiniPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [emails, setEmails] = useState<Email[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if already authenticated
    const authenticated = IntegrationsAuthManager.isAuthenticated("gmail");
    setIsAuthenticated(authenticated);

    if (authenticated) {
      loadEmails();
    }

    // Listen for auth changes
    const handleAuthChange = (event: any) => {
      if (event.detail.service === "gmail") {
        setIsAuthenticated(event.detail.isAuthenticated);
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
  }, []);

  const loadEmails = async () => {
    setIsLoading(true);
    try {
      const token = IntegrationsAuthManager.getToken("gmail");
      const orgId = localStorage.getItem("org-id") || "default-org";

      const response = await fetch("/api/integrations/gmail/emails", {
        headers: {
          Authorization: `Bearer ${token || "demo"}`,
          "X-Org-ID": orgId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEmails(data.emails || []);
        setUnreadCount(data.unreadCount || 0);
      } else {
        setEmails([]);
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("[Gmail] Error loading emails:", err);
      setEmails([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAuth = () => {
    // Open large panel for authentication
    window.dispatchEvent(
      new CustomEvent("open-integration-panel", {
        detail: { service: "gmail", showLargePanel: true },
      }),
    );
  };

  const handleDisconnect = () => {
    IntegrationsAuthManager.clearAuth("gmail");
    setEmails([]);
    setUnreadCount(0);
  };

  if (isMinimized) {
    return (
      <div className="flex items-center justify-center gap-2 p-2">
        <div className="w-6 h-6 bg-gradient-to-br from-red-400 via-blue-500 to-yellow-400 rounded-md flex items-center justify-center text-white font-bold text-xs">
          M
        </div>
        {unreadCount > 0 && (
          <div className="flex items-center justify-center w-5 h-5 bg-red-500 rounded-full text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white/5 backdrop-blur-sm rounded-lg overflow-hidden border border-red-400/30">
      {/* Header with Gmail branding */}
      <div className="flex items-center justify-between p-3 border-b border-red-400/30 bg-gradient-to-r from-red-500/10 via-blue-500/5 to-yellow-400/5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-br from-red-400 via-blue-500 to-yellow-400 rounded-md flex items-center justify-center text-white font-bold text-xs">
            M
          </div>
          <h3 className="text-sm font-semibold text-foreground">Gmail</h3>
        </div>
        {isAuthenticated && unreadCount > 0 && (
          <div className="flex items-center justify-center w-6 h-6 bg-red-500 rounded-full text-xs font-bold text-white animate-pulse shadow-lg shadow-red-500/50">
            {unreadCount > 9 ? "9+" : unreadCount}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {!isAuthenticated ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-4">
            <Lock size={32} className="text-foreground/40" />
            <p className="text-xs text-foreground/60 text-center">
              Connect your Gmail account to see emails
            </p>
            <Button
              onClick={handleOpenAuth}
              className="w-full text-xs"
              size="sm"
            >
              Connect Gmail
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-xs text-foreground/50">Loading emails...</div>
          </div>
        ) : emails.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-xs text-foreground/50">No new emails</div>
          </div>
        ) : (
          emails.map((email) => (
            <div
              key={email.id}
              className={cn(
                "p-2 rounded border border-border/20 cursor-pointer hover:bg-muted/50 transition-colors",
                email.isUnread && "bg-primary/10 border-primary/30",
              )}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {email.from}
                  </p>
                  <p className="text-xs text-foreground/60 line-clamp-2">
                    {email.subject}
                  </p>
                  <p className="text-xs text-foreground/40 mt-1">
                    {new Date(email.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {isAuthenticated && (
        <div className="border-t border-red-400/30 p-2 bg-gradient-to-r from-red-500/5 via-blue-500/5 to-yellow-400/5">
          <Button
            onClick={handleDisconnect}
            variant="ghost"
            size="sm"
            className="w-full text-xs"
          >
            <LogOut size={14} className="mr-1" />
            Disconnect
          </Button>
        </div>
      )}
    </div>
  );
}
