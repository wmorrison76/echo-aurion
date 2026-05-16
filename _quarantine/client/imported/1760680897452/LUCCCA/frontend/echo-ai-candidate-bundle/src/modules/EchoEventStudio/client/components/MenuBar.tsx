import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";
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
  FaTrendingUp,
} from "react-icons/fa";
import {
  MdDashboard,
  MdAnalytics,
  MdAdminPanelSettings
} from "react-icons/md";

const menuItems = [
  { name: "Timeline", fullName: "Project Timeline", href: "/timeline", icon: FaCalendarAlt },
  { name: "Budget", fullName: "Quarterly Budget", href: "/quarterly-budget", icon: FaDollarSign },
  { name: "Priority", fullName: "High Priority Items", href: "/high-priority", icon: FaExclamationTriangle },
  { name: "Gantt", fullName: "Gantt Chart View", href: "/gantt", icon: FaChartBar },
  { name: "Team", fullName: "Team Dashboard", href: "/team-dashboard", icon: FaUsers },
  { name: "Projects", fullName: "Project Tracking", href: "/project-tracking", icon: FaProjectDiagram },
  { name: "Calendar", fullName: "Global Calendar", href: "/calendar", icon: FaCalendarCheck },
  { name: "BEO Mgmt", fullName: "BEO Management", href: "/beo-management", icon: FaFileAlt },
  { name: "Analytics", fullName: "KPI Analytics", href: "/kpi-analytics", icon: MdAnalytics },
  { name: "Admin", fullName: "Admin Panel", href: "/admin", icon: MdAdminPanelSettings },
];

export default function MenuBar() {
  const location = useLocation();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="w-full relative">
      {/* Modern Launch Bar */}
      <div className="flex justify-center py-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-transparent">
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
                <div
                  className={cn(
                    "relative flex items-center justify-center cursor-pointer transition-all duration-200",
                    "w-10 h-10 rounded-lg",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : isHovered
                      ? "bg-primary/20 text-primary scale-110"
                      : "hover:bg-primary/10 hover:text-primary hover:scale-105"
                  )}
                >
                  <item.icon className="h-5 w-5 transition-all duration-200" />
                  
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
                  )}

                  {/* Tooltip */}
                  <div
                    className={cn(
                      "absolute -top-10 left-1/2 transform -translate-x-1/2 px-2 py-1 text-xs rounded whitespace-nowrap pointer-events-none transition-all duration-200 z-50",
                      "bg-foreground text-background",
                      isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                    )}
                  >
                    {item.fullName}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
