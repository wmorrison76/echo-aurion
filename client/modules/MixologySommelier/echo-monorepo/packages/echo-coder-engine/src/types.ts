export type ScoreWeights = {
  fit: number;
  complexity: number;
  deps: number;
  perf: number;
  a11y: number;
  observability: number;
  security: number;
  bundle: number;
};
export type Score = {
  total: number;
  breakdown: Partial<Record<keyof ScoreWeights, number>>;
};
export type FileChange = {
  path: string;
  contents: string;
  mode?: "create" | "patch";
};
export type PlanSpec = {
  task: string;
  route?: string;
  entitlements?: string[];
  constraints?: Record<string, unknown>;
};
export type CandidatePlan = {
  id: string;
  title: string;
  steps: string[];
  files: FileChange[];
  score: Score;
};
export type Tools = {
  fs_write(params: {
    path: string;
    contents: string;
    mode?: "create" | "patch";
  }): Promise<{ ok: boolean; diff?: string }>;
  fs_read(params: {
    path: string;
  }): Promise<{ ok: boolean; contents?: string }>;
  ast_edit(params: {
    path: string;
    transform: string;
    args?: any;
  }): Promise<{ ok: boolean; diff?: string }>;
  run_lint(params: { scope: string }): Promise<{ ok: boolean; report: any }>;
  run_tests(params: { scope: string }): Promise<{ ok: boolean; summary: any }>;
  run_a11y(params: {
    url: string;
  }): Promise<{ ok: boolean; violations: any[] }>;
  run_perf(params: {
    url: string;
    budgets: any;
  }): Promise<{ ok: boolean; scores: any }>;
  run_security(params: {
    scope: string;
  }): Promise<{ ok: boolean; findings: any[] }>;
  git_open_pr(params: {
    title: string;
    body: string;
    branch: string;
  }): Promise<{ ok: boolean; pr: number }>;
  repo_scan(params: {
    path: string;
  }): Promise<{ structure: any; deps: any; problems: any[] }>;
  simulate_folder(params: {
    path: string;
    mode: "analyze" | "repair" | "rebuild";
  }): Promise<{ report: any }>;
  retrieve(params: { query: string; k?: number }): Promise<{
    snippets: { path: string; lines: [number, number]; text: string }[];
  }>;
};
