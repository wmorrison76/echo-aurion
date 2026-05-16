import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

import type {
  DrawingStroke,
  WhiteboardEvent,
} from "@/modules/Whiteboard/types";

const url = import.meta.env.VITE_SUPABASE_URL || "";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

let _supabaseClient: any = null;

if (url && anonKey) {
  _supabaseClient = createClient(url, anonKey);
}

export const supabase = _supabaseClient;

export const supabaseConfig = {
  url,
  anonKey,
  isConfigured: !!_supabaseClient,
  client: _supabaseClient as any,
};

export async function initializeSupabase(newUrl: string, newAnonKey: string) {
  if (!newUrl || !newAnonKey) return null;
  _supabaseClient = createClient(newUrl, newAnonKey);
  supabaseConfig.url = newUrl;
  supabaseConfig.anonKey = newAnonKey;
  supabaseConfig.client = _supabaseClient;
  supabaseConfig.isConfigured = true;
  return _supabaseClient;
}

export function isSupabaseConfigured(): boolean {
  return supabaseConfig.isConfigured && !!supabaseConfig.client;
}

export function getSupabaseClient() {
  return supabaseConfig.client;
}

const WHITEBOARD_EVENT_TYPES = new Set<string>([
  "stroke",
  "shape",
  "text",
  "sticky",
  "embed",
  "delete",
  "update",
  "cursor",
  "chat",
  "drilldown",
  "poll-created",
  "vote-submitted",
]);

type SyncQueueItem = {
  id: string;
  event: WhiteboardEvent;
};

class WhiteboardSyncQueue {
  private readonly key = "luccca-whiteboard-sync-queue";

  private load(): SyncQueueItem[] {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as SyncQueueItem[]) : [];
    } catch {
      return [];
    }
  }

  private save(items: SyncQueueItem[]) {
    localStorage.setItem(this.key, JSON.stringify(items));
  }

  add(event: WhiteboardEvent): string {
    const items = this.load();
    const id = uuidv4();
    items.push({ id, event });
    this.save(items);
    return id;
  }

  getPending(): SyncQueueItem[] {
    return this.load();
  }

  markSynced(id: string) {
    const items = this.load();
    const next = items.filter((i) => i.id !== id);
    if (next.length !== items.length) this.save(next);
  }

  clearSession(sessionId: string) {
    const items = this.load();
    const next = items.filter((i) => i.event.sessionId !== sessionId);
    if (next.length !== items.length) this.save(next);
  }

  async flushSession(sessionId: string): Promise<number> {
    if (!isSupabaseConfigured()) return 0;
    const client = getSupabaseClient();
    if (!client) return 0;

    const pending = this.getPending().filter(
      (i) => i.event.sessionId === sessionId,
    );
    if (pending.length === 0) return 0;

    const rows = pending
      .filter((i) => WHITEBOARD_EVENT_TYPES.has(i.event.type))
      .map((i) => ({
        session_id: i.event.sessionId,
        event_type: i.event.type,
        user_id: i.event.userId,
        data: i.event.data,
      }));

    if (rows.length === 0) return 0;

    const { error } = await client.from("whiteboard_events").insert(rows);
    if (error) return 0;

    for (const item of pending) {
      this.markSynced(item.id);
    }

    return rows.length;
  }
}

export const syncQueue = new WhiteboardSyncQueue();

export function resolveConflicts(
  local: DrawingStroke[],
  remote: DrawingStroke[],
): DrawingStroke[] {
  const byId = new Map<string, DrawingStroke>();

  for (const s of local) {
    byId.set(s.id, s);
  }

  for (const s of remote) {
    const existing = byId.get(s.id);
    if (!existing || (s.timestamp ?? 0) >= (existing.timestamp ?? 0)) {
      byId.set(s.id, s);
    }
  }

  return Array.from(byId.values()).sort(
    (a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0),
  );
}

type Handler = (payload: any) => void;

type ChannelState = {
  channel: RealtimeChannel;
  refs: number;
  active: boolean;
};

function normalizeSubscriberPayload(payload: any): any {
  if (!payload || typeof payload !== "object") return payload;

  if ("type" in payload && "data" in payload) {
    const data = (payload as any).data;
    if (data && typeof data === "object" && !Array.isArray(data)) {
      return {
        ...data,
        userId: (payload as any).userId ?? data.userId,
        sessionId: (payload as any).sessionId ?? data.sessionId,
        timestamp: (payload as any).timestamp ?? data.timestamp,
      };
    }
    return data;
  }

  return payload;
}

