import { telemetryClient } from "./telemetryClient";

let restoreFetch: (() => void) | null = null;

export function installFetchInstrumentation() {
  if (typeof window === "undefined" || restoreFetch) return () => {};
  if (!window.fetch) return () => {};

  const originalFetch = window.fetch.bind(window);

  const instrumentedFetch: typeof fetch = async (input, init) => {
    const start = performance.now();
    const method =
      init?.method || (input instanceof Request ? input.method : "GET");
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input instanceof Request
            ? input.url
            : "unknown";

    try {
      const response = await originalFetch(input as any, init);
      const duration = performance.now() - start;
      telemetryClient.recordApiCall({
        url,
        method: method?.toUpperCase() ?? "GET",
        status: (response as Response)?.status,
        duration,
      });
      return response;
    } catch {
      const duration = performance.now() - start;
      telemetryClient.recordApiCall({
        url,
        method: method?.toUpperCase() ?? "GET",
        status: 0,
        duration,
      });

      return new Response(JSON.stringify({ error: "Network unavailable" }), {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "Content-Type": "application/json" },
      });
    }
  };

  // @ts-expect-error override for instrumentation
  window.fetch = instrumentedFetch;

  restoreFetch = () => {
    // @ts-expect-error restore original
    window.fetch = originalFetch;
    restoreFetch = null;
  };

  return () => {
    restoreFetch?.();
  };
}
