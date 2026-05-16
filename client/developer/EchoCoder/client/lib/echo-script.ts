import { parse as parseYaml } from "yaml";
import { z } from "zod";

const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

type LayoutKind = "container" | "full" | "none";

type NormalizedNode = {
  element: string;
  props: Record<string, any>;
  children: NormalizedChild[];
};

type ExpressionChild = { kind: "expression"; value: string };

type NormalizedChild = string | ExpressionChild | NormalizedNode;

type NormalizationContext = {
  warnings: string[];
};

type ImportEntry = {
  defaultName?: string;
  named: Map<string, string | null>;
};

const importSchema = z.object({
  from: z.string(),
  names: z.array(z.string()).optional(),
  default: z.string().optional(),
});

const rawNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    component: z.string().optional(),
    tag: z.string().optional(),
    type: z.string().optional(),
    props: z.record(z.any()).optional(),
    text: z.string().optional(),
    content: z.union([z.string(), z.array(z.string())]).optional(),
    children: z.array(z.union([rawNodeSchema, z.string()])).optional(),
    jsx: z.string().optional(),
  }),
);

const scriptSchema = z.object({
  page: z
    .object({
      component: z.string().default("GeneratedPage"),
      route: z.string().optional(),
      dest: z.string().optional(),
      layout: z.enum(["container", "full", "none"]).optional(),
      project: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
    })
    .default({ component: "GeneratedPage" }),
  imports: z.array(importSchema).optional().default([]),
  sections: z.array(rawNodeSchema).optional().default([]),
  body: z.array(rawNodeSchema).optional().default([]),
  data: z.record(z.any()).optional().default({}),
});

type RawNode = z.infer<typeof rawNodeSchema>;
type RawImport = z.infer<typeof importSchema>;
type ScriptDefinition = z.infer<typeof scriptSchema>;

const TYPE_CLASSNAMES: Record<string, string> = {
  section:
    "rounded-3xl border border-border/60 bg-background/80 px-6 py-8 shadow-sm space-y-6",
  grid: "grid gap-6",
  stack: "flex flex-col gap-4",
  surface: "rounded-xl border border-border/60 bg-background/90 p-6 space-y-4",
};

const AUTO_COMPONENT_IMPORTS: Record<
  string,
  { from: string; import: "named" | "default"; name?: string; alias?: string }
> = {
  Button: { from: "@/components/ui/button", import: "named" },
  Badge: { from: "@/components/ui/badge", import: "named" },
  Card: { from: "@/components/ui/card", import: "named" },
  CardHeader: { from: "@/components/ui/card", import: "named" },
  CardTitle: { from: "@/components/ui/card", import: "named" },
  CardDescription: { from: "@/components/ui/card", import: "named" },
  CardContent: { from: "@/components/ui/card", import: "named" },
  CardFooter: { from: "@/components/ui/card", import: "named" },
  Separator: { from: "@/components/ui/separator", import: "named" },
  Tabs: { from: "@/components/ui/tabs", import: "named" },
  TabsList: { from: "@/components/ui/tabs", import: "named" },
  TabsTrigger: { from: "@/components/ui/tabs", import: "named" },
  TabsContent: { from: "@/components/ui/tabs", import: "named" },
  ScrollArea: { from: "@/components/ui/scroll-area", import: "named" },
  ScrollBar: { from: "@/components/ui/scroll-area", import: "named" },
  Alert: { from: "@/components/ui/alert", import: "named" },
  AlertTitle: { from: "@/components/ui/alert", import: "named" },
  AlertDescription: { from: "@/components/ui/alert", import: "named" },
  Table: { from: "@/components/ui/table", import: "named" },
  TableBody: { from: "@/components/ui/table", import: "named" },
  TableCell: { from: "@/components/ui/table", import: "named" },
  TableHead: { from: "@/components/ui/table", import: "named" },
  TableRow: { from: "@/components/ui/table", import: "named" },
  Form: { from: "@/components/ui/form", import: "named" },
  FormField: { from: "@/components/ui/form", import: "named" },
  FormItem: { from: "@/components/ui/form", import: "named" },
  Input: { from: "@/components/ui/input", import: "named" },
  Textarea: { from: "@/components/ui/textarea", import: "named" },
  Switch: { from: "@/components/ui/switch", import: "named" },
  Checkbox: { from: "@/components/ui/checkbox", import: "named" },
  RadioGroup: { from: "@/components/ui/radio-group", import: "named" },
  RadioGroupItem: { from: "@/components/ui/radio-group", import: "named" },
  Link: { from: "react-router-dom", import: "named" },
};

