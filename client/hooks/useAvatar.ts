/**
 * useAvatar Hook
 * Manages avatar state, expressions, and interactions
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { BabylonScene } from '@/lib/babylon-scene';
import type { Expression } from '@/lib/facial-expressions';

export interface AvatarTask {
  id: string;
  task_type: string;
  status: 'pending_approval' | 'approved' | 'executing' | 'completed' | 'rejected';
  action_plan: {
    action_steps: Array<{ description: string }>;
    estimated_time_minutes: number;
  };
  confidence_score: number;
  voice_transcript: string;
}

interface UseAvatarOptions {
  userId?: string;
  avatarUrl?: string;
  containerElement?: HTMLCanvasElement | null;
  autoPlayWelcome?: boolean;
}

export const useAvatar = (options: UseAvatarOptions = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentExpression, setCurrentExpression] = useState<Expression>('neutral');
  const [lastResponse, setLastResponse] = useState<string>('');
  
  const sceneRef = useRef<BabylonScene | null>(null);
  const containerRef = useRef<HTMLCanvasElement | null>(null);
  
  // Set external container if provided
  useEffect(() => {
    if (options.containerElement) {
      containerRef.current = options.containerElement;
    }
  }, [options.containerElement]);
  
  /**
   * Initialize avatar scene
   */
  const initializeScene = useCallback(async () => {
    if (!containerRef.current || sceneRef.current) return;
    
    try {
      const config = {
        userId: options.userId || 'default-user',
        containerElement: containerRef.current,
      };
      
      const scene = new BabylonScene(config);
      
      // Load avatar
      const avatarUrl =
        options.avatarUrl ||
        `https://api.readyplayer.me/${options.userId}.glb`;
      
      await scene.loadAvatar(avatarUrl);
      
      // Start natural blinking
      scene.startBlinking(5000);
      
      sceneRef.current = scene;
      
      // Welcome message
      if (options.autoPlayWelcome) {
        setTimeout(() => {
          scene.applyExpression('listening', 300);
          setTimeout(() => {
            scene.applyExpression('happy', 300);
          }, 500);
        }, 500);
      }
      
    } catch (error) {
      console.error('[AVATAR] Initialization failed:', error);
      throw error;
    }
  }, [options.userId, options.avatarUrl, options.autoPlayWelcome]);
  
  /**
   * Send voice command to Avatar API
   */
  const voiceCommandMutation = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      setIsListening(false);
      setCurrentExpression('thinking');
      
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('context', JSON.stringify({
        timestamp: new Date(),
        user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }));
      
      const response = await fetch('/api/avatar/voice-command', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Voice command failed');
      return response.json();
    },
    onSuccess: (data) => {
      setLastResponse(data.message);
      setCurrentExpression('confident');
      
      // Update tasks after response
      tasksQuery.refetch();
    },
    onError: (error) => {
      console.error('[AVATAR] Voice command error:', error);
      setCurrentExpression('concerned');
    },
  });
  
  /**
   * Fetch pending avatar tasks
   */
  const tasksQuery = useQuery({
    queryKey: ['avatar-tasks'],
    queryFn: async () => {
      const response = await fetch('/api/avatar/tasks?status=pending_approval');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      return data.tasks as AvatarTask[];
    },
    initialData: [],
    refetchInterval: 5000, // Poll every 5 seconds
  });
  
  /**
   * Approve avatar task
   */
  const approveMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`/api/avatar/tasks/${taskId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modifications: null }),
      });
      
      if (!response.ok) throw new Error('Approval failed');
      return response.json();
    },
    onSuccess: () => {
      setCurrentExpression('happy');
      tasksQuery.refetch();
    },
  });
  
  /**
   * Reject avatar task
   */
  const rejectMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`/api/avatar/tasks/${taskId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) throw new Error('Rejection failed');
      return response.json();
    },
    onSuccess: () => {
      setCurrentExpression('neutral');
      tasksQuery.refetch();
    },
  });
  
  /**
   * Send voice command to avatar
   */
  const sendVoiceCommand = useCallback(
    async (audioBlob: Blob) => {
      setIsListening(false);
      return voiceCommandMutation.mutateAsync(audioBlob);
    },
    [voiceCommandMutation]
  );
  
  /**
   * Apply expression to avatar
   */
  const applyExpression = useCallback(
    (expression: Expression) => {
      sceneRef.current?.applyExpression(expression);
      setCurrentExpression(expression);
    },
    []
  );
  
  /**
   * Play audio with lip-sync
   */
  const playAudio = useCallback(
    async (audioData: Blob | ArrayBuffer) => {
      if (!sceneRef.current) return;
      
      setIsSpeaking(true);
      setCurrentExpression('happy');
      
      try {
        await sceneRef.current.playAudio(audioData);
        setIsSpeaking(false);
        setCurrentExpression('neutral');
      } catch (error) {
        console.error('[AVATAR] Audio playback error:', error);
        setIsSpeaking(false);
      }
    },
    []
  );
  
  /**
   * Get avatar state
   */
  const getState = useCallback(() => {
    return {
      isListening,
      isSpeaking,
      currentExpression,
      avatarLoaded: !!sceneRef.current,
      tasksPending: tasksQuery.data?.length || 0,
    };
  }, [isListening, isSpeaking, currentExpression, tasksQuery.data]);
  
  /**
   * Cleanup
   */
  const dispose = useCallback(() => {
    if (sceneRef.current) {
      sceneRef.current.dispose();
      sceneRef.current = null;
    }
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => dispose();
  }, [dispose]);
  
  return {
    // State
    isListening,
    setIsListening,
    isSpeaking,
    currentExpression,
    lastResponse,
    
    // Avatar control
    containerRef,
    initializeScene,
    applyExpression,
    playAudio,
    getState,
    dispose,
    
    // Voice commands
    sendVoiceCommand,
    isProcessingVoice: voiceCommandMutation.isPending,
    
    // Tasks
    tasks: tasksQuery.data || [],
    tasksLoading: tasksQuery.isLoading,
    approveTask: approveMutation.mutateAsync,
    rejectTask: rejectMutation.mutateAsync,
    isApprovingTask: approveMutation.isPending,
    isRejectingTask: rejectMutation.isPending,
  };
};

export default useAvatar;
