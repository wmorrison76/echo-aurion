/**
 * Avatar Test Page
 * Test the avatar voice interaction and task creation
 */

import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AvatarTask {
  id: string;
  task_type: string;
  status: string;
  action_plan: {
    action_steps: Array<{ description: string }>;
    estimated_time_minutes: number;
  };
  confidence_score: number;
  voice_transcript: string;
}

export default function AvatarTest() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [tasks, setTasks] = useState<AvatarTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      mediaRecorder.start();
    } catch (err) {
      setError('Microphone access denied');
      console.error('Microphone error:', err);
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;

    const mediaRecorder = mediaRecorderRef.current;
    setIsRecording(false);
    setIsProcessing(true);

    return new Promise<void>((resolve) => {
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await sendVoiceCommand(blob);
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());
        resolve();
      };

      mediaRecorder.stop();
    });
  };

  const sendVoiceCommand = async (audioBlob: Blob) => {
    try {
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

      if (!response.ok) {
        throw new Error('Voice command failed');
      }

      const data = await response.json();
      setTranscript(data.transcript || '');
      setLastResponse(data.message || 'Processing...');

      // Fetch tasks
      const tasksResponse = await fetch('/api/avatar/tasks?status=pending_approval');
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        setTasks(tasksData.tasks || []);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process voice command');
      console.error('Voice command error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const approveTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/avatar/tasks/${taskId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modifications: null }),
      });

      if (!response.ok) throw new Error('Failed to approve task');

      // Refresh tasks
      const tasksResponse = await fetch('/api/avatar/tasks');
      if (tasksResponse.ok) {
        const data = await tasksResponse.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve task');
    }
  };

  const rejectTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/avatar/tasks/${taskId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) throw new Error('Failed to reject task');

      // Refresh tasks
      const tasksResponse = await fetch('/api/avatar/tasks');
      if (tasksResponse.ok) {
        const data = await tasksResponse.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject task');
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Avatar Voice Test</h1>
          <p className="text-slate-300">Interact with the avatar using voice commands</p>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="bg-red-50 border-red-200 p-4">
            <p className="text-red-800">{error}</p>
          </Card>
        )}

        {/* Voice Recording Section */}
        <Card className="bg-slate-800 border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Voice Command</h2>

          <div className="flex flex-col items-center gap-4">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`
                w-20 h-20 rounded-full flex items-center justify-center text-4xl
                transition-all duration-300 transform font-bold
                ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 scale-110 shadow-lg shadow-red-500/50'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/50'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isRecording ? '⏹️' : '🎤'}
            </button>

            <p className="text-slate-300 text-center">
              {isRecording
                ? 'Recording... Click to stop'
                : isProcessing
                ? 'Processing...'
                : 'Click to start recording'}
            </p>
          </div>

          {/* Transcript */}
          {transcript && (
            <div className="mt-4 p-3 bg-slate-700 rounded text-slate-100 text-sm">
              <span className="font-semibold">You said: </span>{transcript}
            </div>
          )}

          {/* Response */}
          {lastResponse && (
            <div className="mt-4 p-3 bg-green-900/30 border border-green-500/30 rounded text-green-100 text-sm">
              <span className="font-semibold">Avatar: </span>{lastResponse}
            </div>
          )}
        </Card>

        {/* Pending Tasks Section */}
        {tasks.length > 0 && (
          <Card className="bg-slate-800 border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              Pending Tasks ({tasks.length})
            </h2>

            <div className="space-y-4">
              {tasks.map((task) => (
                <Card key={task.id} className="bg-slate-700 border-slate-600 p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-white">{task.task_type}</p>
                      <p className="text-sm text-slate-400 mt-1">
                        Confidence: {Math.round(task.confidence_score * 100)}%
                      </p>
                    </div>
                    <span
                      className={`
                        px-3 py-1 rounded-full text-xs font-semibold
                        ${
                          task.status === 'pending_approval'
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }
                      `}
                    >
                      {task.status}
                    </span>
                  </div>

                  <p className="text-slate-300 text-sm mb-3">
                    {task.action_plan.action_steps[0]?.description}
                  </p>

                  <p className="text-xs text-slate-400 mb-4">
                    Estimated time: {task.action_plan.estimated_time_minutes} minutes
                  </p>

                  {task.status === 'pending_approval' && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => approveTask(task.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        Approve
                      </Button>
                      <Button
                        onClick={() => rejectTask(task.id)}
                        variant="outline"
                        className="flex-1"
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-slate-700/50 border-slate-600 p-4">
          <h3 className="font-semibold text-white mb-2">How to Test:</h3>
          <ul className="text-slate-300 text-sm space-y-1 list-disc list-inside">
            <li>Click the microphone button and speak a command</li>
            <li>Try: "Check inventory", "Create order", "Schedule shift"</li>
            <li>The avatar will process your command and create a task</li>
            <li>Review and approve/reject the suggested task</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
