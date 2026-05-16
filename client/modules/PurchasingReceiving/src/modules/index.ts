// Module ecosystem is accessed via shared/modules/index.ts for all public APIs
// Individual modules (PurchRec, Maestro, etc.) are imported directly by components/pages
// that need them, NOT via this barrel export. // This file is left minimal to avoid circular dependencies that cause
// React SWC compilation failures (preamble detection errors).
// See: src/modules/PurchRec/index.tsx for the main module entry point. export {};
