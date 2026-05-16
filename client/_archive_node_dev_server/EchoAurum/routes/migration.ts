import type { RequestHandler } from "express";
import {
  buildMigrationToolkit,
  type MigrationToolkitInput,
} from "../../shared/migration";
function coerceExports(value: unknown): MigrationToolkitInput["exports"] {
  return Array.isArray(value)
    ? (value as MigrationToolkitInput["exports"])
    : [];
}
export const handleMigrationToolkit: RequestHandler = (req, res) => {
  const { exports } = req.body ?? {};
  const payload: MigrationToolkitInput = { exports: coerceExports(exports) };
  try {
    const toolkit = buildMigrationToolkit(payload);
    res.json({ toolkit });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to build migration toolkit.";
    res.status(500).json({ error: message });
  }
};
