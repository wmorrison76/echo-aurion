import { useEffect, useState } from "react";

type OfflineState = {
  isOffline: boolean;
  lastChangedAt: number;
};

const initialState: OfflineState = {
  isOffline: typeof navigator !== "undefined" ? !navigator.onLine : false,
  lastChangedAt: Date.now(),
};

export function useOfflineStatus(): OfflineState {
  const [state, setState] = useState<OfflineState>(initialState);

  useEffect(() => {
    const handleOnline = () =>
      setState({ isOffline: false, lastChangedAt: Date.now() });
    const handleOffline = () =>
      setState({ isOffline: true, lastChangedAt: Date.now() });

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return state;
}
