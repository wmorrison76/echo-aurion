// Runtime-agnostic registration shim for Builder.io
export interface Builder {
  registerComponent: (c: any, opts: any) => void;
}
declare const Builder: Builder | undefined;

export const ShiftCellMeta = {
  name: "ShiftCell",
  inputs: [
    { name: "start", type: "string" },
    { name: "end", type: "string" },
    { name: "first", type: "string" },
    { name: "lastInitial", type: "string" },
    {
      name: "positions",
      type: "list",
      subFields: [{ name: "item", type: "string" }],
    },
    {
      name: "badges",
      type: "list",
      subFields: [{ name: "item", type: "string" }],
    },
  ],
};

if (
  typeof Builder !== "undefined" &&
  Builder &&
  typeof Builder.registerComponent === "function"
) {
  Builder.registerComponent(() => null as any, ShiftCellMeta);
}
