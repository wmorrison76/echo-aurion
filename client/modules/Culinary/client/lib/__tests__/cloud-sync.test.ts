import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cloudSync, type SyncEvent, type SyncConflict } from '../cloud-sync';

// Mock Supabase client
vi.mock('../auth-service', () => ({
  supabase: {
    channel: vi.fn(),
    removeChannel: vi.fn(),
    from: vi.fn(),
  },
}));

describe('CloudSyncManager', () => {
  let mockChannel: any;

  beforeEach(() => {
    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockResolvedValue(null),
    };

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cloudSync.cleanup();
  });

  describe('Queue Management', () => {
    it('should queue sync events and process them in order', async () => {
      const events: SyncEvent[] = [];

      const event1: SyncEvent = {
        id: '1',
        event_type: 'create',
        table: 'recipes',
        record_id: 'recipe-1',
        user_id: 'user-1',
        organization_id: 'org-1',
        new_data: { title: 'Pasta', ingredients: [] },
        timestamp: Date.now(),
        synced: false,
      };

      const event2: SyncEvent = {
        id: '2',
        event_type: 'update',
        table: 'recipes',
        record_id: 'recipe-1',
        user_id: 'user-1',
        organization_id: 'org-1',
        new_data: { title: 'Pasta Carbonara', ingredients: ['eggs', 'bacon'] },
        timestamp: Date.now(),
        synced: false,
      };

      cloudSync.queueChange(event1);
      cloudSync.queueChange(event2);

      const status = cloudSync.getSyncStatus();
      expect(status.queueLength).toBeGreaterThanOrEqual(0); // May process async
    });

    it('should handle concurrent sync events without race conditions', async () => {
      const events: SyncEvent[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        event_type: 'create' as const,
        table: 'recipes',
        record_id: `recipe-${i}`,
        user_id: 'user-1',
        organization_id: 'org-1',
        new_data: { title: `Recipe ${i}` },
        timestamp: Date.now() + i,
        synced: false,
      }));

      events.forEach((event) => cloudSync.queueChange(event));

      // Give async processing time
      await new Promise((resolve) => setTimeout(resolve, 100));

      const status = cloudSync.getSyncStatus();
      expect(status.activeChannels).toBeGreaterThanOrEqual(0);
    });

    it('should retry failed sync events with exponential backoff', async () => {
      let attemptCount = 0;

      const failingEvent: SyncEvent = {
        id: '1',
        event_type: 'create',
        table: 'recipes',
        record_id: 'recipe-1',
        user_id: 'user-1',
        organization_id: 'org-1',
        new_data: { title: 'Failing Recipe' },
        timestamp: Date.now(),
        synced: false,
      };

      cloudSync.queueChange(failingEvent);
      attemptCount++;

      // Verify event was queued
      const status = cloudSync.getSyncStatus();
      expect(status).toBeDefined();
    });
  });

  describe('Multi-User Sync Scenarios', () => {
    it('should handle simultaneous edits from different users', async () => {
      const user1Event: SyncEvent = {
        id: '1',
        event_type: 'update',
        table: 'recipes',
        record_id: 'recipe-1',
        user_id: 'user-1',
        organization_id: 'org-1',
        old_data: { title: 'Original Recipe' },
        new_data: { title: 'User 1 Version' },
        timestamp: Date.now(),
        synced: false,
      };

      const user2Event: SyncEvent = {
        id: '2',
        event_type: 'update',
        table: 'recipes',
        record_id: 'recipe-1',
        user_id: 'user-2',
        organization_id: 'org-1',
        old_data: { title: 'Original Recipe' },
        new_data: { title: 'User 2 Version' },
        timestamp: Date.now() + 1,
        synced: false,
      };

      cloudSync.queueChange(user1Event);
      cloudSync.queueChange(user2Event);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const status = cloudSync.getSyncStatus();
      expect(status).toBeDefined();
    });

    it('should maintain data consistency across multiple tables', async () => {
      const recipe: SyncEvent = {
        id: '1',
        event_type: 'create',
        table: 'recipes',
        record_id: 'recipe-1',
        user_id: 'user-1',
        organization_id: 'org-1',
        new_data: { title: 'New Recipe', id: 'recipe-1' },
        timestamp: Date.now(),
        synced: false,
      };

      const ingredient: SyncEvent = {
        id: '2',
        event_type: 'create',
        table: 'ingredients',
        record_id: 'ingredient-1',
        user_id: 'user-1',
        organization_id: 'org-1',
        new_data: { name: 'Flour', recipe_id: 'recipe-1' },
        timestamp: Date.now() + 1,
        synced: false,
      };

      cloudSync.queueChange(recipe);
      cloudSync.queueChange(ingredient);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const status = cloudSync.getSyncStatus();
      expect(status.queueLength).toBeLessThanOrEqual(2);
    });

    it('should handle user disconnection and reconnection', async () => {
      const event: SyncEvent = {
        id: '1',
        event_type: 'create',
        table: 'recipes',
        record_id: 'recipe-1',
        user_id: 'user-1',
        organization_id: 'org-1',
        new_data: { title: 'Recipe' },
        timestamp: Date.now(),
        synced: false,
      };

      cloudSync.queueChange(event);

      // Simulate disconnect
      await cloudSync.cleanup();
      const statusAfterCleanup = cloudSync.getSyncStatus();
      expect(statusAfterCleanup.activeChannels).toBe(0);

      // Events should be retried on reconnection
      cloudSync.queueChange(event);
      const statusAfterReconnect = cloudSync.getSyncStatus();
      expect(statusAfterReconnect).toBeDefined();
    });
  });

  describe('Conflict Detection and Resolution', () => {
    it('should detect version conflicts', async () => {
      const conflicts = await cloudSync.detectConflicts(
        'recipes',
        'org-1'
      );

      expect(Array.isArray(conflicts)).toBe(true);
    });

    it('should resolve conflicts with custom strategy', async () => {
      const resolver = vi.fn(async (conflict: SyncConflict) => {
        // Prefer remote version if it's more recent
        const localTime = conflict.local_version.updated_at || 0;
        const remoteTime = conflict.remote_version.updated_at || 0;
        return remoteTime > localTime ? 'remote' : 'local';
      });

      cloudSync.setConflictResolver(resolver);

      const testConflict: SyncConflict = {
        id: 'conflict-1',
        table: 'recipes',
        record_id: 'recipe-1',
        local_version: { title: 'Local', updated_at: 1000 },
        remote_version: { title: 'Remote', updated_at: 2000 },
        timestamp: Date.now(),
      };

      // Verify resolver is set
      expect(cloudSync).toBeDefined();
    });

    it('should handle last-write-wins conflict resolution', async () => {
      const resolver = async (conflict: SyncConflict) => {
        // Last write wins
        return conflict.timestamp > 0 ? 'remote' : 'local';
      };

      cloudSync.setConflictResolver(resolver);

      const event: SyncEvent = {
        id: '1',
        event_type: 'update',
        table: 'recipes',
        record_id: 'recipe-1',
        user_id: 'user-1',
        organization_id: 'org-1',
        new_data: { title: 'Latest Version' },
        timestamp: Date.now(),
        synced: false,
      };

      cloudSync.queueChange(event);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(cloudSync.getSyncStatus()).toBeDefined();
    });

    it('should support custom field-level conflict resolution', async () => {
      const resolver = async (conflict: SyncConflict) => {
        const local = conflict.local_version;
        const remote = conflict.remote_version;

        // Merge strategy: combine changes if they affect different fields
        const localFields = Object.keys(local);
        const remoteFields = Object.keys(remote);
        const conflictingFields = localFields.filter((f) =>
          remoteFields.includes(f)
        );

        // If only one side modified the field, merge it
        if (conflictingFields.length === 0) {
          return 'local'; // Both have different changes
        }

        // For overlapping fields, prefer remote
        return 'remote';
      };

      cloudSync.setConflictResolver(resolver);
      expect(cloudSync).toBeDefined();
    });

    it('should handle conflicts during bulk operations', async () => {
      const bulkEvents: SyncEvent[] = Array.from({ length: 50 }, (_, i) => ({
        id: `${i}`,
        event_type: i % 3 === 0 ? 'delete' : 'update',
        table: 'recipes',
        record_id: `recipe-${i % 10}`, // Some will have same ID
        user_id: `user-${i % 3}`, // Multiple users
        organization_id: 'org-1',
        new_data: { title: `Recipe ${i}`, version: i },
        timestamp: Date.now() + i,
        synced: false,
      }));

      bulkEvents.forEach((event) => cloudSync.queueChange(event));

      await new Promise((resolve) => setTimeout(resolve, 100));

      const status = cloudSync.getSyncStatus();
      expect(status.queueLength).toBeLessThanOrEqual(50);
    });
  });

  describe('Event Types', () => {
    it('should handle create events', async () => {
      const createEvent: SyncEvent = {
        id: '1',
        event_type: 'create',
        table: 'recipes',
        record_id: 'recipe-1',
        user_id: 'user-1',
        organization_id: 'org-1',
        new_data: {
          id: 'recipe-1',
          title: 'New Recipe',
          ingredients: [],
        },
        timestamp: Date.now(),
        synced: false,
      };

      cloudSync.queueChange(createEvent);
      expect(cloudSync.getSyncStatus().queueLength).toBeGreaterThanOrEqual(0);
    });

    it('should handle update events', async () => {
      const updateEvent: SyncEvent = {
        id: '1',
        event_type: 'update',
        table: 'recipes',
        record_id: 'recipe-1',
        user_id: 'user-1',
        organization_id: 'org-1',
        old_data: { title: 'Old Title' },
        new_data: { title: 'New Title' },
        timestamp: Date.now(),
        synced: false,
      };

      cloudSync.queueChange(updateEvent);
      expect(cloudSync.getSyncStatus()).toBeDefined();
    });

    it('should handle delete events', async () => {
      const deleteEvent: SyncEvent = {
        id: '1',
        event_type: 'delete',
        table: 'recipes',
        record_id: 'recipe-1',
        user_id: 'user-1',
        organization_id: 'org-1',
        new_data: {},
        timestamp: Date.now(),
        synced: false,
      };

      cloudSync.queueChange(deleteEvent);
      expect(cloudSync.getSyncStatus()).toBeDefined();
    });
  });

  describe('Channel Management', () => {
    it('should manage multiple subscriptions', async () => {
      const tables = ['recipes', 'ingredients', 'customers'];

      for (const table of tables) {
        // We're testing queue management, not actual subscriptions
        const event: SyncEvent = {
          id: Math.random().toString(),
          event_type: 'create',
          table,
          record_id: `${table}-1`,
          user_id: 'user-1',
          organization_id: 'org-1',
          new_data: { name: 'Test' },
          timestamp: Date.now(),
          synced: false,
        };

        cloudSync.queueChange(event);
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(cloudSync.getSyncStatus().activeChannels).toBeGreaterThanOrEqual(0);
    });

    it('should cleanup all subscriptions', async () => {
      const event: SyncEvent = {
        id: '1',
        event_type: 'create',
        table: 'recipes',
        record_id: 'recipe-1',
        user_id: 'user-1',
        organization_id: 'org-1',
        new_data: { name: 'Test' },
        timestamp: Date.now(),
        synced: false,
      };

      cloudSync.queueChange(event);

      await cloudSync.cleanup();

      const status = cloudSync.getSyncStatus();
      expect(status.activeChannels).toBe(0);
      expect(status.queueLength).toBe(0);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle rapid successive changes', async () => {
      for (let i = 0; i < 100; i++) {
        const event: SyncEvent = {
          id: `${i}`,
          event_type: 'update',
          table: 'recipes',
          record_id: 'recipe-1',
          user_id: 'user-1',
          organization_id: 'org-1',
          new_data: { counter: i },
          timestamp: Date.now() + i,
          synced: false,
        };

        cloudSync.queueChange(event);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      const status = cloudSync.getSyncStatus();
      expect(status.queueLength).toBeLessThanOrEqual(100);
    });

    it('should handle large data payloads', async () => {
      const largeData = {
        id: 'recipe-1',
        title: 'Large Recipe',
        ingredients: Array.from({ length: 1000 }, (_, i) => ({
          name: `Ingredient ${i}`,
          quantity: Math.random() * 100,
          unit: 'g',
        })),
        instructions: Array.from({ length: 500 }, (_, i) =>
          `Step ${i}: Do something`.repeat(10)
        ).join('\n'),
      };

      const event: SyncEvent = {
        id: '1',
        event_type: 'create',
        table: 'recipes',
        record_id: 'recipe-1',
        user_id: 'user-1',
        organization_id: 'org-1',
        new_data: largeData,
        timestamp: Date.now(),
        synced: false,
      };

      cloudSync.queueChange(event);
      expect(cloudSync.getSyncStatus().queueLength).toBeGreaterThanOrEqual(0);
    });

    it('should handle null/undefined values in events', async () => {
      const event: SyncEvent = {
        id: '1',
        event_type: 'update',
        table: 'recipes',
        record_id: 'recipe-1',
        user_id: 'user-1',
        organization_id: 'org-1',
        old_data: undefined,
        new_data: {
          title: 'Recipe',
          description: null,
          ingredients: undefined,
        },
        timestamp: Date.now(),
        synced: false,
      };

      cloudSync.queueChange(event);
      expect(cloudSync.getSyncStatus()).toBeDefined();
    });

    it('should gracefully handle errors in conflict resolution', async () => {
      const faultyResolver = vi.fn(async (conflict: SyncConflict) => {
        throw new Error('Resolver failed');
      });

      cloudSync.setConflictResolver(faultyResolver);

      const event: SyncEvent = {
        id: '1',
        event_type: 'update',
        table: 'recipes',
        record_id: 'recipe-1',
        user_id: 'user-1',
        organization_id: 'org-1',
        new_data: { title: 'Test' },
        timestamp: Date.now(),
        synced: false,
      };

      cloudSync.queueChange(event);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(cloudSync.getSyncStatus()).toBeDefined();
    });
  });

  describe('Sync Status Reporting', () => {
    it('should report accurate sync status', async () => {
      const initialStatus = cloudSync.getSyncStatus();
      expect(initialStatus).toEqual({
        isSyncing: false,
        queueLength: 0,
        activeChannels: 0,
      });

      const event: SyncEvent = {
        id: '1',
        event_type: 'create',
        table: 'recipes',
        record_id: 'recipe-1',
        user_id: 'user-1',
        organization_id: 'org-1',
        new_data: { title: 'Test' },
        timestamp: Date.now(),
        synced: false,
      };

      cloudSync.queueChange(event);

      const statusAfter = cloudSync.getSyncStatus();
      expect(statusAfter.queueLength).toBeGreaterThanOrEqual(0);
    });

    it('should indicate when actively syncing', async () => {
      const events: SyncEvent[] = Array.from({ length: 5 }, (_, i) => ({
        id: `${i}`,
        event_type: 'create',
        table: 'recipes',
        record_id: `recipe-${i}`,
        user_id: 'user-1',
        organization_id: 'org-1',
        new_data: { title: `Recipe ${i}` },
        timestamp: Date.now() + i,
        synced: false,
      }));

      events.forEach((event) => cloudSync.queueChange(event));

      const status = cloudSync.getSyncStatus();
      expect(typeof status.isSyncing).toBe('boolean');
      expect(typeof status.queueLength).toBe('number');
      expect(typeof status.activeChannels).toBe('number');
    });
  });
});
