import { useEffect, useMemo, useState } from "react";
import { detectDeviceKind, type DeviceKind } from "@/lib/genesis/device/device/device";

export function useDeviceKind(): DeviceKind {
  const [w, setW] = useState<number>(() => (typeof window !== "undefined" ? window.innerWidth : 1200));

  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return useMemo(() => detectDeviceKind(w), [w]);
}
