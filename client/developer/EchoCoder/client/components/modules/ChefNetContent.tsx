import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Send, MessageSquare, Users, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  status: "online" | "offline" | "busy";
  station: string;
}

interface Message {
  id: string;
  sender: string;
  senderRole: string;
  content: string;
  timestamp: string;
  type: "message" | "alert" | "task";
  priority: "low" | "normal" | "high";
}

const defaultTeam: TeamMember[] = [
  {
    id: "1",
    name: "Chef Marco",
    role: "Head Chef",
    status: "online",
    station: "Main Kitchen",
  },
  {
    id: "2",
    name: "Lisa Chen",
    role: "Sous Chef",
    status: "online",
    station: "Prep Station",
  },
  {
    id: "3",
    name: "James Wilson",
    role: "Line Cook",
    status: "busy",
    station: "Grill Station",
  },
  {
    id: "4",
    name: "Maria Santos",
    role: "Pastry Chef",
    status: "online",
    station: "Pastry Lab",
  },
  {
    id: "5",
    name: "Robert Lee",
    role: "Line Cook",
    status: "offline",
    station: "Sauce Station",
  },
];

const defaultMessages: Message[] = [
  {
    id: "1",
    sender: "Chef Marco",
    senderRole: "Head Chef",
    content: "Service starts in 30 minutes. All stations ready?",
    timestamp: "2:45 PM",
    type: "alert",
    priority: "high",
  },
  {
    id: "2",
    sender: "James Wilson",
    senderRole: "Line Cook",
    content: "Grill station prepped and ready!",
    timestamp: "2:47 PM",
    type: "message",
    priority: "normal",
  },
  {
    id: "3",
    sender: "Lisa Chen",
    senderRole: "Sous Chef",
    content: "Confirmed. Mise en place complete for 150 covers.",
    timestamp: "2:48 PM",
    type: "message",
    priority: "normal",
  },
  {
    id: "4",
    sender: "Maria Santos",
    senderRole: "Pastry Chef",
    content: "Desserts plated and in cooler. Ready for service.",
    timestamp: "2:50 PM",
    type: "message",
    priority: "normal",
  },
];

export default function ChefNetContent() {
  const [team, setTeam] = useState<TeamMember[]>(defaultTeam);
  const [messages, setMessages] = useState<Message[]>(defaultMessages);
  const [newMessage, setNewMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"messages" | "team">("messages");

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: (messages.length + 1).toString(),
      sender: "You",
      senderRole: "Manager",
      content: newMessage,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "message",
      priority: "normal",
    };

    setMessages([...messages, message]);
    setNewMessage("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "busy":
        return "bg-yellow-500";
      case "offline":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: "bg-red-500/20 text-red-700 dark:text-red-400",
      normal: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
      low: "bg-gray-500/20 text-gray-700 dark:text-gray-400",
    };
    return colors[priority as keyof typeof colors] || colors.normal;
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "messages" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("messages")}
          className="gap-2"
        >
          <MessageSquare className="h-4 w-4" /> Messages
        </Button>
        <Button
          variant={activeTab === "team" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("team")}
          className="gap-2"
        >
          <Users className="h-4 w-4" /> Team
        </Button>
      </div>

      {/* Messages Tab */}
      {activeTab === "messages" && (
        <div className="flex-1 flex flex-col gap-4">
          {/* Messages List */}
          <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm">{msg.sender}</p>
                    <p className="text-xs text-muted-foreground">
                      {msg.senderRole}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Badge
                      className={getPriorityBadge(msg.priority)}
                      variant="secondary"
                    >
                      {msg.priority}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {msg.timestamp}
                    </span>
                  </div>
                </div>
                <p className="text-sm">{msg.content}</p>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Send message to team..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <Button onClick={handleSendMessage} size="sm" className="gap-2">
              <Send className="h-4 w-4" /> Send
            </Button>
          </div>
        </div>
      )}

      {/* Team Tab */}
      {activeTab === "team" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {team.map((member) => (
            <Card key={member.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${getStatusColor(member.status)} mt-1`}
                    />
                    <div>
                      <p className="font-semibold">{member.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {member.role}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-sm space-y-1">
                  <p className="flex items-center gap-2">
                    <span className="text-muted-foreground">Station:</span>{" "}
                    {member.station}
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="outline">{member.status}</Badge>
                  </p>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4">
                  Message
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
