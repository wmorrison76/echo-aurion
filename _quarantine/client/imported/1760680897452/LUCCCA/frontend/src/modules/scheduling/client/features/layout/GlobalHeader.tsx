import { Button } from "@/components/ui/button";
// Theme toggle moved to floating sidebar
import { Brain, CalendarDays, Layers3 } from "lucide-react";

export default function GlobalHeader({
  onOpenSettings,
}: {
  onOpenSettings?: () => void;
}) {
  return (
    <header className="border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20">
      <div className="container px-2 h-11 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-primary/10 grid place-items-center text-primary font-bold">
            LU
          </div>
          <div className="text-sm font-semibold tracking-wide">LUCCCA</div>
          <nav className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
            <a
              className="hover:text-foreground flex items-center gap-1"
              href="/"
            >
              <Layers3 className="w-4 h-4" />
              Scheduler
            </a>
            <a
              className="hover:text-foreground flex items-center gap-1"
              href="#lms"
            >
              <Brain className="w-4 h-4" />
              LMS Standards
            </a>
            <a
              className="hover:text-foreground flex items-center gap-1"
              href="#forecast"
            >
              <CalendarDays className="w-4 h-4" />
              Forecast
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-8 rounded-md border bg-background px-2 text-sm"
            defaultValue={localStorage.getItem("shiftflow:outlet") || "Main"}
            onChange={(e) =>
              localStorage.setItem("shiftflow:outlet", e.target.value)
            }
          >
            <option>Main</option>
            <option>Outlet A</option>
            <option>Outlet B</option>
          </select>
          <a href="/m/employee" className="hidden md:inline text-xs underline">
            Employee App
          </a>
          <a href="/m/manager" className="hidden md:inline text-xs underline">
            Manager App
          </a>
          <Button
            size="sm"
            className="h-8"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("shiftflow:open-assistant"))
            }
          >
            <Brain className="mr-1 h-4 w-4" />
            AI Optimize
          </Button>
        </div>
      </div>
    </header>
  );
}
