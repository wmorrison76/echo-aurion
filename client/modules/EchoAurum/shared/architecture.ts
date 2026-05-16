export type EchoSystemType = "aurum" | "stratus" | "ai3" | "synapse";
export type GuardianRole =
  | "data-compliance"
  | "auto-heal"
  | "rollback"
  | "emergency-defense"
  | "forecast-validity"
  | "model-drift";
export interface EchoSystemComponent {
  id: string;
  name: string;
  type: EchoSystemType;
  description: string;
  icon: string;
  color: string;
  glowColor: string;
  functions: string[];
}
export interface GuardianComponent {
  id: string;
  name: string;
  role: GuardianRole;
  system: "aurum" | "stratus" | "both";
  status: "active" | "monitoring" | "alert";
  description: string;
  icon: string;
  responsibilities: string[];
}
export interface DataFlowEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  type: "realtime" | "scheduled" | "event-driven" | "bidirectional";
  schema?: string;
  latency?: string;
}
export interface ArchitectureNode {
  id: string;
  label: string;
  type: "system" | "guardian" | "operation" | "data-source";
  system?: EchoSystemType;
  x: number;
  y: number;
  width: number;
  height: number;
  icon: string;
  description: string;
  details?: string[];
}
export interface ArchitectureLayer {
  id: string;
  name: string;
  description: string;
  systems: string[];
  y: number;
  height: number;
  color: string;
  components: ArchitectureNode[];
}
export interface ClosedLoopCycle {
  id: string;
  name: string;
  stages: Array<{
    name: string;
    system: "aurum" | "stratus";
    description: string;
    icon: string;
  }>;
  duration: string;
}
export interface SynapseConnection {
  id: string;
  protocol: "kafka" | "graphql" | "rest" | "grpc";
  messageSchema: string;
  throughput: string;
  latency: string;
  status: "healthy" | "degraded" | "critical";
}
export interface ArchitectureDashboard {
  systems: EchoSystemComponent[];
  guardians: GuardianComponent[];
  dataFlows: DataFlowEdge[];
  layers: ArchitectureLayer[];
  closedLoopCycle: ClosedLoopCycle;
  synapseConnections: SynapseConnection[];
  healthStatus: {
    aurum: "healthy" | "degraded" | "critical";
    stratus: "healthy" | "degraded" | "critical";
    ai3: "healthy" | "degraded" | "critical";
    synapse: "healthy" | "degraded" | "critical";
  };
}
