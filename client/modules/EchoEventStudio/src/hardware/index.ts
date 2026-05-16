/** * Hardware Abstraction Layer * Export all public APIs and components */ // Types
export type {
  ScanDeviceType,
  ScanFrame,
  ScanInput,
  HardwareDevice,
  HardwareDriver,
  DeviceDetectionResult,
  UseScanBridgeOptions,
  UseScanBridgeReturn,
} from "./types"; // Hooks
export {
  useScanBridge,
  default as useScanBridgeDefault,
} from "./hooks/useScanBridge"; // Components
export { DeviceSelector } from "./components/DeviceSelector"; // Device Detection
export {
  isWebUSBAvailable,
  isWebHIDAvailable,
  isWebSerialAvailable,
  detectMobileCameras,
  detectLiDARDevices,
  detectDepthCameras,
  detectDroneDevices,
  detectAllDevices,
  requestDeviceAccess,
  watchDeviceConnections,
} from "./deviceDetection"; // Drivers (for advanced usage)
export { MobileCameraDriver } from "./drivers/mobileCamera";
export { LiDARDriver } from "./drivers/lidarDriver";
export { DepthCameraDriver } from "./drivers/depthCameraDriver";
export { DroneDriver } from "./drivers/droneDriver";
