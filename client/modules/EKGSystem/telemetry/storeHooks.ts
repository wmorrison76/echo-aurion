import { StoreApi } from "zustand";
import { telemetryClient } from "./telemetryClient";

export function instrumentStoreUpdates<T>(
  storeApi: StoreApi<T>,
  label: string,
) {
  return storeApi.subscribe(() => {
    telemetryClient.recordEvent({
      type: "store:update",
      detail: label,
    });
  });
}
