import {
  ApiMetric,
  ErrorLog,
  EventMetric,
  FrameMetric,
  MemoryMetric,
  TelemetrySnapshot,
} from "../types";
import { sessionRecorder } from "./sessionRecorder";

const MAX_FRAMES = 240;
const MAX_EVENTS = 300;
const MAX_API = 200;
const MAX_ERRORS = 100;

type Subscriber = (snapshot: TelemetrySnapshot) => void;

class TelemetryClient {
  private frames: FrameMetric[] = [];
  private events: EventMetric[] = [];
  private api: ApiMetric[] = [];
  private errors: ErrorLog[] = [];
  private memory?: MemoryMetric;
  private subscribers: Set<Subscriber> = new Set();

  recordFrame(frameMs: number, longTask = false) {
    const fps = frameMs > 0 ? Math.min(120, 1000 / frameMs) : 0;
    this.frames.push({
      timestamp: Date.now(),
      frameMs,
      fps,
      longTask,
    });
    this.trim(this.frames, MAX_FRAMES);
    this.emit();
  }

  recordEvent(event: EventMetric) {
    this.events.push({ ...event, timestamp: Date.now() });
    this.trim(this.events, MAX_EVENTS);
    sessionRecorder.record("event_emitted", event);
    this.emit();
  }

  recordApiCall(metric: Omit<ApiMetric, "timestamp">) {
    this.api.push({ ...metric, timestamp: Date.now() });
    this.trim(this.api, MAX_API);
    sessionRecorder.record("api_call", metric as any);
    this.emit();
  }

  recordError(error: Omit<ErrorLog, "timestamp">) {
    this.errors.push({ ...error, timestamp: Date.now() });
    this.trim(this.errors, MAX_ERRORS);
    sessionRecorder.record("error", error as any);
    this.emit();
  }

  recordMemory(memory: MemoryMetric) {
    this.memory = { ...memory, timestamp: Date.now() };
    sessionRecorder.record("store_snapshot", { memory });
    this.emit();
  }

  subscribe(fn: Subscriber) {
    this.subscribers.add(fn);
    fn(this.snapshot());
    return () => this.subscribers.delete(fn);
  }

  snapshot(): TelemetrySnapshot {
    const now = Date.now();
    const windowStart = now - 60_000;
    const eventRate = this.events.filter(
      (e) => e.timestamp >= windowStart,
    ).length;

    return {
      frames: [...this.frames],
      events: [...this.events],
      api: [...this.api],
      errors: [...this.errors],
      memory: this.memory,
      eventRate,
    };
  }

  private emit() {
    const snap = this.snapshot();
    this.subscribers.forEach((fn) => {
      try {
        fn(snap);
      } catch (err) {
        console.debug("[telemetryClient] subscriber error", err);
      }
    });
  }

  private trim<T>(buffer: T[], max: number) {
    if (buffer.length > max) {
      buffer.splice(0, buffer.length - max);
    }
  }
}

export const telemetryClient = new TelemetryClient();
