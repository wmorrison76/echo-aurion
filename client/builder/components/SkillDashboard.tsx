import React from "react";
import type { UserSkillState, SkillNode } from "@shared/echo/help/types";

interface SkillDashboardProps {
  skills: UserSkillState[];
  skillDefs: SkillNode[];
}

const SkillDashboard: React.FC<SkillDashboardProps> = ({
  skills,
  skillDefs,
}) => {
  const skillDefMap = new Map(skillDefs.map((s) => [s.id, s]));

  const grouped = skills.reduce<Record<string, UserSkillState[]>>((acc, s) => {
    const def = skillDefMap.get(s.skillId);
    const domain = def?.domain ?? "other";
    acc[domain] = acc[domain] || [];
    acc[domain].push(s);
    return acc;
  }, {});

  return (
    <div className="w-full bg-card border border-border rounded-2xl p-4 text-foreground">
      <h2 className="text-lg font-semibold mb-3 text-primary">
        Echo Skill Dashboard
      </h2>

      <div className="grid md:grid-cols-2 gap-4">
        {Object.entries(grouped).map(([domain, domainSkills]) => (
          <div
            key={domain}
            className="bg-card border border-border rounded-xl p-3"
          >
            <h3 className="text-sm font-semibold mb-2 uppercase tracking-wide text-muted-foreground">
              {domain}
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {domainSkills.map((s) => {
                const def = skillDefMap.get(s.skillId);
                const percent = Math.round((s.xp / (def?.maxXp ?? 100)) * 100);
                return (
                  <div key={s.skillId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">
                        {def?.name ?? s.skillId}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        L{s.level} • {percent}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 bg-primary"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-muted-foreground line-clamp-2">
                      {def?.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkillDashboard;
