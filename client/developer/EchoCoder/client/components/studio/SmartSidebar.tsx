import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronLeft, Zap, BookOpen, HelpCircle } from "lucide-react";
import { EchoProLogo } from "@/components/branding/EchoProLogo";
import { Button } from "@/components/ui/button";

interface SidebarItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  tier: 1 | 2 | 3 | 4;
  isActive: boolean;
  progress?: number; // 0-100 for active workflows
  onClick: () => void;
  badge?: string;
}

interface SmartSidebarProps {
  currentTask?: string;
  activeWorkflow?: {
    name: string;
    progress: number; // 0-100
    step: string;
  };
  onNavigate: (taskId: string) => void;
  isCollapsed?: boolean;
}

export function SmartSidebar({
  currentTask,
  activeWorkflow,
  onNavigate,
  isCollapsed: initialCollapsed = false,
}: SmartSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [expandedTier, setExpandedTier] = useState<1 | 2 | 3 | 4 | null>(1);

  // Save preference
  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }
  }, []);

  const sidebarItems: SidebarItem[] = [
    {
      id: "studio",
      title: "Studio",
      icon: <Zap className="w-5 h-5" />,
      tier: 1,
      isActive: currentTask === "studio",
      onClick: () => onNavigate("studio"),
    },
    {
      id: "content",
      title: "Content",
      icon: <BookOpen className="w-5 h-5" />,
      tier: 1,
      isActive: currentTask === "content",
      onClick: () => onNavigate("content"),
    },
    {
      id: "publishing",
      title: "Publishing",
      icon: <Zap className="w-5 h-5" />,
      tier: 1,
      isActive: currentTask === "publishing",
      onClick: () => onNavigate("publishing"),
    },
    {
      id: "analytics",
      title: "Analytics",
      icon: <Zap className="w-5 h-5" />,
      tier: 2,
      isActive: currentTask === "analytics",
      onClick: () => onNavigate("analytics"),
      badge: "new",
    },
    {
      id: "team",
      title: "Team",
      icon: <Zap className="w-5 h-5" />,
      tier: 2,
      isActive: currentTask === "team",
      onClick: () => onNavigate("team"),
      badge: "new",
    },
    {
      id: "security",
      title: "Security",
      icon: <Zap className="w-5 h-5" />,
      tier: 3,
      isActive: currentTask === "security",
      onClick: () => onNavigate("security"),
      badge: "new",
    },
    {
      id: "compliance",
      title: "Compliance",
      icon: <Zap className="w-5 h-5" />,
      tier: 3,
      isActive: currentTask === "compliance",
      onClick: () => onNavigate("compliance"),
      badge: "new",
    },
    {
      id: "advanced",
      title: "Advanced",
      icon: <Zap className="w-5 h-5" />,
      tier: 4,
      isActive: currentTask === "advanced",
      onClick: () => onNavigate("advanced"),
      badge: "new",
    },
  ];

  const groupedItems = {
    1: sidebarItems.filter((item) => item.tier === 1),
    2: sidebarItems.filter((item) => item.tier === 2),
    3: sidebarItems.filter((item) => item.tier === 3),
    4: sidebarItems.filter((item) => item.tier === 4),
  };

  const tierColors = {
    1: "text-cyan-400",
    2: "text-blue-400",
    3: "text-purple-400",
    4: "text-pink-400",
  };

  return (
    <div
      className={cn(
        "h-full bg-gradient-to-b from-slate-900 to-slate-950 border-r border-slate-800 flex flex-col transition-all duration-300 overflow-hidden",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <EchoProLogo size={32} />
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-slate-400 hover:text-white"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Active Workflow Status */}
      {activeWorkflow && !isCollapsed && (
        <div className="px-4 py-3 bg-blue-900/20 border-b border-blue-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-blue-300">{activeWorkflow.name}</span>
            <span className="text-blue-400">{activeWorkflow.progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-blue-900/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
              style={{ width: `${activeWorkflow.progress}%` }}
            />
          </div>
          <p className="text-xs text-blue-200">{activeWorkflow.step}</p>
        </div>
      )}

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
        {([1, 2, 3, 4] as const).map((tier) => (
          <div key={tier}>
            {/* Tier Header */}
            <button
              onClick={() => setExpandedTier(expandedTier === tier ? null : tier)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors",
                expandedTier === tier
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              )}
            >
              {!isCollapsed && (
                <span className={cn("text-xs font-bold tracking-wider", tierColors[tier])}>
                  TIER {tier}
                </span>
              )}
              <ChevronRight
                className={cn(
                  "w-4 h-4 transition-transform",
                  expandedTier === tier ? "rotate-90" : ""
                )}
              />
            </button>

            {/* Items */}
            {expandedTier === tier && !isCollapsed && (
              <div className="mt-2 space-y-1">
                {groupedItems[tier].map((item) => (
                  <button
                    key={item.id}
                    onClick={item.onClick}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                      item.isActive
                        ? "bg-slate-700 text-white border border-slate-600"
                        : "text-slate-300 hover:text-white hover:bg-slate-800"
                    )}
                  >
                    <span className={cn("flex-shrink-0", tierColors[tier])}>
                      {item.icon}
                    </span>
                    <span className="flex-1 text-left truncate">{item.title}</span>
                    {item.badge && (
                      <span className={cn(
                        "px-2 py-0.5 text-xs rounded-full",
                        tierColors[tier],
                        "bg-opacity-20"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-800 p-3 space-y-2">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-center text-slate-400 hover:text-white hover:bg-slate-800",
            !isCollapsed && "justify-start"
          )}
        >
          <BookOpen className="w-4 h-4 mr-2" />
          {!isCollapsed && "Resources"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-center text-slate-400 hover:text-white hover:bg-slate-800",
            !isCollapsed && "justify-start"
          )}
        >
          <HelpCircle className="w-4 h-4 mr-2" />
          {!isCollapsed && "Help"}
        </Button>
      </div>
    </div>
  );
}
