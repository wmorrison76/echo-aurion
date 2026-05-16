// SalesMeeting.tsx
// A comprehensive sales meeting platform with video conferencing, digital whiteboard, and chat functionalities.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Users,
  MessageSquare,
  Palette,
  Type,
  Square,
  Circle,
  ArrowRight,
  Eraser,
  Highlighter,
  MousePointer,
  Hand,
  Settings,
  Phone,
  PhoneOff,
  Camera,
  CameraOff,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  X,
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Shield,
  Clock,
  Download,
  Upload,
  Link,
  StickyNote,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Save,
  FileImage,
  FileText,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  MeetingSession,
  MeetingParticipant,
  ChatMessage,
  WhiteboardElement,
  WhiteboardTool,
  defaultWhiteboardTools,
  meetingColors,
  VideoConfig,
  AudioConfig
} from '@shared/sales-meeting-types';
import VideoConference from '@/components/VideoConference';
import MeetingScheduler from '@/components/MeetingScheduler';

// Separate component for Whiteboard SVG to isolate rendering issues
interface WhiteboardSVGProps {
  whiteboardRef: React.RefObject<SVGSVGElement>;
  whiteboardElements: WhiteboardElement[];
  whiteboardZoom: number;
  onMouseDown: (e: React.MouseEvent<SVGSVGElement>) => void;
  onMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void;
  onMouseUp: (e: React.MouseEvent<SVGSVGElement>) => void;
}

function WhiteboardSVG({
  whiteboardRef,
  whiteboardElements,
  whiteboardZoom,
  onMouseDown,
  onMouseMove,
  onMouseUp
}: WhiteboardSVGProps) {
  const safeElements = Array.isArray(whiteboardElements) ? whiteboardElements : [];
  const safeZoom = typeof whiteboardZoom === 'number' ? whiteboardZoom : 1;

  return (
    <svg
      ref={whiteboardRef}
      className="w-full h-full cursor-crosshair"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{ transform: `scale(${safeZoom})`, transformOrigin: 'top left' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Grid Pattern */}
      <defs>
        <pattern id="whiteboard-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#whiteboard-grid)" />

      {/* Whiteboard Elements */}
      <g id="whiteboard-elements">
        {safeElements
          .filter(element =>
            element &&
            element.id &&
            element.style &&
            element.type === 'draw' &&
            element.path
          )
          .map((element, index) => (
            <g key={`${element.id}-${index}`}>
              <path
                d={element.path}
                fill="none"
                stroke={element.style.color || '#000000'}
                strokeWidth={element.style.strokeWidth || 2}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={element.style.fillColor ? 0.3 : 1}
              />
            </g>
          ))
        }
      </g>
    </svg>
  );
}

