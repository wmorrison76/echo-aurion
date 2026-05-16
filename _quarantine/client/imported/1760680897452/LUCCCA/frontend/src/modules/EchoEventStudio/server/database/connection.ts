import { Pool, PoolClient, QueryResult } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

// Database configuration
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  maxConnections: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
}

// Get database configuration from environment
const getDatabaseConfig = (): DatabaseConfig => {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'hospitalitycrm',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    idleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
  };
};

// Database connection pool
class DatabaseConnection {
  private pool: Pool;
  private config: DatabaseConfig;

  constructor() {
    this.config = getDatabaseConfig();
    this.pool = this.createPool();
    this.setupEventHandlers();
  }

  private createPool(): Pool {
    return new Pool({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
      max: this.config.maxConnections,
      idleTimeoutMillis: this.config.idleTimeoutMs,
      connectionTimeoutMillis: this.config.connectionTimeoutMs,
      statement_timeout: 30000, // 30 seconds
      query_timeout: 30000, // 30 seconds
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });
  }

  private setupEventHandlers(): void {
    this.pool.on('connect', (client) => {
      console.log('New database client connected');
    });

    this.pool.on('error', (err, client) => {
      console.error('Unexpected error on idle client', err);
    });

    this.pool.on('acquire', (client) => {
      console.debug('Client acquired from pool');
    });

    this.pool.on('release', (err, client) => {
      if (err) {
        console.error('Error releasing client', err);
      } else {
        console.debug('Client released back to pool');
      }
    });

    this.pool.on('remove', (client) => {
      console.debug('Client removed from pool');
    });
  }

  // Execute a query
  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text: text.substring(0, 100), duration, rows: result.rowCount });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error('Query error', { text: text.substring(0, 100), duration, error });
      throw error;
    }
  }

  // Get a client from the pool for transactions
  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  // Execute a transaction
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
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

  // Check database connection
  async checkConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW() as now');
      return result.rows.length > 0;
    } catch (error) {
      console.error('Database connection check failed:', error);
      return false;
    }
  }

  // Get pool status
  getPoolStatus() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  // Initialize database (create tables if they don't exist)
  async initialize(): Promise<void> {
    try {
      console.log('Initializing database...');
      
      // Read and execute schema
      const schemaPath = join(__dirname, 'schema.sql');
      const schema = readFileSync(schemaPath, 'utf8');
      
      // Split schema into individual statements
      const statements = schema
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      // Execute each statement
      for (const statement of statements) {
        try {
          await this.query(statement);
        } catch (error) {
          // Ignore "already exists" errors
          if (!(error as any).message?.includes('already exists')) {
            console.error('Error executing statement:', statement.substring(0, 100), error);
            throw error;
          }
        }
      }

      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  // Migrate database to latest version
  async migrate(): Promise<void> {
    try {
      console.log('Running database migrations...');
      
      // Create migrations table if it doesn't exist
      await this.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          filename VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // This would typically read migration files and execute them
      // For now, we'll just ensure the schema is up to date
      await this.initialize();
      
      console.log('Database migrations completed');
    } catch (error) {
      console.error('Database migration failed:', error);
      throw error;
    }
  }

  // Graceful shutdown
  async close(): Promise<void> {
    console.log('Closing database connections...');
    await this.pool.end();
    console.log('Database connections closed');
  }

  // Health check
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: {
      connected: boolean;
      poolStatus: any;
      latency?: number;
    };
  }> {
    const start = Date.now();
    try {
      const connected = await this.checkConnection();
      const latency = Date.now() - start;
      const poolStatus = this.getPoolStatus();

      return {
        status: connected ? 'healthy' : 'unhealthy',
        details: {
          connected,
          poolStatus,
          latency,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          connected: false,
          poolStatus: this.getPoolStatus(),
        },
      };
    }
  }
}

// Create singleton instance
const db = new DatabaseConnection();

