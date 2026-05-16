/********************************************************************
 * LUCCCA — BUILD 47
 * Weekly EC Digest Generator
 *
 * PURPOSE:
 *  - Once a week, produce EC-ready overview
 *  - Event volume & revenue, Risk trends, Top 5 events by risk
 *  - Largest SLA breaches, Labor over/under run, Recommendations
 *********************************************************************/

export type WeeklyDigestInput = {
  weekLabel: string;
  events: any[];
  conflicts: any[];
  dailyRisk?: number[];
  dailyRevenue?: number[];
};

export type WeeklyDigestOutput = {
  markdown: string;
  summary: {
    eventCount: number;
    totalRevenue: number;
    riskTrend: "up" | "down" | "stable";
    topRiskEvents: any[];
    openConflicts: number;
  };
};

function computeTrendline(values: number[]): {
  direction: "up" | "down" | "stable";
  slope: number;
} {
  if (values.length < 2) {
    return { direction: "stable", slope: 0 };
  }

  let sum = 0;
  let sumX = 0;
  let sumXX = 0;
  let sumXY = 0;

  for (let i = 0; i < values.length; i++) {
    sumX += i;
    sumXX += i * i;
    sumXY += i * values[i];
    sum += values[i];
  }

  const n = values.length;
  const slope = (n * sumXY - sumX * sum) / (n * sumXX - sumX * sumX);
  const direction = slope > 0.1 ? "up" : slope < -0.1 ? "down" : "stable";

  return { direction, slope };
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

export function generateWeeklyECDigest(
  input: WeeklyDigestInput
): WeeklyDigestOutput {
  const events = input.events || [];
  const conflicts = input.conflicts || [];
  const dailyRisk = input.dailyRisk || [];
  const dailyRevenue = input.dailyRevenue || [];

  const riskTrend = computeTrendline(dailyRisk);
  const revenueTrend = computeTrendline(dailyRevenue);

  const topRiskEvents = [...events]
    .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
    .slice(0, 5);

  const unresolvedConflicts = conflicts.filter((c) => c.status === "pending");

  const lines: string[] = [];

  // Header
  lines.push(`# Weekly EC Digest — ${input.weekLabel}`);
  lines.push("");
  lines.push(`**Generated:** ${new Date().toLocaleString()}`);
  lines.push("");

  // Key metrics
  lines.push("## 📊 This Week's Snapshot");
  lines.push("");
  lines.push(`- **Events:** ${events.length}`);
  lines.push(`- **Total Estimated Revenue:** $${sum(dailyRevenue).toLocaleString()}`);
  lines.push(`- **Average Daily Risk:** ${(sum(dailyRisk) / dailyRisk.length).toFixed(1)}`);
  lines.push(`- **Open Conflicts:** ${unresolvedConflicts.length}`);
  lines.push("");

  // Trends
  lines.push("## 📈 Trends");
  lines.push("");
  lines.push(
    `- **Risk Trend:** ${riskTrend.direction.toUpperCase()} (slope ${riskTrend.slope.toFixed(2)})`
  );
  lines.push(
    `- **Revenue Trend:** ${revenueTrend.direction.toUpperCase()} (slope ${revenueTrend.slope.toFixed(2)})`
  );
  lines.push("");

  // Top 5 high-risk events
  lines.push("## 🔴 Top 5 High-Risk Events");
  if (topRiskEvents.length === 0) {
    lines.push("- None detected ✓");
  } else {
    topRiskEvents.forEach((e, idx) => {
      const date = e.date || new Date(e.startTime).toLocaleDateString();
      lines.push(
        `${idx + 1}. **${e.title}** — Risk **${e.riskScore || "N/A"}** on ${date} in ${e.space || e.location || "TBD"}`
      );
      if (e.department)
        lines.push(`   - Department: ${e.department}`);
      if (e.headcount) lines.push(`   - Headcount: ${e.headcount}`);
    });
  }
  lines.push("");

  // Open conflicts
  lines.push("## ⚠️ Open Conflicts");
  if (unresolvedConflicts.length === 0) {
    lines.push("- None 🎉");
  } else {
    unresolvedConflicts.forEach((c) => {
      const severity = c.severity ? `[${c.severity.toUpperCase()}]` : "";
      const date = c.date || new Date(c.timestamp).toLocaleDateString();
      lines.push(
        `- **${c.space || "Space TBD"}** on ${date}: ${c.description} ${severity}`
      );
    });
  }
  lines.push("");

  // Recommendations
  lines.push("## 💡 Recommended Focus");
  lines.push("");

  if (riskTrend.direction === "up") {
    lines.push(
      "- **Risk is trending UP.** Review staffing levels and SLA compliance for next week."
    );
  } else if (riskTrend.direction === "down") {
    lines.push(
      "- **Risk is trending DOWN.** Current interventions working—maintain controls."
    );
  } else {
    lines.push("- **Risk is STABLE.** Maintain current operational posture.");
  }

  if (topRiskEvents.length > 0) {
    lines.push(
      "- Schedule detailed review of top 5 high-risk events with:"
    );
    const departments = new Set(
      topRiskEvents.map((e) => e.department).filter(Boolean)
    );
    if (departments.size > 0) {
      lines.push(`  - ${Array.from(departments).join(", ")}`);
    }
  }

  if (unresolvedConflicts.length > 0) {
    lines.push(`- **${unresolvedConflicts.length} conflict(s) await decision.**`);
    lines.push("  - Escalate to EC for approval/denial.");
  }

  lines.push("");
  lines.push("---");
  lines.push("*Generated by LUCCCA · Maestro BQT · EchoAi³*");

  return {
    markdown: lines.join("\n"),
    summary: {
      eventCount: events.length,
      totalRevenue: sum(dailyRevenue),
      riskTrend: riskTrend.direction,
      topRiskEvents,
      openConflicts: unresolvedConflicts.length,
    },
  };
}