export default function SalesMeeting() {
  // Early check for required dependencies
  if (typeof React === 'undefined' || typeof useState === 'undefined' || typeof useCallback === 'undefined' || typeof useEffect === 'undefined') {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">Missing React dependencies</p>
          <button onClick={() => window.location.reload()} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  const [isComponentReady, setIsComponentReady] = useState(false);

  // Meeting state
  const [meetingSession, setMeetingSession] = useState<MeetingSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // UI state
  const [showParticipants, setShowParticipants] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [showVideoConference, setShowVideoConference] = useState(true);
  const [participantsPanelPosition, setParticipantsPanelPosition] = useState({ x: 20, y: 20 });
  const [participantsPanelMinimized, setParticipantsPanelMinimized] = useState(false);
  const [chatPanelPosition, setChatPanelPosition] = useState({ x: 300, y: 20 });
  const [chatPanelMinimized, setChatPanelMinimized] = useState(false);
  const [videoPanelPosition, setVideoPanelPosition] = useState({ x: 600, y: 20 });
  const [videoPanelMinimized, setVideoPanelMinimized] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);

  // Whiteboard state
  const [activeTool, setActiveTool] = useState<WhiteboardTool>(
    defaultWhiteboardTools?.[0] || { type: 'select', color: '#000000', strokeWidth: 2, opacity: 1 }
  );
  const [whiteboardElements, setWhiteboardElements] = useState<WhiteboardElement[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [whiteboardZoom, setWhiteboardZoom] = useState(1);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeChatTab, setActiveChatTab] = useState<'group' | 'private'>('group');
  const [selectedPrivateChat, setSelectedPrivateChat] = useState<string | null>(null);

  // Refs
  const whiteboardRef = useRef<SVGSVGElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Mock data
  const mockParticipants: MeetingParticipant[] = [
    {
      id: 'user-1',
      name: 'John Smith',
      email: 'john@company.com',
      role: 'host',
      department: 'Sales',
      location: 'New York, USA',
      isOnline: true,
      hasVideo: true,
      hasAudio: true,
      isHandRaised: false,
      isPresenting: false,
      joinedAt: new Date(),
      permissions: {
        canDraw: true,
        canShare: true,
        canChat: true,
        canModerate: true
      }
    },
    {
      id: 'user-2',
      name: 'Sarah Johnson',
      email: 'sarah@client.com',
      role: 'client',
      location: 'London, UK',
      isOnline: true,
      hasVideo: true,
      hasAudio: true,
      isHandRaised: false,
      isPresenting: false,
      joinedAt: new Date(),
      permissions: {
        canDraw: false,
        canShare: false,
        canChat: true,
        canModerate: false
      }
    },
    {
      id: 'user-3',
      name: 'Mike Chen',
      email: 'mike@company.com',
      role: 'sales_rep',
      department: 'International Sales',
      location: 'Singapore',
      isOnline: true,
      hasVideo: false,
      hasAudio: true,
      isHandRaised: true,
      isPresenting: false,
      joinedAt: new Date(),
      permissions: {
        canDraw: true,
        canShare: true,
        canChat: true,
        canModerate: false
      }
    }
  ];

  const mockChatMessages: ChatMessage[] = [
    {
      id: 'msg-1',
      senderId: 'user-1',
      content: 'Welcome everyone to the sales presentation!',
      type: 'text',
      timestamp: new Date(Date.now() - 300000),
      isPrivate: false,
      isInternal: false,
      isEncrypted: true
    },
    {
      id: 'msg-2',
      senderId: 'user-3',
      recipientId: 'chef-1',
      content: 'Hey chef, quick question - can the broccoli be grilled instead of steamed for this client?',
      type: 'text',
      timestamp: new Date(Date.now() - 120000),
      isPrivate: true,
      isInternal: true,
      isEncrypted: true
    }
  ];

  // Initialize component safely
  useEffect(() => {
    try {
      // Check if all required imports and data are available
      if (!defaultWhiteboardTools || !Array.isArray(defaultWhiteboardTools) || defaultWhiteboardTools.length === 0) {
        console.error('defaultWhiteboardTools not available');
        setIsComponentReady(false);
        return;
      }

      if (!mockParticipants || !Array.isArray(mockParticipants)) {
        console.error('mockParticipants not available');
        setIsComponentReady(false);
        return;
      }

      if (!mockChatMessages || !Array.isArray(mockChatMessages)) {
        console.error('mockChatMessages not available');
        setIsComponentReady(false);
        return;
      }

      setMeetingSession({
        id: 'meeting-1',
        title: 'Q1 Sales Presentation - Global Catering Solutions',
        hostId: 'user-1',
        participants: mockParticipants,
        status: 'active',
        startTime: new Date(),
        scheduledDuration: 60,
        meetingType: 'sales_call',
        securityLevel: 'high',
        settings: {
          allowGuestAccess: false,
          requireApproval: true,
          recordMeeting: true,
          allowScreenShare: true,
          allowFileShare: true,
          enableWaitingRoom: true,
          maxParticipants: 10
        },
        whiteboard: {
          elements: [],
          viewBox: { x: 0, y: 0, width: 1920, height: 1080, zoom: 1 },
          activeTool: defaultWhiteboardTools[0] || { type: 'select', color: '#000000', strokeWidth: 2, opacity: 1 },
          selectedElements: [],
          collaborativeCursors: new Map()
        },
        chatHistory: mockChatMessages,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      setChatMessages(mockChatMessages);
      setIsComponentReady(true);
    } catch (error) {
      console.error('Error initializing SalesMeeting component:', error);
      setIsComponentReady(false);
    }
  }, []);

  // Whiteboard drawing functions
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!activeTool?.type || activeTool.type !== 'pen' && activeTool.type !== 'highlighter') return;

    setIsDrawing(true);
    const rect = whiteboardRef.current?.getBoundingClientRect();
    if (!rect || !e.clientX || !e.clientY) return;

    const zoom = whiteboardZoom || 1;
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    if (isNaN(x) || isNaN(y)) return;

    const newElement: WhiteboardElement = {
      id: `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'draw',
      x,
      y,
      content: '',
      style: {
        color: activeTool.color || '#000000',
        strokeWidth: activeTool.strokeWidth || 2,
        fillColor: activeTool.type === 'highlighter' ? (activeTool.color || '#ffff00') : undefined
      },
      path: `M ${x} ${y}`,
      createdBy: 'user-1',
      createdAt: new Date(),
      isLocked: false,
      layer: 1
    };

    setWhiteboardElements(prev => [...(Array.isArray(prev) ? prev : []), newElement]);
  }, [activeTool, whiteboardZoom]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing || !activeTool?.type || (activeTool.type !== 'pen' && activeTool.type !== 'highlighter')) return;

    const rect = whiteboardRef.current?.getBoundingClientRect();
    if (!rect || !e.clientX || !e.clientY) return;

    const zoom = whiteboardZoom || 1;
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    if (isNaN(x) || isNaN(y)) return;

    setWhiteboardElements(prev => {
      if (!Array.isArray(prev) || prev.length === 0) return prev;

      const newElements = [...prev];
      const lastElement = newElements[newElements.length - 1];
      if (lastElement?.path && typeof lastElement.path === 'string') {
        lastElement.path += ` L ${x} ${y}`;
      }
      return newElements;
    });
  }, [isDrawing, activeTool, whiteboardZoom]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // Chat functions
  const sendMessage = useCallback(() => {
    if (newMessage.trim()) {
      const message: ChatMessage = {
        id: `msg-${Date.now()}`,
        senderId: 'user-1',
        recipientId: activeChatTab === 'private' ? selectedPrivateChat || undefined : undefined,
        content: newMessage,
        type: 'text',
        timestamp: new Date(),
        isPrivate: activeChatTab === 'private',
        isInternal: false,
        isEncrypted: true
      };
      
      setChatMessages(prev => [...prev, message]);
      setNewMessage('');
    }
  }, [newMessage, activeChatTab, selectedPrivateChat]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // Video/Audio controls
  const toggleVideo = () => setIsVideoEnabled(!isVideoEnabled);
  const toggleAudio = () => setIsAudioEnabled(!isAudioEnabled);
  const toggleScreenShare = () => setIsScreenSharing(!isScreenSharing);
  const toggleRecording = () => setIsRecording(!isRecording);

  // Get participant by ID
  const getParticipant = (id: string) => mockParticipants.find(p => p.id === id);

  // Show loading state until component is ready
  if (!isComponentReady) {
    return (
      <Layout>
        <div className="h-screen bg-background overflow-hidden relative flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading Sales Meeting Platform...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Wrap the entire return in try-catch for safety
  try {
    return (
    <Layout>
      <div className="h-screen bg-background overflow-hidden relative">
        {/* Top Toolbar */}
        <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">Sales Meeting</h1>
            {meetingSession && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                Live
              </Badge>
            )}
            {isRecording && (
              <Badge className="bg-red-50 text-red-700 border-red-200">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse" />
                Recording
              </Badge>
            )}
          </div>

          {/* Meeting Controls */}
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isVideoEnabled ? "default" : "destructive"}
                    size="sm"
                    onClick={toggleVideo}
                  >
                    {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isAudioEnabled ? "default" : "destructive"}
                    size="sm"
                    onClick={toggleAudio}
                  >
                    {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isScreenSharing ? "default" : "outline"}
                    size="sm"
                    onClick={toggleScreenShare}
                  >
                    {isScreenSharing ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isScreenSharing ? 'Stop sharing' : 'Share screen'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isRecording ? "destructive" : "outline"}
                    size="sm"
                    onClick={toggleRecording}
                  >
                    <div className={cn("w-3 h-3 rounded-full", isRecording ? "bg-white" : "bg-red-500")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isRecording ? 'Stop recording' : 'Start recording'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button variant="outline" size="sm" onClick={() => setShowScheduler(true)}>
              <Calendar className="h-4 w-4" />
            </Button>

            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>

            <Button variant="destructive" size="sm">
              <PhoneOff className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Whiteboard Toolbar */}
        <div className="flex items-center justify-center p-2 border-b bg-card/30 backdrop-blur-sm">
          <div className="flex items-center gap-1 bg-background/80 rounded-lg p-1">
            {(defaultWhiteboardTools || []).map((tool, index) => (
              <TooltipProvider key={index}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={activeTool.type === tool.type && activeTool.subType === tool.subType ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setActiveTool(tool)}
                      className="w-10 h-10 p-0"
                    >
                      {tool.type === 'select' && <MousePointer className="h-4 w-4" />}
                      {tool.type === 'pen' && <div className="w-4 h-4 border-2 border-current rounded-full" />}
                      {tool.type === 'highlighter' && <Highlighter className="h-4 w-4" />}
                      {tool.type === 'text' && <Type className="h-4 w-4" />}
                      {tool.type === 'shape' && tool.subType === 'rectangle' && <Square className="h-4 w-4" />}
                      {tool.type === 'shape' && tool.subType === 'circle' && <Circle className="h-4 w-4" />}
                      {tool.type === 'shape' && tool.subType === 'arrow' && <ArrowRight className="h-4 w-4" />}
                      {tool.type === 'eraser' && <Eraser className="h-4 w-4" />}
                      {tool.type === 'laser' && <div className="w-2 h-2 bg-red-500 rounded-full" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {tool.type} {tool.subType ? `(${tool.subType})` : ''}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            
            <div className="w-px h-8 bg-border mx-2" />
            
            {/* Color Palette */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="w-10 h-10 p-0">
                  <div 
                    className="w-6 h-6 rounded border-2 border-border" 
                    style={{ backgroundColor: activeTool.color }}
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <div className="grid grid-cols-5 gap-1 p-2">
                  {(meetingColors || []).map(color => (
                    <button
                      key={color}
                      className="w-8 h-8 rounded border-2 border-border hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      onClick={() => setActiveTool({ ...activeTool, color })}
                    />
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-px h-8 bg-border mx-2" />

            {/* Zoom Controls */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWhiteboardZoom(Math.max(0.1, whiteboardZoom - 0.1))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm min-w-[3rem] text-center">{Math.round(whiteboardZoom * 100)}%</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWhiteboardZoom(Math.min(3, whiteboardZoom + 0.1))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>

            <div className="w-px h-8 bg-border mx-2" />

            <Button variant="ghost" size="sm">
              <Undo className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Redo className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Digital Whiteboard */}
          <div className="absolute inset-0 bg-white z-[1]">
            <WhiteboardSVG
              whiteboardRef={whiteboardRef}
              whiteboardElements={whiteboardElements}
              whiteboardZoom={whiteboardZoom}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            />
          </div>

          {/* Participants Panel */}
          {showParticipants && (
            <div
              className={cn(
                "absolute bg-card/95 backdrop-blur-sm border rounded-lg shadow-lg transition-all duration-200",
                participantsPanelMinimized ? "w-12 h-12" : "w-80 max-h-96"
              )}
              style={{
                left: participantsPanelPosition.x,
                top: participantsPanelPosition.y,
                zIndex: 100
              }}
            >
              <div className="flex items-center justify-between p-3 border-b">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {!participantsPanelMinimized && (
                    <span className="font-medium">Participants ({mockParticipants.length})</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setParticipantsPanelMinimized(!participantsPanelMinimized)}
                    className="w-6 h-6 p-0"
                  >
                    {participantsPanelMinimized ? <Maximize className="h-3 w-3" /> : <Minimize className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowParticipants(false)}
                    className="w-6 h-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {!participantsPanelMinimized && (
                <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
                  {(mockParticipants || []).map((participant) => (
                    <div key={participant.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <div className="relative">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>
                            {participant?.name?.split(' ').map(n => n[0]).join('') || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div className={cn(
                          "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background",
                          participant.isOnline ? "bg-green-500" : "bg-gray-400"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{participant.name}</span>
                          {participant.role === 'host' && (
                            <Badge variant="outline" className="text-xs">Host</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="truncate">{participant.location}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {participant.isHandRaised && (
                          <Hand className="h-3 w-3 text-yellow-500" />
                        )}
                        {participant.hasVideo ? (
                          <Video className="h-3 w-3 text-green-500" />
                        ) : (
                          <VideoOff className="h-3 w-3 text-muted-foreground" />
                        )}
                        {participant.hasAudio ? (
                          <Mic className="h-3 w-3 text-green-500" />
                        ) : (
                          <MicOff className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Chat Panel */}
          {showChat && (
            <div
              className={cn(
                "absolute bg-card/95 backdrop-blur-sm border rounded-lg shadow-lg transition-all duration-200",
                chatPanelMinimized ? "w-12 h-12" : "w-80 h-96"
              )}
              style={{
                left: chatPanelPosition.x,
                top: chatPanelPosition.y,
                zIndex: 100
              }}
            >
              <div className="flex items-center justify-between p-3 border-b">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {!chatPanelMinimized && (
                    <span className="font-medium">Chat</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setChatPanelMinimized(!chatPanelMinimized)}
                    className="w-6 h-6 p-0"
                  >
                    {chatPanelMinimized ? <Maximize className="h-3 w-3" /> : <Minimize className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowChat(false)}
                    className="w-6 h-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {!chatPanelMinimized && (
                <div className="flex flex-col h-80">
                  {/* Chat Tabs */}
                  <div className="flex border-b">
                    <button
                      className={cn(
                        "flex-1 py-2 px-3 text-sm font-medium",
                        activeChatTab === 'group' ? "bg-muted" : "hover:bg-muted/50"
                      )}
                      onClick={() => setActiveChatTab('group')}
                    >
                      Group
                    </button>
                    <button
                      className={cn(
                        "flex-1 py-2 px-3 text-sm font-medium",
                        activeChatTab === 'private' ? "bg-muted" : "hover:bg-muted/50"
                      )}
                      onClick={() => setActiveChatTab('private')}
                    >
                      Private
                    </button>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {(chatMessages || [])
                      .filter(msg => activeChatTab === 'group' ? !msg.isPrivate : msg.isPrivate)
                      .map((message) => {
                        const sender = getParticipant(message.senderId);
                        return (
                          <div key={message.id} className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-medium">{sender?.name || 'Unknown'}</span>
                              <span>{message.timestamp.toLocaleTimeString()}</span>
                              {message.isInternal && (
                                <Badge variant="outline" className="text-xs">Internal</Badge>
                              )}
                            </div>
                            <div className="text-sm bg-muted/50 rounded p-2">
                              {message.content}
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Chat Input */}
                  <div className="p-3 border-t">
                    <div className="flex gap-2">
                      <Input
                        placeholder={activeChatTab === 'group' ? "Type a message..." : "Send private message..."}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={sendMessage} disabled={!newMessage.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Video Conference Panel */}
          {showVideoConference && (
            <div
              className={cn(
                "absolute bg-card/95 backdrop-blur-sm border rounded-lg shadow-lg transition-all duration-200",
                videoPanelMinimized ? "w-12 h-12" : "w-96 h-80"
              )}
              style={{
                left: videoPanelPosition.x,
                top: videoPanelPosition.y,
                zIndex: 100
              }}
            >
              <div className="flex items-center justify-between p-3 border-b">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  {!videoPanelMinimized && (
                    <span className="font-medium">Video Conference</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setVideoPanelMinimized(!videoPanelMinimized)}
                    className="w-6 h-6 p-0"
                  >
                    {videoPanelMinimized ? <Maximize className="h-3 w-3" /> : <Minimize className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowVideoConference(false)}
                    className="w-6 h-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {!videoPanelMinimized && (
                <div className="h-72">
                  <VideoConference
                    participants={mockParticipants}
                    isVideoEnabled={isVideoEnabled}
                    isAudioEnabled={isAudioEnabled}
                    isScreenSharing={isScreenSharing}
                    onVideoToggle={toggleVideo}
                    onAudioToggle={toggleAudio}
                    onScreenShareToggle={toggleScreenShare}
                    className="h-full"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Meeting Info Footer */}
        <div className="flex items-center justify-between p-2 border-t bg-card/50 backdrop-blur-sm text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-3 w-3" />
              <span>Secure Connection</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span>00:45:32</span>
            </div>
            {meetingSession && (
              <span>{meetingSession.title}</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-6 text-xs">
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
            {!showParticipants && (
              <Button variant="ghost" size="sm" onClick={() => setShowParticipants(true)} className="h-6">
                <Users className="h-3 w-3" />
              </Button>
            )}
            {!showChat && (
              <Button variant="ghost" size="sm" onClick={() => setShowChat(true)} className="h-6">
                <MessageSquare className="h-3 w-3" />
              </Button>
            )}
            {!showVideoConference && (
              <Button variant="ghost" size="sm" onClick={() => setShowVideoConference(true)} className="h-6">
                <Video className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Meeting Scheduler Dialog */}
      <Dialog open={showScheduler} onOpenChange={setShowScheduler}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Meeting Scheduler</DialogTitle>
            <DialogDescription>
              Schedule new meetings and manage upcoming appointments
            </DialogDescription>
          </DialogHeader>
          <MeetingScheduler
            onScheduleMeeting={(meeting) => {
              console.log('New meeting scheduled:', meeting);
              setShowScheduler(false);
            }}
            onUpdateReminders={(reminders) => {
              console.log('Reminders updated:', reminders);
            }}
          />
        </DialogContent>
      </Dialog>
    </Layout>
    );
  } catch (renderError) {
    console.error('SalesMeeting render error:', renderError);
    return (
      <Layout>
        <div className="h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-500">Meeting Platform Error</p>
            <button onClick={() => window.location.reload()} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">Reload Page</button>
          </div>
        </div>
      </Layout>
    );
  }
}
