import {
  appendAtPath,
  getAtPath,
  setAtPath,
  unsetAtPath,
  upsertAtPath,
} from "./objectPath";
import type { ApplyFixResult, CommitteeProposal, ProposalFixOp } from "./types";
function cloneProposal<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}
export interface ApplyFixesOutput {
  proposal: CommitteeProposal;
  results: ApplyFixResult[];
}
export function applyFixes(
  proposal: CommitteeProposal,
  fixes: ProposalFixOp[],
): ApplyFixesOutput {
  if (!fixes.length) {
    return { proposal, results: [] };
  }
  const next = cloneProposal(proposal);
  const results: ApplyFixResult[] = [];
  for (const fix of fixes) {
    try {
      switch (fix.type) {
        case "replace": {
          setAtPath(next, fix.path, fix.value);
          results.push({ fix, success: true });
          break;
        }
        case "increment": {
          const current = getAtPath<number>(next, fix.path) ?? 0;
          if (typeof current !== "number")
            throw new Error(`Cannot increment non-number at ${fix.path}`);
          setAtPath(next, fix.path, current + fix.value);
          results.push({ fix, success: true });
          break;
        }
        case "append": {
          appendAtPath(next, fix.path, fix.value);
          results.push({ fix, success: true });
          break;
        }
        case "remove": {
          unsetAtPath(next, fix.path);
          results.push({ fix, success: true });
          break;
        }
        case "upsert": {
          upsertAtPath(
            next,
            fix.selector.path,
            fix.selector.key,
            fix.selector.id,
            fix.value,
          );
          results.push({ fix, success: true });
          break;
        }
        default: {
          const exhaustive: never = fix;
          throw new Error(`Unhandled fix op ${(exhaustive as any)?.type}`);
        }
      }
    } catch (error) {
      results.push({
        fix,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { proposal: next, results };
}
