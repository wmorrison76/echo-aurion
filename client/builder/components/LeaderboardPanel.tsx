import React from "react";

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  totalXp: number;
  level: number;
}

interface LeaderboardPanelProps {
  entries: LeaderboardEntry[];
}

const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({ entries }) => {
  const sorted = [...entries]
    .sort((a, b) => b.totalXp - a.totalXp)
    .slice(0, 20);

  return (
    <div className="bg-card border border-border rounded-2xl p-4 text-foreground">
      <h2 className="text-lg font-semibold mb-3 text-primary">
        Echo Training Leaderboard
      </h2>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground">
            <th className="text-left">Rank</th>
            <th className="text-left">User</th>
            <th className="text-right">Level</th>
            <th className="text-right">XP</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((e, idx) => (
            <tr
              key={e.userId}
              className={
                idx === 0
                  ? "bg-primary/10"
                  : idx === 1
                    ? "bg-muted/50"
                    : "bg-card"
              }
            >
              <td className="py-1">{idx + 1}</td>
              <td className="py-1">{e.displayName}</td>
              <td className="py-1 text-right">{e.level}</td>
              <td className="py-1 text-right">{e.totalXp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LeaderboardPanel;
