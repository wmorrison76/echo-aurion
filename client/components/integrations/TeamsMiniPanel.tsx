import React, { useState, useEffect } from "react";
import { Users, LogOut, Lock } from "lucide-react";
import { cn } from "@/lib/glass";
import { IntegrationsAuthManager } from "@/lib/integrations-auth";
import { Button } from "@/components/ui/button";

interface TeamsMiniPanelProps {
  isMinimized?: boolean;
}

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: number;
  unreadCount: number;
}

export default function TeamsMiniPanel({
  isMinimized = false,
}: TeamsMiniPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if already authenticated
    const authenticated = IntegrationsAuthManager.isAuthenticated("teams");
    setIsAuthenticated(authenticated);

    if (authenticated) {
      loadChats();
    }

    // Listen for auth changes
    const handleAuthChange = (event: any) => {
      if (event.detail.service === "teams") {
        setIsAuthenticated(event.detail.isAuthenticated);
        if (event.detail.isAuthenticated) {
          loadChats();
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

  const loadChats = async () => {
    setIsLoading(true);
    try {
      const token = IntegrationsAuthManager.getToken("teams");
      const orgId = localStorage.getItem("org-id") || "default-org";

      const response = await fetch("/api/integrations/teams/chats", {
        headers: {
          Authorization: `Bearer ${token || "demo"}`,
          "X-Org-ID": orgId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setChats(data.chats || []);
        setTotalUnread(data.totalUnread || 0);
      } else {
        setChats([]);
        setTotalUnread(0);
      }
    } catch (err) {
      console.error("[Teams] Error loading chats:", err);
      setChats([]);
      setTotalUnread(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAuth = () => {
    // Open large panel for authentication
    window.dispatchEvent(
      new CustomEvent("open-integration-panel", {
        detail: { service: "teams", showLargePanel: true },
      }),
    );
  };

  const handleDisconnect = () => {
    IntegrationsAuthManager.clearAuth("teams");
    setChats([]);
    setTotalUnread(0);
  };

  if (isMinimized) {
    return (
      <div className="flex items-center justify-center gap-2 p-2">
        <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-indigo-700 rounded-md flex items-center justify-center text-white font-bold text-xs">
          T
        </div>
        {totalUnread > 0 && (
          <div className="flex items-center justify-center w-5 h-5 bg-red-500 rounded-full text-xs font-bold text-white">
            {totalUnread > 9 ? "9+" : totalUnread}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white/5 backdrop-blur-sm rounded-lg overflow-hidden border border-purple-400/30">
      {/* Header with Teams branding */}
      <div className="flex items-center justify-between p-3 border-b border-purple-400/30 bg-gradient-to-r from-purple-500/10 to-indigo-500/5">
        <div className="flex items-center gap-2">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F8b8d61942d1d4680bbfcbe7aa6b127f4%2F7937bf8c505241c6b3ebd8436506c981?format=webp&width=800"
            alt="Microsoft Teams"
            className="w-6 h-6 object-contain"
          />
          <h3 className="text-sm font-semibold text-foreground">Teams Chat</h3>
        </div>
        {isAuthenticated && totalUnread > 0 && (
          <div className="flex items-center justify-center w-6 h-6 bg-red-500 rounded-full text-xs font-bold text-white animate-pulse shadow-lg shadow-red-500/50">
            {totalUnread > 9 ? "9+" : totalUnread}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {!isAuthenticated ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-4">
            <Lock size={32} className="text-foreground/40" />
            <p className="text-xs text-foreground/60 text-center">
              Connect your Teams account to see chats
            </p>
            <Button
              onClick={handleOpenAuth}
              className="w-full text-xs"
              size="sm"
            >
              Connect Teams
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-xs text-foreground/50">Loading chats...</div>
          </div>
        ) : chats.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-xs text-foreground/50">No active chats</div>
          </div>
        ) : (
          chats.map((chat) => (
            <div
              key={chat.id}
              className={cn(
                "p-2 rounded border border-border/20 cursor-pointer hover:bg-muted/50 transition-colors",
                chat.unreadCount > 0 && "bg-primary/10 border-primary/30",
              )}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-foreground truncate">
                      {chat.name}
                    </p>
                    {chat.unreadCount > 0 && (
                      <span className="text-xs font-bold text-primary">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-foreground/60 line-clamp-2 mt-1">
                    {chat.lastMessage}
                  </p>
                  <p className="text-xs text-foreground/40 mt-1">
                    {new Date(chat.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {isAuthenticated && (
        <div className="border-t border-purple-400/30 p-2 bg-gradient-to-r from-purple-500/5 to-indigo-500/5">
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
