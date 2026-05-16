import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { HACCPReminder } from "@shared/haccp";
interface HaccpRemindersPanelProps {
  reminders: HACCPReminder[];
}
const frequencyTone: Record<HACCPReminder["frequency"], string> = {
  per_delivery: "bg-emerald-100 text-emerald-700",
  daily: "bg-blue-100 text-blue-700",
  weekly: "bg-purple-100 text-purple-700",
  monthly: "bg-amber-100 text-amber-700",
};
export function HaccpRemindersPanel({ reminders }: HaccpRemindersPanelProps) {
  return (
    <Card className="border-2">
      {" "}
      <CardHeader>
        {" "}
        <CardTitle>Schedules &amp; Reminders</CardTitle>{" "}
        <CardDescription>
          Auto-escalations that keep receiving compliant across shifts.
        </CardDescription>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-4">
        {" "}
        {reminders.map((reminder) => (
          <div key={reminder.id} className="rounded-lg border p-4">
            {" "}
            <div className="flex flex-wrap items-start justify-between gap-2">
              {" "}
              <div>
                {" "}
                <div className="flex items-center gap-2">
                  {" "}
                  <span className="text-sm font-semibold">
                    {reminder.title}
                  </span>{" "}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${frequencyTone[reminder.frequency]}`}
                  >
                    {" "}
                    {reminder.frequency}{" "}
                  </span>{" "}
                </div>{" "}
                <p className="mt-1 text-sm text-muted-foreground">
                  {reminder.description}
                </p>{" "}
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {" "}
                  {reminder.timeWindow && (
                    <span>Window: {reminder.timeWindow}</span>
                  )}{" "}
                  {reminder.roles.length > 0 && (
                    <span>Roles: {reminder.roles.join(",")}</span>
                  )}{" "}
                  {reminder.escalation && (
                    <span>Escalation: {reminder.escalation}</span>
                  )}{" "}
                </div>{" "}
                {reminder.relatedTaskIds?.length ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {" "}
                    Linked tasks: {reminder.relatedTaskIds.join(",")}{" "}
                  </div>
                ) : null}{" "}
              </div>{" "}
              <Badge
                variant="outline"
                className="text-xs uppercase tracking-wide"
              >
                {" "}
                Reminder{" "}
              </Badge>{" "}
            </div>{" "}
          </div>
        ))}{" "}
        {!reminders.length && (
          <p className="text-sm text-muted-foreground">
            No reminders configured yet.
          </p>
        )}{" "}
      </CardContent>{" "}
    </Card>
  );
}
