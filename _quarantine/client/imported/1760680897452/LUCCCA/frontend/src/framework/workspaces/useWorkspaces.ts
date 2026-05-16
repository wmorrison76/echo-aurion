import { useMemo } from "react";
import type { Workspace } from "./workspace.types";
import { useWorkspacesApi } from "./WorkspacesProvider";

export function useWorkspaces(){
  const api = useWorkspacesApi();
  const list = api.list();
  const current = useMemo<Workspace | null>(() => {
    if (!api.currentId) return null;
    return api.load(api.currentId) ?? null;
  }, [api, list, api.currentId]);
  return { ...api, current, list };
}
