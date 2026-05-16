export interface UiRecipe { id:string; title:string; category:"Panel"|"Form"|"Table"|"Chart"|"Modal"|"Toolbar"; propsSchema:any; a11yContract:string[]; codegen:{ path:string; templateId:string; slots?:string[] } }

export const MixologyPanel: UiRecipe = {
  id: "mixology.panel",
  title: "Mixology Panel",
  category: "Panel",
  propsSchema: {},
  a11yContract: ["tablist reachable by keyboard", "HCM contrast pass"],
  codegen: { path: "client/pages/Mixology.tsx", templateId: "panel.tabs.recipes.inventory.costing" },
};
