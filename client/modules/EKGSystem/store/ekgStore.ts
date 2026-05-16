import { create } from "zustand";
import { telemetryClient } from "../telemetry/telemetryClient";
import { TelemetrySnapshot, TreadmillStatus } from "../types";

const emptySnapshot: TelemetrySnapshot = {
  frames: [],
  events: [],
  api: [],
  errors: [],
  eventRate: 0,
};

interface EkgState {
  snapshot: TelemetrySnapshot;
  treadmill: TreadmillStatus;
  setTreadmill: (status: Partial<TreadmillStatus>) => void;
}

export const useEkgStore = create<EkgState>((set) => ({
  snapshot: emptySnapshot,
  treadmill: { level: "idle" },
  setTreadmill: (status) =>
    set((state) => ({
      treadmill: { ...state.treadmill, ...status },
    })),
}));

let telemetryBound = false;

function bindTelemetry() {
  if (telemetryBound) return;
  telemetryBound = true;
  telemetryClient.subscribe((snapshot) => {
    useEkgStore.setState({ snapshot });
  });
}

bindTelemetry();
