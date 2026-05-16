import React from "react";
import PanelFrame from "./PanelFrame";
import { cn } from "@/lib/utils";

export type SlotLayoutProps = {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  toolbar?: React.ReactNode;
  main?: React.ReactNode;
  className?: string;
};

export default function SlotLayout({
  header,
  sidebar,
  toolbar,
  main,
  className,
}: SlotLayoutProps) {
  return (
    <PanelFrame
      title="EchoCoder Shell"
      subtitle="Builder Slot Layout"
      status="Synced"
      className={cn("space-y-4", className)}
    >
      <div className="flex flex-col gap-4">
        {header ? (
          <div className="rounded-lg border border-[color-mix(in srgb,var(--border) 80%, transparent)] bg-[color-mix(in srgb,var(--surface) 92%, transparent)] p-4">
            {header}
          </div>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          {sidebar ? (
            <aside className="rounded-lg border border-[color-mix(in srgb,var(--border) 80%, transparent)] bg-[color-mix(in srgb,var(--surface) 92%, transparent)] p-4">
              {sidebar}
            </aside>
          ) : (
            <div className="rounded-lg border border-dashed border-[color-mix(in srgb,var(--border) 40%, transparent)] bg-[color-mix(in srgb,var(--surface) 70%, transparent)] p-4 text-sm opacity-70">
              Configure Sidebar Slot
            </div>
          )}
          <div className="flex flex-col gap-4">
            {toolbar ? (
              <div className="rounded-lg border border-[color-mix(in srgb,var(--border) 80%, transparent)] bg-[color-mix(in srgb,var(--surface) 92%, transparent)] p-3">
                {toolbar}
              </div>
            ) : null}
            <main className="rounded-lg border border-[color-mix(in srgb,var(--border) 90%, transparent)] bg-[color-mix(in srgb,var(--surface) 94%, transparent)] p-6 shadow-[var(--shadow-1)]">
              {main ?? (
                <div className="flex min-h-[240px] items-center justify-center text-sm opacity-70">
                  Drop Builder blocks into the Main slot.
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </PanelFrame>
  );
}
