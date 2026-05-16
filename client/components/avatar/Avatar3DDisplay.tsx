/**
 * Avatar3DDisplay Component
 * Renders the 3D avatar with Babylon.js + voice interaction
 */

import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAvatar } from '@/hooks/useAvatar';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

interface Avatar3DDisplayProps {
  userId?: string;
  className?: string;
  showStatus?: boolean;
}

export const Avatar3DDisplay: React.FC<Avatar3DDisplayProps> = ({
  userId = 'default-user',
  className = '',
  showStatus = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const avatar = useAvatar({
    userId,
    containerElement: canvasRef.current || undefined,
    autoPlayWelcome: true,
  });
  
  const voice = useVoiceRecording({
    onTranscript: async (transcript) => {
      console.log('[AVATAR] Transcript:', transcript);
    },
    onError: (error) => {
      setError(`Voice error: ${error.message}`);
    },
  });
  
  // Initialize avatar scene
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const initializeAvatar = async () => {
      try {
        await avatar.initializeScene();
        setInitialized(true);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize avatar');
        console.error('[AVATAR] Init error:', err);
      }
    };
    
    initializeAvatar();
    
    return () => {
      avatar.dispose();
    };
  }, [avatar]);
  
  // Handle voice recording + avatar command
  const handleVoiceClick = async () => {
    if (voice.isRecording) {
      // Stop recording and process
      await voice.stopRecording();
      
      if (voice.audioBlob) {
        avatar.setIsListening(false);
        await avatar.sendVoiceCommand(voice.audioBlob);
      }
    } else {
      // Start recording
      avatar.setIsListening(true);
      await voice.startRecording();
    }
  };
  
  return (
    <div className={`avatar-display-container ${className}`}>
      <ErrorBoundary
        fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur">
            <Card className="bg-white p-6 max-w-sm">
              <p className="text-red-600 font-semibold">Avatar Runtime Error</p>
              <p className="text-gray-600 text-sm mt-2">
                The 3D engine encountered an unexpected error.
              </p>
              <Button
                onClick={() => window.location.reload()}
                className="mt-4 w-full"
              >
                Reload App
              </Button>
            </Card>
          </div>
        }
      >
        {/* Canvas for 3D rendering */}
        <div className="relative w-full h-screen bg-gradient-to-b from-gray-50 to-gray-100 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: 'block' }}
        />
        
        {/* Loading state */}
        {!initialized && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4" />
              <p className="text-white font-semibold">Loading Avatar...</p>
            </div>
          </div>
        )}
        
        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur">
            <Card className="bg-white p-6 max-w-sm">
              <p className="text-red-600 font-semibold">Avatar Error</p>
              <p className="text-gray-600 text-sm mt-2">{error}</p>
              <Button
                onClick={() => window.location.reload()}
                className="mt-4 w-full"
              >
                Reload
              </Button>
            </Card>
          </div>
        )}
        
        {/* Bottom Controls */}
        {initialized && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-4 z-50">
            {/* Status Indicators */}
            {showStatus && (
              <div className="flex gap-2">
                {avatar.isListening && (
                  <div className="flex items-center gap-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm animate-pulse">
                    🎤 Listening...
                  </div>
                )}
                {avatar.isSpeaking && (
                  <div className="flex items-center gap-2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm animate-pulse">
                    🗣️ Speaking...
                  </div>
                )}
                {voice.isProcessing && (
                  <div className="flex items-center gap-2 bg-purple-500 text-white px-3 py-1 rounded-full text-sm animate-pulse">
                    ⏳ Processing...
                  </div>
                )}
              </div>
            )}
            
            {/* Voice Button */}
            <button
              onClick={handleVoiceClick}
              disabled={!initialized}
              className={`
                relative w-16 h-16 rounded-full font-semibold text-white
                transition-all duration-300 transform
                ${voice.isRecording
                  ? 'bg-red-500 hover:bg-red-600 scale-110 shadow-lg shadow-red-500/50'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/50'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center text-2xl
              `}
              title={voice.isRecording ? 'Stop Recording (Enter or Click to Submit)' : 'Click to Talk to Avatar'}
            >
              {voice.isRecording ? '⏹️' : '🎤'}
            </button>
            
            {/* Instructions */}
            <p className="text-gray-600 text-sm text-center max-w-xs">
              {voice.isRecording
                ? 'Speaking... Click again to stop'
                : 'Click the microphone and tell the avatar what to do'}
            </p>
          </div>
        )}
        
        {/* Top Status Panel */}
        {showStatus && avatar.lastResponse && (
          <div className="absolute top-4 left-4 right-4 bg-green-50 border border-green-200 rounded-lg p-4 shadow-md z-40">
            <p className="text-green-800 text-sm font-semibold">Task Created:</p>
            <p className="text-green-700 text-sm mt-1">{avatar.lastResponse}</p>
          </div>
        )}
        
        {/* Expression Display */}
        {showStatus && (
          <div className="absolute top-4 right-4 bg-white/80 backdrop-blur rounded-lg p-3 shadow-md z-40">
            <p className="text-xs text-gray-600">Expression:</p>
            <p className="text-sm font-semibold text-gray-900 capitalize">
              {avatar.currentExpression}
            </p>
          </div>
        )}
      </div>
      </ErrorBoundary>

      {/* Pending Tasks Panel */}
      {avatar.tasks.length > 0 && (
        <div className="fixed bottom-24 right-4 max-w-sm z-40">
          <Card className="bg-white shadow-lg">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-900">Pending Tasks</h3>
              <p className="text-sm text-gray-600">{avatar.tasks.length} task(s)</p>
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {avatar.tasks.map((task) => (
                <div key={task.id} className="p-4 border-b last:border-b-0">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium text-sm text-gray-900">
                      {task.task_type}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold
                      ${task.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' : ''}
                      ${task.status === 'approved' ? 'bg-blue-100 text-blue-800' : ''}
                      ${task.status === 'executing' ? 'bg-purple-100 text-purple-800' : ''}
                    `}>
                      {task.status}
                    </span>
                  </div>
                  
                  <p className="text-xs text-gray-600 mb-3">
                    {task.action_plan.action_steps[0]?.description}
                  </p>
                  
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs text-gray-500">
                      ⏱️ ~{task.action_plan.estimated_time_minutes}m
                    </p>
                    <p className="text-xs text-gray-500">
                      🎯 {Math.round(task.confidence_score * 100)}%
                    </p>
                  </div>
                  
                  {task.status === 'pending_approval' && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => avatar.approveTask(task.id)}
                        disabled={avatar.isApprovingTask}
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        Approve
                      </Button>
                      <Button
                        onClick={() => avatar.rejectTask(task.id)}
                        disabled={avatar.isRejectingTask}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Avatar3DDisplay;