export const realtimeManager = {
  subscriptions: new Map<string, Set<Handler>>(),
  channels: new Map<string, ChannelState>(),

  subscribe(channel: string, eventType: string, handler: Handler) {
    const key = `${channel}:${eventType}`;
    if (!this.subscriptions.has(key)) this.subscriptions.set(key, new Set());
    this.subscriptions.get(key)!.add(handler);

    if (isSupabaseConfigured() && WHITEBOARD_EVENT_TYPES.has(eventType)) {
      this.ensureSupabaseSubscription(channel);
    }

    return () => {
      this.subscriptions.get(key)?.delete(handler);
      if (this.subscriptions.get(key)?.size === 0)
        this.subscriptions.delete(key);

      if (isSupabaseConfigured() && WHITEBOARD_EVENT_TYPES.has(eventType)) {
        this.releaseSupabaseSubscription(channel);
      }
    };
  },

  sendEvent(channel: string, payload: any) {
    const type = payload?.type;
    if (typeof type !== "string") return;

    const key = `${channel}:${type}`;
    const handlers = this.subscriptions.get(key);
    if (!handlers || handlers.size === 0) return;

    const normalized = normalizeSubscriberPayload(payload);
    for (const h of handlers) {
      h(normalized);
    }
  },

  async broadcastEvent(channel: string, event: WhiteboardEvent) {
    this.sendEvent(channel, event);

    if (!isSupabaseConfigured()) {
      syncQueue.add(event);
      return;
    }

    if (!WHITEBOARD_EVENT_TYPES.has(event.type)) {
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      syncQueue.add(event);
      return;
    }

    try {
      const { error } = await client.from("whiteboard_events").insert({
        session_id: event.sessionId,
        event_type: event.type,
        user_id: event.userId,
        data: event.data,
      });

      if (error) {
        syncQueue.add(event);
      }
    } catch {
      syncQueue.add(event);
    }
  },

  ensureSupabaseSubscription(sessionId: string) {
    if (!isSupabaseConfigured()) return;
    const client = getSupabaseClient();
    if (!client) return;

    const existing = this.channels.get(sessionId);
    if (existing) {
      existing.refs += 1;
      return;
    }

    try {
      const channel = client.channel(`whiteboard:${sessionId}`);

      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whiteboard_events",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: any) => {
          const row = payload?.new;
          if (!row) return;

          const type = String(row.event_type ?? "");
          if (!type) return;

          const normalized: WhiteboardEvent = {
            type: type as any,
            userId: String(row.user_id ?? ""),
            sessionId: String(row.session_id ?? sessionId),
            timestamp: row.created_at
              ? new Date(row.created_at).getTime()
              : Date.now(),
            data: row.data,
          };

          this.sendEvent(sessionId, normalized);
        },
      );

      channel.on("broadcast", { event: "cursor" }, (payload: any) => {
        const p = payload?.payload ?? payload;
        this.sendEvent(sessionId, {
          type: "cursor",
          userId: p?.userId ?? "",
          sessionId,
          timestamp: Date.now(),
          data: p,
        });
      });

      channel.on("broadcast", { event: "timer-start" }, (payload: any) => {
        const p = payload?.payload ?? payload;
        this.sendEvent(sessionId, {
          type: "timer-start",
          userId: p?.userId ?? "",
          sessionId,
          timestamp: Date.now(),
          data: p,
        });
      });
      channel.on("broadcast", { event: "timer-stop" }, () => {
        this.sendEvent(sessionId, {
          type: "timer-stop",
          userId: "",
          sessionId,
          timestamp: Date.now(),
          data: {},
        });
      });

      const state: ChannelState = { channel, refs: 1, active: false };
      this.channels.set(sessionId, state);

      channel.subscribe((status: string) => {
        state.active = status === "SUBSCRIBED";
      });
    } catch {
      // ignore realtime setup failures
    }
  },

  releaseSupabaseSubscription(sessionId: string) {
    const state = this.channels.get(sessionId);
    if (!state) return;

    state.refs -= 1;
    if (state.refs > 0) return;

    this.channels.delete(sessionId);
    try {
      state.channel.unsubscribe();
    } catch {
      // ignore
    }
  },

  sendCursor(sessionId: string, data: { userId: string; cursorX: number; cursorY: number; color?: string }) {
    this.sendEvent(sessionId, { type: "cursor", userId: data.userId, sessionId, timestamp: Date.now(), data });
    const state = this.channels.get(sessionId);
    if (state?.channel && state.active) {
      try {
        void Promise.resolve(state.channel.send({ type: "broadcast", event: "cursor", payload: data })).catch(() => {
          // ignore
        });
      } catch {
        // ignore
      }
    }
  },

  sendTimerStart(sessionId: string, data: { userId: string; seconds: number }) {
    this.sendEvent(sessionId, { type: "timer-start", userId: data.userId, sessionId, timestamp: Date.now(), data });
    const state = this.channels.get(sessionId);
    if (state?.channel && state.active) {
      try {
        void Promise.resolve(state.channel.send({ type: "broadcast", event: "timer-start", payload: data })).catch(() => {
          // ignore
        });
      } catch {
        // ignore
      }
    }
  },

  sendTimerStop(sessionId: string) {
    this.sendEvent(sessionId, { type: "timer-stop", userId: "", sessionId, timestamp: Date.now(), data: {} });
    const state = this.channels.get(sessionId);
    if (state?.channel && state.active) {
      try {
        void Promise.resolve(state.channel.send({ type: "broadcast", event: "timer-stop", payload: {} })).catch(() => {
          // ignore
        });
      } catch {
        // ignore
      }
    }
  },
};

export async function uploadWhiteboardFile(
  sessionId: string,
  file: File,
): Promise<{ url: string; path: string; shared: boolean } | null> {
  if (!isSupabaseConfigured()) {
    return {
      url: URL.createObjectURL(file),
      path: "local",
      shared: false,
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      url: URL.createObjectURL(file),
      path: "local",
      shared: false,
    };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const path = `sessions/${sessionId}/${uuidv4()}-${safeName}`;

  const { error } = await client.storage
    .from("whiteboard-files")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

  if (error) {
    return {
      url: URL.createObjectURL(file),
      path: "local",
      shared: false,
    };
  }

  const { data } = client.storage.from("whiteboard-files").getPublicUrl(path);
  const url = data?.publicUrl;

  if (!url) {
    return {
      url: URL.createObjectURL(file),
      path,
      shared: false,
    };
  }

  return { url, path, shared: true };
}
