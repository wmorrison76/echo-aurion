import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  Mic,
  Share2,
  Phone,
  MessageCircle,
  Users,
  Clock,
} from "lucide-react";

interface Participant {
  id: string;
  name: string;
  status: "connected" | "connecting" | "disconnected";
  audio: boolean;
  video: boolean;
  screenShare: boolean;
}

interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  timestamp: string;
}

const defaultParticipants: Participant[] = [
  {
    id: "1",
    name: "You",
    status: "connected",
    audio: true,
    video: true,
    screenShare: false,
  },
  {
    id: "2",
    name: "Chef Marco",
    status: "connected",
    audio: true,
    video: true,
    screenShare: false,
  },
  {
    id: "3",
    name: "Lisa Chen",
    status: "connected",
    audio: false,
    video: true,
    screenShare: false,
  },
  {
    id: "4",
    name: "James Wilson",
    status: "connecting",
    audio: true,
    video: false,
    screenShare: false,
  },
];

const defaultMessages: ChatMessage[] = [
  {
    id: "1",
    sender: "Chef Marco",
    message: "Good morning everyone!",
    timestamp: "10:05 AM",
  },
  {
    id: "2",
    sender: "Lisa Chen",
    message: "Ready to discuss the new menu",
    timestamp: "10:06 AM",
  },
  {
    id: "3",
    sender: "You",
    message: "Let me share the designs",
    timestamp: "10:07 AM",
  },
];

export default function VideoContent() {
  const [participants, setParticipants] =
    useState<Participant[]>(defaultParticipants);
  const [messages, setMessages] = useState<ChatMessage[]>(defaultMessages);
  const [newMessage, setNewMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [callDuration, setCallDuration] = useState("00:12:34");

  const connectedCount = participants.filter(
    (p) => p.status === "connected",
  ).length;

  const toggleParticipantAudio = (id: string) => {
    setParticipants(
      participants.map((p) => (p.id === id ? { ...p, audio: !p.audio } : p)),
    );
  };

  const toggleParticipantVideo = (id: string) => {
    setParticipants(
      participants.map((p) => (p.id === id ? { ...p, video: !p.video } : p)),
    );
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: (messages.length + 1).toString(),
      sender: "You",
      message: newMessage,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages([...messages, message]);
    setNewMessage("");
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      connected: "bg-green-500/20 text-green-700 dark:text-green-400",
      connecting: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
      disconnected: "bg-red-500/20 text-red-700 dark:text-red-400",
    };
    return colors[status as keyof typeof colors] || colors.disconnected;
  };

  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      {/* Main Video Area */}
      <div className="col-span-2 flex flex-col gap-4">
        {/* Current Speaker */}
        <div className="flex-1 bg-slate-900 rounded-lg border-2 border-blue-500 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-900 flex flex-col items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-4">
              <Video className="h-16 w-16 text-white" />
            </div>
            <p className="text-xl font-bold text-white">Chef Marco</p>
            <p className="text-sm text-gray-400">Main Screen</p>
          </div>

          {/* Recording Indicator */}
          {isRecording && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-sm font-semibold">RECORDING</span>
            </div>
          )}

          {/* Call Duration */}
          <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-mono">{callDuration}</span>
          </div>
        </div>

        {/* Participant Grid */}
        <div className="grid grid-cols-4 gap-2">
          {participants.map((p) => (
            <div
              key={p.id}
              className="bg-slate-800 rounded-lg border border-slate-700 p-3 flex flex-col gap-2 items-center relative group"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
                <Video className="h-6 w-6 text-white" />
              </div>
              <p className="text-xs font-semibold text-white text-center line-clamp-2">
                {p.name}
              </p>
              <Badge className={getStatusBadge(p.status)} variant="secondary">
                {p.status}
              </Badge>

              {/* Hover Controls */}
              <div className="absolute bottom-1 left-1 right-1 hidden group-hover:flex gap-1">
                <button
                  onClick={() => toggleParticipantAudio(p.id)}
                  className={`flex-1 p-1 rounded text-xs ${
                    p.audio ? "bg-green-500" : "bg-red-500"
                  } text-white hover:opacity-80`}
                >
                  <Mic className="h-3 w-3 mx-auto" />
                </button>
                <button
                  onClick={() => toggleParticipantVideo(p.id)}
                  className={`flex-1 p-1 rounded text-xs ${
                    p.video ? "bg-green-500" : "bg-red-500"
                  } text-white hover:opacity-80`}
                >
                  <Video className="h-3 w-3 mx-auto" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="bg-slate-800 rounded-lg p-4 flex gap-3 justify-center">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => toggleParticipantAudio("1")}
          >
            <Mic className="h-4 w-4" /> Mute
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => toggleParticipantVideo("1")}
          >
            <Video className="h-4 w-4" /> Video Off
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="h-4 w-4" /> Share Screen
          </Button>
          <Button
            variant={isRecording ? "destructive" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setIsRecording(!isRecording)}
          >
            {isRecording ? "Stop" : "Start"} Recording
          </Button>
          <Button variant="destructive" size="sm" className="gap-2 ml-auto">
            <Phone className="h-4 w-4" /> End Call
          </Button>
        </div>
      </div>

      {/* Sidebar - Chat */}
      <div className="col-span-1 flex flex-col gap-4">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Chat
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-y-auto flex-1 space-y-3 mb-3">
            {messages.map((msg) => (
              <div key={msg.id} className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <p className="text-sm font-semibold">{msg.sender}</p>
                  <span className="text-xs text-muted-foreground">
                    {msg.timestamp}
                  </span>
                </div>
                <p className="text-sm bg-slate-100 dark:bg-slate-800 p-2 rounded">
                  {msg.message}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Message Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type message..."
            className="flex-1 text-sm border rounded px-2 py-2"
          />
          <Button onClick={handleSendMessage} size="sm">
            Send
          </Button>
        </div>

        {/* Participants Panel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Participants ({connectedCount})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {participants.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900 rounded"
              >
                <span className="font-semibold">{p.name}</span>
                <Badge className={getStatusBadge(p.status)} variant="secondary">
                  {p.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
