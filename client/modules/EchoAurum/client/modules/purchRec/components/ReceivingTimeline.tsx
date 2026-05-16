import type { ReceivingEvent } from "@shared/purchasing";
interface ReceivingTimelineProps {
  events: ReceivingEvent[];
}
const STATUS_TO_COLOR: Record<ReceivingEvent["status"], string> = {
  Queued: "bg-slate-500/10 text-slate-200 border-slate-400/40",
  Receiving: "bg-aurum-500/15 text-aurum-100 border-aurum-400/50",
  Completed: "bg-emerald-500/10 text-emerald-200 border-emerald-400/40",
  Variance: "bg-rose-500/10 text-rose-200 border-rose-400/40",
};
export function ReceivingTimeline({ events }: ReceivingTimelineProps) {
  return (
    <div className="rounded-3xl border border-border/40 bg-surface/90 p-6 shadow-[0_35px_90px_-50px_rgba(9,12,21,0.65)]">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            {" "}
            Receiving timeline{" "}
          </p>{" "}
          <h2 className="mt-2 text-xl font-semibold text-foreground">
            {" "}
            Dock activity across LUCCCA{" "}
          </h2>{" "}
        </div>{" "}
      </div>{" "}
      <ol className="mt-6 space-y-5">
        {" "}
        {events.map((event) => (
          <li key={event.id} className="flex gap-4">
            {" "}
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/40 bg-surface-variant/70 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {" "}
              {new Date(event.timestamp).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
            </div>{" "}
            <div className="flex-1 rounded-2xl border border-border/40 bg-surface-variant/60 p-4">
              {" "}
              <div className="flex flex-wrap items-center gap-3">
                {" "}
                <span className="text-sm font-semibold text-foreground">
                  {" "}
                  {event.poReference}{" "}
                </span>{" "}
                <span className="text-xs text-muted-foreground">
                  {" "}
                  {event.property}{" "}
                </span>{" "}
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${STATUS_TO_COLOR[event.status]}`}
                >
                  {" "}
                  {event.status}{" "}
                </span>{" "}
                <span className="text-xs text-muted-foreground">
                  {" "}
                  {event.dock}{" "}
                </span>{" "}
              </div>{" "}
              <p className="mt-3 text-sm text-muted-foreground">
                {" "}
                {event.summary}{" "}
              </p>{" "}
            </div>{" "}
          </li>
        ))}{" "}
      </ol>{" "}
    </div>
  );
}
