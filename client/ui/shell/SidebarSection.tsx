import React from "react";
import { cn } from "@/lib/utils";

type SidebarSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function SidebarSection({
  title,
  description,
  children,
  className,
}: SidebarSectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      <header className="space-y-1">
        <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          {title}
        </h3>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </header>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
