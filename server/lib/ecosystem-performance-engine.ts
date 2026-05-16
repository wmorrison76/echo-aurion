/**
 * Ecosystem Performance Engine
 * Phase 7: Performance Optimization
 * Handles indexing, caching, batching, and query optimization
 */

import { createClient } from '@supabase/supabase-js';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
}

interface BatchOperation {
  id: string;
  operations: Array<{
    type: 'create' | 'update' | 'delete';
    table: string;
    data: Record<string, any>;
  }>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  results?: Array<{ success: boolean; error?: string }>;
}

interface IndexStrategy {
  table: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gist';
  unique: boolean;
}

export class EcosystemPerformanceEngine {
  private supabase: any;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private batchQueue: BatchOperation[] = [];
  private indexes: IndexStrategy[] = [];

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.initializeIndexes();
    this.startCacheCleanup();
    this.startBatchProcessor();
  }

  /**
   * Initialize recommended indexes for 50,000+ employees
   */
  private initializeIndexes(): void {
    this.indexes = [
      {
        table: 'employee_profiles',
        columns: ['org_id', 'status'],
        type: 'btree',
        unique: false,
      },
      {
        table: 'employee_profiles',
        columns: ['org_id', 'department'],
        type: 'btree',
        unique: false,
      },
      {
        table: 'employee_profiles',
        columns: ['org_id', 'employee_number'],
        type: 'btree',
        unique: true,
      },
      {
        table: 'employee_profiles',
        columns: ['email'],
        type: 'btree',
        unique: true,
      },
      {
        table: 'shifts',
        columns: ['employee_id', 'shift_date'],
        type: 'btree',
        unique: false,
      },
      {
        table: 'sync_logs',
        columns: ['org_id', 'system_type'],
        type: 'btree',
        unique: false,
      },
    ];
  }

  /**
   * Create recommended indexes
   */
  async createIndexes(): Promise<void> {
    for (const index of this.indexes) {
      try {
        const indexName = `idx_${index.table}_${index.columns.join('_')}`;
        const columnList = index.columns.join(', ');
        const uniqueKeyword = index.unique ? 'UNIQUE' : '';

        const sql = `
          CREATE INDEX IF NOT EXISTS ${indexName}
          ON ${index.table} USING ${index.type} (${columnList})
        `;

        await this.supabase.rpc('execute_sql', { query: sql });

        console.log(`[Performance] Index created: ${indexName}`);
      } catch (error) {
        console.error(`[Performance] Failed to create index:`, error);
      }
    }
  }

  /**
   * Cache get operation
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if cache has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Cache set operation
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Cache invalidation
   */
  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Batch multiple operations
   */
  async batch(operations: BatchOperation['operations'][]): Promise<BatchOperation> {
    const batchOp: BatchOperation = {
      id: `batch-${Date.now()}`,
      operations: operations.flat(),
      status: 'pending',
      createdAt: new Date(),
    };

    this.batchQueue.push(batchOp);
    return batchOp;
  }

  /**
   * Process batch operations efficiently
   */
  private async processBatch(batch: BatchOperation): Promise<void> {
    batch.status = 'processing';
    const results: Array<{ success: boolean; error?: string }> = [];

    try {
      // Group operations by table
      const operationsByTable = batch.operations.reduce(
        (acc, op) => {
          if (!acc[op.table]) acc[op.table] = [];
          acc[op.table].push(op);
          return acc;
        },
        {} as Record<string, BatchOperation['operations']>
      );

      // Process each table's operations
      for (const [table, tableOps] of Object.entries(operationsByTable)) {
        // Separate by operation type
        const creates = tableOps.filter(op => op.type === 'create');
        const updates = tableOps.filter(op => op.type === 'update');
        const deletes = tableOps.filter(op => op.type === 'delete');

        // Batch inserts (1000 at a time)
        for (let i = 0; i < creates.length; i += 1000) {
          const chunk = creates.slice(i, i + 1000);
          try {
            const { error } = await this.supabase
              .from(table)
              .insert(chunk.map(op => op.data));

            if (error) throw error;

            results.push(
              ...chunk.map(() => ({ success: true }))
            );
          } catch (error) {
            results.push(
              ...chunk.map(() => ({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              }))
            );
          }
        }

        // Process updates
        for (const update of updates) {
          try {
            const { id, ...data } = update.data;
            const { error } = await this.supabase
              .from(table)
              .update(data)
              .eq('id', id);

            if (error) throw error;

            results.push({ success: true });
          } catch (error) {
            results.push({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        // Process deletes
        for (const del of deletes) {
          try {
            const { id } = del.data;
            const { error } = await this.supabase
              .from(table)
              .delete()
              .eq('id', id);

            if (error) throw error;

            results.push({ success: true });
          } catch (error) {
            results.push({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      batch.status = 'completed';
      batch.results = results;
      batch.completedAt = new Date();
    } catch (error) {
      batch.status = 'failed';
      console.error('[Performance] Batch processing failed:', error);
    }
  }

  /**
   * Query optimization with efficient pagination
   */
  async getEmployeesOptimized(
    orgId: string,
    page: number = 0,
    pageSize: number = 50,
    filters?: Record<string, any>
  ): Promise<any[]> {
    // Check cache first
    const cacheKey = `employees:${orgId}:${page}:${pageSize}:${JSON.stringify(filters || {})}`;
    const cached = this.get(cacheKey);
    if (cached) return cached;

    try {
      let query = this.supabase
        .from('employee_profiles')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      // Apply filters using indexed columns
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.department) {
        query = query.eq('department', filters.department);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Cache result for 5 minutes
      this.set(cacheKey, data || [], 5 * 60 * 1000);

      return data || [];
    } catch (error) {
      console.error('[Performance] Query optimization failed:', error);
      throw error;
    }
  }

  /**
   * Bulk sync with batching
   */
  async bulkSyncEmployees(employees: any[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    // Process in batches of 1000
    for (let i = 0; i < employees.length; i += 1000) {
      const batch = employees.slice(i, i + 1000);

      try {
        const { error } = await this.supabase
          .from('employee_profiles')
          .upsert(batch, { onConflict: 'org_id,employee_number' });

        if (error) throw error;

        success += batch.length;
      } catch (error) {
        console.error('[Performance] Bulk sync failed:', error);
        failed += batch.length;
      }
    }

    // Invalidate cache
    this.invalidate('employees:');

    return { success, failed };
  }

  /**
   * Cache statistics
   */
  getCacheStats(): { size: number; entries: number; memory: number } {
    let memory = 0;

    for (const entry of this.cache.values()) {
      memory += JSON.stringify(entry.data).length;
    }

    return {
      size: this.cache.size,
      entries: this.cache.size,
      memory,
    };
  }

  /**
   * Batch queue statistics
   */
  getBatchQueueStats(): { pending: number; processing: number; completed: number } {
    return {
      pending: this.batchQueue.filter(b => b.status === 'pending').length,
      processing: this.batchQueue.filter(b => b.status === 'processing').length,
      completed: this.batchQueue.filter(b => b.status === 'completed').length,
    };
  }

  /**
   * Start periodic cache cleanup
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const before = this.cache.size;

      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
        }
      }

      const evicted = before - this.cache.size;
      if (evicted > 0) {
        console.log(`[Performance] Cache cleanup: evicted ${evicted} expired entries`);
      }
    }, 60 * 1000); // Run every minute
  }

  /**
   * Start batch processor
   */
  private startBatchProcessor(): void {
    setInterval(async () => {
      const pending = this.batchQueue.filter(b => b.status === 'pending');

      for (const batch of pending) {
        await this.processBatch(batch);
      }
    }, 5 * 1000); // Process batches every 5 seconds
  }
}

export default EcosystemPerformanceEngine;
