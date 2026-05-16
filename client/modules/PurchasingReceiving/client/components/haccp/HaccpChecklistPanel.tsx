import React, { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Store, HACCP_TASK_EVENT_NAME } from "@/lib/store";
import type { HACCPChecklistTask } from "@shared/haccp";
interface HaccpChecklistPanelProps {
  tasks: HACCPChecklistTask[];
}
const FREQUENCY_LABEL: Record<HACCPChecklistTask["frequency"], string> = {
  per_delivery: "Per Delivery",
  daily: "Daily",
  weekly: "Weekly",
};
export function HaccpChecklistPanel({ tasks }: HaccpChecklistPanelProps) {
  const [refreshToken, setRefreshToken] = useState(0);
  useEffect(() => {
    const handler = () => setRefreshToken((value) => value + 1);
    window.addEventListener(HACCP_TASK_EVENT_NAME, handler);
    return () => window.removeEventListener(HACCP_TASK_EVENT_NAME, handler);
  }, []);
  const grouped = useMemo(() => {
    return tasks.reduce<Record<string, HACCPChecklistTask[]>>((acc, task) => {
      const key = task.category;
      acc[key] = acc[key] ? [...acc[key], task] : [task];
      return acc;
    }, {});
  }, [tasks]);
  const handleToggle = (task: HACCPChecklistTask, checked: boolean) => {
    if (task.frequency === "per_delivery") {
      if (checked) {
        Store.recordHaccpDelivery(task.id);
      } else {
        Store.resetHaccpTask(task.id);
      }
    } else {
      Store.setHaccpTaskCompleted(task.id, task.frequency, checked);
    }
  };
  const handleLogDelivery = (taskId: string) => {
    Store.recordHaccpDelivery(taskId);
  };
  const handleReset = (taskId: string) => {
    Store.resetHaccpTask(taskId);
  };
  return (
    <Card className="border-2">
      {" "}
      <CardHeader>
        {" "}
        <CardTitle>Receiving Checklists</CardTitle>{" "}
        <CardDescription>
          Operational controls mapped to HACCP critical control points and
          verification steps.
        </CardDescription>{" "}
      </CardHeader>{" "}
      <CardContent>
        {" "}
        <Accordion type="multiple" className="w-full space-y-2">
          {" "}
          {Object.entries(grouped).map(([category, items]) => (
            <AccordionItem
              key={category}
              value={category}
              className="rounded-lg border px-4"
            >
              {" "}
              <AccordionTrigger className="text-left text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {" "}
                {category}{" "}
              </AccordionTrigger>{" "}
              <AccordionContent className="space-y-4 pb-4">
                {" "}
                {items.map((task) => {
                  const status = Store.getHaccpTaskStatus(
                    task.id,
                    task.frequency,
                  );
                  const completed =
                    task.frequency === "per_delivery"
                      ? (status?.count ?? 0) > 0
                      : Boolean(status);
                  return (
                    <div key={task.id} className="rounded-lg border p-4">
                      {" "}
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        {" "}
                        <div>
                          {" "}
                          <div className="flex flex-wrap items-center gap-2">
                            {" "}
                            <span className="text-sm font-semibold">
                              {task.title}
                            </span>{" "}
                            <Badge variant="secondary">
                              {FREQUENCY_LABEL[task.frequency]}
                            </Badge>{" "}
                            {task.criticalControlPoint && (
                              <Badge variant="destructive">CCP</Badge>
                            )}{" "}
                          </div>{" "}
                          <p className="mt-1 text-sm text-muted-foreground">
                            {task.description}
                          </p>{" "}
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                            {" "}
                            {task.criticalLimit && (
                              <span>
                                Critical limit:{" "}
                                <strong>{task.criticalLimit}</strong>
                              </span>
                            )}{" "}
                            {task.verification && (
                              <span>Verification: {task.verification}</span>
                            )}{" "}
                            {task.documentation && (
                              <span>Documentation: {task.documentation}</span>
                            )}{" "}
                            <span>Roles: {task.roles.join(",")}</span>{" "}
                          </div>{" "}
                        </div>{" "}
                        {task.frequency === "per_delivery" ? (
                          <div className="flex flex-col items-end gap-2 text-sm">
                            {" "}
                            <span className="text-xs text-muted-foreground">
                              Checks logged today
                            </span>{" "}
                            <span className="text-xl font-semibold">
                              {status?.count ?? 0}
                            </span>{" "}
                            <div className="flex gap-2">
                              {" "}
                              <Button
                                size="sm"
                                onClick={() => handleLogDelivery(task.id)}
                              >
                                {" "}
                                Log delivery check{" "}
                              </Button>{" "}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReset(task.id)}
                              >
                                {" "}
                                Reset{" "}
                              </Button>{" "}
                            </div>{" "}
                          </div>
                        ) : (
                          <label className="flex items-center gap-2 text-sm">
                            {" "}
                            <Checkbox
                              checked={completed}
                              onCheckedChange={(checked) =>
                                handleToggle(task, checked === true)
                              }
                            />{" "}
                            <span>
                              {completed ? "Completed" : "Mark complete"}
                            </span>{" "}
                          </label>
                        )}{" "}
                      </div>{" "}
                    </div>
                  );
                })}{" "}
              </AccordionContent>{" "}
            </AccordionItem>
          ))}{" "}
        </Accordion>{" "}
      </CardContent>{" "}
    </Card>
  );
}
