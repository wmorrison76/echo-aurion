/** * Video Conference System Type Definitions * Supports Daily.co SaaS and self-hosted options */ export type RoomType =
  "private" | "public" | "shared";
export type PrivacyLevel = "private" | "invited" | "public";
export type ParticipantRole = "participant" | "presenter" | "moderator";
export type RecordingStatus = "processing" | "ready" | "failed";
export type GuestLinkStatus =
  | "active"
  | "expired"
  | "revoked"; /** * Video Conference Room */
export interface VideoConferenceRoom {
  id: string;
  dailyRoomName: string;
  roomName: string;
  roomDescription?: string;
  roomType: RoomType;
  privacyLevel: PrivacyLevel;
  maxParticipants: number;
  allowRecording: boolean;
  allowScreenShare: boolean;
  allowChat: boolean;
  meetingStartTime?: number;
  meetingEndTime?: number;
  scheduledDuration?: number;
  ownerId: string;
  createdBy: string;
  orgId?: string;
  boardId?: string;
  tableId?: string;
  servicePeriodId?: string;
  venueId?: string;
  role?: string;
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
} /** * Video Conference Participant */
export interface VideoConferenceParticipant {
  id: string;
  roomId: string;
  userId?: string;
  guestName?: string;
  guestEmail?: string;
  participantRole: ParticipantRole;
  joinTime: number;
  leaveTime?: number;
  durationMinutes?: number;
  isGuest: boolean;
  wasKicked: boolean;
  metadata?: Record<string, any>;
  createdAt: number;
} /** * Guest Link for external access */
export interface VideoConferenceGuestLink {
  id: string;
  roomId: string;
  guestToken: string;
  createdBy: string;
  guestName?: string;
  allowedEmail?: string;
  maxUses?: number;
  currentUses: number;
  expiresAt?: number;
  isRevoked: boolean;
  revokedAt?: number;
  revokedBy?: string;
  revokeReason?: string;
  requirePassword: boolean;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
} /** * Video Conference Session */
export interface VideoConferenceSession {
  id: string;
  roomId: string;
  sessionStart: number;
  sessionEnd?: number;
  durationMinutes?: number;
  participantCount: number;
  peakParticipantCount: number;
  recordingId?: string;
  recordingUrl?: string;
  isRecorded: boolean;
  storageStatus?: "pending" | "processing" | "complete" | "failed";
  metadata?: Record<string, any>;
  createdAt: number;
} /** * Video Conference Recording */
export interface VideoConferenceRecording {
  id: string;
  sessionId?: string;
  roomId: string;
  recordingId: string;
  recordingUrl?: string;
  recordingSize?: number;
  durationSeconds?: number;
  fileFormat?: string;
  status: RecordingStatus;
  uploadedBy?: string;
  createdAt: number;
  metadata?: Record<string, any>;
} /** * Daily.co Room Response */
export interface DailyRoomResponse {
  name: string;
  displayName: string;
  privacyLevel: string;
  maxParticipants?: number;
  properties?: {
    allowScreenShare?: boolean;
    allowRecording?: boolean;
    allowChat?: boolean;
  };
  createdAt?: string;
  url?: string;
  config?: Record<string, any>;
} /** * Daily.co Participant Token Request */
export interface DailyTokenRequest {
  roomName: string;
  userName: string;
  userEmail?: string;
  isOwner?: boolean;
  allowScreenShare?: boolean;
  allowRecording?: boolean;
  expiresIn?: number; // seconds
} /** * Video Conference Join Request */
export interface VideoConferenceJoinRequest {
  roomId: string;
  userId?: string;
  guestToken?: string;
  guestName?: string;
  guestEmail?: string;
  userName: string;
  tableId?: string;
  servicePeriodId?: string;
  boardId?: string;
} /** * Video Conference Join Response */
export interface VideoConferenceJoinResponse {
  success: boolean;
  room?: VideoConferenceRoom;
  token?: string;
  participants?: VideoConferenceParticipant[];
  dailyRoomUrl?: string;
  error?: string;
} /** * Guest Link Creation Request */
export interface CreateGuestLinkRequest {
  roomId: string;
  guestName?: string;
  allowedEmail?: string;
  maxUses?: number;
  expirationMinutes?: number;
  requirePassword?: boolean;
  password?: string;
} /** * Guest Link Creation Response */
export interface CreateGuestLinkResponse {
  success: boolean;
  link?: VideoConferenceGuestLink;
  joinUrl?: string;
  error?: string;
} /** * Room Creation Request */
export interface CreateRoomRequest {
  roomName: string;
  roomDescription?: string;
  roomType: RoomType;
  privacyLevel: PrivacyLevel;
  maxParticipants?: number;
  allowRecording?: boolean;
  allowScreenShare?: boolean;
  allowChat?: boolean;
  meetingStartTime?: number;
  scheduledDuration?: number;
  boardId?: string;
  tableId?: string;
  servicePeriodId?: string;
  venueId?: string;
  role?: string;
  metadata?: Record<string, any>;
} /** * Room Creation Response */
export interface CreateRoomResponse {
  success: boolean;
  room?: VideoConferenceRoom;
  error?: string;
} /** * Active Room Statistics */
export interface ActiveRoomStatistics {
  id: string;
  roomName: string;
  currentParticipants: number;
  maxParticipants: number;
  hasActiveParticipants: boolean;
  ownerId: string;
  createdAt: number;
} /** * Conference Statistics */
export interface ConferenceStatistics {
  id: string;
  roomName: string;
  totalParticipants: number;
  guestCount: number;
  sessionCount: number;
  recordedSessions: number;
  recordingCount: number;
} /** * Recording Upload Event */
export interface RecordingUploadEvent {
  roomId: string;
  sessionId?: string;
  recordingId: string;
  recordingUrl: string;
  recordingSize: number;
  durationSeconds: number;
  timestamp: number;
} /** * Participant Event */
export interface ParticipantEvent {
  type: "joined" | "left" | "kicked" | "role-changed";
  participantId: string;
  roomId: string;
  userId?: string;
  guestEmail?: string;
  timestamp: number;
  metadata?: Record<string, any>;
} /** * Conference Manager State */
export interface ConferenceManagerState {
  activeRooms: Map<string, VideoConferenceRoom>;
  participants: Map<string, VideoConferenceParticipant[]>;
  currentParticipant?: VideoConferenceParticipant;
  isConnected: boolean;
  error?: string;
} /** * Guest Join Validation */
export interface GuestJoinValidation {
  valid: boolean;
  reason?: string;
  room?: VideoConferenceRoom;
  requiresPassword?: boolean;
  expiresAt?: number;
} /** * Conference Settings */
export interface ConferenceSettings {
  autoRecord: boolean;
  maxRoomDuration?: number;
  allowGuestLinks: boolean;
  guestLinkExpiration: number; // minutes requireGuestApproval: boolean; defaultMaxParticipants: number; enableWhiteboardIntegration: boolean; enablePhase13Sync: boolean;
} /** * Conference Event */
export interface ConferenceEvent {
  type: string;
  roomId: string;
  timestamp: number;
  data: Record<string, any>;
} /** * Whiteboard Conference Integration */
export interface WhiteboardConferenceLink {
  conferenceRoomId: string;
  whiteboardBoardId: string;
  linkedAt: number;
  createdBy: string;
  metadata?: Record<string, any>;
} /** * Daily.co API Configuration */
export interface DailyApiConfig {
  apiKey: string;
  apiUrl: string;
  environment: "production" | "staging" | "development";
} /** * Webhook Event from Daily.co */
export interface DailyWebhookEvent {
  type: string;
  data: Record<string, any>;
  timestamp: number;
  roomName: string;
}
