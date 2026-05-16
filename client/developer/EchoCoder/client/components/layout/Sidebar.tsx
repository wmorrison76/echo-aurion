import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Home,
  ChefHat,
  Cake,
  Calendar,
  Package,
  Crown,
  Wine,
  Users,
  Handshake,
  HelpCircle,
  Pencil,
  Video,
  Palette,
  StickyNote,
  Code,
  Sparkles,
  Grid3x3,
  Layout,
  Settings,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const sidebarItems = [
  { id: "dashboard", label: "Dashboard", icon: Home, path: "/dashboard" },
  { id: "culinary", label: "Culinary", icon: ChefHat, path: "/culinary" },
  { id: "pastry", label: "Pastry", icon: Cake, path: "/pastry" },
  { id: "schedule", label: "Schedule", icon: Calendar, path: "/schedule" },
  { id: "inventory", label: "Inventory", icon: Package, path: "/inventory" },
  { id: "maestro", label: "Maestro", icon: Crown, path: "/maestro" },
  { id: "mixology", label: "Mixology", icon: Wine, path: "/mixology" },
  { id: "crm", label: "CRM", icon: Users, path: "/crm" },
  { id: "chefnet", label: "ChefNet", icon: Handshake, path: "/chefnet" },
  { id: "support", label: "Support", icon: HelpCircle, path: "/support" },
  { id: "whiteboard", label: "Whiteboard", icon: Pencil, path: "/whiteboard" },
  { id: "video", label: "Video", icon: Video, path: "/video" },
  { id: "canvas", label: "Canvas", icon: Palette, path: "/canvas" },
  { id: "stickynotes", label: "Sticky Notes", icon: StickyNote, path: "/stickynotes" },
  { id: "echocoder", label: "EchoCoder", icon: Code, path: "/echocoder", badge: "🔧" },
  { id: "aurum", label: "Echo Aurum", icon: Sparkles, path: "/aurum" },
  { id: "layout", label: "Echo Layout", icon: Grid3x3, path: "/layout" },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen: initialOpen = true, onClose }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const location = useLocation();

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="fixed bottom-4 left-4 z-40 md:hidden"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen bg-sidebar border-r border-border/40 backdrop-blur transition-all duration-300 z-50 flex flex-col",
          isOpen ? "w-56" : "w-20"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/40">
          {isOpen && <h2 className="font-bold text-sm text-foreground">Golden Seed</h2>}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="hidden md:inline-flex"
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
          </Button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {sidebarItems.map(({ id, label, icon: Icon, path, badge }) => (
              <Link
                key={id}
                to={path}
                onClick={handleClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive(path)
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {isOpen && (
                  <>
                    <span className="flex-1">{label}</span>
                    {badge && <span className="text-xs">{badge}</span>}
                  </>
                )}
              </Link>
            ))}
          </div>
        </nav>

        {/* Settings */}
        <div className="border-t border-border/40 p-2">
          <Link
            to="/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              isActive("/settings")
                ? "bg-primary/20 text-primary border border-primary/30"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            )}
            onClick={handleClose}
          >
            <Settings className="h-5 w-5 flex-shrink-0" />
            {isOpen && <span>Settings</span>}
          </Link>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={handleClose}
        />
      )}

      {/* Content offset */}
      <div className={cn("transition-all duration-300", isOpen ? "md:ml-56" : "md:ml-20")} />
    </>
  );
}
