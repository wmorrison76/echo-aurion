// ============================================================================
// MODULE: aiSmartSnap.ts
// PURPOSE:
// Context-aware snapping engine that learns user alignment behavior over time.
// Feeds EchoAi³ with alignment deltas to improve predictive placement.
//
// INTEGRATES WITH:
// - useSceneStore / TransformControls
// - EchoAi³ event log (POST /api/ai/events)
// - SnapPrefs Store
// ============================================================================ import { Vector3 } from"three"
import { useSnapStore } from"@/store/snapStore" export interface SmartSnapEvent { objectId: string before: Vector3 after: Vector3 delta: Vector3
} export function applySmartSnap(position: Vector3): Vector3 { const state = useSnapStore.getState() const gridSize = state.gridSize || 0.5 const snapped = position.clone() snapped.x = Math.round(snapped.x / gridSize) * gridSize snapped.z = Math.round(snapped.z / gridSize) * gridSize return snapped
} export async function logSnapEvent(e: SmartSnapEvent) { try { await fetch("/api/ai/events", { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ type:"snap", ...e }), }) } catch (err) { console.warn("Failed to log snap event", err) }
}
