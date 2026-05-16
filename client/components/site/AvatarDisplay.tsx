import React, { useEffect, useState } from "react";
import { cn } from "@/lib/glass";
import { LogOut, User, LogIn, X, Mic, MicOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  mockLogin,
  mockLogout,
  getAuthUser,
  getTestUsers,
} from "@/lib/auth-mock";
import { initializeEchoAi3System } from "@/core/ai3/index";
import { useEchoAi3ChatWithSuggestions } from "@/lib/echo-ai3/chat-integration";

// ============================================================================
// Styling Constants (from EchoAiLauncher)
// ============================================================================
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const computePanelStyle = (density: number): React.CSSProperties => {
  const d = clamp01(density);
  const surface = 0.28 + d * 0.65;
  const gradientA = 0.18 + d * 0.5;
  const gradientB = 0.15 + d * 0.35;
  const outline = 0.07 + d * 0.34;
  const blur = 14 + (1 - d) * 20;
  const saturation = 1.05 + d * 0.5;
  const brightness = 0.9 + d * 0.25;
  return {
    background: `linear-gradient(150deg, hsl(var(--background) / ${surface.toFixed(2)}) 0%, hsl(var(--background) / ${gradientA.toFixed(2)}) 46%, hsl(var(--background) / ${gradientB.toFixed(2)}) 100%)`,
    boxShadow: `0 32px 70px rgba(8, 14, 27, ${(0.26 + d * 0.5).toFixed(2)}), inset 0 0 72px hsl(var(--primary) / ${(0.18 + d * 0.48).toFixed(2)})`,
    border: "none",
    borderRadius: "24px",
    outline: `1px solid hsl(var(--primary) / ${outline.toFixed(2)})`,
    backdropFilter: `blur(${blur.toFixed(1)}px) saturate(${saturation.toFixed(2)}) brightness(${brightness.toFixed(2)})`,
    WebkitBackdropFilter: `blur(${blur.toFixed(1)}px) saturate(${saturation.toFixed(2)}) brightness(${brightness.toFixed(2)})`,
    opacity: 0.85 + d * 0.15,
    transition:
      "backdrop-filter 180ms ease, box-shadow 180ms ease, outline-color 180ms ease, opacity 180ms ease",
  };
};

const computeOverlayStyle = (density: number): React.CSSProperties => {
  const d = clamp01(density);
  return {
    opacity: 0.14 + d * 0.6,
    filter: `brightness(${(0.9 + d * 0.4).toFixed(2)}) saturate(${(1 + d * 0.25).toFixed(2)})`,
    transform: `scale(${(1.01 + (1 - d) * 0.06).toFixed(3)})`,
    transition: "opacity 160ms ease, transform 160ms ease, filter 160ms ease",
  };
};

const glassPanelClass =
  "relative flex h-[50vh] w-[320px] flex-col gap-3 overflow-hidden rounded-3xl px-4 py-4 backdrop-blur-[30px] transition-[transform,opacity] duration-300";
const glassOverlayClass =
  "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.4),transparent_70%)] mix-blend-screen";
const statusIndicatorClass =
  "relative inline-flex h-2.5 w-2.5 items-center justify-center";
const messageScrollClass =
  "relative flex min-h-0 max-h-[58vh] flex-1 flex-col gap-3 overflow-y-auto pr-3 text-[12px] leading-relaxed";
const messageBubbleBaseClass =
  "max-w-[86%] rounded-3xl px-4 py-2.5 text-[12px] leading-relaxed shadow-[0_22px_38px_rgba(8,14,27,0.55)] transition duration-200 ease-out backdrop-blur-sm";
const aiMessageBubbleClass =
  "bg-[linear-gradient(135deg,hsl(var(--primary)/0.28),hsl(var(--primary)/0.14))] text-[hsl(var(--primary-foreground)/0.95)] shadow-[0_0_36px_hsl(var(--primary)/0.42)]";
const userMessageBubbleClass =
  "self-end bg-[linear-gradient(135deg,hsl(var(--foreground)/0.26),hsl(var(--foreground)/0.12))] text-[hsl(var(--foreground)/0.92)] shadow-[0_0_28px_rgba(11,19,36,0.42)]";
