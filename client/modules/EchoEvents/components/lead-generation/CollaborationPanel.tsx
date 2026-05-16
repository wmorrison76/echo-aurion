import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FaComments, FaShareAlt } from "react-icons/fa";
type CollaborationStatus = "on-track" | "at-risk" | "blocked";
type CollaborationUpdate = {
  id: string;
  title: string;
  owner: string;
  dueIn: string;
  status: CollaborationStatus;
  lastActivity: string;
  messageCount: number;
};
type CollaborationPanelProps = {
  title: string;
  description?: string;
  updates: CollaborationUpdate[];
  onOpenWorkspace?: () => void;
};
const statusStyles: Record<CollaborationStatus, string> = {
  "on-track": "bg-emerald-500/15 text-emerald-500",
  "at-risk": "bg-amber-500/15 text-amber-600",
  blocked: "bg-red-500/15 text-red-500",
};
export function CollaborationPanel({
  title,
  description,
  updates,
  onOpenWorkspace,
}: CollaborationPanelProps) {
  return (
    <Card className="glass-panel h-full">
      {" "}
      <CardHeader className="pb-2">
        {" "}
        <div className="flex items-center justify-between gap-3">
          {" "}
          <div>
            {" "}
            <CardTitle className="text-base font-semibold sm:text-lg">
              {title}
            </CardTitle>{" "}
            {description ? (
              <CardDescription className="text-xs sm:text-sm">
                {description}
              </CardDescription>
            ) : null}{" "}
          </div>{" "}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 border border-border/60"
            onClick={onOpenWorkspace}
          >
            {" "}
            <FaShareAlt className="h-3.5 w-3.5" />{" "}
            <span className="sr-only">Open collaboration workspace</span>{" "}
          </Button>{" "}
        </div>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-4">
        {" "}
        {updates.map((update) => (
          <div
            key={update.id}
            className="rounded-lg border border-border/60 bg-card/80 p-4 transition hover:border-primary/60"
          >
            {" "}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              {" "}
              <div>
                {" "}
                <div className="flex items-center gap-2">
                  {" "}
                  <h4 className="text-sm font-semibold text-foreground">
                    {update.title}
                  </h4>{" "}
                  <Badge
                    variant="outline"
                    className={cn(
                      "border-none text-[0.65rem] font-semibold uppercase tracking-wide",
                      statusStyles[update.status],
                    )}
                  >
                    {" "}
                    {update.status.replace("-", "")}{" "}
                  </Badge>{" "}
                </div>{" "}
                <p className="mt-1 text-xs text-muted-foreground">
                  {" "}
                  Owner:{" "}
                  <span className="font-medium text-foreground/80">
                    {update.owner}
                  </span>{" "}
                </p>{" "}
                <p className="text-xs text-muted-foreground">
                  {update.dueIn}
                </p>{" "}
              </div>{" "}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {" "}
                <div className="flex items-center gap-1">
                  {" "}
                  <FaComments className="h-3 w-3" />{" "}
                  <span>{update.messageCount} notes</span>{" "}
                </div>{" "}
                <span>{update.lastActivity}</span>{" "}
              </div>{" "}
            </div>{" "}
          </div>
        ))}{" "}
        <Button
          className="w-full apple-button"
          variant="outline"
          onClick={onOpenWorkspace}
        >
          {" "}
          Open SaaS Playbook Workspace{" "}
        </Button>{" "}
      </CardContent>{" "}
    </Card>
  );
}
export type { CollaborationUpdate };
