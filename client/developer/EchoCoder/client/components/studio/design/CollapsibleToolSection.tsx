import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CollapsibleToolSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  onToggle?: (isOpen: boolean) => void;
  badge?: number | string;
  icon?: React.ReactNode;
}

export default function CollapsibleToolSection({
  title,
  description,
  children,
  defaultOpen = true,
  className,
  onToggle,
  badge,
  icon,
}: CollapsibleToolSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    onToggle?.(newState);
  };

  return (
    <Card className={cn("border border-primary/20 bg-background/75 shadow-sm backdrop-blur", className)}>
      <CardHeader 
        className="cursor-pointer hover:bg-primary/5 transition-colors py-3 px-4"
        onClick={handleToggle}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1">
            {icon && <div className="mt-0.5 text-muted-foreground">{icon}</div>}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">{title}</CardTitle>
                {badge !== undefined && (
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                    {badge}
                  </span>
                )}
              </div>
              {description && (
                <CardDescription className="text-xs mt-1">
                  {description}
                </CardDescription>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -mr-2 -mt-1"
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-4 border-t border-primary/10 px-4 py-3">
          {children}
        </CardContent>
      )}
    </Card>
  );
}
