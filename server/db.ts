import { getDatabaseClient } from "./lib/database-client";

export interface QueryResult<T = any> {
  rows: T[];
}

function normalizeParams(values?: any[]): any[] {
  if (!values) return [];
  return Array.isArray(values) ? values : [values];
}

/**
 * Compatibility wrapper for legacy services that expect `db.query()` returning `{ rows }`.
 * Backed by the DatabaseClient which uses Supabase `execute_sql` RPC when configured.
 */
export const db = {
  async query<T = any>(sql: string, values?: any[]): Promise<QueryResult<T>> {
    const client = getDatabaseClient();
    const rows = await client.query<T>(sql, normalizeParams(values));
    return { rows };
  },
};
