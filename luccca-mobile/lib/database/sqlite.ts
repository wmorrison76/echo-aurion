/**
 * SQLite Database Manager
 * Handles initialization, migrations, and CRUD operations
 */

import * as SQLite from "expo-sqlite";
import { DATABASE_SCHEMA, MIGRATIONS } from "./schema";

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize database connection
 */
export async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  try {
    db = await SQLite.openDatabaseAsync("luccca.db");

    // Enable foreign keys
    await db.execAsync("PRAGMA foreign_keys = ON");

    // Run migrations
    await runMigrations();

    console.log("[DB] Database initialized successfully");
    return db;
  } catch (error) {
    console.error("[DB] Failed to initialize database:", error);
    throw error;
  }
}

/**
 * Get database instance
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error("Database not initialized. Call initializeDatabase first.");
  }
  return db;
}

/**
 * Run pending migrations
 */
async function runMigrations(): Promise<void> {
  if (!db) throw new Error("Database not initialized");

  try {
    // Create migrations table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        executed_at TEXT NOT NULL
      );
    `);

    // Get executed migrations
    const executedResult = await db.getAllAsync<{ version: number }>(
      "SELECT version FROM migrations ORDER BY version",
    );
    const executedVersions = new Set(executedResult.map((r) => r.version));

    // Run pending migrations
    for (const migration of MIGRATIONS) {
      if (!executedVersions.has(migration.version)) {
        console.log(`[DB] Running migration: ${migration.name}`);

        // Execute migration SQL
        await db.execAsync(migration.sql);

        // Record migration
        await db.runAsync(
          "INSERT INTO migrations (version, name, executed_at) VALUES (?, ?, ?)",
          [migration.version, migration.name, new Date().toISOString()],
        );

        console.log(`[DB] Migration completed: ${migration.name}`);
      }
    }
  } catch (error) {
    console.error("[DB] Migration failed:", error);
    throw error;
  }
}

/**
 * Execute raw SQL query
 */
export async function executeSql(
  sql: string,
  params: any[] = [],
): Promise<SQLite.SQLiteRunResult> {
  const database = getDatabase();
  return database.runAsync(sql, params);
}

/**
 * Execute query and return results
 */
export async function querySql<T>(
  sql: string,
  params: any[] = [],
): Promise<T[]> {
  const database = getDatabase();
  return database.getAllAsync<T>(sql, params);
}

/**
 * Execute query and return single result
 */
export async function querySqlOne<T>(
  sql: string,
  params: any[] = [],
): Promise<T | null> {
  const database = getDatabase();
  const result = await database.getFirstAsync<T>(sql, params);
  return result || null;
}

/**
 * Start transaction
 */
export async function beginTransaction(): Promise<void> {
  const database = getDatabase();
  await database.execAsync("BEGIN TRANSACTION");
}

/**
 * Commit transaction
 */
export async function commitTransaction(): Promise<void> {
  const database = getDatabase();
  await database.execAsync("COMMIT");
}

/**
 * Rollback transaction
 */
export async function rollbackTransaction(): Promise<void> {
  const database = getDatabase();
  await database.execAsync("ROLLBACK");
}

/**
 * Execute function within transaction
 */
export async function withTransaction<T>(
  callback: () => Promise<T>,
): Promise<T> {
  try {
    await beginTransaction();
    const result = await callback();
    await commitTransaction();
    return result;
  } catch (error) {
    await rollbackTransaction();
    throw error;
  }
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
    console.log("[DB] Database closed");
  }
}

/**
 * Clear all data (for testing/reset)
 */
export async function clearDatabase(): Promise<void> {
  const database = getDatabase();

  const tables = [
    "sync_queue",
    "changes",
    "conflicts",
    "sync_logs",
    "analytics_snapshots",
    "user_permissions",
    "cache",
    "events",
    "integrations",
    "outlets",
    "organizations",
  ];

  for (const table of tables) {
    await database.runAsync(`DELETE FROM ${table}`);
  }

  console.log("[DB] Database cleared");
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  events: number;
  syncQueue: number;
  integrations: number;
  syncLogs: number;
}> {
  const database = getDatabase();

  const [eventsCount, syncQueueCount, integrationsCount, syncLogsCount] =
    await Promise.all([
      database.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM events",
      ),
      database.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM sync_queue",
      ),
      database.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM integrations",
      ),
      database.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM sync_logs",
      ),
    ]);

  return {
    events: eventsCount?.count || 0,
    syncQueue: syncQueueCount?.count || 0,
    integrations: integrationsCount?.count || 0,
    syncLogs: syncLogsCount?.count || 0,
  };
}
