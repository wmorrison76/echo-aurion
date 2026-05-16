/**
 * Database Connection Manager
 * Handles connection pooling for Neon PostgreSQL
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import * as dotenv from 'dotenv';
import { getRequestContext } from '../lib/context';

// Load environment variables
dotenv.config();

// Parse DATABASE_URL and ensure SSL is configured
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Neon requires SSL - ensure it's in the connection string
const databaseUrl = connectionString.includes('?')
  ? `${connectionString}&sslmode=require`
  : `${connectionString}?sslmode=require`;

// Connection pool configuration
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false // Required for Neon
  },
  max: 10, // Optimized for horizontal scaling through a proxy (e.g., pgbouncer)
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test connection on startup
pool.on('connect', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Database connected successfully');
  }
});

// Pool error handling
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client:', err);
  // Don't exit process in production
  if (process.env.NODE_ENV === 'development') {
    process.exit(-1);
  }
});

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connection test successful');
    console.log('   Server time:', result.rows[0].current_time);
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}

/**
 * Set tenant context in database for RLS
 */
async function setTenantContext(client: PoolClient): Promise<void> {
  const { orgId } = getRequestContext();
  if (orgId) {
    try {
      await client.query("SELECT set_config('app.current_org_id', $1, false)", [orgId]);
    } catch (err) {
      console.error('❌ Failed to set app.current_org_id:', err);
    }
  }
}

/**
 * Execute a query with automatic connection handling
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const client = await pool.connect();
  try {
    await setTenantContext(client);
    const result = await client.query<T>(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.warn(`⚠️  Slow query (${duration}ms):`, text.substring(0, 100));
    }

    return result;
  } catch (error) {
    console.error('❌ Query error:', {
      text: text.substring(0, 200),
      error: error instanceof Error ? error.message : error
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get a client from the pool for transaction handling
 */
export async function getClient(): Promise<PoolClient> {
  const client = await pool.connect();
  await setTenantContext(client);
  return client;
}

/**
 * Execute multiple queries in a transaction
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close all connections (for graceful shutdown)
 */
export async function closePool(): Promise<void> {
  await pool.end();
  console.log('Database connections closed');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing database connections...');
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing database connections...');
  await closePool();
  process.exit(0);
});

export default pool;
