/**
 * BackboardPage - Main routing page
 *
 * The platform primarily renders content through the PanelHost system (floating panels).
 * When no panels are open yet, an empty page can look like a broken/blank app.
 *
 * This lightweight landing view:
 * - Confirms the app is running
 * - Gives users obvious actions to open common modules
 * - Leaves plenty of space for panels once opened
 */

import { useCallback } from "react";
import { openPanel } from "@/lib/open-panel";
import { Button } from "@/components/ui/button";

export default function BackboardPage() {
  const handleOpen = useCallback((panelId: string) => {
    try {
      openPanel(panelId as any);
    } catch (err) {
      // Avoid throwing from the landing page; the user can still use the sidebar.
      console.warn("[BackboardPage] Failed to open panel", panelId, err);
    }
  }, []);

  return (
    <div
      style={{ minHeight: "100vh" }}
      className="flex items-center justify-center px-6 py-10"
    >
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-card/70 p-6 shadow-sm backdrop-blur">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">
            Welcome to LUCCCA
          </h1>
          <p className="text-sm text-muted-foreground">
            Nothing is open yet. Use the sidebar, or tap a quick action below to
            open a module.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button
            type="button"
            className="justify-start"
            onClick={() => handleOpen("dashboard")}
          >
            Open Dashboard
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="justify-start"
            onClick={() => handleOpen("schedule")}
          >
            Open Schedule
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="justify-start"
            onClick={() => handleOpen("culinary")}
          >
            Open Culinary
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="justify-start"
            onClick={() => handleOpen("purchasing-receiving")}
          >
            Open Purchasing & Receiving
          </Button>
        </div>

        <div className="mt-5 text-xs text-muted-foreground">
          Tip: If you still see a blank page, refresh the preview once so the
          browser clears any cached dev modules.
        </div>
      </div>
    </div>
  );
}
