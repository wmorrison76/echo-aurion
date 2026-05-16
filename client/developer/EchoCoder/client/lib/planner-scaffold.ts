import type { ScriptBuildOutput as EchoScriptBuildOutput } from "@/lib/echo-script";

import type { ScriptBuildOutput } from "@/lib/echo-script";

export type PlannerScaffoldFile = {
  path: string;
  label: string;
  description: string;
  contents: string;
};

export type PlannerScaffold = {
  projectName: string;
  projectSlug: string;
  projectRoot: string;
  entryPath: string;
  files: PlannerScaffoldFile[];
};

export function makeProjectSlug(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-") || "project"
  );
}

export function buildProjectScaffold(params: {
  compiled: ScriptBuildOutput;
  projectName: string;
  projectSlug?: string;
}): PlannerScaffold {
  const { compiled } = params;
  const baseName = params.projectName.trim() || compiled.projectName;
  const slug = makeProjectSlug(params.projectSlug || baseName);
  const projectRoot = `client/projects/${slug}`;
  const entryPath = `${projectRoot}/index.tsx`;
  const route = compiled.route || `/projects/${slug}`;
  const generatedAt = new Date(compiled.generatedAt);
  const humanTimestamp = Number.isNaN(generatedAt.getTime())
    ? compiled.generatedAt
    : generatedAt.toLocaleString();

  const manifest = {
    id: slug,
    name: baseName,
    entry: entryPath,
    route,
    layout: compiled.meta.layout,
    generatedAt: compiled.generatedAt,
    sections: compiled.summary.sections,
    nodes: compiled.summary.nodes,
  };

  const readmeLines = [
    `# ${baseName}`,
    "",
    `Generated via Echo planner on ${humanTimestamp}.`,
    "",
    "## File map",
    "- `index.tsx`: Primary LUCCCA panel entry that renders the generated UI.",
    "- `manifest.json`: Metadata consumed by LUCCCA while mounting the panel bundle.",
    "- `README.md`: Integration checklist and context for the hospitality team.",
    "",
    "## Integration checklist",
    `1. Mount ${"`"}${route}${"`"} inside the router or navigation controls.`,
    "2. Connect live hospitality data sources in place of sample values.",
    "3. Confirm accessibility, localization, telemetry, and guardrails before release.",
    "",
    "## Planner summary",
    `- Sections: ${compiled.summary.sections}`,
    `- Nodes: ${compiled.summary.nodes}`,
    `- Layout mode: ${compiled.meta.layout}`,
  ];
  if (compiled.meta.title) {
    readmeLines.push(`- Title: ${compiled.meta.title}`);
  }
  if (compiled.meta.description) {
    readmeLines.push(`- Description: ${compiled.meta.description}`);
  }
  if (route) {
    readmeLines.push(`- Route: ${route}`);
  }
  readmeLines.push(
    "",
    "Luccca Planner keeps this README in sync so the team can track why each module exists.",
    "",
  );

  const files: PlannerScaffoldFile[] = [
    {
      path: entryPath,
      label: "Entry page",
      description:
        "Primary LUCCCA panel entrypoint generated from the planner script.",
      contents: compiled.code,
    },
    {
      path: `${projectRoot}/manifest.json`,
      label: "Manifest",
      description: "Deployment manifest for LUCCCA orchestration.",
      contents: JSON.stringify(manifest, null, 2) + "\n",
    },
    {
      path: `${projectRoot}/README.md`,
      label: "Integration notes",
      description: "Checklist and context for the concierge workspace rollout.",
      contents: readmeLines.join("\n"),
    },
  ];

  return {
    projectName: baseName,
    projectSlug: slug,
    projectRoot,
    entryPath,
    files,
  };
}
