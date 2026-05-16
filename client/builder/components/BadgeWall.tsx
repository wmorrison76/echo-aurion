import React from "react";
import type { BadgeDefinition } from "@shared/echo/help/types";

export interface BadgeWallProps {
  badgeIds: string[];
  badgeDefs: BadgeDefinition[];
}

const BadgeWall: React.FC<BadgeWallProps> = ({ badgeIds, badgeDefs }) => {
  const badgeDefMap = new Map(badgeDefs.map((b) => [b.id, b]));
  const earnedSet = new Set(badgeIds);

  return (
    <div className="bg-card border border-border rounded-2xl p-4 text-foreground">
      <h2 className="text-lg font-semibold mb-3 text-primary">Echo Badges</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {badgeDefs.map((b) => {
          const earned = earnedSet.has(b.id);
          return (
            <div
              key={b.id}
              className={`rounded-xl border p-3 text-center text-xs ${
                earned
                  ? "bg-primary/10 border-primary/50"
                  : "bg-card border-border opacity-60"
              }`}
            >
              <div className="text-sm font-semibold mb-1">{b.name}</div>
              <div className="text-[10px] text-muted-foreground">
                {b.description}
              </div>
              <div className="mt-2 text-[10px]">
                {earned ? "✓ Unlocked" : "Locked"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BadgeWall;
