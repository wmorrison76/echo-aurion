/** * Hardware abstraction layer types * Supports mobile camera, LiDAR, depth cameras, and drone photogrammetry */ /** * Supported hardware input types */
export type ScanDeviceType =
  | "mobile"
  | "lidar"
  | "drone"
  | "depthcam"; /** * Represents a single frame from any hardware source * Contains multiple representations of the same capture */
export interface ScanFrame {
  // Unique frame identifier id: string; timestamp: number; deviceType: ScanDeviceType; // RGB image data (available from most sources) rgb?: { data: Uint8ClampedArray | ImageData; width: number; height: number; format: 'rgba' | 'rgb'; }; // Depth map (available from depth cameras, LiDAR, photogrammetry) depth?: { data: Uint16Array | Float32Array; width: number; height: number; minDepth: number; maxDepth: number; unit: 'mm' | 'cm' | 'm'; // measurement unit }; // Point cloud data (available from LiDAR, depth cameras, photogrammetry) pointCloud?: { positions: Float32Array; // [x, y, z, x, y, z, ...] colors?: Uint8ClampedArray; // [r, g, b, a, r, g, b, a, ...] optional normals?: Float32Array; // [nx, ny, nz, nx, ny, nz, ...] optional count: number; // number of points }; // Metadata and calibration metadata: { exposure?: number; iso?: number; focalLength?: number; principalPoint?: { x: number; y: number }; distortionCoefficients?: number[]; // Camera intrinsics matrix (3x3) cameraMatrix?: number[]; // For IMU sensors (depth cameras, mobile) imuData?: { accelerometer: [number, number, number]; gyroscope: [number, number, number]; magnetometer?: [number, number, number]; }; // For drone: GPS and orientation gps?: { latitude: number; longitude: number; altitude: number; accuracy: number; }; orientation?: { yaw: number; pitch: number; roll: number; }; }; // Quality indicators quality?: { confidence: number; // 0-1, confidence of depth data blur: number; // 0-1, motion blur estimate lighting: number; // 0-1, lighting quality exposure: 'good' | 'underexposed' | 'overexposed'; };
} /** * Hardware input stream wrapper */
export interface ScanInput {
  type: ScanDeviceType;
  stream: MediaStream | ArrayBuffer | Blob;
  device?: HardwareDevice;
} /** * Hardware device capabilities and info */
export interface HardwareDevice {
  id: string;
  name: string;
  type: ScanDeviceType;
  manufacturer?: string;
  model?: string; // Capabilities capabilities: { supportsRGB: boolean; supportsDepth: boolean; supportsPointCloud: boolean; supportsIMU: boolean; supportsGPS: boolean; maxFrameRate: number; maxResolution: { width: number; height: number }; depthRange?: { min: number; max: number }; // in meters }; // Connection status connected: boolean; lastSeen: number; // Device-specific info vendorId?: number; productId?: number; serialNumber?: string;
} /** * Hardware driver interface */
export interface HardwareDriver {
  type: ScanDeviceType;
  name: string; // Check if this driver can run on current platform isSupported(): Promise<boolean>; // List available devices of this type listDevices(): Promise<HardwareDevice[]>; // Connect to a device connect(deviceId: string): Promise<void>; // Disconnect from device disconnect(): Promise<void>; // Start streaming frames startCapture(): Promise<void>; // Stop streaming frames stopCapture(): Promise<void>; // Get current frame (if available) getCurrentFrame(): ScanFrame | null; // Set frame callback onFrame: (callback: (frame: ScanFrame) => void) => void; // Check if currently capturing isCapturing(): boolean;
} /** * Device detection and driver configuration */
export interface DeviceDetectionResult {
  available: HardwareDevice[];
  autoDetected?: HardwareDevice;
  recommended?: HardwareDevice;
} /** * useScanBridge hook options */
export interface UseScanBridgeOptions {
  // Auto-detect and use device if available autoDetect?: boolean; // Specific device to use (skips auto-detect) deviceId?: string; // Device type preference preferredType?: ScanDeviceType; // Manual selection fallback allowManualSelect?: boolean; // Callbacks onDeviceConnected?: (device: HardwareDevice) => void; onDeviceDisconnected?: (device: HardwareDevice) => void; onError?: (error: Error) => void; // Performance tuning targetFrameRate?: number; targetResolution?: { width: number; height: number };
} /** * Hook return value */
export interface UseScanBridgeReturn {
  // Current state device: HardwareDevice | null; isCapturing: boolean; isLoading: boolean; error: Error | null; // Actions startCapture(): Promise<void>; stopCapture(): Promise<void>; selectDevice(deviceId: string): Promise<void>; detectDevices(): Promise<DeviceDetectionResult>; // Get current frame currentFrame: ScanFrame | null;
}
