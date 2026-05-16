// ============================================================================
// MODULE: useScanBridge.ts
// PURPOSE:
// Unified hardware abstraction layer for EchoReality. Accepts input from
// any scanning device (mobile camera, LiDAR, drone, depth camera) and exposes
// a normalized frame stream to the EchoFusion pipeline.
//
// INTEGRATES WITH:
// - EchoFusion API (upload/merge)
// - EchoAi³ (learns correction patterns)
// - Builder.io (toggles available hardware via config)
//
// FUTURE HOOKS:
// - LiDAR tripod SDKs (Leica/Velodyne)
// - Drone photogrammetry (DJI)
// - Depth cameras (Intel Realsense / Kinect Azure)
// - ARKit / ARCore Room Scan
// ============================================================================ import { useEffect, useRef, useState } from"react" export interface ScanFrame { id: string timestamp: number pose: [number, number, number, number, number, number] depth?: Float32Array color?: ImageBitmap | null
} export interface ScanInput { type:"mobile" |"lidar" |"drone" |"depthcam" stream: MediaStream | ArrayBuffer
} export function useScanBridge( onFrame: (frame: ScanFrame) => void, input?: ScanInput
) { const [active, setActive] = useState(false) const videoRef = useRef<HTMLVideoElement>(null) useEffect(() => { if (!input) return let running = true setActive(true) // MOBILE CAMERA MODE ---------------------------------------------------- if (input.type ==="mobile" && input.stream instanceof MediaStream) { const v = document.createElement("video") v.srcObject = input.stream v.play() videoRef.current = v const loop = () => { if (!running) return const frame: ScanFrame = { id: crypto.randomUUID(), timestamp: performance.now(), pose: [0, 0, 0, 0, 0, 0], color: null, } onFrame(frame) requestAnimationFrame(loop) } loop() } // BINARY DEPTH STREAM (mock LiDAR/Drone) ------------------------------- if (["lidar","drone","depthcam"].includes(input.type)) { const data = input.stream as ArrayBuffer const arr = new Float32Array(data) const frame: ScanFrame = { id: crypto.randomUUID(), timestamp: performance.now(), pose: [0, 0, 0, 0, 0, 0], depth: arr, } onFrame(frame) } return () => { running = false setActive(false) } }, [input, onFrame]) return { active, videoRef }
}
