/**
 * Version Utilities
 *
 * Semver-style versioning for menu items. The three levels encode
 * different change types:
 *
 *   MAJOR (X.0.0): Recipe change — affects what's served
 *                  Forces re-approval of any BEO that locked this item
 *   MINOR (0.X.0): Description/copy change — affects how it's presented
 *                  Notifies BEO holders but doesn't block
 *   PATCH (0.0.X): Price or metadata change — invisible to most users
 *                  Auto-applies to non-locked uses
 *
 * This distinction is critical: a price update shouldn't invalidate
 * a signed BEO, but a recipe change must.
 */

import type { ItemSnapshot, ItemVersion, UserId } from '../BanquetMenuBuilder.types';

export type ChangeType = 'major' | 'minor' | 'patch';

export interface VersionString {
  major: number;
  minor: number;
  patch: number;
  raw: string;
}

/**
 * Parse a semver string like "4.2.1" into components.
 */
export function parseVersion(version: string): VersionString {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid version string: ${version}. Expected format: X.Y.Z`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    raw: version,
  };
}

/**
 * Format a version object back to string.
 */
export function formatVersion(v: Pick<VersionString, 'major' | 'minor' | 'patch'>): string {
  return `${v.major}.${v.minor}.${v.patch}`;
}

/**
 * Bump a version based on change type.
 * Resets lower components when bumping a higher one.
 */
export function bumpVersion(currentVersion: string, changeType: ChangeType): string {
  const v = parseVersion(currentVersion);

  switch (changeType) {
    case 'major':
      return formatVersion({ major: v.major + 1, minor: 0, patch: 0 });
    case 'minor':
      return formatVersion({ major: v.major, minor: v.minor + 1, patch: 0 });
    case 'patch':
      return formatVersion({ major: v.major, minor: v.minor, patch: v.patch + 1 });
  }
}

/**
 * Compare two versions. Returns negative if a < b, positive if a > b, 0 if equal.
 */
export function compareVersions(a: string, b: string): number {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  if (va.major !== vb.major) return va.major - vb.major;
  if (va.minor !== vb.minor) return va.minor - vb.minor;
  return va.patch - vb.patch;
}

/**
 * Determine the change type by comparing two snapshots.
 */
export function detectChangeType(
  oldSnapshot: ItemSnapshot,
  newSnapshot: ItemSnapshot
): ChangeType {
  if (oldSnapshot.category !== newSnapshot.category) return 'major';
  if (JSON.stringify(oldSnapshot.dietary) !== JSON.stringify(newSnapshot.dietary)) {
    return 'major';
  }
  if (
    JSON.stringify(oldSnapshot.serviceRequirement) !==
    JSON.stringify(newSnapshot.serviceRequirement)
  ) {
    return 'major';
  }
  if (JSON.stringify(oldSnapshot.descriptions) !== JSON.stringify(newSnapshot.descriptions)) {
    return 'minor';
  }
  if (
    JSON.stringify(oldSnapshot.taglineOptions) !== JSON.stringify(newSnapshot.taglineOptions)
  ) {
    return 'minor';
  }
  return 'patch';
}

/**
 * Build a new ItemVersion record.
 */
export function createItemVersion(params: {
  previousVersion: string;
  changeType: ChangeType;
  changeReason: string;
  snapshot: ItemSnapshot;
  changedBy: UserId;
  approvedBy?: UserId;
}): ItemVersion {
  const newVersionId = bumpVersion(params.previousVersion, params.changeType);
  const now = new Date();

  return {
    versionId: newVersionId,
    changeType: params.changeType,
    changeReason: params.changeReason,
    snapshot: params.snapshot,
    changedBy: params.changedBy,
    changedAt: now,
    approvedBy: params.approvedBy,
    approvedAt: params.approvedBy ? now : undefined,
    lockedByBEOs: [],
  };
}

/**
 * Build an initial version 1.0.0 for newly created items.
 */
export function createInitialVersion(params: {
  snapshot: ItemSnapshot;
  changedBy: UserId;
  approvedBy?: UserId;
}): ItemVersion {
  const now = new Date();
  return {
    versionId: '1.0.0',
    changeType: 'major',
    changeReason: 'Initial creation',
    snapshot: params.snapshot,
    changedBy: params.changedBy,
    changedAt: now,
    approvedBy: params.approvedBy,
    approvedAt: params.approvedBy ? now : undefined,
    lockedByBEOs: [],
  };
}
