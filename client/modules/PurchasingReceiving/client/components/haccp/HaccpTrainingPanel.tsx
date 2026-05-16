import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Store, HACCP_TRAINING_EVENT_NAME } from "@/lib/store";
import type { HACCPTrainingModule } from "@shared/haccp";
interface HaccpTrainingPanelProps {
  modules: HACCPTrainingModule[];
}
const CADENCE_LABEL: Record<HACCPTrainingModule["cadence"], string> = {
  onboarding: "Onboarding",
  monthly: "Monthly",
  quarterly: "Quarterly",
  biannual: "Biannual",
  annual: "Annual",
};
const DELIVERY_LABEL: Record<HACCPTrainingModule["delivery"], string> = {
  in_person: "In-person",
  video: "Video",
  quiz: "Quiz",
  self_paced: "Self-paced",
};
const cadenceTone: Record<HACCPTrainingModule["cadence"], string> = {
  onboarding: "bg-sky-100 text-sky-700",
  monthly: "bg-amber-100 text-amber-700",
  quarterly: "bg-emerald-100 text-emerald-700",
  biannual: "bg-purple-100 text-purple-700",
  annual: "bg-blue-100 text-blue-700",
};
export function HaccpTrainingPanel({ modules }: HaccpTrainingPanelProps) {
  const [, forceRefresh] = useState(0);
  useEffect(() => {
    const handler = () => forceRefresh((value) => value + 1);
    window.addEventListener(HACCP_TRAINING_EVENT_NAME, handler);
    return () => window.removeEventListener(HACCP_TRAINING_EVENT_NAME, handler);
  }, []);
  const handleComplete = (moduleId: string) => {
    Store.completeHaccpTraining(moduleId);
    forceRefresh((value) => value + 1);
  };
  const handleReset = (moduleId: string) => {
    Store.resetHaccpTraining(moduleId);
    forceRefresh((value) => value + 1);
  };
  return (
    <Card className="border-2">
      {" "}
      <CardHeader>
        {" "}
        <CardTitle>Team Training</CardTitle>{" "}
        <CardDescription>
          Certification pathways with proof-of-training for audits.
        </CardDescription>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-4">
        {" "}
        {modules.map((module) => {
          const status = Store.getHaccpTrainingStatus(module.id);
          const completed = Boolean(status?.completedAt);
          const completedAt = status?.completedAt
            ? new Date(status.completedAt).toLocaleDateString()
            : null;
          const expiresOn = status?.expiresOn
            ? new Date(status.expiresOn).toLocaleDateString()
            : null;
          return (
            <div key={module.id} className="rounded-lg border p-4">
              {" "}
              <div className="flex flex-wrap items-start justify-between gap-3">
                {" "}
                <div className="space-y-2">
                  {" "}
                  <div className="flex flex-wrap items-center gap-2">
                    {" "}
                    <span className="text-sm font-semibold">
                      {module.title}
                    </span>{" "}
                    <Badge className={cadenceTone[module.cadence]}>
                      {CADENCE_LABEL[module.cadence]}
                    </Badge>{" "}
                    <Badge variant="outline">
                      {DELIVERY_LABEL[module.delivery]}
                    </Badge>{" "}
                  </div>{" "}
                  <p className="text-sm text-muted-foreground">
                    {module.description}
                  </p>{" "}
                  <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    {" "}
                    <span>Duration: {module.durationMinutes} min</span>{" "}
                    <span>Roles: {module.roles.join(",")}</span>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Objectives
                    </p>{" "}
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {" "}
                      {module.objectives.map((objective, index) => (
                        <li key={index}>{objective}</li>
                      ))}{" "}
                    </ul>{" "}
                  </div>{" "}
                  {module.resources.length > 0 && (
                    <div>
                      {" "}
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Resources
                      </p>{" "}
                      <ul className="mt-1 space-y-1 text-sm">
                        {" "}
                        {module.resources.map((resource) => (
                          <li key={resource.label}>
                            {" "}
                            {resource.url ? (
                              <a
                                href={resource.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary underline"
                              >
                                {" "}
                                {resource.label}{" "}
                              </a>
                            ) : (
                              <span className="text-muted-foreground">
                                {resource.label}
                              </span>
                            )}{" "}
                          </li>
                        ))}{" "}
                      </ul>{" "}
                    </div>
                  )}{" "}
                </div>{" "}
                <div className="flex flex-col items-end gap-2 text-right text-xs text-muted-foreground">
                  {" "}
                  <Badge
                    variant={completed ? "secondary" : "outline"}
                    className="self-end text-[0.65rem] uppercase tracking-wide"
                  >
                    {" "}
                    {completed ? "Completed" : "Not Completed"}{" "}
                  </Badge>{" "}
                  {completedAt && <span>Completed: {completedAt}</span>}{" "}
                  {expiresOn && <span>Expires: {expiresOn}</span>}{" "}
                  <div className="flex gap-2">
                    {" "}
                    {completed ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReset(module.id)}
                      >
                        {" "}
                        Reset module{" "}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleComplete(module.id)}
                      >
                        {" "}
                        Mark complete{" "}
                      </Button>
                    )}{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
            </div>
          );
        })}{" "}
        {!modules.length && (
          <p className="text-sm text-muted-foreground">
            No training modules configured.
          </p>
        )}{" "}
      </CardContent>{" "}
    </Card>
  );
}
