import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface TabletBackButtonProps {
  title?: string;
  className?: string;
  showOnTablet?: boolean;
}

/**
 * Back button component that shows only on desktop view
 * Automatically hides when accessed from tablet mode
 * Pass showOnTablet={true} to show even in tablet mode
 */
export function TabletBackButton({
  title = "Back to Echo Recipe Pro",
  className,
  showOnTablet = false,
}: TabletBackButtonProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check if this is a tablet setup (has device query param)
  const isTabletMode = !!searchParams.get("device");

  // Don't show button if in tablet mode (unless explicitly requested)
  if (isTabletMode && !showOnTablet) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => navigate("/?tab=recipes")}
      title={title}
      className={className || "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}
    >
      <ArrowLeft className="w-5 h-5" />
    </Button>
  );
}
