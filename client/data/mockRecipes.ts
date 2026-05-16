// Shared data entrypoint used by multiple modules via `@/data/*`.
// Re-export canonical demo recipes from the Culinary module.

export { default } from "../modules/Culinary/client/data/mockRecipes";
export * from "../modules/Culinary/client/data/mockRecipes";
