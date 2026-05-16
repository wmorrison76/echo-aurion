import { useMemo } from "react";
import {
  resolveCommitteeConfig,
  type ResolveCommitteeConfigOptions,
} from "@modules/Maestro/committee/config";
import type { CommitteeConfig } from "@modules/Maestro/committee";
export function useCommitteeConfig(
  options?: ResolveCommitteeConfigOptions,
): CommitteeConfig {
  return useMemo(() => resolveCommitteeConfig(options), [options?.overrides]);
}
