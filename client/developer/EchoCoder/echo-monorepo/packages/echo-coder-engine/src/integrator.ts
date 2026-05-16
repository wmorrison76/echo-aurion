import type { FileChange, PlanSpec } from "./types";

export function integrateRoute(spec: PlanSpec): FileChange[] {
  const path = `client/pages/${(spec.route ?? "/").replace(/\W+/g, "_")}.tsx`;
  const contents = `export default function Generated() { return (<div className=\"container py-10\">Generated for ${spec.task}</div>); }`;
  return [{ path, contents, mode: "create" }];
}

export function integrateRegistry(): FileChange[] {
  return [
    { path: "client/App.tsx", contents: "// Route registration applied by engine\n", mode: "patch" },
  ];
}
