import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Volume2,
  VolumeX,
  Settings,
  Maximize2,
  Minimize2,
  Pin,
  PinOff,
  MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MeetingParticipant, VideoConfig, AudioConfig } from '@/shared/sales-meeting-types';

interface VideoConferenceProps {
  participants: MeetingParticipant[];
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  onVideoToggle: () => void;
  onAudioToggle: () => void;
  onScreenShareToggle: () => void;
  className?: string;
}

interface VideoStream {
  participantId: string;
  stream: MediaStream;
  isScreenShare?: boolean;
  volume: number;
}

export default function VideoConference({
  participants,
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  onVideoToggle,
  onAudioToggle,
  onScreenShareToggle,
  className
}: VideoConferenceProps) {
  const [videoStreams, setVideoStreams] = useState<VideoStream[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoLayout, setVideoLayout] = useState<'grid' | 'speaker' | 'sidebar'>('grid');
  const [pinnedParticipant, setPinnedParticipant] = useState<string | null>(null);
  const [videoQuality, setVideoQuality] = useState<'720p' | '1080p'>('720p');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Get available media devices
  const getMediaDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAvailableDevices(devices);
      
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      
      if (videoDevices.length > 0 && !selectedVideoDevice) {
        setSelectedVideoDevice(videoDevices[0].deviceId);
      }
      if (audioDevices.length > 0 && !selectedAudioDevice) {
        setSelectedAudioDevice(audioDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Error getting media devices:', error);
    }
  }, [selectedVideoDevice, selectedAudioDevice]);

  // Initialize local media stream
  const initializeLocalStream = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: isVideoEnabled ? {
          deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined,
          width: { ideal: videoQuality === '1080p' ? 1920 : 1280 },
          height: { ideal: videoQuality === '1080p' ? 1080 : 720 },
          frameRate: { ideal: 30 }
        } : false,
        audio: isAudioEnabled ? {
          deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }, [isVideoEnabled, isAudioEnabled, selectedVideoDevice, selectedAudioDevice, videoQuality]);

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });

      setScreenShareStream(stream);

      if (screenShareRef.current) {
        screenShareRef.current.srcObject = stream;
      }

      // Listen for when screen sharing ends
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        stopScreenShare();
      });

      return stream;
    } catch (error) {
      console.error('Error starting screen share:', error);
      throw error;
    }
  }, []);

  // Stop screen sharing
  const stopScreenShare = useCallback(() => {
    if (screenShareStream) {
      screenShareStream.getTracks().forEach(track => track.stop());
      setScreenShareStream(null);
      
      if (screenShareRef.current) {
        screenShareRef.current.srcObject = null;
      }
    }
  }, [screenShareStream]);

  // Handle screen share toggle
  const handleScreenShareToggle = useCallback(async () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      try {
        await startScreenShare();
      } catch (error) {
        console.error('Failed to start screen sharing:', error);
      }
    }
    onScreenShareToggle();
  }, [isScreenSharing, stopScreenShare, startScreenShare, onScreenShareToggle]);

  // Update local stream when settings change
  useEffect(() => {
    if (localStream) {
      // Update video track
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = isVideoEnabled;
      }

      // Update audio track
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isAudioEnabled;
      }
    }
  }, [localStream, isVideoEnabled, isAudioEnabled]);

  // Initialize media devices and stream
  useEffect(() => {
    getMediaDevices();
    initializeLocalStream().catch(console.error);

    return () => {
      // Cleanup streams on unmount
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (screenShareStream) {
        screenShareStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Mock video streams for remote participants
  useEffect(() => {
    const mockStreams = participants
      .filter(p => p.id !== 'user-1' && p.hasVideo) // Exclude local user
      .map(p => ({
        participantId: p.id,
        stream: new MediaStream(), // In real implementation, this would be the actual stream
        volume: 0.8
      }));
    
    setVideoStreams(mockStreams);
  }, [participants]);

  const getParticipantById = (id: string) => participants.find(p => p.id === id);

  const getVideoGridClass = () => {
    const totalVideos = videoStreams.length + (localStream ? 1 : 0) + (screenShareStream ? 1 : 0);
    
    if (videoLayout === 'speaker' || pinnedParticipant) {
      return 'grid-cols-1';
    }
    
    if (totalVideos <= 2) return 'grid-cols-1 md:grid-cols-2';
    if (totalVideos <= 4) return 'grid-cols-2';
    if (totalVideos <= 6) return 'grid-cols-2 md:grid-cols-3';
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
  };

  const VideoTile = ({ 
    participantId, 
    stream, 
    isLocal = false, 
    isScreenShare = false,
    className: tileClassName 
  }: { 
    participantId?: string;
    stream?: MediaStream; 
    isLocal?: boolean; 
    isScreenShare?: boolean;
    className?: string;
  }) => {
    const participant = participantId ? getParticipantById(participantId) : null;
    const isPinned = pinnedParticipant === participantId;
    const showControls = isLocal || participant?.role === 'host';

    return (
      <Card className={cn(
        "relative overflow-hidden group",
        isPinned && "ring-2 ring-primary",
        isScreenShare && "col-span-2 row-span-2",
        tileClassName
      )}>
        <CardContent className="p-0 h-full relative">
          {/* Video Element */}
          <video
            ref={isLocal ? localVideoRef : isScreenShare ? screenShareRef : undefined}
            autoPlay
            muted={isLocal}
            playsInline
            className="w-full h-full object-cover bg-muted"
          />

          {/* Participant Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {!isScreenShare && (
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs">
                      {isLocal ? 'You' : participant?.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                )}
                <span className="text-white text-sm font-medium">
                  {isScreenShare 
                    ? `${participant?.name || 'Someone'}'s Screen` 
                    : isLocal 
                      ? 'You' 
                      : participant?.name || 'Unknown'
                  }
                </span>
                {participant?.isPresenting && !isScreenShare && (
                  <Monitor className="w-3 h-3 text-blue-400" />
                )}
              </div>

              <div className="flex items-center gap-1">
                {!isScreenShare && (
                  <>
                    {(isLocal ? isVideoEnabled : participant?.hasVideo) ? (
                      <Video className="w-3 h-3 text-green-400" />
                    ) : (
                      <VideoOff className="w-3 h-3 text-red-400" />
                    )}
                    {(isLocal ? isAudioEnabled : participant?.hasAudio) ? (
                      <Mic className="w-3 h-3 text-green-400" />
                    ) : (
                      <MicOff className="w-3 h-3 text-red-400" />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Video Controls Overlay */}
          {showControls && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm" className="w-8 h-8 p-0">
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {!isLocal && (
                    <>
                      <DropdownMenuItem onClick={() => setPinnedParticipant(isPinned ? null : participantId)}>
                        {isPinned ? <PinOff className="w-4 h-4 mr-2" /> : <Pin className="w-4 h-4 mr-2" />}
                        {isPinned ? 'Unpin' : 'Pin Video'}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Volume2 className="w-4 h-4 mr-2" />
                        Adjust Volume
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem>
                    <Maximize2 className="w-4 h-4 mr-2" />
                    Full Screen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* No Video Placeholder */}
          {!isScreenShare && !(isLocal ? isVideoEnabled : participant?.hasVideo) && (
            <div className="absolute inset-0 bg-muted flex items-center justify-center">
              <div className="text-center">
                <Avatar className="w-16 h-16 mx-auto mb-2">
                  <AvatarFallback className="text-lg">
                    {isLocal ? 'You' : participant?.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <VideoOff className="w-6 h-6 mx-auto text-muted-foreground" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Video Layout Controls */}
      <div className="flex items-center justify-between p-2 bg-muted/30 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Button
            variant={videoLayout === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setVideoLayout('grid')}
          >
            Grid
          </Button>
          <Button
            variant={videoLayout === 'speaker' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setVideoLayout('speaker')}
          >
            Speaker
          </Button>
          <Button
            variant={videoLayout === 'sidebar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setVideoLayout('sidebar')}
          >
            Sidebar
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setVideoQuality(videoQuality === '720p' ? '1080p' : '720p')}>
                Quality: {videoQuality}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Video className="w-4 h-4 mr-2" />
                Camera Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Mic className="w-4 h-4 mr-2" />
                Audio Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4 bg-black/5 rounded-b-lg">
        {screenShareStream && (
          <div className="mb-4">
            <VideoTile 
              stream={screenShareStream} 
              isScreenShare={true}
              participantId="user-1"
              className="aspect-video"
            />
          </div>
        )}

        <div className={cn("grid gap-4 h-full", getVideoGridClass())}>
          {/* Local Video */}
          {localStream && (
            <VideoTile 
              stream={localStream} 
              isLocal={true}
              className="aspect-video"
            />
          )}

          {/* Remote Videos */}
          {videoStreams.map((videoStream) => (
            <VideoTile
              key={videoStream.participantId}
              participantId={videoStream.participantId}
              stream={videoStream.stream}
              className="aspect-video"
            />
          ))}

          {/* Participants without video */}
          {participants
            .filter(p => p.id !== 'user-1' && !p.hasVideo)
            .map((participant) => (
              <VideoTile
                key={participant.id}
                participantId={participant.id}
                className="aspect-video"
              />
            ))}
        </div>
      </div>
    </div>
  );
}
