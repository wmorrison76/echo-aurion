import { createClient } from "@supabase/supabase-js";

export interface DatabaseClient {
  query<T = any>(sql: string, values?: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, values?: any[]): Promise<T | null>;
  exec(sql: string, values?: any[]): Promise<void>;
}

let cachedClient: DatabaseClient | null = null;

/**
 * Get or create a database client
 */
export function getDatabaseClient(): DatabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(
      "[DatabaseClient] Supabase credentials not configured. Using no-op client.",
    );
    return createNoOpClient();
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Create a wrapper client that implements our DatabaseClient interface
    cachedClient = {
      async query<T = any>(sql: string, values?: any[]): Promise<T[]> {
        try {
          const { data, error } = await supabase.rpc("execute_sql", {
            sql,
            params: values || [],
          });

          if (error) {
            console.error("[DatabaseClient] Query error:", error);
            return [];
          }

          return data || [];
        } catch (err) {
          console.error("[DatabaseClient] Query failed:", err);
          return [];
        }
      },

      async queryOne<T = any>(sql: string, values?: any[]): Promise<T | null> {
        try {
          const { data, error } = await supabase.rpc("execute_sql", {
            sql: `${sql} LIMIT 1`,
            params: values || [],
          });

          if (error) {
            console.error("[DatabaseClient] Query error:", error);
            return null;
          }

          return (data && data[0]) || null;
        } catch (err) {
          console.error("[DatabaseClient] Query failed:", err);
          return null;
        }
      },

      async exec(sql: string, values?: any[]): Promise<void> {
        try {
          const { error } = await supabase.rpc("execute_sql", {
            sql,
            params: values || [],
          });

          if (error) {
            console.error("[DatabaseClient] Exec error:", error);
          }
        } catch (err) {
          console.error("[DatabaseClient] Exec failed:", err);
        }
      },
    };

    return cachedClient;
  } catch (err) {
    console.error(
      "[DatabaseClient] Failed to initialize Supabase client:",
      err,
    );
    return createNoOpClient();
  }
}

/**
 * Create a no-op database client for when Supabase is not available
 */
function createNoOpClient(): DatabaseClient {
  return {
    async query<T = any>(): Promise<T[]> {
      return [];
    },
    async queryOne<T = any>(): Promise<T | null> {
      return null;
    },
    async exec(): Promise<void> {
      // no-op
    },
  };
}

/**
 * Close the database connection
 */
export function closeDatabaseClient(): void {
  cachedClient = null;
}

export class Database implements DatabaseClient {
  private readonly client: DatabaseClient;

  constructor(client?: DatabaseClient) {
    this.client = client ?? getDatabaseClient();
  }

  query<T = any>(sql: string, values?: any[]): Promise<T[]> {
    return this.client.query<T>(sql, values);
  }

  queryOne<T = any>(sql: string, values?: any[]): Promise<T | null> {
    return this.client.queryOne<T>(sql, values);
  }

  exec(sql: string, values?: any[]): Promise<void> {
    return this.client.exec(sql, values);
  }
}
