import { useCallback, useState } from "react";
import type {
  EchoOpenAIDialogue,
  DialogueMessage,
  AnyKnowledge,
  TrainingSession,
} from "../echo/types/knowledge";

interface TrainingState {
  dialogue: EchoOpenAIDialogue | null;
  messages: DialogueMessage[];
  isActive: boolean;
  isLoading: boolean;
}

/**
 * Hook to manage Echo-OpenAI collaborative training
 */
export function useEchoOpenAITraining() {
  const [state, setState] = useState<TrainingState>({
    dialogue: null,
    messages: [],
    isActive: false,
    isLoading: false,
  });

  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>(
    [],
  );
  const [learnedKnowledge, setLearnedKnowledge] = useState<AnyKnowledge[]>([]);

  /**
   * Initialize a new training dialogue
   */
  const initializeDialogue = useCallback(
    async (domain: string, focusAreas: string[]) => {
      setState((s) => ({ ...s, isLoading: true }));

      try {
        const response = await fetch("/api/echo-training/init-dialogue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain, focusAreas }),
        });

        if (!response.ok) {
          throw new Error("Failed to initialize dialogue");
        }

        const data = await response.json();
        const dialogue = data.dialogue;

        setState({
          dialogue,
          messages: dialogue.messages,
          isActive: true,
          isLoading: false,
        });

        return dialogue;
      } catch (error) {
        console.error("Dialogue initialization failed:", error);
        setState((s) => ({ ...s, isLoading: false }));
        throw error;
      }
    },
    [],
  );

  /**
   * Send a message in the dialogue
   */
  const sendMessage = useCallback(
    async (message: string, domain: string, focusAreas: string[]) => {
      if (!state.dialogue || !message.trim()) {
        return;
      }

      setState((s) => ({ ...s, isLoading: true }));

      try {
        const response = await fetch("/api/echo-training/dialogue-turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dialogueId: state.dialogue.id,
            currentMessage: message,
            domain,
            focusAreas,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        const data = await response.json();

        setState((s) => ({
          ...s,
          messages: [...s.messages, data.userMessage, data.openaiMessage],
          isLoading: false,
        }));

        return data;
      } catch (error) {
        console.error("Error sending message:", error);
        setState((s) => ({ ...s, isLoading: false }));
        throw error;
      }
    },
    [state.dialogue],
  );

  /**
   * Save learned knowledge from dialogue
   */
  const saveLearning = useCallback(
    async (knowledge: AnyKnowledge[]) => {
      if (!state.dialogue) {
        return;
      }

      try {
        const response = await fetch(
          "/api/echo-training/save-learned-knowledge",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dialogueId: state.dialogue.id,
              knowledge,
            }),
          },
        );

        if (!response.ok) {
          throw new Error("Failed to save learning");
        }

        const data = await response.json();
        setLearnedKnowledge((prev) => [...prev, ...knowledge]);

        return data;
      } catch (error) {
        console.error("Error saving learning:", error);
        throw error;
      }
    },
    [state.dialogue],
  );

  /**
   * Complete the training dialogue
   */
  const completeDialogue = useCallback(async () => {
    if (!state.dialogue) {
      return;
    }

    try {
      const response = await fetch("/api/echo-training/complete-dialogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dialogueId: state.dialogue.id,
          dialogue: {
            ...state.dialogue,
            messages: state.messages,
            status: "completed",
            trainedKnowledge: learnedKnowledge.map((k) => k.id),
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to complete dialogue");
      }

      const data = await response.json();

      const session: TrainingSession = {
        id: `session-${Date.now()}`,
        createdAt: new Date().toISOString(),
        domain: state.dialogue.domain,
        focusAreas: state.messages[0]?.knowledgeGaps || [],
        dialogues: [state.dialogue.id],
        completedKnowledge: learnedKnowledge,
        stats: {
          questionsAsked: state.messages.length,
          knowledgeAcquired: learnedKnowledge.length,
          gapsIdentified: state.messages[0]?.knowledgeGaps?.length || 0,
          gapsFilled: learnedKnowledge.length,
        },
      };

      setTrainingSessions((prev) => [...prev, session]);
      setState({
        dialogue: null,
        messages: [],
        isActive: false,
        isLoading: false,
      });

      return { session, summary: data.summary };
    } catch (error) {
      console.error("Error completing dialogue:", error);
      throw error;
    }
  }, [state.dialogue, state.messages, learnedKnowledge]);

  /**
   * Get statistics for current session
   */
  const getSessionStats = useCallback(() => {
    return {
      totalQuestions: state.messages.length,
      knowledgeLearned: learnedKnowledge.length,
      isActive: state.isActive,
      isLoading: state.isLoading,
      dialogueId: state.dialogue?.id,
    };
  }, [state, learnedKnowledge]);

  return {
    // State
    dialogue: state.dialogue,
    messages: state.messages,
    isActive: state.isActive,
    isLoading: state.isLoading,
    learnedKnowledge,
    trainingSessions,

    // Methods
    initializeDialogue,
    sendMessage,
    saveLearning,
    completeDialogue,
    getSessionStats,
  };
}