export type ScriptBuildOutput = {
  componentName: string;
  destPath: string;
  projectName: string;
  route?: string;
  code: string;
  imports: string[];
  summary: { sections: number; nodes: number; warnings: string[] };
  meta: { layout: LayoutKind; title?: string; description?: string };
  generatedAt: string;
  sourceFingerprint: string;
};

export function compileEchoScript(source: string): ScriptBuildOutput {
  const rawAst = safeParse(source);
  let definition: ScriptDefinition;
  try {
    definition = scriptSchema.parse(rawAst ?? {});
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues
        .map((issue) => `${issue.path.join(".") || "script"}: ${issue.message}`)
        .join("; ");
      throw new Error(`Script validation failed: ${message}`);
    }
    throw error;
  }

  const nodesSource = definition.sections.length
    ? definition.sections
    : definition.body;

  const context: NormalizationContext = { warnings: [] };
  const normalizedNodes = nodesSource.map((node: RawNode) =>
    normalizeNode(node, context),
  );

  const layout: LayoutKind = definition.page.layout ?? "container";
  const indent = layout === "container" ? 8 : layout === "full" ? 6 : 4;
  const componentUsage = new Set<string>();
  const { lines: bodyLines, count: nodeCount } = renderNodes(
    normalizedNodes,
    indent,
    componentUsage,
  );

  const fingerprint = fingerprintScript(source);
  const componentName = pascalCase(definition.page.component);
  const destPath = resolveDestPath(definition.page, componentName);
  const projectName = definition.page.project?.trim() || componentName;

  const importStatements = buildImportStatements(
    definition.imports,
    componentUsage,
    context.warnings,
  );

  const lines: string[] = [
    "// Generated via Echo script pipeline",
    "// Update the planner script to regenerate this file.",
    "",
  ];

  if (importStatements.length) {
    lines.push(...importStatements, "");
  }

  if (definition.data && Object.keys(definition.data).length > 0) {
    const dataJson = JSON.stringify(definition.data, null, 2);
    lines.push(`const data = ${dataJson} as const;`, "");
  }

  const returnLines = buildReturnLines(bodyLines, layout);

  lines.push(`export default function ${componentName}() {`);
  lines.push(...returnLines);
  lines.push("}", "");

  if (definition.page.title || definition.page.description) {
    const meta = {
      title: definition.page.title,
      description: definition.page.description,
    };
    lines.push(`export const pageMeta = ${JSON.stringify(meta, null, 2)} as const;`, "");
  }

  if (definition.page.route) {
    lines.push(
      `export const route = { path: "${definition.page.route}" } as const;`,
      "",
    );
  }

  const code = lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";

  const uniqueWarnings = Array.from(new Set(context.warnings));

  return {
    componentName,
    destPath,
    projectName,
    route: definition.page.route,
    code,
    imports: importStatements,
    summary: {
      sections: normalizedNodes.length,
      nodes: nodeCount,
      warnings: uniqueWarnings,
    },
    meta: {
      layout,
      title: definition.page.title,
      description: definition.page.description,
    },
    generatedAt: new Date().toISOString(),
    sourceFingerprint: fingerprint,
  };
}

export function fingerprintScript(source: string): string {
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0; // eslint-disable-line no-bitwise
  }
  return hash.toString(16);
}

