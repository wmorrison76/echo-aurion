import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  FaCalendarAlt,
  FaDollarSign,
  FaExclamationTriangle,
  FaChartBar,
  FaUsers,
  FaProjectDiagram,
  FaCog,
  FaCalendarCheck,
  FaFileAlt,
} from "react-icons/fa";
import { MdDashboard, MdAnalytics, MdAdminPanelSettings } from "react-icons/md";
interface MenuBarProps {
  compact?: boolean;
  className?: string;
}
const menuItems = [
  {
    name: "Timeline",
    fullName: "Project Timeline",
    href: "/timeline",
    icon: FaCalendarAlt,
  },
  {
    name: "Budget",
    fullName: "Quarterly Budget",
    href: "/quarterly-budget",
    icon: FaDollarSign,
  },
  {
    name: "Priority",
    fullName: "High Priority Items",
    href: "/high-priority",
    icon: FaExclamationTriangle,
  },
  {
    name: "Gantt",
    fullName: "Gantt Chart View",
    href: "/gantt",
    icon: FaChartBar,
  },
  {
    name: "Team",
    fullName: "Team Dashboard",
    href: "/team-dashboard",
    icon: FaUsers,
  },
  {
    name: "Projects",
    fullName: "Project Tracking",
    href: "/project-tracking",
    icon: FaProjectDiagram,
  },
  {
    name: "Calendar",
    fullName: "Global Calendar",
    href: "/calendar",
    icon: FaCalendarCheck,
  },
  {
    name: "BEO Mgmt",
    fullName: "BEO Management",
    href: "/beo-management",
    icon: FaFileAlt,
  },
  {
    name: "Analytics",
    fullName: "KPI Analytics",
    href: "/kpi-analytics",
    icon: MdAnalytics,
  },
  {
    name: "Echo Studio",
    fullName: "Echo AI Studio",
    href: "/echo-studio",
    icon: FaCog,
  },
  {
    name: "Admin",
    fullName: "Admin Panel",
    href: "/admin",
    icon: MdAdminPanelSettings,
  },
];
export default function MenuBar({
  compact = false,
  className,
}: MenuBarProps = {}) {
  const location = useLocation();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  return (
    <div className={cn("relative w-full", className)}>
      {" "}
      <div
        className={cn(
          "flex flex-wrap items-center gap-1",
          compact ? "justify-start py-1.5" : "justify-center py-3",
        )}
      >
        {" "}
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.href;
          const isHovered = hoveredIndex === index;
          return (
            <Link
              key={item.name}
              to={item.href}
              className="relative group"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {" "}
              <div
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200",
                  compact && "h-9 w-9",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : isHovered
                      ? "bg-primary/20 text-primary shadow-sm"
                      : "hover:bg-primary/10 hover:text-primary",
                )}
              >
                {" "}
                <item.icon
                  className={cn(
                    "transition-all duration-200",
                    compact ? "h-4 w-4" : "h-5 w-5",
                  )}
                />{" "}
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-primary" />
                )}{" "}
                <div
                  className={cn(
                    "pointer-events-none absolute -top-9 left-1/2 z-50 -translate-x-1/2 px-2 py-1 text-xs font-medium text-background transition-all duration-200",
                    "rounded bg-foreground",
                    isHovered ? "opacity-100" : "translate-y-2 opacity-0",
                  )}
                >
                  {" "}
                  {item.fullName}{" "}
                </div>{" "}
              </div>{" "}
            </Link>
          );
        })}{" "}
      </div>{" "}
    </div>
  );
}
