/**
 * LUCCCA Framework — Bluetooth Thermometer Integration
 * =====================================================
 * Web Bluetooth API hook for pairing BLE temperature probes
 * Supports: ThermoWorks BlueDOT, Meater+, FireBoard, InkBird, generic BLE thermometers
 *
 * Location: client/hooks/use-bluetooth-thermometer.ts
 * Wire onReading to HaccpComplianceWorkspace handleCreateLog. Requires HTTPS.
 */

import { useCallback, useEffect, useRef, useState } from "react";

const THERMOMETER_PROFILES: Record<
  string,
  {
    name: string;
    serviceUUID: string;
    characteristicUUID: string;
    parseReading: (data: DataView) => number;
    batteryServiceUUID?: string;
    batteryCharUUID?: string;
  }
> = {
  generic_htp: {
    name: "Generic Health Thermometer",
    serviceUUID: "00001809-0000-1000-8000-00805f9b34fb",
    characteristicUUID: "00002a1c-0000-1000-8000-00805f9b34fb",
    parseReading: (dv: DataView) => {
      const flags = dv.getUint8(0);
      const isFahrenheit = (flags & 0x01) !== 0;
      const mantissa =
        dv.getUint8(1) | (dv.getUint8(2) << 8) | (dv.getUint8(3) << 16);
      const exponent = dv.getInt8(4);
      let temp = mantissa * Math.pow(10, exponent);
      if (isFahrenheit) temp = (temp - 32) * (5 / 9);
      return temp;
    },
    batteryServiceUUID: "0000180f-0000-1000-8000-00805f9b34fb",
    batteryCharUUID: "00002a19-0000-1000-8000-00805f9b34fb",
  },
  thermoworks_bluedot: {
    name: "ThermoWorks BlueDOT",
    serviceUUID: "0000fff0-0000-1000-8000-00805f9b34fb",
    characteristicUUID: "0000fff1-0000-1000-8000-00805f9b34fb",
    parseReading: (dv: DataView) => dv.getInt16(0, true) / 10,
  },
  inkbird: {
    name: "InkBird Sensor",
    serviceUUID: "0000fff0-0000-1000-8000-00805f9b34fb",
    characteristicUUID: "0000fff2-0000-1000-8000-00805f9b34fb",
    parseReading: (dv: DataView) => dv.getInt16(0, true) / 100,
  },
  meater: {
    name: "Meater+",
    serviceUUID: "a75cc7fc-c956-488f-ac2a-2dbc08b63a04",
    characteristicUUID: "7edda774-045e-4bbf-909b-45d1991a2876",
    parseReading: (dv: DataView) => dv.getUint16(0, true) / 16 + 8,
  },
  fireboard: {
    name: "FireBoard",
    serviceUUID: "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
    characteristicUUID: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
    parseReading: (dv: DataView) => {
      const bytes: number[] = [];
      for (let i = 0; i < dv.byteLength; i++) bytes.push(dv.getUint8(i));
      try {
        const parsed = JSON.parse(String.fromCharCode(...bytes));
        return parsed.ch1 ?? parsed.temp ?? 0;
      } catch {
        return dv.byteLength >= 2 ? dv.getInt16(0, true) / 10 : 0;
      }
    },
  },
  sensorpush: {
    name: "SensorPush",
    serviceUUID: "ef090000-11d6-42ba-93b8-9dd7ec090ab0",
    characteristicUUID: "ef090001-11d6-42ba-93b8-9dd7ec090ab0",
    parseReading: (dv: DataView) => dv.getInt32(0, true) / 1000,
  },
};

export type ThermometerDevice = {
  id: string;
  name: string;
  profile: string;
  device: BluetoothDevice;
  server?: BluetoothRemoteGATTServer;
  characteristic?: BluetoothRemoteGATTCharacteristic;
  batteryLevel?: number;
  connected: boolean;
  lastReading?: TemperatureReading;
  signalStrength?: number;
};

export type TemperatureReading = {
  deviceId: string;
  deviceName: string;
  temperatureC: number;
  temperatureF: number;
  timestamp: string;
  batteryLevel?: number;
};

export type ThermometerHookOptions = {
  onReading?: (reading: TemperatureReading) => void;
  onAlert?: (reading: TemperatureReading, reason: string) => void;
  onConnectionChange?: (device: ThermometerDevice) => void;
  onError?: (error: Error, deviceId?: string) => void;
  pollIntervalMs?: number;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
};

function celsiusToFahrenheit(c: number): number {
  return c * (9 / 5) + 32;
}

