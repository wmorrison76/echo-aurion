import { useEffect, useMemo } from "react";
import { EchoAi3Core } from "./EchoAi3Core";

export function useEchoAi3(moduleName: string) {
  const core = useMemo(() => EchoAi3Core.getInstance(), []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.log(`%c[EchoAi³] ${moduleName} node linked`, "color:#77f");
    }
    return () => {
      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-console
        console.log(`[EchoAi³] ${moduleName} node unlinked`);
      }
    };
  }, [moduleName]);

  return {
    broadcast(type: string, data?: any) {
      core.broadcast("Echo", `${moduleName}:${type}`, data);
    },
    core,
  };
}
