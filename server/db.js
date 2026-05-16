import { getDatabaseClient } from "./lib/database-client.ts";

function normalizeParams(values) {
  if (!values) return [];
  return Array.isArray(values) ? values : [values];
}

/**
 * Legacy-compatible `db` export.
 * Provides `query(sql, params)` returning `{ rows }` like node-postgres.
 */
export const db = {
  async query(sql, values) {
    const client = getDatabaseClient();
    const rows = await client.query(sql, normalizeParams(values));
    return { rows };
  },
};