export function useBluetoothThermometer(options: ThermometerHookOptions = {}) {
  const {
    onReading,
    onAlert,
    onConnectionChange,
    onError,
    pollIntervalMs = 5000,
    autoReconnect = true,
    maxReconnectAttempts = 3,
  } = options;

  const [devices, setDevices] = useState<Map<string, ThermometerDevice>>(
    new Map(),
  );
  const [isScanning, setIsScanning] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [readings, setReadings] = useState<TemperatureReading[]>([]);
  const pollTimersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(
    new Map(),
  );
  const reconnectAttemptsRef = useRef<Map<string, number>>(new Map());
  const callbacksRef = useRef({
    onReading,
    onAlert,
    onConnectionChange,
    onError,
  });

  useEffect(() => {
    callbacksRef.current = { onReading, onAlert, onConnectionChange, onError };
  }, [onReading, onAlert, onConnectionChange, onError]);

  useEffect(() => {
    const supported =
      typeof navigator !== "undefined" &&
      "bluetooth" in navigator &&
      typeof (navigator as any).bluetooth?.requestDevice === "function";
    setIsSupported(supported);
  }, []);

  const processReading = useCallback(
    (deviceId: string, deviceName: string, tempC: number, battery?: number) => {
      const reading: TemperatureReading = {
        deviceId,
        deviceName,
        temperatureC: Math.round(tempC * 10) / 10,
        temperatureF: Math.round(celsiusToFahrenheit(tempC) * 10) / 10,
        timestamp: new Date().toISOString(),
        batteryLevel: battery,
      };
      setReadings((prev) => [reading, ...prev].slice(0, 500));
      setDevices((prev) => {
        const next = new Map(prev);
        const device = next.get(deviceId);
        if (device)
          next.set(deviceId, {
            ...device,
            lastReading: reading,
            batteryLevel: battery,
          });
        return next;
      });
      callbacksRef.current.onReading?.(reading);
    },
    [],
  );

  const handleNotification = useCallback(
    (deviceId: string, deviceName: string, profile: string) =>
      (event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        const value = target.value;
        if (!value) return;
        try {
          const profileDef = THERMOMETER_PROFILES[profile];
          if (!profileDef) return;
          const tempC = profileDef.parseReading(value);
          if (!Number.isFinite(tempC) || tempC < -50 || tempC > 500) return;
          processReading(deviceId, deviceName, tempC);
        } catch (err) {
          callbacksRef.current.onError?.(
            err instanceof Error ? err : new Error(String(err)),
            deviceId,
          );
        }
      },
    [processReading],
  );

  const readBatteryLevel = useCallback(
    async (
      server: BluetoothRemoteGATTServer,
      profile: string,
    ): Promise<number | undefined> => {
      const profileDef = THERMOMETER_PROFILES[profile];
      if (!profileDef?.batteryServiceUUID || !profileDef?.batteryCharUUID)
        return undefined;
      try {
        const batteryService = await server.getPrimaryService(
          profileDef.batteryServiceUUID,
        );
        const batteryChar = await batteryService.getCharacteristic(
          profileDef.batteryCharUUID,
        );
        const value = await batteryChar.readValue();
        return value.getUint8(0);
      } catch {
        return undefined;
      }
    },
    [],
  );

  const connectToProfile = useCallback(
    async (
      device: BluetoothDevice,
      profileKey: string,
    ): Promise<ThermometerDevice | null> => {
      const profile = THERMOMETER_PROFILES[profileKey];
      if (!profile || !device.gatt) return null;
      try {
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService(profile.serviceUUID);
        const characteristic = await service.getCharacteristic(
          profile.characteristicUUID,
        );
        const battery = await readBatteryLevel(server, profileKey);
        const thermDevice: ThermometerDevice = {
          id: device.id,
          name: device.name || profile.name,
          profile: profileKey,
          device,
          server,
          characteristic,
          batteryLevel: battery,
          connected: true,
        };
        try {
          await characteristic.startNotifications();
          characteristic.addEventListener(
            "characteristicvaluechanged",
            handleNotification(device.id, thermDevice.name, profileKey),
          );
        } catch {
          const timer = setInterval(async () => {
            try {
              const value = await characteristic.readValue();
              const tempC = profile.parseReading(value);
              if (Number.isFinite(tempC) && tempC > -50 && tempC < 500) {
                processReading(device.id, thermDevice.name, tempC, battery);
              }
            } catch {
              callbacksRef.current.onError?.(
                new Error("Polling read failed"),
                device.id,
              );
            }
          }, pollIntervalMs);
          pollTimersRef.current.set(device.id, timer);
        }
        device.addEventListener("gattserverdisconnected", () => {
          setDevices((prev) => {
            const next = new Map(prev);
            const existing = next.get(device.id);
            if (existing) {
              next.set(device.id, { ...existing, connected: false });
              callbacksRef.current.onConnectionChange?.({
                ...existing,
                connected: false,
              });
            }
            return next;
          });
          const timer = pollTimersRef.current.get(device.id);
          if (timer) {
            clearInterval(timer);
            pollTimersRef.current.delete(device.id);
          }
        });
        return thermDevice;
      } catch (err) {
        callbacksRef.current.onError?.(
          err instanceof Error ? err : new Error(String(err)),
          device.id,
        );
        return null;
      }
    },
    [handleNotification, processReading, readBatteryLevel, pollIntervalMs],
  );

  const scanAndPair = useCallback(
    async (preferredProfile?: string): Promise<ThermometerDevice | null> => {
      if (!isSupported) {
        callbacksRef.current.onError?.(
          new Error("Web Bluetooth is not supported"),
        );
        return null;
      }
      setIsScanning(true);
      try {
        const profiles = preferredProfile
          ? { [preferredProfile]: THERMOMETER_PROFILES[preferredProfile]! }
          : THERMOMETER_PROFILES;
        const optionalServices: string[] = [];
        const filters: BluetoothLEScanFilter[] = [];
        for (const [, profile] of Object.entries(profiles)) {
          if (!profile) continue;
          filters.push({ services: [profile.serviceUUID] });
          if (profile.batteryServiceUUID)
            optionalServices.push(profile.batteryServiceUUID);
        }
        const device = await (navigator as any).bluetooth.requestDevice({
          filters,
          optionalServices,
        });
        if (!device) return null;
        for (const [key, profile] of Object.entries(profiles)) {
          if (!profile) continue;
          try {
            const thermDevice = await connectToProfile(device, key);
            if (thermDevice) {
              setDevices((prev) => {
                const next = new Map(prev);
                next.set(device.id, thermDevice);
                return next;
              });
              callbacksRef.current.onConnectionChange?.(thermDevice);
              return thermDevice;
            }
          } catch {
            continue;
          }
        }
        callbacksRef.current.onError?.(
          new Error("Could not connect to any known thermometer profile"),
        );
        return null;
      } catch (err) {
        if ((err as Error)?.name !== "NotFoundError") {
          callbacksRef.current.onError?.(
            err instanceof Error ? err : new Error(String(err)),
          );
        }
        return null;
      } finally {
        setIsScanning(false);
      }
    },
    [isSupported, connectToProfile],
  );

  const disconnect = useCallback((deviceId: string) => {
    setDevices((prev) => {
      const next = new Map(prev);
      const device = next.get(deviceId);
      if (device) {
        try {
          device.characteristic?.stopNotifications().catch(() => {});
          device.server?.disconnect();
        } catch {}
        const timer = pollTimersRef.current.get(deviceId);
        if (timer) {
          clearInterval(timer);
          pollTimersRef.current.delete(deviceId);
        }
        next.delete(deviceId);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      for (const [, timer] of pollTimersRef.current) clearInterval(timer);
      pollTimersRef.current.clear();
    };
  }, []);

  const readNow = useCallback(
    async (deviceId: string): Promise<TemperatureReading | null> => {
      const device = devices.get(deviceId);
      if (!device?.characteristic || !device.connected) return null;
      try {
        const profile = THERMOMETER_PROFILES[device.profile];
        if (!profile) return null;
        const value = await device.characteristic.readValue();
        const tempC = profile.parseReading(value);
        if (!Number.isFinite(tempC) || tempC < -50 || tempC > 500) return null;
        const reading: TemperatureReading = {
          deviceId,
          deviceName: device.name,
          temperatureC: Math.round(tempC * 10) / 10,
          temperatureF: Math.round(celsiusToFahrenheit(tempC) * 10) / 10,
          timestamp: new Date().toISOString(),
          batteryLevel: device.batteryLevel,
        };
        setReadings((prev) => [reading, ...prev].slice(0, 500));
        callbacksRef.current.onReading?.(reading);
        return reading;
      } catch (err) {
        callbacksRef.current.onError?.(
          err instanceof Error ? err : new Error(String(err)),
          deviceId,
        );
        return null;
      }
    },
    [devices],
  );

  return {
    isSupported,
    isScanning,
    devices: Array.from(devices.values()),
    readings,
    scanAndPair,
    disconnect,
    readNow,
    supportedProfiles: Object.entries(THERMOMETER_PROFILES).map(([key, p]) => ({
      key,
      name: p.name,
    })),
  };
}

export { THERMOMETER_PROFILES, celsiusToFahrenheit };
export type { TemperatureReading as BluetoothTemperatureReading };
