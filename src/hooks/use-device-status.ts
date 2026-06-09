import { useEffect, useRef, useState, useCallback } from "react";
import { DEVICES, mockPing, type DeviceStatus } from "@/lib/devices";

export type StatusMap = Record<number, DeviceStatus>;

export function useDeviceStatus(intervalMs = 5000) {
  const [status, setStatus] = useState<StatusMap>(() =>
    Object.fromEntries(DEVICES.map((d) => [d.id, "unknown" as DeviceStatus])),
  );
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    const entries = await Promise.all(
      DEVICES.map(async (d) => [d.id, await mockPing(d.ip)] as const),
    );
    if (!mounted.current) return;
    setStatus(Object.fromEntries(entries));
    setLastUpdate(Date.now());
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh();
    const t = setInterval(refresh, intervalMs);
    return () => {
      mounted.current = false;
      clearInterval(t);
    };
  }, [refresh, intervalMs]);

  return { status, refresh, lastUpdate };
}