// Export the database instance and types
export { db, DatabaseConnection };
export type { DatabaseConfig, PoolClient, QueryResult };

// Helper functions for common database operations
export const dbHelpers = {
  // Execute a simple query
  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    return await db.query(text, params);
  },

  // Execute a transaction
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    return await db.transaction(callback);
  },

  // Insert a record and return the inserted row
  async insert<T = any>(table: string, data: Record<string, any>): Promise<T> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    
    const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    const result = await db.query<T>(query, values);
    
    return result.rows[0];
  },

  // Update a record by ID and return the updated row
  async update<T = any>(table: string, id: string, data: Record<string, any>): Promise<T | null> {
    const entries = Object.entries(data);
    const setClause = entries.map(([key], index) => `${key} = $${index + 2}`).join(', ');
    const values = [id, ...entries.map(([, value]) => value)];
    
    const query = `UPDATE ${table} SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`;
    const result = await db.query<T>(query, values);
    
    return result.rows[0] || null;
  },

  // Delete a record by ID
  async delete(table: string, id: string): Promise<boolean> {
    const query = `DELETE FROM ${table} WHERE id = $1`;
    const result = await db.query(query, [id]);
    
    return (result.rowCount || 0) > 0;
  },

  // Find a record by ID
  async findById<T = any>(table: string, id: string): Promise<T | null> {
    const query = `SELECT * FROM ${table} WHERE id = $1`;
    const result = await db.query<T>(query, [id]);
    
    return result.rows[0] || null;
  },

  // Find records with conditions
  async findWhere<T = any>(
    table: string, 
    conditions: Record<string, any>, 
    options?: {
      orderBy?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<T[]> {
    const entries = Object.entries(conditions);
    const whereClause = entries.map(([key], index) => `${key} = $${index + 1}`).join(' AND ');
    const values = entries.map(([, value]) => value);
    
    let query = `SELECT * FROM ${table}`;
    if (whereClause) {
      query += ` WHERE ${whereClause}`;
    }
    
    if (options?.orderBy) {
      query += ` ORDER BY ${options.orderBy}`;
    }
    
    if (options?.limit) {
      query += ` LIMIT ${options.limit}`;
    }
    
    if (options?.offset) {
      query += ` OFFSET ${options.offset}`;
    }
    
    const result = await db.query<T>(query, values);
    return result.rows;
  },

  // Count records with conditions
  async count(table: string, conditions?: Record<string, any>): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM ${table}`;
    let values: any[] = [];
    
    if (conditions) {
      const entries = Object.entries(conditions);
      const whereClause = entries.map(([key], index) => `${key} = $${index + 1}`).join(' AND ');
      values = entries.map(([, value]) => value);
      query += ` WHERE ${whereClause}`;
    }
    
    const result = await db.query<{ count: string }>(query, values);
    return parseInt(result.rows[0].count);
  },

  // Execute a raw SQL query with proper error handling
  async raw<T = any>(query: string, params?: any[]): Promise<T[]> {
    const result = await db.query<T>(query, params);
    return result.rows;
  },

  // Upsert (insert or update) a record
  async upsert<T = any>(
    table: string, 
    data: Record<string, any>, 
    conflictColumns: string[]
  ): Promise<T> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    
    const updateSet = columns
      .filter(col => !conflictColumns.includes(col))
      .map(col => `${col} = EXCLUDED.${col}`)
      .join(', ');
    
    const query = `
      INSERT INTO ${table} (${columns.join(', ')}) 
      VALUES (${placeholders})
      ON CONFLICT (${conflictColumns.join(', ')}) 
      DO UPDATE SET ${updateSet}, updated_at = NOW()
      RETURNING *
    `;
    
    const result = await db.query<T>(query, values);
    return result.rows[0];
  }
};

// Initialize database on startup
process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing database connections...');
  await db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing database connections...');
  await db.close();
  process.exit(0);
});

export default db;
