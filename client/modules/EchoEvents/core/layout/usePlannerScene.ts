import { useCallback, useState } from "react";
import * as THREE from "three";
import { PlannerScene, isPlannerScene } from "./PlannerSchema";
import { PlannerToStudioBridge, BridgeOptions } from "./PlannerToStudioBridge";
export interface BuildOptions extends BridgeOptions {
  clearScene?: (scene: THREE.Scene) => void;
}
export function usePlannerScene(defaultScene?: PlannerScene | string) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState<string | null>(null);
  const parseScene = useCallback(
    (input: PlannerScene | string | undefined): PlannerScene | null => {
      if (!input) {
        return null;
      }
      if (typeof input === "string") {
        try {
          const parsed = JSON.parse(input) as unknown;
          if (isPlannerScene(parsed)) {
            return parsed;
          }
          setError("Invalid PlannerScene schema");
          return null;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setError(`JSON parse error: ${message}`);
          return null;
        }
      }
      if (!isPlannerScene(input)) {
        setError("Invalid PlannerScene schema");
        return null;
      }
      return input;
    },
    [],
  );
  const build = useCallback(
    async (
      scene: THREE.Scene,
      input?: PlannerScene | string,
      options?: BuildOptions,
    ) => {
      setError(null);
      setStatus("parsing");
      const data = parseScene(input ?? defaultScene);
      if (!data) {
        return;
      }
      setStatus("importing");
      if (options?.clearScene) {
        options.clearScene(scene);
      }
      const bridge = new PlannerToStudioBridge(scene, {
        assetRoot: options?.assetRoot,
        onProgress: (message) => {
          setStatus(message);
          options?.onProgress?.(message);
        },
        onError: (err) => {
          setError(err.message);
          options?.onError?.(err);
        },
      });
      await bridge.import(data);
      setStatus("ready");
    },
    [defaultScene, parseScene],
  );
  return { status, error, build };
}
