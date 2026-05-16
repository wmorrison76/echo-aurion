import { supabase } from "./auth-service";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type SyncEvent = {
  id: string;
  event_type: "create" | "update" | "delete";
  table: string;
  record_id: string;
  user_id: string;
  organization_id: string;
  old_data?: Record<string, any>;
  new_data: Record<string, any>;
  timestamp: number;
  synced: boolean;
};

export type SyncConflict = {
  id: string;
  table: string;
  record_id: string;
  local_version: Record<string, any>;
  remote_version: Record<string, any>;
  timestamp: number;
};

class CloudSyncManager {
  private channels: Map<string, RealtimeChannel> = new Map();
  private syncQueue: SyncEvent[] = [];
  private isSyncing = false;
  private conflictResolver:
    | ((conflict: SyncConflict) => Promise<"local" | "remote">)
    | null = null;

  /**
   * Initialize real-time sync for a table
   */
  async subscribeToTable(
    table: string,
    organizationId: string,
    onDataChange: (event: SyncEvent) => void,
  ) {
    const channelName = `${table}:${organizationId}`;

    // Unsubscribe from existing channel if it exists
    if (this.channels.has(channelName)) {
      await supabase.removeChannel(this.channels.get(channelName)!);
    }

    // Create new channel
    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true },
          presence: { key: organizationId },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          const syncEvent: SyncEvent = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            event_type: payload.eventType as any,
            table,
            record_id: newRecord?.id || oldRecord?.id,
            user_id: newRecord?.updated_by || "system",
            organization_id: organizationId,
            old_data: payload.old,
            new_data: payload.new,
            timestamp: Date.now(),
            synced: true,
          };
          onDataChange(syncEvent);
        },
      )
      .subscribe();

    this.channels.set(channelName, channel);
  }

  /**
   * Unsubscribe from table updates
   */
  async unsubscribeFromTable(table: string, organizationId: string) {
    const channelName = `${table}:${organizationId}`;
    if (this.channels.has(channelName)) {
      await supabase.removeChannel(this.channels.get(channelName)!);
      this.channels.delete(channelName);
    }
  }

  /**
   * Queue a local change for sync
   */
  queueChange(event: SyncEvent) {
    this.syncQueue.push(event);
    this.processSyncQueue();
  }

  /**
   * Process pending sync queue
   */
  private async processSyncQueue() {
    if (this.isSyncing || this.syncQueue.length === 0) return;

    this.isSyncing = true;

    while (this.syncQueue.length > 0) {
      const event = this.syncQueue.shift()!;

      try {
        await this.applyChangeToServer(event);
      } catch (error) {
        console.error("Sync error:", error);
        // Re-queue on error with exponential backoff
        event.synced = false;
        this.syncQueue.push(event);
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (6 - this.syncQueue.length)),
        );
      }
    }

    this.isSyncing = false;
  }

  /**
   * Apply a change to the server
   */
  private async applyChangeToServer(event: SyncEvent) {
    const { table, event_type, record_id, new_data } = event;

    switch (event_type) {
      case "create":
        const { error: createError } = await supabase
          .from(table)
          .insert(new_data);
        if (createError) throw createError;
        break;

      case "update":
        const { error: updateError } = await supabase
          .from(table)
          .update(new_data)
          .eq("id", record_id);
        if (updateError) throw updateError;
        break;

      case "delete":
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq("id", record_id);
        if (deleteError) throw deleteError;
        break;
    }
  }

  /**
   * Detect and resolve conflicts
   */
  async detectConflicts(
    table: string,
    organizationId: string,
  ): Promise<SyncConflict[]> {
    try {
      const { data: conflicts } = await supabase
        .from("sync_conflicts")
        .select("*")
        .eq("table", table)
        .eq("organization_id", organizationId)
        .eq("resolved", false);

      return conflicts || [];
    } catch (error) {
      console.error("Error detecting conflicts:", error);
      return [];
    }
  }

  /**
   * Resolve conflict
   */
  async resolveConflict(conflictId: string, resolution: "local" | "remote") {
    try {
      const { error } = await supabase
        .from("sync_conflicts")
        .update({ resolution, resolved: true })
        .eq("id", conflictId);

      if (error) throw error;
    } catch (error) {
      console.error("Error resolving conflict:", error);
    }
  }

  /**
   * Set conflict resolver strategy
   */
  setConflictResolver(
    resolver: (conflict: SyncConflict) => Promise<"local" | "remote">,
  ) {
    this.conflictResolver = resolver;
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      isSyncing: this.isSyncing,
      queueLength: this.syncQueue.length,
      activeChannels: this.channels.size,
    };
  }

  /**
   * Clear all subscriptions
   */
  async cleanup() {
    for (const [, channel] of this.channels) {
      await supabase.removeChannel(channel);
    }
    this.channels.clear();
    this.syncQueue = [];
  }
}

export const cloudSync = new CloudSyncManager();

/**
 * Monitor presence of other users in organization
 */
export async function monitorOrganizationPresence(
  organizationId: string,
  onPresenceChange: (
    users: Array<{ id: string; email: string; status: string }>,
  ) => void,
) {
  const channel = supabase.channel(`presence:${organizationId}`);

  channel
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const users = Object.entries(state).map(
        ([userId, data]: [string, any]) => ({
          id: userId,
          email: data[0]?.email || "Unknown",
          status: data[0]?.status || "offline",
        }),
      );
      onPresenceChange(users);
    })
    .on("presence", { event: "join" }, ({ key, newPresences }) => {
      console.log("User joined:", newPresences);
    })
    .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
      console.log("User left:", leftPresences);
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          online_at: new Date().toISOString(),
          status: "active",
        });
      }
    });

  return channel;
}

/**
 * Broadcast a message to organization
 */
export async function broadcastMessage(
  organizationId: string,
  message: {
    type: string;
    data: Record<string, any>;
  },
) {
  const channel = supabase.channel(`broadcast:${organizationId}`);

  channel.on("broadcast", { event: message.type }, (payload) => {
    console.log("Broadcast received:", payload);
  });

  await channel.subscribe();

  await channel.send({
    type: "broadcast",
    event: message.type,
    payload: message.data,
  });
}

/**
 * Get full sync history for auditing
 */
export async function getSyncHistory(
  organizationId: string,
  table?: string,
  limit: number = 100,
) {
  try {
    let query = supabase
      .from("sync_events")
      .select("*")
      .eq("organization_id", organizationId)
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (table) {
      query = query.eq("table", table);
    }

    const { data, error } = await query;
    return { success: !error, data: data || [], error };
  } catch (error) {
    return { success: false, data: [], error };
  }
}

/**
 * Create backup of organization data
 */
export async function backupOrganizationData(organizationId: string) {
  try {
    const tables = [
      "users",
      "recipes",
      "ingredients",
      "customers",
      "orders",
      "services",
      "events",
    ];

    const backup: Record<string, any[]> = {};

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("organization_id", organizationId);

      if (!error) {
        backup[table] = data || [];
      }
    }

    return {
      success: true,
      backup,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return { success: false, backup: {}, error };
  }
}

/**
 * Restore organization data from backup
 */
export async function restoreOrganizationData(
  organizationId: string,
  backup: Record<string, any[]>,
) {
  try {
    for (const [table, records] of Object.entries(backup)) {
      if (records.length === 0) continue;

      // Delete existing records
      await supabase.from(table).delete().eq("organization_id", organizationId);

      // Insert backup records
      const { error } = await supabase.from(table).insert(records);

      if (error) {
        console.error(`Error restoring ${table}:`, error);
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}
