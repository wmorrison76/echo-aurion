export interface ServiceSpec { name:string; route:string; verbs:("GET"|"POST"|"PUT"|"DELETE")[] }
export interface FileChange { path:string; contents:string; mode?:"create"|"patch" }

export const nodeExpressAdapter = {
  id: "node_express",
  newService(spec: ServiceSpec): FileChange[] {
    const file = `server/routes/${spec.name}.ts`;
    const handler = `import { RequestHandler } from \"express\";\nexport const handle${capitalize(spec.name)}: RequestHandler = (req, res) => { res.json({ ok: true }); };`;
    const indexPatch = `\n// ${spec.name} route\napp.${spec.verbs?.[0]?.toLowerCase?.() === "get" ? "get" : "post"}(\"${spec.route}\", handle${capitalize(spec.name)});`;
    return [
      { path: file, contents: handler, mode: "create" },
      { path: "server/index.ts", contents: indexPatch, mode: "patch" },
    ];
  },
} as const;

function capitalize(s:string){return s.charAt(0).toUpperCase()+s.slice(1)}
