import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Mic, MicOff, Video, VideoOff } from 'lucide-react';

interface JitsiVideoCallProps {
  roomName: string;
  displayName: string;
  onClose: () => void;
  parentNode?: HTMLElement;
}

export const JitsiVideoCall: React.FC<JitsiVideoCallProps> = ({
  roomName,
  displayName,
  onClose,
  parentNode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const jitsiRef = useRef<any>(null);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isVideoOff, setIsVideoOff] = React.useState(false);

  useEffect(() => {
    // Load Jitsi script dynamically
    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;

    script.onload = () => {
      if (!window.JitsiMeetExternalAPI) return;

      const container = parentNode || containerRef.current;
      if (!container) return;

      const jitsi = new (window as any).JitsiMeetExternalAPI('meet.jit.si', {
        roomName: `luccca-${roomName}-${Date.now()}`,
        width: '100%',
        height: '100%',
        parentNode: container,
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableSimulcast: false,
          enableLipSync: true,
          constraints: {
            video: {
              height: {
                ideal: 720,
                max: 720,
                min: 240,
              },
              width: {
                ideal: 1280,
                max: 1280,
                min: 320,
              },
            },
          },
        },
        userInfo: {
          displayName,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          TOOLBAR_BUTTONS: [
            'microphone',
            'camera',
            'closedcaptions',
            'desktop',
            'fullscreen',
            'fodeviceselection',
            'hangup',
            'chat',
            'recording',
            'livestream',
            'etherpad',
            'settings',
            'raisehand',
            'videoquality',
            'filmstrip',
            'feedback',
            'stats',
            'shortcuts',
            'tileview',
            'select-background',
            'download',
          ],
          LANG_DETECTION: true,
          NATIVE_SRC_DISCOVERY_ENABLED: true,
        },
      });

      jitsiRef.current = jitsi;

      // Handle ready event
      jitsi.addEventListener('readyToClose', () => {
        onClose();
      });

      // Handle audio/video mute events
      jitsi.addEventListener('audioMuteStatusChanged', (data: any) => {
        setIsMuted(data.muted);
      });

      jitsi.addEventListener('videoMuteStatusChanged', (data: any) => {
        setIsVideoOff(data.muted);
      });

      return () => {
        if (jitsiRef.current) {
          jitsiRef.current.dispose();
        }
      };
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      if (jitsiRef.current) {
        jitsiRef.current.dispose();
      }
    };
  }, [roomName, displayName, parentNode, onClose]);

  const toggleAudio = () => {
    if (jitsiRef.current) {
      jitsiRef.current.executeCommand('toggleAudio');
    }
  };

  const toggleVideo = () => {
    if (jitsiRef.current) {
      jitsiRef.current.executeCommand('toggleVideo');
    }
  };

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      {/* Video Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Control Buttons - Floating */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
        <Button
          variant={isMuted ? 'destructive' : 'default'}
          size="sm"
          onClick={toggleAudio}
          className="rounded-full"
        >
          {isMuted ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant={isVideoOff ? 'destructive' : 'default'}
          size="sm"
          onClick={toggleVideo}
          className="rounded-full"
        >
          {isVideoOff ? (
            <VideoOff className="h-4 w-4" />
          ) : (
            <Video className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="destructive"
          size="sm"
          onClick={onClose}
          className="rounded-full"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Status Indicator */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        {isMuted && (
          <div className="bg-red-500 text-white text-xs px-2 py-1 rounded">
            Muted
          </div>
        )}
        {isVideoOff && (
          <div className="bg-red-500 text-white text-xs px-2 py-1 rounded">
            Camera Off
          </div>
        )}
      </div>
    </div>
  );
};

// Declare Jitsi types
declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export default JitsiVideoCall;
