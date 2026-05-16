export interface FrameMetric {
  timestamp: number;
  frameMs: number;
  fps: number;
  longTask?: boolean;
}

export interface ApiMetric {
  timestamp: number;
  url: string;
  method: string;
  status?: number;
  duration: number;
}

export interface EventMetric {
  timestamp: number;
  type: string;
  detail?: string;
}

export interface MemoryMetric {
  timestamp: number;
  usedMB?: number;
  totalMB?: number;
  unavailable?: boolean;
}

export interface ErrorLog {
  timestamp: number;
  message: string;
  stack?: string;
  source?: string;
}

export interface TelemetrySnapshot {
  frames: FrameMetric[];
  events: EventMetric[];
  api: ApiMetric[];
  errors: ErrorLog[];
  memory?: MemoryMetric;
  eventRate: number;
}

export type TreadmillLevel = "idle" | "running" | "paused";

export interface TreadmillStatus {
  level: TreadmillLevel;
  activeScenario?: string;
}
