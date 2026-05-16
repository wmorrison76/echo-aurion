import { EchoAi3Core } from"./EchoAi3Core";
import { EchoHarmonyLayer } from"./EchoHarmonyLayer";
import { EchoPersonas } from"./EchoPersonas";
import { EchoMemoryVault } from"./EchoMemoryVault";
import { EchoTelemetry } from"./EchoTelemetry";
import { EchoReasonGraph } from"./EchoReasonGraph";
import { EchoDialogueBus } from"./EchoDialogueBus";
import { EchoContextCluster } from"./EchoContextCluster"; export interface EchoAi3System { core: EchoAi3Core; harmony: EchoHarmonyLayer; personas: EchoPersonas; vault: EchoMemoryVault; telemetry: EchoTelemetry; reason: EchoReasonGraph; bus: EchoDialogueBus; cluster: EchoContextCluster;
} let bootstrapped: EchoAi3System | null = null; export function initializeEchoAi3System(): EchoAi3System { if (bootstrapped) { return bootstrapped; } const core = EchoAi3Core.getInstance(); const harmony = EchoHarmonyLayer.initialize(core); const personas = EchoPersonas.getInstance(); const vault = EchoMemoryVault.getInstance(); const telemetry = EchoTelemetry.getInstance(); const reason = EchoReasonGraph.getInstance(); const bus = EchoDialogueBus.getInstance(); const cluster = EchoContextCluster.getInstance(); core.register("Echo", personas); core.register("Stratus", vault); core.register("Argus", telemetry); if (typeof window !=="undefined") { // eslint-disable-next-line no-console console.log("%c[EchoAi³] Mesh online — Personality, Memory, Collaboration active","color:#00ffa2"); } bootstrapped = { core, harmony, personas, vault, telemetry, reason, bus, cluster, }; return bootstrapped;
}