export const DEFAULT_ECHO_SCRIPT = `# Echo script example for hospitality suite planning
page:
  component: "HospitalityPlanner"
  route: "/studio/hospitality-overview"
  layout: "container"
  project: "HospitalitySuite"
  title: "Hospitality Suite Orchestration"
  description: "Operational view generated from Echo script pipeline."
imports:
  - from: "@/components/ui/button"
    names:
      - Button
  - from: "@/components/ui/card"
    names:
      - Card
      - CardHeader
      - CardTitle
      - CardDescription
      - CardContent
  - from: "@/components/ui/badge"
    names:
      - Badge
sections:
  - type: "section"
    props:
      className: "space-y-8"
    children:
      - component: "div"
        props:
          className: "flex flex-wrap items-center justify-between gap-4"
        children:
          - component: "div"
            props:
              className: "space-y-1"
            children:
              - component: "p"
                props:
                  className: "text-xs uppercase tracking-wider text-muted-foreground"
                text: "Operational Planner"
              - component: "h1"
                props:
                  className: "text-3xl font-semibold tracking-tight"
                text: "Hospitality suite orchestration"
              - component: "p"
                props:
                  className: "text-sm text-muted-foreground"
                text: "Consolidate scheduling, budgeting, and guest experience into one LUCCCA view."
          - component: "div"
            props:
              className: "flex items-center gap-2"
            children:
              - component: "Button"
                props:
                  size: "sm"
                text: "Open Planner"
              - component: "Button"
                props:
                  variant: "outline"
                  size: "sm"
                text: "Trigger Builder"
      - component: "div"
        props:
          className: "grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        children:
          - component: "Card"
            children:
              - component: "CardHeader"
                children:
                  - component: "CardTitle"
                    props:
                      className: "text-sm font-medium"
                    text: "Active modules"
                  - component: "CardDescription"
                    text: "Modules in deployment across hospitality initiatives."
              - component: "CardContent"
                children:
                  - component: "div"
                    props:
                      className: "flex items-baseline gap-2"
                    children:
                      - component: "p"
                        props:
                          className: "text-3xl font-semibold"
                        text: "8"
                      - component: "Badge"
                        props:
                          variant: "outline"
                          className: "text-xs"
                        text: "3 pending review"
          - component: "Card"
            children:
              - component: "CardHeader"
                children:
                  - component: "CardTitle"
                    props:
                      className: "text-sm font-medium"
                    text: "Guest experience score"
                  - component: "CardDescription"
                    text: "Composite signal across last 14 days."
              - component: "CardContent"
                children:
                  - component: "p"
                    props:
                      className: "text-3xl font-semibold"
                    text: "94"
                  - component: "p"
                    props:
                      className: "text-xs text-muted-foreground"
                    text: "Goal ≥ 88"
          - component: "Card"
            children:
              - component: "CardHeader"
                children:
                  - component: "CardTitle"
                    props:
                      className: "text-sm font-medium"
                    text: "Budget delta"
                  - component: "CardDescription"
                    text: "Variance vs approved plan for the week."
              - component: "CardContent"
                children:
                  - component: "p"
                    props:
                      className: "text-3xl font-semibold"
                    text: "$42K"
                  - component: "p"
                    props:
                      className: "text-xs text-emerald-500"
                    text: "Under forecast"
          - component: "Card"
            children:
              - component: "CardHeader"
                children:
                  - component: "CardTitle"
                    props:
                      className: "text-sm font-medium"
                    text: "Compliance checks"
                  - component: "CardDescription"
                    text: "Security, a11y, and telemetry guardrails."
              - component: "CardContent"
                children:
                  - component: "p"
                    props:
                      className: "text-3xl font-semibold"
                    text: "12/12"
                  - component: "p"
                    props:
                      className: "text-xs text-muted-foreground"
                    text: "No outstanding actions"
`;

