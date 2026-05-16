/**
 * Chat Panel Component
 *
 * Native instant messaging with channels and direct messages
 * All text is i18n-ready with translation keys
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageSquare,
  Send,
  Plus,
  Hash,
  UserPlus,
  Search,
  MoreVertical,
  Smile,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Mic,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/glass";
import { useAuth } from "@/hooks/useAuth";
import { VoiceTranslateControl } from "@/components/messaging/VoiceTranslateControl";

interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  content: string;
  contentKey?: string; // i18n key
  type: "text" | "file" | "image" | "voice" | "system";
  translation?: {
    text: string;
    sourceLanguage?: string;
    targetLanguage?: string;
  };
  attachments?: Array<{
    id: string;
    type: string;
    name: string;
    nameKey?: string; // i18n key
    url: string;
    size: number;
  }>;
  reactions?: Array<{
    emoji: string;
    userIds: string[];
  }>;
  timestamp: string;
  edited?: boolean;
}

interface ChatChannel {
  id: string;
  name: string;
  nameKey?: string; // i18n key
  type: "public" | "private" | "direct";
  members: string[];
  lastMessage?: ChatMessage;
  unreadCount?: number;
}

export default function ChatPanel() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user, organization } = useAuth();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadChannels();
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const orgId = organization?.id || "default";
        const userName = user?.name || "User";
        const response = await fetch("/api/chat/init", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Org-ID": orgId },
          body: JSON.stringify({ userName, orgId }),
        });
        const data = await response.json().catch(() => null);
        if (data?.userId) {
          setCurrentUserId(data.userId);
        }
      } catch {
        // ignore
      }
    };
    init();
  }, [organization?.id, user?.name]);

  useEffect(() => {
    if (selectedChannel) {
      loadMessages(selectedChannel);
    }
  }, [selectedChannel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChannels = async () => {
    try {
      // In production, fetch from API
      const mockChannels: ChatChannel[] = [
        {
          id: "channel-general",
          name: "General",
          nameKey: "chat.channel.general",
          type: "public",
          members: ["user-1", "user-2"],
          unreadCount: 3,
        },
        {
          id: "channel-kitchen",
          name: "Kitchen",
          nameKey: "chat.channel.kitchen",
          type: "public",
          members: ["user-1"],
          unreadCount: 0,
        },
      ];
      setChannels(mockChannels);
      if (mockChannels.length > 0) {
        setSelectedChannel(mockChannels[0].id);
      }
    } catch (error: any) {
      toast({
        title: t("common.error") || "Error",
        description: error.message || "Failed to load channels",
        variant: "destructive",
      });
    }
  };

  const loadMessages = async (channelId: string) => {
    try {
      const response = await fetch(`/api/chat/messages?limit=200&days=2`, {
        headers: { "X-Org-ID": organization?.id || "default" },
      });
      const data = await response.json();

      const rawMessages = data.messages || [];
      const filtered = rawMessages.filter(
        (msg: ChatMessage) => msg.channelId === channelId,
      );
      setMessages(filtered);
    } catch (error: any) {
      toast({
        title: t("common.error") || "Error",
        description: error.message || "Failed to load messages",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async (
    payload?: ChatMessage["translation"],
    overrideText?: string,
  ) => {
    const content = payload?.text || overrideText || newMessage.trim();
    if (!content || !selectedChannel) return;

    try {
      const message: ChatMessage = {
        id: `msg-${Date.now()}`,
        channelId: selectedChannel,
        senderId: currentUserId || user?.id || `user-${Date.now()}`,
        senderName: user?.name || "User",
        content,
        contentKey: undefined,
        type: payload ? "voice" : "text",
        timestamp: new Date().toISOString(),
        translation: payload
          ? {
              text: payload.text,
              sourceLanguage: payload.sourceLanguage,
              targetLanguage: payload.targetLanguage,
            }
          : undefined,
      };
      await fetch(`/api/chat/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Org-ID": organization?.id || "default",
        },
        body: JSON.stringify(message),
      });
      setMessages((prev) => [...prev, message]);
      setNewMessage("");
      inputRef.current?.focus();
    } catch (error: any) {
      toast({
        title: t("common.error") || "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const handleTyping = () => {
    if (!selectedChannel) return;
    // In production, emit typing event via WebSocket
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const selectedChannelData = channels.find((c) => c.id === selectedChannel);

  return (
    <div className="h-full w-full flex bg-background">
      {/* Channels Sidebar */}
      <div className="w-64 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              {t("chat.channels") || "Channels"}
            </h2>
            <Button size="sm" variant="ghost">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <Button size="sm" className="w-full" onClick={() => {}}>
            <Hash className="w-4 h-4 mr-2" />
            {t("chat.channel.create") || "Create Channel"}
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {channels.map((channel) => (
              <div
                key={channel.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors",
                  selectedChannel === channel.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
                onClick={() => setSelectedChannel(channel.id)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Hash className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium truncate">{channel.name}</span>
                </div>
                {channel.unreadCount && channel.unreadCount > 0 && (
                  <Badge variant="default" className="ml-2">
                    {channel.unreadCount}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <>
            {/* Channel Header */}
            <div className="p-4 border-b border-border bg-background">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Hash className="w-5 h-5" />
                    {selectedChannelData?.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedChannelData?.members.length || 0}{" "}
                    {t("chat.channel.members") || "members"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost">
                    <UserPlus className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Search className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="flex items-start gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {message.senderName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">
                          {message.senderName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(message.timestamp), {
                            addSuffix: true,
                          })}
                        </span>
                        {message.edited && (
                          <span className="text-xs text-muted-foreground">
                            ({t("chat.message.edited") || "edited"})
                          </span>
                        )}
                      </div>
                      <p className="text-foreground">{message.content}</p>
                      {message.translation?.text && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {message.translation.sourceLanguage || "auto"} →{" "}
                          {message.translation.targetLanguage}:{" "}
                          {message.translation.text}
                        </p>
                      )}
                      {message.attachments &&
                        message.attachments.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {message.attachments.map((attachment) => (
                              <div
                                key={attachment.id}
                                className="flex items-center gap-2 p-2 border border-border rounded"
                              >
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-foreground">
                                  {attachment.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {(attachment.size / 1024).toFixed(1)} KB
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      {message.reactions && message.reactions.length > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                          {message.reactions.map((reaction, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="cursor-pointer"
                            >
                              {reaction.emoji} {reaction.userIds.length}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="px-4 py-2 text-sm text-muted-foreground">
                {typingUsers.join(", ")}{" "}
                {t("chat.user.typing") || "is typing..."}
              </div>
            )}

            {/* Message Input */}
            <div className="p-4 border-t border-border bg-background">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost">
                  <ImageIcon className="w-4 h-4" />
                </Button>
                <Input
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={
                    t("chat.message.send.placeholder") || "Type a message..."
                  }
                  className="flex-1"
                />
                <VoiceTranslateControl
                  compact
                  onCommit={(payload) => {
                    const text = payload.translation || payload.transcript;
                    setNewMessage(text);
                    handleSendMessage(
                      {
                        text,
                        sourceLanguage: payload.sourceLanguage,
                        targetLanguage: payload.targetLanguage,
                      },
                      text,
                    );
                  }}
                />
                <Button size="sm" variant="ghost">
                  <Smile className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {t("chat.select.channel") ||
                  "Select a channel to start chatting"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
