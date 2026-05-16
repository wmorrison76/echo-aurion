import { randomUUID } from "node:crypto";

export interface SarifFinding {
  ruleId: string;
  level: "error" | "warning" | "note";
  message: string;
  file?: string;
  line?: number;
}

export interface AutoPrOptions {
  title: string;
  summary: string;
  branch: string;
  reviewers?: string[];
  findings?: SarifFinding[];
  checklist?: string[];
}

export interface AutoPrPayload {
  id: string;
  createdAt: string;
  title: string;
  branch: string;
  body: string;
  reviewers: string[];
}

export function createAutoPr(options: AutoPrOptions): AutoPrPayload {
  if (!options.title.trim()) {
    throw new Error("Pull request title is required");
  }
  if (!options.summary.trim()) {
    throw new Error("Pull request summary is required");
  }

  const sections: string[] = [];
  sections.push("## Summary", options.summary.trim());

  if (options.findings?.length) {
    sections.push("## Static Analysis Findings");
    sections.push(
      options.findings
        .map((finding) =>
          `- **${finding.level.toUpperCase()}** ${finding.ruleId} – ${finding.message}${renderLocation(
            finding,
          )}`,
        )
        .join("\n"),
    );
  }

  if (options.checklist?.length) {
    sections.push("## Validation Checklist");
    sections.push(options.checklist.map((item) => `- [ ] ${item}`).join("\n"));
  }

  sections.push(
    "\n---\n",
    "_This PR was drafted by Echo AI³'s meta-PR bot. A human reviewer must approve before merge._",
  );

  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    title: options.title.trim(),
    branch: options.branch.trim(),
    body: sections.join("\n\n"),
    reviewers: options.reviewers ?? ["lead", "security"],
  };
}

function renderLocation(finding: SarifFinding) {
  if (!finding.file) return "";
  const location = finding.line ? `${finding.file}:${finding.line}` : finding.file;
  return ` _(location: ${location})_`;
}
