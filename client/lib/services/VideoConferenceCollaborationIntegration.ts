/**
 * Video Conference & Real-Time Collaboration Integration (Phase 13)
 *
 * This service bridges video conference participants with the real-time
 * collaboration system, enabling:
 * - Participant presence sync
 * - Cursor tracking for active speakers
 * - Change propagation to collaborators
 * - Recording metadata sync with file storage (Phase 14)
 */

import { VideoConferenceParticipant } from "@/modules/VideoConference/types/VideoConferenceTypes";

export interface CollaborationPresence {
  participantId: string;
  userId?: string;
  guestName?: string;
  isSpeaking: boolean;
  cursorX?: number;
  cursorY?: number;
  joinedAt: number;
  lastActivity: number;
}

export interface PresenceSyncEvent {
  type:
    | "participant-joined"
    | "participant-left"
    | "speaking-changed"
    | "presence-update";
  participant: VideoConferenceParticipant;
  presence?: CollaborationPresence;
  timestamp: number;
}

class VideoConferenceCollaborationIntegration {
  private presenceMap: Map<string, CollaborationPresence> = new Map();
  private listeners: Set<(event: PresenceSyncEvent) => void> = new Set();
  private sessionId: string = "";
  private roomId: string = "";

  /**
   * Initialize integration for a specific conference session
   */
  initialize(roomId: string, sessionId: string): void {
    this.roomId = roomId;
    this.sessionId = sessionId;
    this.presenceMap.clear();
    this.broadcastPresenceSync("initialized");
  }

  /**
   * Register a listener for presence changes
   */
  onPresenceChange(callback: (event: PresenceSyncEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Handle participant joining the conference
   */
  handleParticipantJoined(participant: VideoConferenceParticipant): void {
    const presence: CollaborationPresence = {
      participantId: participant.id,
      userId: participant.userId,
      guestName: participant.guestName,
      isSpeaking: false,
      joinedAt: Date.now(),
      lastActivity: Date.now(),
    };

    this.presenceMap.set(participant.id, presence);

    this.broadcastEvent({
      type: "participant-joined",
      participant,
      presence,
      timestamp: Date.now(),
    });

    // Broadcast to collaboration system
    this.broadcastToCollaborationManager({
      type: "conference-participant-joined",
      participantId: participant.id,
      userId: participant.userId,
      guestName: participant.guestName,
      sessionId: this.sessionId,
      roomId: this.roomId,
    });
  }

  /**
   * Handle participant leaving the conference
   */
  handleParticipantLeft(participant: VideoConferenceParticipant): void {
    const presence = this.presenceMap.get(participant.id);

    this.presenceMap.delete(participant.id);

    this.broadcastEvent({
      type: "participant-left",
      participant,
      presence,
      timestamp: Date.now(),
    });

    // Broadcast to collaboration system
    this.broadcastToCollaborationManager({
      type: "conference-participant-left",
      participantId: participant.id,
      userId: participant.userId,
      durationSeconds: participant.durationMinutes
        ? participant.durationMinutes * 60
        : 0,
      sessionId: this.sessionId,
      roomId: this.roomId,
    });
  }

  /**
   * Update participant speaking status
   */
  updateSpeakingStatus(participantId: string, isSpeaking: boolean): void {
    const presence = this.presenceMap.get(participantId);

    if (presence) {
      presence.isSpeaking = isSpeaking;
      presence.lastActivity = Date.now();

      // Find the actual participant data
      const participant = Array.from(this.presenceMap.values()).find(
        (p) => p.participantId === participantId,
      );

      this.broadcastEvent({
        type: "speaking-changed",
        participant: {
          id: participantId,
          roomId: this.roomId,
          guestName: presence.guestName,
          participantRole: "participant",
          joinTime: presence.joinedAt,
          isGuest: !presence.userId,
          wasKicked: false,
          createdAt: presence.joinedAt,
        } as any,
        presence,
        timestamp: Date.now(),
      });

      // Broadcast to collaboration system
      this.broadcastToCollaborationManager({
        type: "conference-participant-speaking",
        participantId,
        userId: presence.userId,
        isSpeaking,
        sessionId: this.sessionId,
        roomId: this.roomId,
      });
    }
  }

  /**
   * Update participant cursor position for cursor tracking
   */
  updateCursorPosition(participantId: string, x: number, y: number): void {
    const presence = this.presenceMap.get(participantId);

    if (presence) {
      presence.cursorX = x;
      presence.cursorY = y;
      presence.lastActivity = Date.now();

      this.broadcastEvent({
        type: "presence-update",
        participant: {
          id: participantId,
          roomId: this.roomId,
          participantRole: "participant",
          joinTime: presence.joinedAt,
          isGuest: !presence.userId,
          wasKicked: false,
          createdAt: presence.joinedAt,
        } as any,
        presence,
        timestamp: Date.now(),
      });

      // Broadcast cursor tracking to collaboration system
      this.broadcastToCollaborationManager({
        type: "conference-cursor-position",
        participantId,
        userId: presence.userId,
        cursorX: x,
        cursorY: y,
        sessionId: this.sessionId,
        roomId: this.roomId,
      });
    }
  }

  /**
   * Get current active participants
   */
  getActiveParticipants(): CollaborationPresence[] {
    return Array.from(this.presenceMap.values());
  }

  /**
   * Get participant presence info
   */
  getParticipantPresence(
    participantId: string,
  ): CollaborationPresence | undefined {
    return this.presenceMap.get(participantId);
  }

  /**
   * Get speaking participants
   */
  getSpeakingParticipants(): CollaborationPresence[] {
    return Array.from(this.presenceMap.values()).filter((p) => p.isSpeaking);
  }

  /**
   * Clear all presence data (e.g., when conference ends)
   */
  clear(): void {
    this.presenceMap.clear();
    this.listeners.clear();
  }

  /**
   * Broadcast presence sync event to listeners
   */
  private broadcastEvent(event: PresenceSyncEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error("Error in presence change listener:", error);
      }
    });
  }

  /**
   * Broadcast presence sync to collaboration manager
   */
  private broadcastPresenceSync(status: string): void {
    window.dispatchEvent(
      new CustomEvent("video-conference-presence-sync", {
        detail: {
          status,
          roomId: this.roomId,
          sessionId: this.sessionId,
          timestamp: Date.now(),
        },
      }),
    );
  }

  /**
   * Broadcast to collaboration system using custom event
   */
  private broadcastToCollaborationManager(data: Record<string, any>): void {
    try {
      window.dispatchEvent(
        new CustomEvent("collaboration-presence-update", {
          detail: {
            ...data,
            source: "video-conference",
            sessionId: this.sessionId,
            boardId: this.roomId,
            timestamp: Date.now(),
          },
        }),
      );
    } catch (error) {
      console.error("Failed to broadcast to collaboration manager:", error);
    }
  }
}

// Export singleton instance
export const videoConferenceCollaborationIntegration =
  new VideoConferenceCollaborationIntegration();
