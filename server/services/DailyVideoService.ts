/**
 * Daily.co Video Conference Service
 * Handles all Daily.co API interactions for video conferencing
 */

import axios, { AxiosInstance } from "axios";
import crypto from "crypto";
import {
  DailyRoomResponse,
  DailyTokenRequest,
  VideoConferenceRoom,
} from "@/modules/VideoConference/types/VideoConferenceTypes";

interface DailyConfig {
  apiKey: string;
  apiUrl?: string;
  environment?: "production" | "staging" | "development";
}

class DailyVideoService {
  private client: AxiosInstance;
  private apiKey: string;
  private roomCache = new Map<string, DailyRoomResponse>();
  private cacheTTL = 60 * 60 * 1000; // 1 hour

  constructor(config: DailyConfig) {
    this.apiKey = config.apiKey;
    const apiUrl = config.apiUrl || "https://api.daily.co/v1";

    this.client = axios.create({
      baseURL: apiUrl,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Create a new room
   */
  async createRoom(
    roomName: string,
    options?: {
      displayName?: string;
      maxParticipants?: number;
      allowScreenShare?: boolean;
      allowRecording?: boolean;
      allowChat?: boolean;
      expiresAt?: Date;
    },
  ): Promise<DailyRoomResponse> {
    try {
      const response = await this.client.post("/rooms", {
        name: roomName,
        display_name: options?.displayName || roomName,
        privacy: "private",
        properties: {
          max_participants: options?.maxParticipants || 100,
          enable_screenshare: options?.allowScreenShare !== false,
          enable_recording: options?.allowRecording !== false,
          enable_chat: options?.allowChat !== false,
        },
        expires_at: options?.expiresAt?.toISOString(),
      });

      if (response.data) {
        this.roomCache.set(roomName, response.data);
      }

      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to create room");
    }
  }

  /**
   * Get room details
   */
  async getRoom(roomName: string): Promise<DailyRoomResponse> {
    try {
      // Check cache first
      const cached = this.roomCache.get(roomName);
      if (cached) {
        return cached;
      }

      const response = await this.client.get(`/rooms/${roomName}`);

      if (response.data) {
        this.roomCache.set(roomName, response.data);
      }

      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to get room");
    }
  }

  /**
   * Delete a room
   */
  async deleteRoom(roomName: string): Promise<boolean> {
    try {
      await this.client.delete(`/rooms/${roomName}`);
      this.roomCache.delete(roomName);
      return true;
    } catch (error) {
      throw this.handleError(error, "Failed to delete room");
    }
  }

  /**
   * Generate participant token for room access
   */
  async generateParticipantToken(request: DailyTokenRequest): Promise<string> {
    try {
      const response = await this.client.post("/meeting-tokens", {
        properties: {
          room_name: request.roomName,
          user_name: request.userName,
          user_email: request.userEmail,
          is_owner: request.isOwner || false,
          enable_screenshare: request.allowScreenShare !== false,
          enable_recording: request.allowRecording !== false,
        },
        expires_in: request.expiresIn || 3600, // Default 1 hour
      });

      return response.data.token;
    } catch (error) {
      throw this.handleError(error, "Failed to generate token");
    }
  }

  /**
   * List all rooms
   */
  async listRooms(): Promise<DailyRoomResponse[]> {
    try {
      const response = await this.client.get("/rooms");
      return response.data.data || [];
    } catch (error) {
      throw this.handleError(error, "Failed to list rooms");
    }
  }

  /**
   * Update room settings
   */
  async updateRoom(
    roomName: string,
    updates: {
      displayName?: string;
      maxParticipants?: number;
      allowScreenShare?: boolean;
      allowRecording?: boolean;
      allowChat?: boolean;
    },
  ): Promise<DailyRoomResponse> {
    try {
      const response = await this.client.post(`/rooms/${roomName}`, {
        display_name: updates.displayName,
        properties: {
          max_participants: updates.maxParticipants,
          enable_screenshare: updates.allowScreenShare,
          enable_recording: updates.allowRecording,
          enable_chat: updates.allowChat,
        },
      });

      if (response.data) {
        this.roomCache.set(roomName, response.data);
      }

      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to update room");
    }
  }

  /**
   * Get room recordings
   */
  async getRoomRecordings(roomName: string): Promise<any[]> {
    try {
      const response = await this.client.get(`/recordings`, {
        params: {
          room_name: roomName,
        },
      });

      return response.data.data || [];
    } catch (error) {
      throw this.handleError(error, "Failed to get recordings");
    }
  }

  /**
   * Delete recording
   */
  async deleteRecording(recordingId: string): Promise<boolean> {
    try {
      await this.client.delete(`/recordings/${recordingId}`);
      return true;
    } catch (error) {
      throw this.handleError(error, "Failed to delete recording");
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    signature: string,
    body: string,
    secret: string,
  ): boolean {
    try {
      const hash = crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("hex");

      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hash));
    } catch {
      return false;
    }
  }

  /**
   * Get meeting token (helper method)
   */
  async getMeetingToken(
    roomName: string,
    userName: string,
    userEmail?: string,
    isOwner: boolean = false,
  ): Promise<string> {
    return this.generateParticipantToken({
      roomName,
      userName,
      userEmail,
      isOwner,
      expiresIn: 3600,
    });
  }

  /**
   * Handle errors from API calls
   */
  private handleError(error: any, message: string): Error {
    if (error.response?.data?.error) {
      return new Error(`${message}: ${error.response.data.error}`);
    }

    if (error.message) {
      return new Error(`${message}: ${error.message}`);
    }

    return new Error(message);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.roomCache.clear();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get("/");
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

// Export singleton instance (initialize in main server file)
let dailyVideoService: DailyVideoService | null = null;

export function initializeDailyService(config: DailyConfig): DailyVideoService {
  dailyVideoService = new DailyVideoService(config);
  return dailyVideoService;
}

export function getDailyService(): DailyVideoService {
  if (!dailyVideoService) {
    throw new Error(
      "Daily.co service not initialized. Call initializeDailyService first.",
    );
  }
  return dailyVideoService;
}

export default DailyVideoService;
