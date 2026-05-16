/**
 * Lock-in status indicator (24h before day).
 */

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock } from "lucide-react";

export interface LockInStatusProps {
  date: string;
  outletId?: string;
  locked: boolean;
  lockedAt?: string;
}

export function LockInStatus({
  date,
  outletId,
  locked,
  lockedAt,
}: LockInStatusProps) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between py-3">
        <div className="flex items-center gap-2">
          {locked ? (
            <Lock className="h-4 w-4" />
          ) : (
            <Unlock className="h-4 w-4" />
          )}
          <span>{date}</span>
          {outletId && (
            <span className="text-muted-foreground text-sm">
              {outletId.slice(0, 8)}…
            </span>
          )}
        </div>
        <Badge variant={locked ? "default" : "secondary"}>
          {locked ? "Locked" : "Editable"}
        </Badge>
        {locked && lockedAt && (
          <span className="text-xs text-muted-foreground">
            {new Date(lockedAt).toLocaleString()}
          </span>
        )}
      </CardContent>
    </Card>
  );
}
