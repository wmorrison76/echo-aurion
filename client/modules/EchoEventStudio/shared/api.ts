/** * Shared code between client and server * Useful to share types between client and server * and/or small pure JS functions that can be used on both client and server */ /** * Example response type for /api/demo */
export interface DemoResponse {
  message: string;
} /** * EchoLayout dining scene types */
export type LayoutObjectType =
  | "table_round"
  | "table_rect"
  | "buffet"
  | "cocktail"
  | "podium"
  | "dance_floor";
export interface EchoLayoutObject {
  id: string;
  type: LayoutObjectType;
  position: [number, number, number];
  rotation?: [number, number, number];
  seats?: number;
  zone?: string;
  glCode?: string;
  costCenter?: string;
  dimensions?: { width?: number; length?: number };
}
export interface EchoAiLayoutRequest {
  roomType?: string;
  covers?: number;
  flowPreference?: string;
  theme?: string;
  width: number;
  length: number;
}
export interface EchoAiLayoutResponse {
  objects: EchoLayoutObject[];
  metadata?: {
    generatedAt: string;
    model: string;
    parameters: EchoAiLayoutRequest;
  };
}
export interface EchoStratusSummary {
  tables: number;
  seats: number;
  buffets: number;
  totalObjects: number;
  glCodes: Record<string, number>;
  costCenters: Record<string, number>;
}
/** * EchoReality Mode Types * Multi-scan capture, fusion, and AI training */ export interface DevicePose {
  position: [number, number, number];
  rotation: [number, number, number];
  scale?: number;
}
export interface CameraIntrinsics {
  fx: number;
  fy: number;
  cx: number;
  cy: number;
  width: number;
  height: number;
}
export interface RealityScanMetadata {
  device: string; // e.g.,"iPhone15Pro","Pixel8" area?: string; // e.g.,"west wall","north corner" lighting?: string; // e.g.,"bright","dim","natural" timestamp: number; // milliseconds since epoch quality?:"low" |"medium" |"high";
}
export interface EchoRealityUploadRequest {
  scanId: string; // UUID userId: string; // chef-id or user identifier session: string; // e.g.,"P66_DiningRoom" devicePose: DevicePose; cameraIntrinsics?: CameraIntrinsics; fileUrl?: string; // URL to pre-uploaded file (Supabase public URL) meta: RealityScanMetadata;
}
export interface EchoRealityUploadResponse {
  success: boolean;
  scanId: string;
  message: string;
  fileUrl?: string;
  storageKey?: string;
}
export interface TrainingDelta {
  scanId: string;
  region: Array<[number, number, number]>; // 3D points oldMesh?: string; // GLB or mesh reference newMesh?: string; // Corrected mesh reference tags: Array<"wall" |"table" |"glass" |"door" |"floor" |"ceiling" | string>; userAction: string; // e.g.,"plane_correction","gap_fill","merge" timestamp: number;
}
export interface RealityCorrectionData {
  scanId: string;
  corrections: TrainingDelta[];
  mergedMeshUrl?: string;
  savedAt?: string;
}
