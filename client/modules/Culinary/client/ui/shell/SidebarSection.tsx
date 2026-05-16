import React from "react";

interface SidebarSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
}

export function SidebarSection({
  title,
  description,
  children,
  className = "",
  defaultOpen = true,
}: SidebarSectionProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className={`border-b border-border/40 pb-3 mb-3 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left mb-1"
      >
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
            {title}
          </h3>
          {description && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {description}
            </p>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}
