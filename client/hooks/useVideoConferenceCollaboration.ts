import { useEffect, useState, useCallback } from "react";
import {
  videoConferenceCollaborationIntegration,
  CollaborationPresence,
  PresenceSyncEvent,
} from "@/lib/services/VideoConferenceCollaborationIntegration";
import { VideoConferenceParticipant } from "@/modules/VideoConference/types/VideoConferenceTypes";

export interface UseVideoConferenceCollaborationProps {
  roomId?: string;
  sessionId?: string;
  enabled?: boolean;
}

export function useVideoConferenceCollaboration({
  roomId = "",
  sessionId = "",
  enabled = true,
}: UseVideoConferenceCollaborationProps = {}) {
  const [activeParticipants, setActiveParticipants] = useState<
    CollaborationPresence[]
  >([]);
  const [speakingParticipants, setSpeakingParticipants] = useState<
    CollaborationPresence[]
  >([]);
  const [lastPresenceEvent, setLastPresenceEvent] =
    useState<PresenceSyncEvent | null>(null);

  // Initialize integration
  useEffect(() => {
    if (!enabled || !roomId || !sessionId) return;

    videoConferenceCollaborationIntegration.initialize(roomId, sessionId);

    return () => {
      videoConferenceCollaborationIntegration.clear();
    };
  }, [enabled, roomId, sessionId]);

  // Subscribe to presence changes
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe =
      videoConferenceCollaborationIntegration.onPresenceChange(
        (event: PresenceSyncEvent) => {
          setLastPresenceEvent(event);
          setActiveParticipants(
            videoConferenceCollaborationIntegration.getActiveParticipants(),
          );
          setSpeakingParticipants(
            videoConferenceCollaborationIntegration.getSpeakingParticipants(),
          );
        },
      );

    return unsubscribe;
  }, [enabled]);

  // Handle participant joined
  const handleParticipantJoined = useCallback(
    (participant: VideoConferenceParticipant) => {
      videoConferenceCollaborationIntegration.handleParticipantJoined(
        participant,
      );
    },
    [],
  );

  // Handle participant left
  const handleParticipantLeft = useCallback(
    (participant: VideoConferenceParticipant) => {
      videoConferenceCollaborationIntegration.handleParticipantLeft(
        participant,
      );
    },
    [],
  );

  // Handle speaking status change
  const updateSpeakingStatus = useCallback(
    (participantId: string, isSpeaking: boolean) => {
      videoConferenceCollaborationIntegration.updateSpeakingStatus(
        participantId,
        isSpeaking,
      );
    },
    [],
  );

  // Handle cursor tracking
  const updateCursorPosition = useCallback(
    (participantId: string, x: number, y: number) => {
      videoConferenceCollaborationIntegration.updateCursorPosition(
        participantId,
        x,
        y,
      );
    },
    [],
  );

  // Get participant presence
  const getParticipantPresence = useCallback(
    (participantId: string): CollaborationPresence | undefined => {
      return videoConferenceCollaborationIntegration.getParticipantPresence(
        participantId,
      );
    },
    [],
  );

  return {
    activeParticipants,
    speakingParticipants,
    lastPresenceEvent,
    handleParticipantJoined,
    handleParticipantLeft,
    updateSpeakingStatus,
    updateCursorPosition,
    getParticipantPresence,
  };
}
