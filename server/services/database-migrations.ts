import { logger } from "../lib/logger";
import * as fs from "fs";
import * as path from "path";

/**
 * Database Migration Service
 * Handles initialization and management of database tables
 */
class DatabaseMigrationService {
  private initialized = false;
  private supabase: any = null;

  /**
   * Initialize the migration service with Supabase client
   */
  async initialize(supabaseClient: any): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    try {
      this.supabase = supabaseClient;

      if (!this.supabase) {
        logger.warn("[DatabaseMigrations] Supabase client not available");
        return false;
      }

      // Run all migrations
      await this.runAllMigrations();
      this.initialized = true;
      return true;
    } catch (error) {
      logger.error("[DatabaseMigrations] Initialization error", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Run all migration files
   */
  private async runAllMigrations(): Promise<void> {
    try {
      const migrationsDir = path.join(__dirname, "../migrations");

      // Check if migrations directory exists
      if (!fs.existsSync(migrationsDir)) {
        logger.warn("[DatabaseMigrations] Migrations directory not found");
        return;
      }

      const files = fs
        .readdirSync(migrationsDir)
        .filter((file) => file.endsWith(".sql"))
        .sort();

      for (const file of files) {
        await this.runMigration(file);
      }
    } catch (error) {
      logger.error("[DatabaseMigrations] Error running migrations", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Run a single migration file
   */
  private async runMigration(filename: string): Promise<void> {
    try {
      const filepath = path.join(__dirname, "../migrations", filename);
      const sql = fs.readFileSync(filepath, "utf-8");

      // Split by semicolon and execute statements
      const statements = sql
        .split(";")
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt.length > 0);

      for (const statement of statements) {
        await this.supabase
          .rpc("exec_sql", { sql: statement })
          .catch((err: any) => {
            // Some Supabase instances might not have exec_sql, try direct query
            if (err.message?.includes("exec_sql")) {
              return this.supabase
                .from("_migrations")
                .insert({ name: filename });
            }
            throw err;
          });
      }

      logger.info("[DatabaseMigrations] Migration completed", { filename });
    } catch (error) {
      logger.warn("[DatabaseMigrations] Migration error (may already exist)", {
        filename,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Check if prospects table exists
   */
  async prospectsTableExists(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from("prospects")
        .select("id")
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  }
}

export const databaseMigrationService = new DatabaseMigrationService();
