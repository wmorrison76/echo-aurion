export interface Builder {
  registerComponent: (c: any, opts: any) => void;
}
declare const Builder: Builder | undefined;

export const GlowyDeskAuditPanelMeta = {
  name: "GlowyDeskAuditPanel",
  inputs: [
    { name: "source", type: "string", defaultValue: "/vault/audit.jsonl" },
  ],
};

if (
  typeof Builder !== "undefined" &&
  Builder &&
  typeof Builder.registerComponent === "function"
) {
  Builder.registerComponent(() => null as any, GlowyDeskAuditPanelMeta);
}
