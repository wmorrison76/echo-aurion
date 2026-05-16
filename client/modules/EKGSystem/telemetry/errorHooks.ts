import { telemetryClient } from "./telemetryClient";

let errorHooksInstalled = false;

export function startErrorInstrumentation() {
  if (typeof window === "undefined" || errorHooksInstalled) return () => {};
  errorHooksInstalled = true;

  const onError = (event: ErrorEvent) => {
    telemetryClient.recordError({
      message: event.message || "Unknown error",
      stack: event.error?.stack,
      source: event.filename,
    });
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    telemetryClient.recordError({
      message:
        reason?.message || typeof reason === "string"
          ? reason
          : "Unhandled rejection",
      stack: reason?.stack,
      source: "unhandledrejection",
    });
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    errorHooksInstalled = false;
  };
}
