import type { BEODocument } from "@/../shared/types/beo";

/**
 * Check if a field was changed in the most recent revision
 * Used by BEOPrintView to highlight diffs
 */
export function isChanged(doc: BEODocument | undefined, path: string): boolean {
  if (!doc) return false;

  const lastRevision = doc.revisions?.[doc.revisions.length - 1];
  if (!lastRevision) return false;

  return lastRevision.changes.some((c) => c.path.includes(path));
}

/**
 * Get highlight style for changed fields
 * Returns inline style object for React
 */
export function getHighlightStyle(
  doc: BEODocument | undefined,
  path: string,
): React.CSSProperties {
  if (isChanged(doc, path)) {
    return {
      background: "rgba(255, 235, 59, 0.35)",
      transition: "background 0.2s ease",
    };
  }
  return {};
}

/**
 * Get all changed field paths in most recent revision
 * Useful for generating summary of what changed
 */
export function getChangedPaths(doc: BEODocument | undefined): Set<string> {
  const paths = new Set<string>();

  if (!doc?.revisions || doc.revisions.length === 0) {
    return paths;
  }

  const lastRevision = doc.revisions[doc.revisions.length - 1];
  lastRevision.changes.forEach((change) => {
    paths.add(change.path);
  });

  return paths;
}