const controlChipBaseClass =
  "rounded-full bg-[hsl(var(--background)/0.52)] px-3 py-1 text-[11px] font-medium text-[hsl(var(--foreground)/0.82)] shadow-[inset_0_0_12px_rgba(8,14,27,0.45)] transition hover:bg-[hsl(var(--background)/0.68)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45";
const inputFieldClass =
  "flex-1 rounded-full bg-[hsl(var(--background)/0.62)] px-4 py-2 text-[13px] text-[hsl(var(--foreground)/0.9)] placeholder:text-[hsl(var(--foreground)/0.55)] shadow-[inset_0_0_30px_rgba(8,14,27,0.55)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/45";
const activeControlClass =
  "bg-primary/80 text-primary-foreground shadow-[0_0_36px_hsl(var(--primary)/0.45)]";
const subtleLabelClass =
  "text-[10px] uppercase tracking-[0.28em] text-[hsl(var(--foreground)/0.6)]";

// ============================================================================
// Helper: Safe localStorage access
// ============================================================================
const safeGet = (key: string) => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key: string, value: string) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {}
};

// ============================================================================
// Avatar URLs
// ============================================================================
const AVATAR_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Ccircle cx='12' cy='8' r='4'/%3E%3Cpath d='M4 20c0-4 4-6 8-6s8 2 8 6'/%3E%3C/svg%3E";
const AVATAR_URLS: Record<string, string> = {
  Echo_B: AVATAR_PLACEHOLDER,
  Echo_F: AVATAR_PLACEHOLDER,
  Echo_M: AVATAR_PLACEHOLDER,
  Echo_R: AVATAR_PLACEHOLDER,
};

