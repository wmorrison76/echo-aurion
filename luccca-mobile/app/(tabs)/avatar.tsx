/**
 * React Native Avatar Voice Interaction Screen
 * Voice commands, facial expressions, and task management
 * Week 11 Implementation
 */

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { AuthContext } from '@/context/AuthContext';

interface AvatarTask {
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

const EXPRESSIONS = ['neutral', 'happy', 'thinking', 'concerned', 'confident', 'listening'];

export default function AvatarScreen() {
  const { state: authState } = useContext(AuthContext);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [tasks, setTasks] = useState<AvatarTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentExpression, setCurrentExpression] = useState<string>('neutral');
  const [lastResponse, setLastResponse] = useState<string>('');
  const recordingRef = React.useRef<Audio.Recording | null>(null);

  // Initialize audio permissions
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpiece: false,
        });
      } catch (error) {
        console.error('[AVATAR] Audio setup error:', error);
      }
    };

    setupAudio();
  }, []);

  // Fetch pending tasks
  useEffect(() => {
    if (!authState.userToken) return;

    const fetchTasks = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          'https://api.luccca.app/api/avatar/tasks?status=pending_approval',
          {
            headers: {
              Authorization: `Bearer ${authState.userToken}`,
            },
          }
        );

        if (!response.ok) throw new Error('Failed to fetch tasks');

        const data = await response.json();
        setTasks(data.tasks || []);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load tasks';
        setError(message);
        console.error('[AVATAR] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();

    // Poll for new tasks every 10 seconds
    const interval = setInterval(fetchTasks, 10000);
    return () => clearInterval(interval);
  }, [authState.userToken]);

  // Update recording duration
  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      setCurrentExpression('listening');
      const recording = new Audio.Recording();

      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await recording.startAsync();

      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);
    } catch (error) {
      Alert.alert('Error', 'Failed to start recording');
      console.error('[AVATAR] Recording error:', error);
      setCurrentExpression('concerned');
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      setCurrentExpression('thinking');

      if (!recordingRef.current) {
        throw new Error('No recording in progress');
      }

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (uri) {
        await sendVoiceCommand(uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to stop recording');
      console.error('[AVATAR] Stop recording error:', error);
      setCurrentExpression('concerned');
    }
  };

  const sendVoiceCommand = async (audioUri: string) => {
    if (!authState.userToken) return;

    try {
      setIsProcessing(true);

      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        name: 'voice-command.m4a',
        type: 'audio/m4a',
      } as any);

      const response = await fetch(
        'https://api.luccca.app/api/avatar/voice-command',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authState.userToken}`,
          },
          body: formData,
        }
      );

      if (!response.ok) throw new Error('Voice command failed');

      const data = await response.json();
      setLastResponse(data.message);
      setCurrentExpression('happy');

      // Refresh tasks
      const tasksResponse = await fetch(
        'https://api.luccca.app/api/avatar/tasks?status=pending_approval',
        {
          headers: {
            Authorization: `Bearer ${authState.userToken}`,
          },
        }
      );

      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        setTasks(tasksData.tasks || []);
      }

      setTimeout(() => {
        setCurrentExpression('neutral');
      }, 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Voice command failed';
      Alert.alert('Error', message);
      setCurrentExpression('concerned');
    } finally {
      setIsProcessing(false);
    }
  };

  const approveTask = async (taskId: string) => {
    if (!authState.userToken) return;

    try {
      const response = await fetch(
        `https://api.luccca.app/api/avatar/tasks/${taskId}/approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authState.userToken}`,
          },
          body: JSON.stringify({ modifications: null }),
        }
      );

      if (!response.ok) throw new Error('Approval failed');

      setTasks(tasks.filter((t) => t.id !== taskId));
      Alert.alert('Success', 'Task approved and executing');
      setCurrentExpression('happy');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Approval failed';
      Alert.alert('Error', message);
    }
  };

  const rejectTask = async (taskId: string) => {
    if (!authState.userToken) return;

    try {
      const response = await fetch(
        `https://api.luccca.app/api/avatar/tasks/${taskId}/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authState.userToken}`,
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) throw new Error('Rejection failed');

      setTasks(tasks.filter((t) => t.id !== taskId));
      Alert.alert('Success', 'Task rejected');
      setCurrentExpression('neutral');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Rejection failed';
      Alert.alert('Error', message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#1e3a8a" />
          <Text style={styles.loadingText}>Initializing Avatar...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Avatar Representation */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>🤖</Text>
          </View>
          <Text style={styles.avatarName}>LUCCCA Avatar</Text>
          <Text style={styles.expressionLabel}>Expression: {currentExpression}</Text>
        </View>

        {/* Voice Command Section */}
        <View style={styles.commandSection}>
          <Text style={styles.sectionTitle}>Voice Command</Text>

          <TouchableOpacity
            style={[
              styles.voiceButton,
              isRecording && styles.voiceButtonRecording,
            ]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
          >
            <MaterialCommunityIcons
              name={isRecording ? 'stop-circle' : 'microphone'}
              size={40}
              color={isRecording ? '#ef4444' : '#1e3a8a'}
            />
            <Text style={styles.voiceButtonText}>
              {isProcessing ? 'Processing...' : isRecording ? 'Stop Recording' : 'Start Recording'}
            </Text>
            {isRecording && (
              <Text style={styles.recordingDuration}>{recordingDuration}s</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.voiceHint}>
            {isProcessing
              ? 'Processing your voice command...'
              : isRecording
              ? 'Speak your command...'
              : 'Click to record a voice command'}
          </Text>

          {lastResponse && (
            <View style={styles.responseBox}>
              <MaterialCommunityIcons name="check-circle" size={20} color="#10b981" />
              <Text style={styles.responseText}>{lastResponse}</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle" size={20} color="#dc2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        {/* Expression Selector */}
        <View style={styles.expressionSection}>
          <Text style={styles.sectionTitle}>Expressions</Text>
          <View style={styles.expressionGrid}>
            {EXPRESSIONS.map((exp) => (
              <TouchableOpacity
                key={exp}
                style={[
                  styles.expressionButton,
                  currentExpression === exp && styles.expressionButtonActive,
                ]}
                onPress={() => setCurrentExpression(exp)}
              >
                <Text style={styles.expressionButtonText}>{exp}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Pending Tasks */}
        {tasks.length > 0 && (
          <View style={styles.tasksSection}>
            <Text style={styles.sectionTitle}>Pending Approvals ({tasks.length})</Text>

            {tasks.map((task) => (
              <View key={task.id} style={styles.taskCard}>
                <View style={styles.taskHeader}>
                  <Text style={styles.taskType}>{task.task_type}</Text>
                  <Text style={styles.confidenceScore}>
                    {Math.round(task.confidence_score * 100)}%
                  </Text>
                </View>

                <Text style={styles.taskTranscript}>{task.voice_transcript}</Text>

                <View style={styles.taskSteps}>
                  <Text style={styles.stepsLabel}>Steps:</Text>
                  {task.action_plan.action_steps.map((step, idx) => (
                    <Text key={idx} style={styles.stepText}>
                      {idx + 1}. {step.description}
                    </Text>
                  ))}
                  <Text style={styles.timeEstimate}>
                    ⏱️ ~{task.action_plan.estimated_time_minutes}m
                  </Text>
                </View>

                <View style={styles.taskActions}>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => rejectTask(task.id)}
                  >
                    <MaterialCommunityIcons name="close" size={16} color="#ffffff" />
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => approveTask(task.id)}
                  >
                    <MaterialCommunityIcons name="check" size={16} color="#ffffff" />
                    <Text style={styles.approveButtonText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {tasks.length === 0 && (
          <View style={styles.emptySection}>
            <MaterialCommunityIcons name="check-all" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No pending tasks</Text>
            <Text style={styles.emptySubtext}>All caught up!</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarEmoji: {
    fontSize: 40,
  },
  avatarName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  expressionLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  commandSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  voiceButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    marginBottom: 12,
  },
  voiceButtonRecording: {
    backgroundColor: '#fee2e2',
  },
  voiceButtonText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#1e3a8a',
  },
  recordingDuration: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
    color: '#ef4444',
  },
  voiceHint: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  responseBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#dcfce7',
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  responseText: {
    fontSize: 13,
    color: '#166534',
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    flex: 1,
  },
  expressionSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  expressionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  expressionButton: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderColor: '#d1d5db',
    borderWidth: 1,
    alignItems: 'center',
  },
  expressionButtonActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a',
  },
  expressionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    textTransform: 'capitalize',
  },
  expressionButtonActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a',
  },
  tasksSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  taskCard: {
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textTransform: 'capitalize',
  },
  confidenceScore: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  taskTranscript: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 18,
  },
  taskSteps: {
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  stepsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  stepText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 3,
  },
  timeEstimate: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  taskActions: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#10b981',
    borderRadius: 6,
    gap: 4,
  },
  approveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#ef4444',
    borderRadius: 6,
    gap: 4,
  },
  rejectButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#9ca3af',
  },
});
