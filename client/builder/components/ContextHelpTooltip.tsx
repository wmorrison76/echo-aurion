import React, { useState, useEffect, useRef } from "react";
import type { HelpContextBinding } from "@shared/echo/help/types";

export interface ContextHelpTooltipProps {
  contextId: string;
  placement?: "top" | "right" | "bottom" | "left";
  iconVariant?: "question" | "info" | "echo-mini";
  module?: string;
  route?: string;
  role?: string;
  userId?: string;
}

const ContextHelpTooltip: React.FC<ContextHelpTooltipProps> = ({
  contextId,
  placement = "top",
  iconVariant = "question",
  module,
  route,
  role,
  userId,
}) => {
  const [open, setOpen] = useState(false);
  const [binding, setBinding] = useState<HelpContextBinding | null>(null);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open || binding || loading) return;

    const fetchBinding = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("contextId", contextId);
        if (module) params.set("module", module);
        if (route) params.set("route", route);
        if (role) params.set("role", role);
        if (userId) params.set("userId", userId);

        const res = await fetch(`/api/help/context?${params.toString()}`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setBinding(data);
      } catch (err) {
        console.error("[ContextHelpTooltip] Failed to load context:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBinding();
  }, [open, contextId, module, route, role, userId, binding, loading]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = window.setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  const icon = (() => {
    switch (iconVariant) {
      case "info":
        return "i";
      case "echo-mini":
        return "E";
      default:
        return "?";
    }
  })();

  const placementClasses: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      className="inline-flex relative items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className="h-4 w-4 rounded-full border border-border text-[10px] flex items-center justify-center text-muted-foreground bg-card/80 hover:bg-muted"
      >
        {icon}
      </button>

      {open && (
        <div
          className={`absolute z-[9999] min-w-[220px] max-w-xs rounded-lg bg-popover/95 border border-border shadow-lg px-3 py-2 text-xs text-foreground ${placementClasses[placement]}`}
        >
          {loading && (
            <div className="text-[11px] text-muted-foreground">Loading…</div>
          )}
          {!loading && binding && (
            <>
              <div className="font-semibold text-[11px] mb-1">
                {binding.title || "Help"}
              </div>
              <div className="text-[11px] text-muted-foreground mb-2">
                {binding.description}
              </div>
              {binding.primaryArticle && (
                <button
                  type="button"
                  className="text-[10px] text-primary hover:opacity-80 underline"
                  onClick={() => {
                    console.log(
                      "[ContextHelpTooltip] Open article:",
                      binding.primaryArticle,
                    );
                  }}
                >
                  View detailed article
                </button>
              )}
            </>
          )}
          {!loading && !binding && (
            <div className="text-[11px] text-muted-foreground">
              No help available for <code>{contextId}</code>.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContextHelpTooltip;