function safeParse(source: string): unknown {
  try {
    if (!source || !source.trim()) return {};
    return parseYaml(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Script parse failed: ${message}`);
  }
}

function normalizeNode(node: RawNode, context: NormalizationContext): NormalizedNode {
  const presetClass = node.type ? TYPE_CLASSNAMES[node.type] : undefined;
  const element = determineElement(node);
  const props: Record<string, any> = {
    ...(presetClass ? { className: presetClass } : {}),
    ...(node.props ?? {}),
  };

  if (Array.isArray(props.className)) {
    props.className = props.className.filter(Boolean).join(" ");
  }

  props.className = mergeClassNames(
    typeof presetClass === "string" ? presetClass : undefined,
    typeof props.className === "string" ? props.className : undefined,
  );

  Object.keys(props).forEach((key) => {
    if (props[key] === undefined) {
      delete props[key];
    }
  });

  const children: NormalizedChild[] = [];

  if (node.text && !node.children?.length) {
    children.push(convertStringChild(node.text));
  }

  if (node.content) {
    const items = Array.isArray(node.content) ? node.content : [node.content];
    items.forEach((value) => {
      children.push(convertStringChild(value));
    });
  }

  if (node.children) {
    node.children.forEach((child) => {
      if (typeof child === "string") {
        children.push(convertStringChild(child));
      } else {
        children.push(normalizeNode(child, context));
      }
    });
  }

  if (node.jsx) {
    children.push({ kind: "expression", value: node.jsx });
  }

  return { element, props, children };
}

function renderNodes(
  nodes: NormalizedNode[],
  indent: number,
  componentUsage: Set<string>,
): { lines: string[]; count: number } {
  const lines: string[] = [];
  let total = 0;
  nodes.forEach((node) => {
    const rendered = renderNode(node, indent, componentUsage);
    lines.push(...rendered.lines);
    total += rendered.count;
  });
  return { lines, count: total };
}

function renderNode(
  node: NormalizedNode,
  indent: number,
  componentUsage: Set<string>,
): { lines: string[]; count: number } {
  const lines: string[] = [];
  const element = node.element;
  const indentStr = " ".repeat(indent);
  const childIndent = indent + 2;
  const childIndentStr = " ".repeat(childIndent);
  const isComponent = isComponentName(element);
  if (isComponent && element !== "Fragment") {
    componentUsage.add(element);
  }

  const propsEntries = formatProps(node.props, childIndentStr);
  const propsString = propsEntries.length ? ` ${propsEntries.join(" ")}` : "";

  if (!node.children.length && (isVoidElement(element) || element === "Fragment")) {
    if (element === "Fragment") {
      lines.push(`${indentStr}<>`);
      lines.push(`${indentStr}</>`);
      return { lines, count: 1 };
    }
    lines.push(`${indentStr}<${element}${propsString} />`);
    return { lines, count: 1 };
  }

  if (!node.children.length) {
    lines.push(`${indentStr}<${element}${propsString} />`);
    return { lines, count: 1 };
  }

  if (element === "Fragment") {
    lines.push(`${indentStr}<>`);
  } else {
    lines.push(`${indentStr}<${element}${propsString}>`);
  }

  let childCount = 0;
  node.children.forEach((child) => {
    if (typeof child === "string") {
      lines.push(`${childIndentStr}{${JSON.stringify(child)}}`);
    } else if (isExpressionChild(child)) {
      lines.push(`${childIndentStr}{${child.value}}`);
    } else {
      const renderedChild = renderNode(child, childIndent, componentUsage);
      lines.push(...renderedChild.lines);
      childCount += renderedChild.count;
    }
  });

  if (element === "Fragment") {
    lines.push(`${indentStr}</>`);
  } else {
    lines.push(`${indentStr}</${element}>`);
  }

  return { lines, count: 1 + childCount };
}

function buildReturnLines(bodyLines: string[], layout: LayoutKind): string[] {
  if (!bodyLines.length) {
    return ["  return null;"];
  }

  const lines: string[] = ["  return ("];
  if (layout === "none") {
    lines.push("    <>");
    lines.push(...bodyLines);
    lines.push("    <>".replace("<>", "</>"));
    lines.push("  );");
    return lines;
  }

  if (layout === "full") {
    lines.push("    <main className=\"min-h-screen bg-background py-12\">");
    lines.push(...bodyLines);
    lines.push("    </main>");
    lines.push("  );");
    return lines;
  }

  lines.push("    <main className=\"min-h-screen bg-background\">");
  lines.push("      <div className=\"container py-12 space-y-10\">");
  lines.push(...bodyLines);
  lines.push("      </div>");
  lines.push("    </main>");
  lines.push("  );");
  return lines;
}

function buildImportStatements(
  userImports: RawImport[],
  componentUsage: Set<string>,
  warnings: string[],
): string[] {
  const map = new Map<string, ImportEntry>();

  userImports.forEach((entry) => {
    if (entry.default) {
      addDefaultImport(map, entry.from, entry.default);
    }
    entry.names?.forEach((rawName) => {
      const { name, alias } = parseImportName(rawName);
      addNamedImport(map, entry.from, name, alias);
    });
  });

  componentUsage.forEach((component) => {
    const mapping = AUTO_COMPONENT_IMPORTS[component];
    if (!mapping) {
      warnings.push(`Provide import for component \"${component}\"`);
      return;
    }
    if (mapping.import === "named") {
      addNamedImport(map, mapping.from, mapping.name ?? component, mapping.alias);
    } else {
      addDefaultImport(map, mapping.from, mapping.name ?? component);
    }
  });

  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([from, entry]) => {
      const fragments: string[] = [];
      if (entry.defaultName) {
        fragments.push(entry.defaultName);
      }
      if (entry.named.size) {
        const named = Array.from(entry.named.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([name, alias]) => (alias ? `${name} as ${alias}` : name))
          .join(", ");
        fragments.push(`{ ${named} }`);
      }
      return `import ${fragments.join(", ")} from "${from}";`;
    });
}

