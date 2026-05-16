import type { OpsResource, OpsResourceType, OpsTask, UUID } from "../types/ops-gantt";
import { clampNumber, parseIsoToMs } from "./time";

export interface ResourceAllocation {
  resourceId: UUID;
  resourceType: OpsResourceType;
  taskId: UUID;
  eventId: UUID;
  startMs: number;
  endMs: number;
  units: number;
}

export interface ResourceCapacityConflict {
  resourceId: UUID;
  resourceType: OpsResourceType;
  /**
   * Max allowed concurrent units (capacity) during the conflict window.
   */
  capacity: number;
  /**
   * Observed max concurrent units during the window.
   */
  observedPeak: number;
  windowStartMs: number;
  windowEndMs: number;
  taskIds: UUID[];
  message: string;
}

export interface ResourceLoadBucket {
  resourceId: UUID;
  resourceType: OpsResourceType;
  bucketStartMs: number;
  bucketEndMs: number;
  /**
   * Concurrent units in the bucket (max during bucket).
   */
  peakUnits: number;
  /**
   * 0..1 normalized vs capacity (clamped).
   */
  utilization: number;
}

export interface ResourceLoadResult {
  allocations: ResourceAllocation[];
  conflicts: ResourceCapacityConflict[];
  buckets: ResourceLoadBucket[];
}

function isValidWindow(startMs: number, endMs: number): boolean {
  return Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs;
}

function resourceCapacity(resource: OpsResource): number {
  const cap = resource.capacity ?? 1;
  return Math.max(1, Math.floor(cap));
}

function buildAllocations(tasks: OpsTask[], resourcesById: Map<UUID, OpsResource>): ResourceAllocation[] {
  const allocations: ResourceAllocation[] = [];

  for (const t of tasks) {
    const s = parseIsoToMs(t.start);
    const e = parseIsoToMs(t.end);
    if (s === null || e === null || !isValidWindow(s, e)) continue;

    // People/team allocations (assigneeIds).
    for (const personId of t.assigneeIds ?? []) {
      const r = resourcesById.get(personId);
      const type: OpsResourceType = r?.resourceType ?? "person";
      allocations.push({
        resourceId: personId,
        resourceType: type,
        taskId: t.taskId,
        eventId: t.eventId,
        startMs: s,
        endMs: e,
        units: 1,
      });
    }

    // Non-person resources (resourceIds).
    for (const rid of t.resourceIds ?? []) {
      const r = resourcesById.get(rid);
      if (!r) continue; // Unknown resource -> ignore rather than guess.
      allocations.push({
        resourceId: rid,
        resourceType: r.resourceType,
        taskId: t.taskId,
        eventId: t.eventId,
        startMs: s,
        endMs: e,
        units: 1,
      });
    }
  }

  return allocations;
}

/**
 * Computes:
 * - per-resource allocations
 * - capacity conflicts (overlap count > capacity)
 * - heatmap-ready buckets (peak utilization per bucket)
 */
