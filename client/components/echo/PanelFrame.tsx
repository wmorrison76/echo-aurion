import React from "react";
import { cn } from "@/lib/utils";
import "../../../styles/chrome.css";

export type PanelFrameProps = {
  title?: string;
  subtitle?: string;
  status?: string;
  chrome?: boolean;
  children?: React.ReactNode;
  className?: string;
};

export function PanelFrame({
  title = "Echo Panel",
  subtitle = "EchoCoder Engine",
  status = "Preview",
  chrome = true,
  children,
  className,
}: PanelFrameProps) {
  return (
    <section className={cn("panel-shell", className)}>
      {chrome ? (
        <header className="panel-header">
          <div className="panel-header-left">
            <div className="panel-buttons">
              <span className="panel-dot red" aria-hidden="true" />
              <span className="panel-dot yellow" aria-hidden="true" />
              <span className="panel-dot green" aria-hidden="true" />
            </div>
            <div>
              <div className="panel-title">{title}</div>
              <div className="panel-subtitle">{subtitle}</div>
            </div>
          </div>
          <div className="panel-header-right">
            <span className="text-xs uppercase tracking-wide opacity-70">
              {status}
            </span>
          </div>
        </header>
      ) : null}
      <div className="panel-body">{children}</div>
    </section>
  );
}

export default PanelFrame;
