// Shared context entrypoint used by multiple modules via `@/context/*`.
// Keep this implementation auth-agnostic so modules can mount independently.

export * from "../modules/Culinary/client/context/AppDataContext";
