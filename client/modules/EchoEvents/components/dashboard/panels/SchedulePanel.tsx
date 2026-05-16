import { Clock, Calendar } from "lucide-react";
import { MiniPanel } from "../MiniPanel";
import { cn } from "@/lib/utils";
interface ScheduleEvent {
  id: string;
  time: string;
  title: string;
  client?: string;
  duration?: string;
  type?: "call" | "meeting" | "event";
}
interface SchedulePanelProps {
  events?: ScheduleEvent[];
  isMinimized?: boolean;
  onMinimize?: () => void;
  onClose?: () => void;
  size?: "small" | "medium" | "large";
  onSizeChange?: (size: "small" | "medium" | "large") => void;
}
const DEFAULT_EVENTS: ScheduleEvent[] = [
  {
    id: "1",
    time: "9:00 AM",
    title: "Client Call - Acme Corp",
    client: "Acme",
    duration: "30m",
    type: "call",
  },
  {
    id: "2",
    time: "10:30 AM",
    title: "Event Planning Meeting",
    duration: "60m",
    type: "meeting",
  },
  {
    id: "3",
    time: "1:00 PM",
    title: "Vendor Review",
    duration: "45m",
    type: "meeting",
  },
  {
    id: "4",
    time: "3:30 PM",
    title: "Proposal Review",
    duration: "30m",
    type: "call",
  },
];
const typeColors = {
  call: "bg-primary/20 text-primary",
  meeting: "bg-purple-500/20 text-purple-300",
  event: "bg-green-500/20 text-green-300",
};
export function SchedulePanel({
  events = DEFAULT_EVENTS,
  isMinimized,
  onMinimize,
  onClose,
  size = "medium",
  onSizeChange,
}: SchedulePanelProps) {
  return (
    <MiniPanel
      id="schedule"
      title="Today's Schedule"
      icon={<Clock className="h-4 w-4" />}
      isMinimized={isMinimized}
      onMinimize={onMinimize}
      onClose={onClose}
      size={size}
      onSizeChange={onSizeChange}
    >
      {" "}
      <div className="space-y-2">
        {" "}
        {events.length === 0 ? (
          <p className="text-xs text-white/50 py-4 text-center">
            {" "}
            No events scheduled{" "}
          </p>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="p-2.5 rounded-lg bg-background border border-white/10 hover:bg-background transition-colors"
            >
              {" "}
              <div className="flex items-start gap-2 mb-1">
                {" "}
                <span className="text-xs font-semibold text-white/80 min-w-fit">
                  {" "}
                  {event.time}{" "}
                </span>{" "}
                {event.type && (
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded",
                      typeColors[event.type],
                    )}
                  >
                    {" "}
                    {event.type}{" "}
                  </span>
                )}{" "}
              </div>{" "}
              <p className="text-xs text-white font-medium truncate">
                {" "}
                {event.title}{" "}
              </p>{" "}
              {event.duration && (
                <p className="text-xs text-white/50">{event.duration}</p>
              )}{" "}
            </div>
          ))
        )}{" "}
      </div>{" "}
    </MiniPanel>
  );
}
