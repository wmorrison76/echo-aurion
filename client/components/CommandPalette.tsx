/**
 * Global Command Palette (Cmd+K)
 * Provides quick access to all features with keyboard shortcuts
 */

import React, { useState, useEffect, useCallback } from "react";
import { Command } from "cmdk";
import { Search, FileText, BarChart3, Calendar, ShoppingCart, Users, Settings, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  action: () => void;
  keywords?: string[];
  category: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Define command items
  const commands: CommandItem[] = [
    // Navigation
    {
      id: "dashboard",
      label: "Go to Dashboard",
      description: "Navigate to main dashboard",
      icon: <BarChart3 className="h-4 w-4" />,
      action: () => navigate("/dashboard"),
      keywords: ["dashboard", "home", "main"],
      category: "Navigation",
    },
    {
      id: "inventory",
      label: "Open Inventory",
      description: "View inventory management",
      icon: <ShoppingCart className="h-4 w-4" />,
      action: () => navigate("/inventory"),
      keywords: ["inventory", "stock", "items"],
      category: "Navigation",
    },
    {
      id: "schedule",
      label: "Open Schedule",
      description: "View staff scheduling",
      icon: <Calendar className="h-4 w-4" />,
      action: () => navigate("/schedule"),
      keywords: ["schedule", "staff", "shifts", "labor"],
      category: "Navigation",
    },
    {
      id: "purchasing",
      label: "Open Purchasing",
      description: "View purchasing and receiving",
      icon: <ShoppingCart className="h-4 w-4" />,
      action: () => navigate("/purchasing"),
      keywords: ["purchasing", "receiving", "orders", "po"],
      category: "Navigation",
    },
    {
      id: "culinary",
      label: "Open Culinary",
      description: "View recipe management",
      icon: <FileText className="h-4 w-4" />,
      action: () => navigate("/culinary"),
      keywords: ["culinary", "recipes", "menu"],
      category: "Navigation",
    },
    {
      id: "echoaurum",
      label: "Open EchoAurum",
      description: "View financial management",
      icon: <BarChart3 className="h-4 w-4" />,
      action: () => navigate("/echoaurum"),
      keywords: ["echoaurum", "financial", "accounting", "gl"],
      category: "Navigation",
    },
    {
      id: "settings",
      label: "Open Settings",
      description: "View system settings",
      icon: <Settings className="h-4 w-4" />,
      action: () => navigate("/settings"),
      keywords: ["settings", "preferences", "config"],
      category: "Navigation",
    },
  ];

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const handleSelect = useCallback((command: CommandItem) => {
    command.action();
    setOpen(false);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-2xl bg-surface border border-border rounded-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="border-none">
          <div className="flex items-center border-b border-border px-4 py-3">
            <Search className="mr-2 h-4 w-4 text-muted-foreground" />
            <Command.Input
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
              autoFocus
            />
            <button
              onClick={() => setOpen(false)}
              className="ml-2 p-1 hover:bg-muted rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty>No results found.</Command.Empty>
            {commands.map((command) => (
              <Command.Item
                key={command.id}
                value={command.label}
                keywords={command.keywords}
                onSelect={() => handleSelect(command)}
                className="flex items-center gap-3 px-3 py-2 rounded hover:bg-muted cursor-pointer"
              >
                {command.icon}
                <div className="flex-1">
                  <div className="font-medium">{command.label}</div>
                  {command.description && (
                    <div className="text-xs text-muted-foreground">
                      {command.description}
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {command.category}
                </div>
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