function addNamedImport(
  map: Map<string, ImportEntry>,
  from: string,
  name: string,
  alias: string | null,
) {
  const entry = map.get(from) ?? { named: new Map<string, string | null>() };
  if (!entry.named.has(name)) {
    entry.named.set(name, alias);
  }
  map.set(from, entry);
}

function addDefaultImport(map: Map<string, ImportEntry>, from: string, name: string) {
  const entry = map.get(from) ?? { named: new Map<string, string | null>() };
  if (!entry.defaultName) {
    entry.defaultName = name;
  }
  map.set(from, entry);
}

function parseImportName(raw: string): { name: string; alias: string | null } {
  const parts = raw.split(/\s+as\s+/i).map((part) => part.trim());
  if (parts.length === 2) {
    return { name: parts[0], alias: parts[1] };
  }
  return { name: raw.trim(), alias: null };
}

function determineElement(node: RawNode): string {
  if (node.component) return node.component;
  if (node.tag) return node.tag;
  if (node.type) {
    if (node.type === "section") return "section";
    if (node.type === "grid" || node.type === "stack" || node.type === "surface") return "div";
  }
  return "div";
}

function mergeClassNames(...values: (string | undefined)[]): string | undefined {
  const merged = values
    .flatMap((value) => (value ? value.split(/\s+/) : []))
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");
  return merged || undefined;
}

function formatProps(props: Record<string, any>, indent: string): string[] {
  return Object.entries(props).flatMap(([key, value]) => {
    if (value === undefined || value === null) return [];
    if (typeof value === "boolean") {
      return value ? [key] : [`${key}={false}`];
    }
    if (typeof value === "string") {
      if (value.startsWith("expr:")) {
        return [`${key}={${value.slice(5)}}`];
      }
      return [`${key}=${JSON.stringify(value)}`];
    }
    if (typeof value === "number") {
      return [`${key}={${value}}`];
    }
    const json = JSON.stringify(value);
    if (!json.includes("\n")) {
      return [`${key}={${json}}`];
    }
    const formatted = JSON.stringify(value, null, 2)
      .split("\n")
      .map((line, idx) => `${idx === 0 ? "" : indent}${line}`)
      .join("\n");
    return [`${key}={\n${formatted}\n${indent.slice(2)}}`];
  });
}

function isVoidElement(element: string): boolean {
  return VOID_ELEMENTS.has(element.toLowerCase());
}

function isComponentName(element: string): boolean {
  if (!element) return false;
  if (element === "Fragment") return false;
  const first = element.charAt(0);
  return first.toUpperCase() === first && first.toLowerCase() !== first;
}

function isExpressionChild(child: NormalizedChild): child is ExpressionChild {
  return typeof child === "object" && child !== null && (child as ExpressionChild).kind === "expression";
}

function convertStringChild(value: string): NormalizedChild {
  if (value.startsWith("expr:")) {
    return { kind: "expression", value: value.slice(5) };
  }
  return value;
}

function pascalCase(input: string): string {
  const words = input
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  return words.join("") || "GeneratedPage";
}

function resolveDestPath(page: ScriptDefinition["page"], componentName: string): string {
  if (page.dest) {
    const trimmed = page.dest.trim().replace(/^\/+/, "");
    const withExt = /\.tsx?$/.test(trimmed) ? trimmed : `${trimmed}.tsx`;
    if (withExt.startsWith("client/")) return sanitizePath(withExt);
    if (withExt.startsWith("pages/")) return sanitizePath(`client/${withExt}`);
    return sanitizePath(`client/pages/${withExt}`);
  }
  if (page.route) {
    const segments = page.route
      .split("/")
      .filter(Boolean)
      .map(pascalCase);
    const name = segments.length ? segments.join("") : componentName;
    return `client/pages/${name}.tsx`;
  }
  return `client/pages/${componentName}.tsx`;
}

function sanitizePath(path: string): string {
  const clean = path
    .replace(/\\/g, "/")
    .split("/")
    .filter((segment) => segment !== ".." && segment !== "." && segment !== "")
    .join("/");
  return clean;
}