export default function AvatarDisplay() {
  // Avatar Display State
  const [selectedAvatar, setSelectedAvatar] = useState("Echo_B");
  const [mounted, setMounted] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentUser, setCurrentUser] = useState(getAuthUser());
  const [testUsers] = useState(getTestUsers());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Chat State (from EchoAiLauncher)
  const ai3 = React.useMemo(() => initializeEchoAi3System(), []);
  const [chatOpen, setChatOpen] = useState(
    () => safeGet("avatar.chat.open") === "1",
  );
  const [chatPinned, setChatPinned] = useState(
    () => safeGet("avatar.chat.pinned") === "1",
  );
  const [chatHovering, setChatHovering] = useState(false);
  const [panelOpacity, setPanelOpacity] = useState<number>(() => {
    try {
      const stored = parseFloat(safeGet("avatar.chat.opacity") || "0.82");
      if (Number.isNaN(stored)) return 0.82;
      return clamp01(stored);
    } catch {
      return 0.82;
    }
  });
  const [isHidden, setIsHidden] = useState(false);
  const [persona, setPersona] = useState(() => ai3.personas.getPersona());

  // EchoAi^3 Integration
  const chatHook = useEchoAi3ChatWithSuggestions();
  const history = (chatHook?.messages || []) as Array<{ role: "user" | "ai"; text: string }>;
  const value = chatHook?.input || "";
  const setValue = chatHook?.setInput || (() => {});
  const sendMessage = chatHook?.sendMessage || (async () => {});
  const pendingReply = chatHook?.isLoading || false;
  const chatSuggestions = chatHook?.suggestions || [];
  
  const suggestions = Array.isArray(chatSuggestions) ? chatSuggestions : [];

  const [speaking, setSpeaking] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    // Load selected avatar from localStorage
    const saved = localStorage.getItem("user-avatar") || "Echo_B";
    console.log("[AvatarDisplay] Loading avatar from localStorage:", saved);
    setSelectedAvatar(saved);
    setImageError(false);
    setMounted(true);

    // Listen for avatar changes in localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user-avatar" && e.newValue) {
        console.log("[AvatarDisplay] Storage change detected:", e.newValue);
        setSelectedAvatar(e.newValue);
        setImageError(false);
      }
      // Also listen for auth changes
      if (e.key === "auth-user") {
        setCurrentUser(getAuthUser());
      }
    };

    // Listen for avatar-changed custom event (for instant updates)
    const handleAvatarChanged = (event: any) => {
      const saved = localStorage.getItem("user-avatar") || "Echo_B";
      console.log("[AvatarDisplay] Avatar changed event received:", saved);
      setSelectedAvatar(saved);
      setImageError(false);
    };

    // Listen for settings panel close to refresh avatar
    const handleSettingsClosed = () => {
      const saved = localStorage.getItem("user-avatar") || "Echo_B";
      console.log("[AvatarDisplay] Settings closed, refreshing avatar:", saved);
      setSelectedAvatar(saved);
    };

    // Listen for auth changes
    const handleAuthChanged = () => {
      setCurrentUser(getAuthUser());
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("avatar-changed", handleAvatarChanged);
    window.addEventListener("settings-closed", handleSettingsClosed);
    window.addEventListener("auth-changed", handleAuthChanged);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("avatar-changed", handleAvatarChanged);
      window.removeEventListener("settings-closed", handleSettingsClosed);
      window.removeEventListener("auth-changed", handleAuthChanged);
    };
  }, []);

  // Persist chat state to localStorage
  useEffect(() => {
    safeSet("avatar.chat.open", chatOpen ? "1" : "0");
    safeSet("avatar.chat.pinned", chatPinned ? "1" : "0");
    safeSet("avatar.chat.opacity", String(panelOpacity));
  }, [chatOpen, chatPinned, panelOpacity]);

  // Chat helpers and handlers
  function toggleChatPinned(force?: boolean) {
    setChatPinned((prev) => {
      const next = typeof force === "boolean" ? force : !prev;
      if (next) {
        setChatOpen(true);
      } else {
        setChatOpen(false);
        setChatHovering(false);
      }
      return next;
    });
  }

  function handleChatNewChat() {
    setValue("");
    // Reset conversation properly
    if (suggestions && typeof suggestions === 'object' && 'resetConversation' in suggestions) {
      (suggestions as any).resetConversation();
    }
  }

  function handleChatHide() {
    setIsHidden(true);
  }

  // Close chat when dropdown opens
  useEffect(() => {
    if (isDropdownOpen) {
      setChatOpen(false);
      setChatHovering(false);
    }
  }, [isDropdownOpen]);

  // Handle "echo:ask" event - opens chat with a prompt
  useEffect(() => {
    const onAsk = (e: any) => {
      const p = (e?.detail?.prompt || "").toString();
      if (!p) return;
      setChatPinned(true);
      setChatHovering(true);
      setChatOpen(true);
      setIsDropdownOpen(false);
      setValue(p);
      sendMessage(p);
    };
    window.addEventListener("echo:ask", onAsk as any);
    return () => window.removeEventListener("echo:ask", onAsk as any);
  }, [sendMessage, setValue]);

  // Handle "echo-action" event - auto-expand when Echo speaks
  useEffect(() => {
    const onAction = (e: any) => {
      const text = (e?.detail?.text || "").toString();
      if (!text) return;
      setChatOpen(true);
      // Add as AI message directly - sendMessage supports optional AI response
      if (sendMessage) {
        sendMessage("", text);
      }
    };
    window.addEventListener("echo-action", onAction as any);
    return () => window.removeEventListener("echo-action", onAction as any);
  }, [sendMessage]);

  let avatarUrl: string;

  // Check if it's a predefined avatar
  if (AVATAR_URLS[selectedAvatar as keyof typeof AVATAR_URLS]) {
    avatarUrl = AVATAR_URLS[selectedAvatar as keyof typeof AVATAR_URLS];
    console.log(
      "[AvatarDisplay] Using predefined avatar:",
      selectedAvatar,
      "->",
      avatarUrl,
    );
  }
  // Check if it's a custom uploaded avatar (filename)
  else if (
    selectedAvatar.startsWith("avatar-") &&
    selectedAvatar.includes(".")
  ) {
    avatarUrl = `/api/avatar/file/${selectedAvatar}`;
    console.log(
      "[AvatarDisplay] Using custom uploaded avatar:",
      selectedAvatar,
      "->",
      avatarUrl,
    );
  }
  // Check if it's a base64 encoded custom avatar
  else if (selectedAvatar.startsWith("data:image/")) {
    avatarUrl = selectedAvatar;
    console.log("[AvatarDisplay] Using base64 avatar (truncated for brevity)");
  }
  // Default fallback
  else {
    avatarUrl = AVATAR_URLS.Echo_B;
    console.log(
      "[AvatarDisplay] Unknown avatar type, using fallback:",
      selectedAvatar,
      "->",
      avatarUrl,
    );
  }

  const handleOpenAvatarSettings = () => {
    console.log("[AvatarDisplay] Opening avatar settings panel");
    const event = new CustomEvent("open-settings", {
      detail: { tab: "avatar" },
      bubbles: true,
      composed: true,
    });
    window.dispatchEvent(event);
  };

  const handleLogin = async (userId: string) => {
    try {
      const success = await mockLogin(userId);
      if (success) {
        setCurrentUser(getAuthUser());
        setIsDropdownOpen(false);
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent("auth-changed"));
      }
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLogout = () => {
    mockLogout();
    setCurrentUser(null);
    setIsDropdownOpen(false);
    window.dispatchEvent(new CustomEvent("auth-changed"));
  };

  return (
    <div key="avatar-display" data-avatar-display className={`fixed right-6 top-4 z-[10001]`}>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <button
            data-avatar-trigger
            onMouseEnter={() => {
              if (mounted) {
                setShowTooltip(true);
                // Always open chat on hover (unless dropdown is open)
                if (!isDropdownOpen) {
                  setChatOpen(true);
                  setChatHovering(true);
                }
              }
            }}
            onMouseLeave={() => {
              setShowTooltip(false);
              // Don't close chat here - let the chat panel handle it on its own onMouseLeave
              // This allows users to move from avatar to chat without the chat closing
              // Only close if not pinned and not hovering chat panel
              if (!chatPinned && !chatHovering) {
                // Small delay to allow moving to chat panel
                setTimeout(() => {
                  if (!chatPinned && !chatHovering) {
                    setChatOpen(false);
                  }
                }, 200);
              }
            }}
            className={cn(
              "group flex flex-col items-center gap-1 transition-all cursor-pointer",
              !mounted && "opacity-0 pointer-events-none",
              "hover:scale-105",
            )}
            title={
              currentUser
                ? `${currentUser.name} (${currentUser.role})`
                : "Login"
            }
            type="button"
          >
            {/* Avatar with green auth indicator ring */}
            <div
              className={cn(
                "relative w-12 h-12 rounded-full overflow-hidden shadow-lg flex items-center justify-center transition-all",
                "bg-background/80 backdrop-blur-sm",
                currentUser
                  ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-background/80"
                  : "ring-2 ring-blue-500 ring-offset-2 ring-offset-background/80",
              )}
            >
              {imageError || !avatarUrl ? (
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                  A
                </div>
              ) : (
                <img
                  src={avatarUrl}
                  alt="User Avatar"
                  className="w-full h-full object-cover"
                  onError={() => {
                    console.warn(
                      "[AvatarDisplay] Image failed to load:",
                      avatarUrl,
                    );
                    setImageError(true);
                  }}
                  onLoad={() => {
                    console.log(
                      "[AvatarDisplay] Image loaded successfully:",
                      avatarUrl,
                    );
                    setImageError(false);
                  }}
                />
              )}
              {/* Auth status badge */}
              <div
                className={cn(
                  "absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-background/80 flex items-center justify-center text-[10px] font-bold",
                  currentUser
                    ? "bg-emerald-500 text-white"
                    : "bg-blue-500 text-white",
                )}
                title={currentUser ? "Logged in" : "Not logged in"}
              >
                {currentUser ? "✓" : "○"}
              </div>
            </div>

            {/* User Name / Status Text */}
            <div className="text-center text-xs">
              <p className="font-medium text-foreground/80 text-[11px]">
                {currentUser ? currentUser.name.split(" ")[0] : "Login"}
              </p>
              {currentUser && (
                <p
                  className={cn(
                    "text-[10px] font-semibold",
                    currentUser.role === "admin"
                      ? "text-emerald-500"
                      : "text-blue-400",
                  )}
                >
                  {currentUser.role}
                </p>
              )}
            </div>

            {/* Tooltip on hover */}
            <div
              className={cn(
                "absolute top-20 whitespace-nowrap bg-background/95 backdrop-blur-sm border border-primary/30 rounded-md px-3 py-2 text-xs font-medium text-foreground shadow-lg transition-opacity",
                mounted && showTooltip && !isDropdownOpen
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none",
              )}
            >
              {currentUser ? "Manage account" : "Login"}
            </div>
          </button>
        </DropdownMenuTrigger>

        {/* Dropdown Menu - Combined Auth + Avatar Selection */}
        <DropdownMenuContent align="end" className="w-64 z-[10003]">
          {/* User Info Section */}
          {currentUser ? (
            <>
              <DropdownMenuLabel className="flex flex-col gap-2">
                <div>
                  <span className="font-semibold text-foreground">
                    {currentUser.name}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {currentUser.email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                  <span className="text-xs text-emerald-400 font-semibold">
                    {currentUser.role.toUpperCase()}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
          ) : null}

          {/* Avatar Selection Section */}
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Avatar
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={handleOpenAvatarSettings}>
            <User className="w-4 h-4 mr-2" />
            <span>Change Avatar</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Authentication Section */}
          {currentUser ? (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Switch User
              </DropdownMenuLabel>
              {testUsers.map((user) => (
                <DropdownMenuItem
                  key={user.id}
                  onClick={() => handleLogin(user.id)}
                  className={currentUser.id === user.id ? "bg-accent" : ""}
                >
                  <User className="w-3 h-3 mr-2" />
                  <div className="flex flex-col">
                    <span className="text-sm">{user.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {user.role}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
              >
                <LogOut className="w-3 h-3 mr-2" />
                Logout
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Login as Test User
              </DropdownMenuLabel>
              {testUsers.map((user) => (
                <DropdownMenuItem
                  key={user.id}
                  onClick={() => handleLogin(user.id)}
                >
                  <LogIn className="w-3 h-3 mr-2" />
                  <div className="flex flex-col">
                    <span className="text-sm">{user.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {user.role}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Chat Panel - Hidden by default, shows on hover/click */}
      {chatOpen && !isHidden && (
        <div
          className="absolute right-0 top-[calc(100%+12px)] z-[10002] pointer-events-auto"
          style={{
            maxWidth: "min(320px, calc(100vw - 48px))",
            maxHeight: "calc(100vh - 120px)",
          }}
          onMouseEnter={() => {
            setChatHovering(true);
            setChatOpen(true); // Ensure chat stays open when hovering the panel
          }}
          onMouseLeave={(e) => {
            // Check if we're moving to avatar or another element
            const relatedTarget = e.relatedTarget;
            const isMovingToAvatar = (relatedTarget instanceof Element) && (
              relatedTarget.closest('[data-avatar-trigger]') ||
              relatedTarget.closest('[data-avatar-display]')
            );

            setChatHovering(false);
            // Only close if not pinned, and not moving to avatar
            if (!chatPinned && !isMovingToAvatar) {
              setTimeout(() => {
                if (!chatPinned && !chatHovering) {
                  setChatOpen(false);
                }
              }, 200);
            }
          }}
        >
          <div
            style={{
              ...computePanelStyle(panelOpacity),
              width: "min(320px, calc(100vw - 48px))",
              height: "min(50vh, calc(100vh - 140px))",
            }}
            className={glassPanelClass
              .replace("w-[320px]", "")
              .replace("h-[50vh]", "")}
          >
            {/* Glass overlay */}
            <div
              className={glassOverlayClass}
              style={computeOverlayStyle(panelOpacity)}
              aria-hidden="true"
            />

            {/* Header */}
            <header className="relative z-[1] flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={statusIndicatorClass}>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/30" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_14px_hsl(var(--primary)/0.75)]" />
                  </span>
                  <div className="flex flex-col leading-tight">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-primary/80">
                      Echo
                    </span>
                    <span
                      className={`text-[12px] font-medium ${
                        speaking
                          ? "text-primary"
                          : pendingReply
                            ? "text-primary/80"
                            : "text-[hsl(var(--foreground)/0.55)]"
                      }`}
                    >
                      {speaking
                        ? "Responding"
                        : pendingReply
                          ? "Formulating response"
                          : "Awaiting command"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleChatPinned()}
                    className={`${controlChipBaseClass} ${chatPinned ? activeControlClass : ""}`}
                    aria-pressed={chatPinned}
                    title={chatPinned ? "Unpin chat" : "Pin chat open"}
                  >
                    {chatPinned ? "Pinned" : "Pin"}
                  </button>
                  <button
                    type="button"
                    onClick={handleChatHide}
                    className={controlChipBaseClass}
                    title="Hide chat"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[hsl(var(--foreground)/0.55)]">
                <span className={subtleLabelClass}>Persona</span>
                <span>
                  {history.length} message{history.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-2xl bg-[hsl(var(--background)/0.38)] px-4 py-3 text-[11px] text-[hsl(var(--foreground)/0.72)] shadow-[inset_0_0_24px_rgba(8,14,27,0.45)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {persona.avatar ? (
                      <img
                        src={persona.avatar}
                        alt={`${persona.displayName} avatar`}
                        className="h-7 w-7 rounded-full border border-[hsl(var(--background)/0.6)] object-cover"
                      />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-primary/30 flex items-center justify-center text-[10px]">
                        {persona.displayName?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-[hsl(var(--foreground)/0.9)]">
                        {persona.displayName}
                      </p>
                      <p className="text-[10px] text-[hsl(var(--foreground)/0.6)]">
                        {persona.role}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* Messages Area */}
            <div className={messageScrollClass}>
              {history.length === 0 ? (
                <div className="flex items-center justify-center h-full text-[12px] text-[hsl(var(--foreground)/0.55)]">
                  <p className="text-center">Start a conversation...</p>
                </div>
              ) : (
                history.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      messageBubbleBaseClass,
                      msg.role === "ai"
                        ? aiMessageBubbleClass
                        : userMessageBubbleClass,
                    )}
                  >
                    {msg.text}
                  </div>
                ))
              )}
            </div>

            {/* Input Area */}
            <div className="relative z-[1] flex items-center gap-2">
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && value.trim() && !pendingReply) {
                    sendMessage(value.trim());
                  }
                }}
                placeholder="Ask Echo AI..."
                className={inputFieldClass}
                disabled={pendingReply}
                autoFocus={chatOpen}
              />
              <button
                type="button"
                onClick={() => {
                  if (!micEnabled) {
                    // Request microphone permission
                    navigator.mediaDevices.getUserMedia({ audio: true })
                      .then(() => {
                        setMicEnabled(true);
                        setIsRecording(true);
                        // TODO: Implement voice recording and transcription
                        console.log("[EchoAi^3] Microphone enabled");
                      })
                      .catch((err) => {
                        console.error("[EchoAi^3] Microphone access denied:", err);
                        alert("Microphone access is required for voice input. Please enable it in your browser settings.");
                      });
                  } else {
                    setIsRecording(!isRecording);
                    if (isRecording) {
                      // TODO: Stop recording and transcribe
                      console.log("[EchoAi^3] Stopping recording");
                    }
                  }
                }}
                className={cn(
                  controlChipBaseClass,
                  micEnabled && isRecording && "bg-red-500/80 text-white",
                  micEnabled && !isRecording && "bg-green-500/80 text-white"
                )}
                title={micEnabled ? (isRecording ? "Stop recording" : "Start recording") : "Enable microphone"}
              >
                {isRecording ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
              </button>
              <button
                type="button"
                onClick={handleChatNewChat}
                className={controlChipBaseClass}
                title="New chat"
              >
                New
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
