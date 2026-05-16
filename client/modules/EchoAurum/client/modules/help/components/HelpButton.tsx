import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HelpCategory } from "@/shared/help";
interface HelpButtonProps {
  onClick?: () => void;
  category?: HelpCategory;
  size?: "sm" | "md" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost";
  className?: string;
  tooltip?: string;
}
export function HelpButton({
  onClick,
  size = "icon",
  variant = "outline",
  className,
  tooltip = "Open Help Center",
}: HelpButtonProps) {
  return (
    <div className="relative group">
      {" "}
      <Button
        variant={variant}
        size={size}
        onClick={onClick}
        className={`gap-2 ${className || ""}`}
        title={tooltip}
      >
        {" "}
        <HelpCircle className="h-5 w-5" /> {size !== "icon" && "Help"}{" "}
      </Button>{" "}
      {size === "icon" && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block px-3 py-1 bg-surface-variant border border-border/40 rounded-lg text-xs text-muted-foreground whitespace-nowrap z-50 pointer-events-none">
          {" "}
          {tooltip}{" "}
        </div>
      )}{" "}
    </div>
  );
}
