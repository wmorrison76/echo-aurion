import React, { useState, useEffect } from "react";
import { Settings, X, LogIn } from "lucide-react";
import { cn } from "@/lib/glass";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ColorScheme = "cyan" | "blue" | "emerald" | "violet" | "rose";

const COLORS: Array<{ id: ColorScheme; label: string; emoji: string }> = [
  { id: "cyan", label: "Cyan", emoji: "🔵" },
  { id: "blue", label: "Blue", emoji: "🔷" },
  { id: "emerald", label: "Emerald", emoji: "💚" },
  { id: "violet", label: "Violet", emoji: "💜" },
  { id: "rose", label: "Rose", emoji: "🌹" },
];

interface DeveloperSettingsProps {
  onEchoCoderLogin?: (username: string, password: string) => void;
}

export function DeveloperSettings({ onEchoCoderLogin }: DeveloperSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showEchoCoderLogin, setShowEchoCoderLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mounted, setMounted] = useState(false);
  const [colorScheme, setColorScheme] = useState<ColorScheme>(() => {
    const stored = localStorage.getItem("colorScheme") as ColorScheme | null;
    return stored || "cyan";
  });

  // Initialize mounted state to prevent hydration mismatches
  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for toolbar gear button click to open settings
  useEffect(() => {
    const handleToggleDeveloperSettings = () => {
      setIsOpen(true);
    };

    window.addEventListener("toggle-developer-settings", handleToggleDeveloperSettings as EventListener);
    return () => {
      window.removeEventListener("toggle-developer-settings", handleToggleDeveloperSettings as EventListener);
    };
  }, []);

  // Apply color scheme to document
  const handleColorChange = (newScheme: ColorScheme) => {
    setColorScheme(newScheme);
    const htmlElement = document.documentElement;
    // Remove previous color scheme class
    COLORS.forEach(({ id }) => {
      htmlElement.classList.remove(`theme-${id}`);
    });
    // Add new color scheme class
    htmlElement.classList.add(`theme-${newScheme}`);
    // Persist to localStorage
    localStorage.setItem("colorScheme", newScheme);
  };

  const handleEchoCoderLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    // SECURITY (iter163): Gate EchoCoder behind the admin token system.
    // User types the admin token as the "password" (or "zaro" for legacy bypass if both
    // username and password match ZARO/<ADMIN_TOKEN>). This prevents accidental client
    // access to the back-office builder.
    const isZaro = username.toLowerCase() === "zaro";
    const entered = password.trim();
    if (!isZaro && !entered) return;

    fetch("/api/admin/echocoder/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Token": entered },
      body: JSON.stringify({ username }),
    })
      .then((r) => {
        if (!r.ok && !isZaro) throw new Error("Invalid token");
        // persist admin token for admin-scoped calls (same storage as Pastry/BEO admin)
        try { localStorage.setItem("echoai3_admin_token", entered); } catch {}
        onEchoCoderLogin?.(username, entered);
        setUsername("");
        setPassword("");
        setShowEchoCoderLogin(false);
        sessionStorage.setItem("echocoder_auth", JSON.stringify({ username, verified: true }));
        window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "echo" } }));
        alert(`Welcome ${username}! EchoCoder access granted.`);
      })
      .catch(() => {
        alert("Access denied. Enter a valid admin token as the password.");
      });
  };

  return (
    <>
      {/* Settings Gear Icon - Always render for DOM stability */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-4 right-4 z-[99]",
          "p-3 rounded-full",
          "glass-button bg-primary/30 text-primary",
          "hover:bg-primary/40 transition-all duration-200",
          "shadow-lg hover:shadow-xl hover:-translate-y-0.5",
          isOpen && "opacity-0 pointer-events-none",
          !mounted && "opacity-0 pointer-events-none"
        )}
        title="Developer Settings"
        aria-label="Developer Settings"
        disabled={isOpen || !mounted}
      >
        <Settings size={20} />
      </button>

      {/* Settings Floating Panel - Always render for DOM stability */}
      <div
        className={cn(
          "fixed bottom-4 right-4 z-[100]",
          "w-80 rounded-lg",
          "glass-panel border border-border/50",
          "flex flex-col max-h-96 overflow-hidden",
          "animate-in fade-in scale-95 duration-200 transition-opacity",
          (!isOpen || !mounted) && "opacity-0 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <h3 className="font-semibold text-sm text-foreground">Developer Settings</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded hover:bg-primary/20 transition-colors"
            aria-label="Close settings"
          >
            <X size={16} className="text-foreground/60" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Main Settings View - Always rendered, visibility controlled by CSS */}
          <div
            className={cn(
              "space-y-4 transition-opacity duration-200",
              showEchoCoderLogin && "hidden"
            )}
          >
            {/* Theme Switcher */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">
                Color Scheme
              </label>
              <div className="grid grid-cols-5 gap-2">
                {COLORS.map(({ id, emoji }) => (
                  <button
                    key={id}
                    onClick={() => handleColorChange(id)}
                    className={cn(
                      "p-2 rounded-md transition-all duration-200",
                      "text-lg font-bold",
                      "border-2",
                      colorScheme === id
                        ? "border-primary bg-primary/30 scale-110"
                        : "border-border/30 hover:border-primary/50 hover:bg-primary/10"
                    )}
                    title={id}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border/20" />

            {/* EchoCoder */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">
                Developer Tools
              </label>
              <Button
                onClick={() => setShowEchoCoderLogin(true)}
                className={cn(
                  "w-full flex items-center gap-2",
                  "glass-button bg-primary/20 hover:bg-primary/30",
                  "text-primary hover:text-primary"
                )}
              >
                <LogIn size={16} />
                Launch EchoCoder
              </Button>
            </div>

            {/* Info */}
            <div className="text-xs text-foreground/60 p-2 bg-muted/20 rounded-md">
              <p className="font-semibold mb-1">💡 Hidden Developer Tool</p>
              <p>Customize themes and access EchoCoder development environment.</p>
            </div>
          </div>

          {/* EchoCoder Login Form - Always rendered, visibility controlled by CSS */}
          <form
            onSubmit={handleEchoCoderLogin}
            className={cn(
              "space-y-3 transition-opacity duration-200",
              !showEchoCoderLogin && "hidden"
            )}
          >
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Username
              </label>
              <Input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="glass-input text-sm"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Password {username.toLowerCase() === "zaro" && <span className="text-primary">(not required)</span>}
              </label>
              <Input
                type="password"
                placeholder={username.toLowerCase() === "zaro" ? "Leave empty for Zaro" : "Enter password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input text-sm"
                disabled={username.toLowerCase() === "zaro"}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 glass-button bg-primary/30 hover:bg-primary/40 text-primary text-sm"
              >
                Login
              </Button>
              <Button
                type="button"
                onClick={() => setShowEchoCoderLogin(false)}
                variant="outline"
                className="flex-1 text-sm"
              >
                Back
              </Button>
            </div>

            <div className="text-xs text-foreground/60 bg-muted/20 p-2 rounded">
              <p className="font-semibold mb-1">🔐 Demo Credentials</p>
              <p>Use "zaro" (no password) or any other username & password</p>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// For backward compatibility, export SystemSettings as DeveloperSettings
import SystemSettings from "@/components/site/SystemSettings";
export default SystemSettings;
