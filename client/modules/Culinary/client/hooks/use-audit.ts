import { useCallback } from "react";

type AuditPayload = {
  action: string;
  entity?: string;
  entityId?: string | number;
  data?: unknown;
};

type AuditClient = {
  log: (event: AuditPayload) => Promise<void>;
};

export function useAudit(): AuditClient {
  const log = useCallback(async (event: AuditPayload) => {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console -- intentional for Builder dev visibility
      console.info("[Audit]", event);
    }
  }, []);

  return { log };
}
