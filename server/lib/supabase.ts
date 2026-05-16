/**
 * In-memory Supabase-like Client
 *
 * Used for local/dev environments when Supabase credentials are not configured.
 * Provides a minimal subset of the supabase-js query API used throughout the
 * server routes (select/insert/update/delete + common filters + pagination).
 */

import { v4 as uuidv4 } from "uuid";

type Row = Record<string, any>;

type OrderOptions = { ascending?: boolean };

type SelectOptions = { count?: "exact" | "planned" | "estimated" };

type QueryResult<T> = {
  data: T;
  error: any;
  count?: number;
};

class InMemoryDatabase {
  private tables = new Map<string, Row[]>();

  getTable(table: string): Row[] {
    const existing = this.tables.get(table);
    if (existing) return existing;
    const next: Row[] = [];
    this.tables.set(table, next);
    return next;
  }

  setTable(table: string, rows: Row[]): void {
    this.tables.set(table, rows);
  }
}

class InMemoryQuery implements PromiseLike<QueryResult<any>> {
  private operation: "select" | "insert" | "update" | "delete" | "upsert" =
    "select";

  private filters: ((row: Row) => boolean)[] = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private rangeWindow: { from: number; to: number } | null = null;
  private wantCount = false;
  private returnSingle = false;

  private pendingInsert: Row[] = [];
  private pendingUpdate: Row | null = null;
  private pendingUpsert: { rows: Row[]; onConflict?: string } | null = null;

  constructor(
    private db: InMemoryDatabase,
    private table: string,
  ) {}

  select(_columns?: any, options?: SelectOptions): this {
    this.wantCount = options?.count === "exact";

    // Support supabase-js patterns like insert(...).select() / update(...).select()
    // where select acts as "returning" rather than changing the operation.
    if (this.operation !== "select") {
      return this;
    }

    this.operation = "select";
    return this;
  }

