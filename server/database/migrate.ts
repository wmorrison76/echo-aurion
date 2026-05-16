/**
 * Database Migration Runner
 * Executes SQL migration files in order
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { query, closePool } from './connection';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

interface Migration {
  id: number;
  filename: string;
  executed_at: Date;
}

/**
 * Create migrations tracking table
 */
async function createMigrationsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

/**
 * Get list of executed migrations
 */
async function getExecutedMigrations(): Promise<Set<string>> {
  const result = await query<Migration>('SELECT filename FROM schema_migrations');
  return new Set(result.rows.map(row => row.filename));
}

/**
 * Get list of pending migration files
 */
function getPendingMigrations(executed: Set<string>): string[] {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  return files.filter(file => !executed.has(file));
}

/**
 * Execute a single migration file
 */
async function executeMigration(filename: string): Promise<void> {
  console.log(`Executing migration: ${filename}`);
  
  const filepath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filepath, 'utf-8');
  
  try {
    // Execute the migration SQL
    await query(sql);
    
    // Record successful migration
    await query(
      'INSERT INTO schema_migrations (filename) VALUES ($1)',
      [filename]
    );
    
    console.log(`✅ Migration completed: ${filename}`);
  } catch (error) {
    console.error(`❌ Migration failed: ${filename}`);
    throw error;
  }
}

/**
 * Run all pending migrations
 */
async function runMigrations(): Promise<void> {
  console.log('🚀 Starting database migrations...\n');
  
  try {
    // Create migrations tracking table
    await createMigrationsTable();
    
    // Get executed and pending migrations
    const executed = await getExecutedMigrations();
    const pending = getPendingMigrations(executed);
    
    if (pending.length === 0) {
      console.log('✅ Database is up to date. No migrations to run.');
      return;
    }
    
    console.log(`Found ${pending.length} pending migration(s):\n`);
    pending.forEach(file => console.log(`  - ${file}`));
    console.log('');
    
    // Execute each pending migration
    for (const filename of pending) {
      await executeMigration(filename);
    }
    
    console.log('\n✅ All migrations completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await closePool();
  }
}

// Run migrations if executed directly
const isMainModule =
  typeof process !== 'undefined' &&
  process.argv?.[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { runMigrations };

