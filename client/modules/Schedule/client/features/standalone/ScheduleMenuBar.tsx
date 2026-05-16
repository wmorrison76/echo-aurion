import React from "react";
import {
  Calendar,
  BarChart3,
  DollarSign,
  Scale,
  Star,
  Clock,
  Menu,
  X,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button"; // Simple classname helper
const cn = (...classes: (string | undefined | false)[]) =>
  classes.filter(Boolean).join("");
export type SchedulePage =
  | "schedule"
  | "reports"
  | "forecast"
  | "analytics"
  | "finance"
  | "legal"
  | "ratings"
  | "timeoff"
  | "attendance";
interface MenuBarProps {
  currentPage: SchedulePage;
  onPageChange: (page: SchedulePage) => void;
}
export default function ScheduleMenuBar({
  currentPage,
  onPageChange,
}: MenuBarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const menuItems: Array<{
    id: SchedulePage;
    label: string;
    icon: ReactNode;
  }> = [
    { id: "schedule", label: "Schedule", icon: <Calendar size={18} /> },
    { id: "reports", label: "Reports", icon: <Menu size={18} /> },
    { id: "forecast", label: "Forecast", icon: <BarChart3 size={18} /> },
    { id: "analytics", label: "Analytics", icon: <BarChart3 size={18} /> },
    { id: "finance", label: "Finance", icon: <DollarSign size={18} /> },
    { id: "legal", label: "Legal", icon: <Scale size={18} /> },
    { id: "ratings", label: "Staff Ratings", icon: <Star size={18} /> },
    { id: "timeoff", label: "Time Off", icon: <Clock size={18} /> },
    { id: "attendance", label: "Attendance", icon: <Users size={18} /> },
  ];
  return (
    <>
      {" "}
      {/* Desktop Menu Bar */}{" "}
      <div className="hidden md:flex items-center gap-1 px-4 py-3 border-b border-border/50 bg-background/40 backdrop-blur-sm flex-shrink-0">
        {" "}
        <h2 className="text-sm font-semibold mr-auto text-foreground/80">
          {" "}
          Schedule Manager{" "}
        </h2>{" "}
        <div className="flex items-center gap-1">
          {" "}
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant={currentPage === item.id ? "default" : "ghost"}
              size="sm"
              onClick={() => onPageChange(item.id)}
              className={cn(
                "gap-2 text-xs whitespace-nowrap",
                currentPage === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/70 hover:text-foreground",
              )}
            >
              {" "}
              {item.icon} {item.label}{" "}
            </Button>
          ))}{" "}
        </div>{" "}
      </div>{" "}
      {/* Mobile Menu Bar */}{" "}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background/40 backdrop-blur-sm flex-shrink-0">
        {" "}
        <h2 className="text-sm font-semibold text-foreground/80">
          Schedule
        </h2>{" "}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1"
        >
          {" "}
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}{" "}
        </Button>{" "}
        {/* Mobile Dropdown */}{" "}
        {mobileMenuOpen && (
          <div className="absolute top-14 left-0 right-0 bg-background border-b border-border/50 p-2 flex flex-col gap-1 z-10">
            {" "}
            {menuItems.map((item) => (
              <Button
                key={item.id}
                variant={currentPage === item.id ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  onPageChange(item.id);
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  "w-full justify-start gap-2 text-xs",
                  currentPage === item.id
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/70 hover:text-foreground",
                )}
              >
                {" "}
                {item.icon} {item.label}{" "}
              </Button>
            ))}{" "}
          </div>
        )}{" "}
      </div>{" "}
    </>
  );
}