  insert(rows: Row[]): this {
    this.operation = "insert";
    this.pendingInsert = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  upsert(rows: Row[], options?: { onConflict?: string }): this {
    this.operation = "upsert";
    this.pendingUpsert = {
      rows: Array.isArray(rows) ? rows : [rows],
      onConflict: options?.onConflict,
    };
    return this;
  }

  update(data: Row): this {
    this.operation = "update";
    this.pendingUpdate = data;
    return this;
  }

  delete(): this {
    this.operation = "delete";
    return this;
  }

  eq(column: string, value: any): this {
    this.filters.push((r) => r?.[column] === value);
    return this;
  }

  neq(column: string, value: any): this {
    this.filters.push((r) => r?.[column] !== value);
    return this;
  }

  is(column: string, value: any): this {
    this.filters.push((r) => r?.[column] === value);
    return this;
  }

  in(column: string, values: any[]): this {
    const set = new Set(values);
    this.filters.push((r) => set.has(r?.[column]));
    return this;
  }

  gte(column: string, value: any): this {
    this.filters.push((r) => r?.[column] >= value);
    return this;
  }

  lte(column: string, value: any): this {
    this.filters.push((r) => r?.[column] <= value);
    return this;
  }

  order(column: string, options?: OrderOptions): this {
    this.orderBy = { column, ascending: options?.ascending !== false };
    return this;
  }

  range(from: number, to: number): this {
    this.rangeWindow = { from, to };
    return this;
  }

  single(): Promise<QueryResult<any>> {
    this.returnSingle = true;
    return this.execute();
  }

  private async execute(): Promise<QueryResult<any>> {
    try {
      const tableRows = this.db.getTable(this.table);
      const applyFilters = (rows: Row[]) =>
        this.filters.reduce((acc, fn) => acc.filter(fn), rows);

      if (this.operation === "insert") {
        const now = new Date().toISOString();
        const inserted = this.pendingInsert.map((r) => ({
          id: r.id ?? uuidv4(),
          created_at: r.created_at ?? now,
          updated_at: r.updated_at ?? now,
          ...r,
        }));

        this.db.setTable(this.table, [...tableRows, ...inserted]);

        const data = this.returnSingle ? (inserted[0] ?? null) : inserted;
        const error =
          this.returnSingle && !inserted[0] ? { code: "PGRST116" } : null;
        return { data, error, count: inserted.length };
      }

      if (this.operation === "upsert") {
        const now = new Date().toISOString();
        const onConflict = this.pendingUpsert?.onConflict || "id";
        const rows = this.pendingUpsert?.rows ?? [];

        const existingByKey = new Map<any, Row>();
        for (const r of tableRows) existingByKey.set(r?.[onConflict], r);

        const nextRows: Row[] = [...tableRows];
        const upserted: Row[] = [];

        for (const raw of rows) {
          const key = raw?.[onConflict];
          const base: Row = existingByKey.get(key) ?? {};
          const merged: Row = {
            ...base,
            ...raw,
            id: raw.id ?? base.id ?? uuidv4(),
            created_at: base.created_at ?? raw.created_at ?? now,
            updated_at: now,
          };

          const existingIdx = nextRows.findIndex(
            (r) => r?.[onConflict] === key,
          );
          if (existingIdx >= 0) nextRows[existingIdx] = merged;
          else nextRows.push(merged);

          upserted.push(merged);
        }

        this.db.setTable(this.table, nextRows);

        const data = this.returnSingle ? (upserted[0] ?? null) : upserted;
        const error =
          this.returnSingle && !upserted[0] ? { code: "PGRST116" } : null;
        return { data, error, count: upserted.length };
      }

      const filtered = applyFilters(tableRows);
      const count = this.wantCount ? filtered.length : undefined;

      if (this.operation === "update") {
        const now = new Date().toISOString();
        const patch = this.pendingUpdate ?? {};
        const nextRows = tableRows.map((row) => {
          if (!applyFilters([row]).length) return row;
          const next = {
            ...row,
            ...patch,
            updated_at: patch.updated_at ?? now,
          };
          return next;
        });
        this.db.setTable(this.table, nextRows);

        const updated = applyFilters(nextRows);
        const data = this.returnSingle ? (updated[0] ?? null) : updated;
        return {
          data,
          error: this.returnSingle && !updated[0] ? { code: "PGRST116" } : null,
          count,
        };
      }

      if (this.operation === "delete") {
        const keep = tableRows.filter((row) => !applyFilters([row]).length);
        const removed = applyFilters(tableRows);
        this.db.setTable(this.table, keep);

        const data = this.returnSingle ? (removed[0] ?? null) : removed;
        return { data, error: null, count: removed.length };
      }

      // select
      let rows = [...filtered];
      if (this.orderBy) {
        const { column, ascending } = this.orderBy;
        rows.sort((a, b) => {
          const av = a?.[column];
          const bv = b?.[column];
          const an = typeof av === "number" ? av : Date.parse(String(av));
          const bn = typeof bv === "number" ? bv : Date.parse(String(bv));
          if (!Number.isNaN(an) && !Number.isNaN(bn)) {
            return ascending ? an - bn : bn - an;
          }
          const as = av == null ? "" : String(av);
          const bs = bv == null ? "" : String(bv);
          return ascending ? as.localeCompare(bs) : bs.localeCompare(as);
        });
      }

      if (this.rangeWindow) {
        rows = rows.slice(this.rangeWindow.from, this.rangeWindow.to + 1);
      }

      const data = this.returnSingle ? (rows[0] ?? null) : rows;
      const error = this.returnSingle && !rows[0] ? { code: "PGRST116" } : null;
      return { data, error, count };
    } catch (error) {
      return { data: this.returnSingle ? null : [], error };
    }
  }

  then<TResult1 = QueryResult<any>, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResult<any>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as any, onrejected as any);
  }
}

class InMemorySupabaseClient {
  constructor(private db: InMemoryDatabase) {}

  from(table: string): InMemoryQuery {
    return new InMemoryQuery(this.db, table);
  }
}

const db = new InMemoryDatabase();
export const supabase = new InMemorySupabaseClient(db);

export function getSupabaseClient(): InMemorySupabaseClient {
  return supabase;
}