export function computeResourceLoad(
  tasks: OpsTask[],
  resources: OpsResource[],
  opts?: { bucketMinutes?: number },
): ResourceLoadResult {
  const bucketMinutes = Math.max(5, Math.floor(opts?.bucketMinutes ?? 30));
  const resourcesById = new Map<UUID, OpsResource>(resources.map((r) => [r.resourceId, r]));

  const allocations = buildAllocations(tasks, resourcesById);

  // Group allocations by resource.
  const byResource = new Map<UUID, ResourceAllocation[]>();
  for (const a of allocations) {
    const list = byResource.get(a.resourceId) ?? [];
    list.push(a);
    byResource.set(a.resourceId, list);
  }

  const conflicts: ResourceCapacityConflict[] = [];
  const buckets: ResourceLoadBucket[] = [];

  for (const [resourceId, list] of byResource.entries()) {
    const resource = resourcesById.get(resourceId);
    if (!resource) continue;

    const cap = resourceCapacity(resource);
    const sorted = list.slice().sort((a, b) => a.startMs - b.startMs);

    // Sweep-line events.
    const points: Array<{ at: number; delta: number; taskId: UUID }> = [];
    for (const a of sorted) {
      points.push({ at: a.startMs, delta: a.units, taskId: a.taskId });
      points.push({ at: a.endMs, delta: -a.units, taskId: a.taskId });
    }
    points.sort((a, b) => (a.at - b.at) || (a.delta - b.delta)); // ends before starts at same time

    let current = 0;
    let max = 0;
    let windowStart: number | null = null;
    let windowPeak = 0;
    const active = new Map<UUID, number>();

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const prevAt = points[i - 1]?.at;
      const at = p.at;

      // If we were in an over-capacity window, it lasts until this point.
      if (windowStart !== null && prevAt !== undefined && at > prevAt) {
        // window continues; nothing to do here
      }

      // Apply delta.
      current += p.delta;
      if (p.delta > 0) active.set(p.taskId, (active.get(p.taskId) ?? 0) + p.delta);
      if (p.delta < 0) {
        const next = (active.get(p.taskId) ?? 0) + p.delta;
        if (next <= 0) active.delete(p.taskId);
        else active.set(p.taskId, next);
      }

      max = Math.max(max, current);

      const over = current > cap;
      if (over && windowStart === null) {
        windowStart = at;
        windowPeak = current;
      } else if (over && windowStart !== null) {
        windowPeak = Math.max(windowPeak, current);
      }

      const nextAt = points[i + 1]?.at;
      const leavingOver = windowStart !== null && !over;
      const lastPoint = i === points.length - 1;
      const endAt = leavingOver ? at : lastPoint ? at : null;

      if (windowStart !== null && endAt !== null && endAt > windowStart) {
        conflicts.push({
          resourceId,
          resourceType: resource.resourceType,
          capacity: cap,
          observedPeak: windowPeak,
          windowStartMs: windowStart,
          windowEndMs: endAt,
          taskIds: Array.from(active.keys()),
          message: `${resource.name} over capacity (${windowPeak}/${cap})`,
        });
        windowStart = null;
        windowPeak = 0;
      }

      // Build buckets between this point and next point using current value.
      if (nextAt !== undefined && nextAt > at) {
        const bucketSizeMs = bucketMinutes * 60_000;
        const startBucket = Math.floor(at / bucketSizeMs) * bucketSizeMs;
        const endBucket = Math.ceil(nextAt / bucketSizeMs) * bucketSizeMs;
        for (let b = startBucket; b < endBucket; b += bucketSizeMs) {
          const bStart = b;
          const bEnd = b + bucketSizeMs;
          const overlapStart = Math.max(bStart, at);
          const overlapEnd = Math.min(bEnd, nextAt);
          if (overlapEnd <= overlapStart) continue;

          // Peak within bucket: for our sweep, current is constant between points.
          const peakUnits = current;
          const utilization = clampNumber(peakUnits / cap, 0, 1);

          // Merge with existing bucket if present.
          const existing = buckets.find(
            (x) =>
              x.resourceId === resourceId &&
              x.bucketStartMs === bStart &&
              x.bucketEndMs === bEnd,
          );
          if (existing) {
            existing.peakUnits = Math.max(existing.peakUnits, peakUnits);
            existing.utilization = clampNumber(existing.peakUnits / cap, 0, 1);
          } else {
            buckets.push({
              resourceId,
              resourceType: resource.resourceType,
              bucketStartMs: bStart,
              bucketEndMs: bEnd,
              peakUnits,
              utilization,
            });
          }
        }
      }
    }

    // If max <= cap, no capacity conflicts (buckets still exist).
    void max;
  }

  // Sort for stable consumption.
  buckets.sort((a, b) => (a.resourceId.localeCompare(b.resourceId) || a.bucketStartMs - b.bucketStartMs));
  conflicts.sort((a, b) => (a.resourceId.localeCompare(b.resourceId) || a.windowStartMs - b.windowStartMs));

  return { allocations, conflicts, buckets };
}

