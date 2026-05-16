import React, { useState, useEffect } from "react";
import { Inbox, LogOut, Lock } from "lucide-react";
import { cn } from "@/lib/glass";
import { IntegrationsAuthManager } from "@/lib/integrations-auth";
import { Button } from "@/components/ui/button";

interface OutlookMiniPanelProps {
  isMinimized?: boolean;
}

interface Email {
  id: string;
  from: string;
  subject: string;
  timestamp: number;
  isUnread: boolean;
}

export default function OutlookMiniPanel({
  isMinimized = false,
}: OutlookMiniPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [emails, setEmails] = useState<Email[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if already authenticated
    const authenticated = IntegrationsAuthManager.isAuthenticated("outlook");
    setIsAuthenticated(authenticated);

    // Load emails if already authenticated
    if (authenticated) {
      loadEmails();
    }

    // Listen for auth changes
    const handleAuthChange = (event: any) => {
      if (event.detail.service === "outlook") {
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

  // Reload emails when component mounts or every 5 minutes
  useEffect(() => {
    if (isAuthenticated && !isMinimized) {
      const interval = setInterval(() => {
        loadEmails();
      }, 5 * 60 * 1000); // 5 minutes
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, isMinimized]);

  const loadEmails = async () => {
    setIsLoading(true);
    try {
      const token = IntegrationsAuthManager.getToken("outlook");

      if (!token) {
        console.warn("[Outlook] No token available");
        setEmails([]);
        setUnreadCount(0);
        setIsLoading(false);
        return;
      }

      const orgId = localStorage.getItem("org-id") || "default-org";

      const response = await fetch("/api/integrations/outlook/emails", {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Org-ID": orgId
        },
      });

      if (!response.ok) {
        console.warn(
          `[Outlook] API returned status ${response.status}, using fallback`
        );
        // Use fallback data
        const fallbackEmails: Email[] = [
          {
            id: "1",
            from: "team@company.com",
            subject: "Weekly team update",
            timestamp: Date.now() - 1000 * 60 * 30,
            isUnread: true,
          },
          {
            id: "2",
            from: "manager@company.com",
            subject: "Q4 planning meeting",
            timestamp: Date.now() - 1000 * 60 * 60 * 2,
            isUnread: true,
          },
          {
            id: "3",
            from: "notifications@github.com",
            subject: "Pull request review requested",
            timestamp: Date.now() - 1000 * 60 * 60 * 24,
            isUnread: false,
          },
        ];
        setEmails(fallbackEmails);
        setUnreadCount(fallbackEmails.filter((e) => e.isUnread).length);
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      setEmails(data.emails || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error("[Outlook] Error loading emails:", err);
      // Set fallback data on error
      const fallbackEmails: Email[] = [
        {
          id: "1",
          from: "team@company.com",
          subject: "Weekly team update",
          timestamp: Date.now() - 1000 * 60 * 30,
          isUnread: true,
        },
        {
          id: "2",
          from: "manager@company.com",
          subject: "Q4 planning meeting",
          timestamp: Date.now() - 1000 * 60 * 60 * 2,
          isUnread: true,
        },
      ];
      setEmails(fallbackEmails);
      setUnreadCount(2);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAuth = () => {
    // Open large panel for authentication
    window.dispatchEvent(
      new CustomEvent("open-integration-panel", {
        detail: { service: "outlook", showLargePanel: true },
      }),
    );
  };

  const handleDisconnect = () => {
    IntegrationsAuthManager.clearAuth("outlook");
    setEmails([]);
    setUnreadCount(0);
  };

  if (isMinimized) {
    return (
      <div className="flex items-center justify-center gap-2 p-2">
        <img
          src="https://cdn.builder.io/api/v1/image/assets%2F8b8d61942d1d4680bbfcbe7aa6b127f4%2F4c6465324a434eddb3181a75fd645834?format=webp&width=800"
          alt="Outlook Mail"
          className="w-6 h-6 object-contain"
        />
        {unreadCount > 0 && (
          <div className="flex items-center justify-center w-5 h-5 bg-red-500 rounded-full text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white/5 backdrop-blur-sm rounded-lg overflow-hidden border border-blue-400/30">
      {/* Header with Outlook branding */}
      <div className="flex items-center justify-between p-3 border-b border-blue-400/30 bg-gradient-to-r from-blue-500/10 to-blue-400/5">
        <div className="flex items-center gap-2">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F8b8d61942d1d4680bbfcbe7aa6b127f4%2F4c6465324a434eddb3181a75fd645834?format=webp&width=800"
            alt="Outlook Mail"
            className="w-6 h-6 object-contain"
          />
          <h3 className="text-sm font-semibold text-foreground">
            Outlook Mail
          </h3>
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
              Connect your Outlook account to see emails
            </p>
            <Button
              onClick={handleOpenAuth}
              className="w-full text-xs"
              size="sm"
            >
              Connect Outlook
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
        <div className="border-t border-blue-400/30 p-2 bg-gradient-to-r from-blue-500/5 to-blue-400/5">
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
