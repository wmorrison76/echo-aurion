import React, { useState } from "react";
import { Plus, Settings, MessageSquare, Bell, Zap, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
interface QuickActionItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  color?: string;
}
const defaultActions: QuickActionItem[] = [
  {
    id: "new-prospect",
    icon: Plus,
    label: "New Prospect",
    onClick: () => console.log("New prospect"),
    color: "bg-primary",
  },
  {
    id: "messages",
    icon: MessageSquare,
    label: "Messages",
    onClick: () => console.log("Messages"),
    color: "bg-purple-500",
  },
  {
    id: "notifications",
    icon: Bell,
    label: "Notifications",
    onClick: () => console.log("Notifications"),
    color: "bg-amber-500",
  },
  {
    id: "quick-actions",
    icon: Zap,
    label: "Quick Actions",
    onClick: () => console.log("Quick actions"),
    color: "bg-green-500",
  },
];
interface QuickActionStackProps {
  items?: QuickActionItem[];
  position?: "bottom-right" | "bottom-left";
}
export default function QuickActionStack({
  items = defaultActions,
  position = "bottom-right",
}: QuickActionStackProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const positionClasses = cn(
    "fixed z-40",
    position === "bottom-right" ? "bottom-6 right-6" : "bottom-6 left-6",
  );
  return (
    <div className={positionClasses}>
      {" "}
      {/* Stacked Items */}{" "}
      <div className="flex flex-col gap-3 items-end">
        {" "}
        {isExpanded &&
          items.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="glass-panel rounded-full p-3 cursor-pointer transition-all hover:shadow-lg hover:scale-110 relative"
                onClick={() => {
                  item.onClick();
                  setIsExpanded(false);
                }}
              >
                {" "}
                <Icon className="h-5 w-5 text-white" />{" "}
              </div>
            );
          })}{" "}
        {/* Main Action Button */}{" "}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "glass-panel rounded-full p-4 cursor-pointer transition-all",
            "hover:shadow-lg hover:scale-110 active:scale-95",
            "flex items-center justify-center",
            isExpanded ? "bg-red-500/80" : "bg-primary/80",
          )}
          title={isExpanded ? "Close" : "Quick actions"}
        >
          {" "}
          {isExpanded ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <Plus className="h-6 w-6 text-white" />
          )}{" "}
        </button>{" "}
      </div>{" "}
      {/* Background overlay when expanded */}{" "}
      {isExpanded && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setIsExpanded(false)}
        />
      )}{" "}
    </div>
  );
}
