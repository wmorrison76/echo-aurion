import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChefHat,
  Calendar,
  ClipboardList,
  Users,
  Package,
  BarChart3,
  Settings,
  Bell,
  Search,
  Home,
  FileText,
  Clock,
  TrendingUp,
  MessageCircle,
  PanelLeft,
  X,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/glass';

interface CommandSidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

// Define CheckCircle icon before using it in navigationStructure
const CheckCircle = (props: any) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const navigationStructure = [
  {
    group: 'Command Center',
    items: [
      { id: 'overview', label: 'Overview', icon: Home, action: 'overview' },
      { id: 'dashboard', label: 'Dashboard', icon: BarChart3, action: 'dashboard' },
      { id: 'global-calendar', label: 'Global Calendar', icon: Calendar, action: 'calendar' },
      { id: 'personal-calendar', label: 'Personal Calendar', icon: Clock, action: 'personal-calendar' },
    ]
  },
  {
    group: 'Production',
    items: [
      { id: 'production', label: 'Production', icon: ClipboardList, action: 'production', badge: null },
      { id: 'production-planner', label: 'Production Planner', icon: Calendar, action: 'planner' },
      { id: 'schedule', label: 'Schedule', icon: Users, action: 'schedule' },
      { id: 'prep-list', label: 'Prep List Creator', icon: FileText, action: 'prep-list' },
    ]
  },
  {
    group: 'Operations',
    items: [
      { id: 'butcher', label: 'Butcher', icon: Package, action: 'butcher' },
      { id: 'chef-kitchen', label: 'Chef Kitchen', icon: ChefHat, action: 'kitchen' },
      { id: 'haccp', label: 'HACCP', icon: ClipboardList, action: 'haccp' },
      { id: 'pre-inspection', label: 'Pre-Inspection', icon: CheckCircle, action: 'inspection' },
    ]
  },
  {
    group: 'Sales & Events',
    items: [
      { id: 'beos', label: 'BEOs', icon: FileText, action: 'beos' },
      { id: 'menu-builder', label: 'Menu Builder', icon: BarChart3, action: 'menu' },
      { id: 'ordering', label: 'Ordering & Invoices', icon: MessageCircle, action: 'ordering' },
    ]
  },
];

export const CommandSidebar: React.FC<CommandSidebarProps> = ({
  isCollapsed = false,
  onToggle,
  onClose,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [collapsed, setCollapsed] = useState(isCollapsed);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggle = () => {
    setCollapsed(!collapsed);
    onToggle?.();
  };

  const handleNavigate = (action: string) => {
    // Map actions to actual routes or events
    const actionMap: Record<string, () => void> = {
      overview: () => window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "dashboard" } })),
      dashboard: () => window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "dashboard" } })),
      calendar: () => navigate("/calendar"),
      'personal-calendar': () => navigate("/personal-calendar"),
      production: () => window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "production" } })),
      planner: () => window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "production" } })),
      schedule: () => window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "scheduling" } })),
      'prep-list': () => window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "production" } })),
      butcher: () => window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "production" } })),
      kitchen: () => window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "maestro" } })),
      haccp: () => window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "production" } })),
      inspection: () => window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "production" } })),
      beos: () => window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "culinary" } })),
      menu: () => window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "culinary" } })),
      ordering: () => window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "purchasing" } })),
    };

    const handler = actionMap[action];
    if (handler) {
      handler();
      onClose?.();
    }
  };

  return (
    <div className={cn(
      "h-full flex flex-col transition-all duration-300 ease-out",
      "glass-panel rounded-lg",
      "bg-background/40 backdrop-blur-md border border-cyan-400/30",
      "relative z-50",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <ChefHat className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg truncate">Maestro</h2>
              <p className="text-xs text-muted-foreground truncate">BQT Control</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggle}
            className="ml-auto h-8 w-8 p-0 flex-shrink-0"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Time Display */}
      {!collapsed && (
        <div className="px-4 py-2 border-b border-border/50 bg-muted/30">
          <div className="text-center">
            <div className="text-lg font-bold text-primary">
              {currentTime.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            <div className="text-xs text-muted-foreground">
              {currentTime.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      {!collapsed && (
        <div className="p-4 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder="Search..."
              className="pl-10 bg-background/50 text-sm"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <div className={cn(
          "p-4",
          collapsed ? "space-y-4" : "space-y-6"
        )}>
          {navigationStructure.map((group, groupIndex) => (
            <div key={groupIndex}>
              {!collapsed && (
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {group.group}
                </h4>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.action)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
                        "hover:bg-accent hover:text-accent-foreground",
                        "group relative cursor-pointer"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 font-medium text-left text-sm">
                            {item.label}
                          </span>
                          {item.badge && (
                            <Badge variant="secondary" className="text-xs flex-shrink-0">
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border/50 bg-background/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-white">MB</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">Maestro BQT</div>
              <div className="text-xs text-muted-foreground truncate">Command Center</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandSidebar;
