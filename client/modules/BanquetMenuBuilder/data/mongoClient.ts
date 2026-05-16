/**
 * MongoDB Atlas Connection Singleton
 *
 * Single connection pool shared across the module.
 * Lazy initialization on first call.
 * Graceful shutdown via closeMongoConnection().
 */

import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import { getConfig } from '../BanquetMenuBuilder.config';

let client: MongoClient | null = null;
let db: Db | null = null;
let connecting: Promise<MongoClient> | null = null;

/**
 * Get or create the MongoDB client.
 * Concurrent calls during initial connection are safe — they share the same promise.
 */
export async function getMongoClient(): Promise<MongoClient> {
  if (client) return client;
  if (connecting) return connecting;

  const config = getConfig();

  const options: MongoClientOptions = {
    maxPoolSize: config.mongodb.maxPoolSize,
    minPoolSize: config.mongodb.minPoolSize,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 30000,
    retryWrites: true,
    retryReads: true,
  };

  connecting = (async () => {
    const c = new MongoClient(config.mongodb.connectionString, options);
    await c.connect();
    client = c;
    connecting = null;
    return c;
  })();

  return connecting;
}

/**
 * Get the database instance (cached).
 */
export async function getDb(): Promise<Db> {
  if (db) return db;
  const c = await getMongoClient();
  const config = getConfig();
  db = c.db(config.mongodb.databaseName);
  return db;
}

/**
 * Graceful shutdown.
 * Call this when your app is shutting down (process exit, SIGTERM, etc.)
 */
export async function closeMongoConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    connecting = null;
  }
}

/**
 * Health check — verifies the connection is alive.
 * Useful for /health endpoints or startup probes.
 */
export async function pingMongo(): Promise<boolean> {
  try {
    const database = await getDb();
    await database.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

/**
 * For tests — allows resetting the client without process restart.
 */
export function _resetClientForTesting(): void {
  client = null;
  db = null;
  connecting = null;
}
