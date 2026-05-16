import { telemetryClient } from "./telemetryClient";

let restoreDispatch: (() => void) | null = null;

export function startEventBusInstrumentation() {
  if (typeof window === "undefined" || restoreDispatch) return () => {};

  const originalDispatch = window.dispatchEvent.bind(window);

  const instrumentedDispatch: typeof window.dispatchEvent = (event: Event) => {
    try {
      if (event instanceof CustomEvent) {
        const detail =
          typeof event.detail === "string"
            ? event.detail
            : event.detail
              ? JSON.stringify(event.detail).slice(0, 120)
              : undefined;
        telemetryClient.recordEvent({
          type: event.type,
          detail,
        });
      }
    } catch (err) {
      console.debug("[eventBusHooks] dispatch instrumentation skipped", err);
    }
    return originalDispatch(event);
  };

  // @ts-expect-error override for instrumentation
  window.dispatchEvent = instrumentedDispatch;

  restoreDispatch = () => {
    // @ts-expect-error restore original
    window.dispatchEvent = originalDispatch;
    restoreDispatch = null;
  };

  return () => {
    restoreDispatch?.();
  };
}
