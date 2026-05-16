/**
 * EchoAi³ Sandbox Restore Expansion
 * ---------------------------------
 * This is a conceptual stub that tracks "snapshots" of module state
 * so you can roll back Builder.io sandboxes after experiments.
 */

const snapshots = new Map();

export function enableSandboxRecovery() {
  if (typeof window === "undefined") return;
  window.__ECHO_SANDBOX__ = {
    saveSnapshot,
    restoreSnapshot,
    listSnapshots,
  };
}

export function saveSnapshot(id, state) {
  snapshots.set(id, {
    state: JSON.parse(JSON.stringify(state || {})),
    savedAt: new Date().toISOString(),
  });
}

export function restoreSnapshot(id) {
  const snap = snapshots.get(id);
  if (!snap) return null;
  return JSON.parse(JSON.stringify(snap.state));
}

export function listSnapshots() {
  return Array.from(snapshots.entries()).map(([id, data]) => ({
    id,
    savedAt: data.savedAt,
  }));
}

/**
 * R&D-specific: Save experiment state snapshots for comparison
 */
export function saveExperimentSnapshot(experimentId, state) {
  const snapshotId = `experiment-${experimentId}-${Date.now()}`;
  saveSnapshot(snapshotId, {
    ...state,
    type: "experiment",
    experimentId,
  });
  return snapshotId;
}

/**
 * R&D-specific: Compare two experiment states
 */
export function compareExperimentSnapshots(snapshotId1, snapshotId2) {
  const snap1 = restoreSnapshot(snapshotId1);
  const snap2 = restoreSnapshot(snapshotId2);

  if (!snap1 || !snap2) return null;

  return {
    baseline: snapshotId1,
    variant: snapshotId2,
    differences: findDifferences(snap1, snap2),
  };
}

function findDifferences(obj1, obj2, path = "") {
  const diffs = [];

  const keys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);

  for (const key of keys) {
    const fullPath = path ? `${path}.${key}` : key;
    const val1 = obj1?.[key];
    const val2 = obj2?.[key];

    if (typeof val1 === "object" && typeof val2 === "object") {
      diffs.push(...findDifferences(val1, val2, fullPath));
    } else if (val1 !== val2) {
      diffs.push({
        path: fullPath,
        before: val1,
        after: val2,
      });
    }
  }

  return diffs;
}
