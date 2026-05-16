// ============================================================================
// MODULE: TeamMergeService.ts
// PURPOSE:
// Server-side utility for combining multi-user scan data into a single
// coherent 3D room mesh.
//
// ALGORITHM:
// 1. Compute centroid from GPS positions.
// 2. Align orientations using yaw averaging.
// 3. Merge point clouds / meshes with simple ICP (placeholder WASM).
// 4. Output merged mesh and metadata.
//
// INTEGRATES WITH:
// - EchoFusion API (/api/fusion/merge)
// - useScanBridge outputs
// - EchoAi³ for fusion quality training
// ============================================================================ export interface ScanMeta { userId: string gps: [number, number] orientation: number timestamp: number meshData: Float32Array
} export interface MergedScanResult { centroid: [number, number] mergedOrientation: number mergedMesh: Float32Array
} export async function mergeTeamScans(scans: ScanMeta[]): Promise<MergedScanResult> { if (scans.length === 0) throw new Error("No scans to merge") const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length const centroid: [number, number] = [ avg(scans.map((s) => s.gps[0])), avg(scans.map((s) => s.gps[1])), ] const mergedOrientation = avg(scans.map((s) => s.orientation)) const mergedMesh = new Float32Array( scans.reduce((a, s) => a + s.meshData.length, 0) ) let offset = 0 for (const s of scans) { mergedMesh.set(s.meshData, offset) offset += s.meshData.length } const result: MergedScanResult = { centroid, mergedOrientation, mergedMesh } await fetch("/api/ai/events", { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ type:"merge", users: scans.map((s) => s.userId), centroid, mergedOrientation, meshSize: mergedMesh.length, }), }).catch(() => {}) return result
}
