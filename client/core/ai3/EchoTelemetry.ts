import { EchoAi3Core } from "./EchoAi3Core";

export interface TelemetryPacket {
  module: string;
  emotion?: string;
  sentiment?: number;
  latencyMs?: number;
  fps?: number;
  memoryUse?: number;
  message?: string;
  error?: string;
  timestamp: number;
}

export class EchoTelemetry {
  private static instance: EchoTelemetry | null = null;
  private readonly core = EchoAi3Core.getInstance();
  private readonly packets: TelemetryPacket[] = [];
  private readonly limit = 500;

  private constructor() {}

  static getInstance() {
    if (!EchoTelemetry.instance) {
      EchoTelemetry.instance = new EchoTelemetry();
    }
    return EchoTelemetry.instance;
  }

  capture(packet: TelemetryPacket) {
    const entry: TelemetryPacket = { ...packet, timestamp: packet.timestamp ?? Date.now() };
    this.packets.push(entry);
    if (this.packets.length > this.limit) {
      this.packets.splice(0, this.packets.length - this.limit);
    }
    this.core.broadcast("Argus", "telemetryUpdate", entry);
  }

  getRecent(limit = 12) {
    return this.packets.slice(-limit);
  }

  getAverageSentiment() {
    const vals = this.packets.filter((p) => typeof p.sentiment === "number").map((p) => p.sentiment!);
    if (!vals.length) return 0;
    return vals.reduce((acc, value) => acc + value, 0) / vals.length;
  }

  getPerformanceStats() {
    const fps = this.packets.filter((p) => typeof p.fps === "number").map((p) => p.fps!);
    const latency = this.packets.filter((p) => typeof p.latencyMs === "number").map((p) => p.latencyMs!);
    return {
      avgFPS: fps.length ? fps.reduce((a, b) => a + b, 0) / fps.length : 0,
      avgLatency: latency.length ? latency.reduce((a, b) => a + b, 0) / latency.length : 0,
      totalPackets: this.packets.length,
    };
  }
}
