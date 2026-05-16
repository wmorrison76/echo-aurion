import React, { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { fuzzyFilter } from "@/lib/fuzzy-search";
import { VoiceTranslateControl } from "@/components/messaging/VoiceTranslateControl";

type ChatUser = {
  id: string;
  name: string;
  status: "online" | "offline" | "away";
};

type ChatMessage = {
  id: string;
  sender: string;
  senderId: string;
  content: string;
  recipientId?: string;
  timestamp: number;
  translation?: {
    text: string;
    sourceLanguage?: string;
    targetLanguage?: string;
  };
};

const readStorage = (key: string) => {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export default function MiniChatWindow() {
  const { user, organization } = useAuth();
  const [open, setOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const orgId =
    organization?.id ||
    (() => {
      const raw = readStorage("auth_org");
      if (!raw) return "default";
      try {
        return JSON.parse(raw)?.id || "default";
      } catch {
        return "default";
      }
    })();
  const displayName =
    user?.name ||
    (() => {
      const raw = readStorage("auth_user");
      if (!raw) return "User";
      try {
        return JSON.parse(raw)?.name || "User";
      } catch {
        return "User";
      }
    })();

  useEffect(() => {
    if (!open) return;
    const init = async () => {
      try {
        const initRes = await fetch("/api/chat/init", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Org-ID": String(orgId),
          },
          body: JSON.stringify({ userName: displayName, orgId }),
        });
        const payload = await initRes.json().catch(() => null);
        if (payload?.userId) {
          setCurrentUserId(payload.userId);
        }
      } catch {
        // ignore
      }
    };
    init();
  }, [open, displayName, orgId]);

  useEffect(() => {
    if (!open) return;
    const loadUsers = async () => {
      try {
        const res = await fetch("/api/chat/users", {
          headers: { "X-Org-ID": String(orgId) },
        });
        const data = await res.json();
        setUsers(data.users || []);
      } catch {
        setUsers([]);
      }
    };
    const loadMessages = async () => {
      try {
        const res = await fetch("/api/chat/messages?limit=200&days=2", {
          headers: { "X-Org-ID": String(orgId) },
        });
        const data = await res.json();
        setMessages(data.messages || []);
      } catch {
        setMessages([]);
      }
    };
    loadUsers();
    loadMessages();
  }, [open, orgId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedUserId]);

  const filteredUsers = useMemo(() => {
    if (!query.trim()) return users;
    return fuzzyFilter(query, users, (u) => u.name).map((entry) => entry.item);
  }, [query, users]);

  const activeMessages = useMemo(() => {
    if (!selectedUserId || !currentUserId) return [];
    return messages.filter((msg) => {
      const isDirect =
        (msg.senderId === currentUserId &&
          msg.recipientId === selectedUserId) ||
        (msg.senderId === selectedUserId && msg.recipientId === currentUserId);
      return isDirect;
    });
  }, [messages, selectedUserId, currentUserId]);

  const handleSend = async (
    payload?: ChatMessage["translation"],
    textOverride?: string,
  ) => {
    const content = textOverride ?? newMessage.trim();
    if (!content || !selectedUserId || !currentUserId) return;
    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: String(user?.name || displayName),
      senderId: currentUserId,
      content: payload?.text || content,
      recipientId: selectedUserId,
      timestamp: Date.now(),
      translation: payload
        ? {
            text: payload.text,
            sourceLanguage: payload.sourceLanguage,
            targetLanguage: payload.targetLanguage,
          }
        : undefined,
    };
    try {
      await fetch("/api/chat/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Org-ID": String(orgId),
        },
        body: JSON.stringify(message),
      });
      setMessages((prev) => [...prev, message]);
      setNewMessage("");
    } catch {
      // ignore
    }
  };

  return (
    <div className="absolute bottom-4 right-4 z-50">
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          className="h-10 w-10 rounded-full p-0"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
      )}
      {open && (
        <Card className="w-80 shadow-lg border-border">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <div className="text-sm font-semibold">Quick Chat</div>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              ✕
            </Button>
          </div>
          <div className="p-3 space-y-2">
            <Input
              placeholder="Search teammate..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8"
            />
            <ScrollArea className="h-24">
              <div className="space-y-1">
                {filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className={`w-full text-left px-2 py-1 rounded text-xs ${
                      selectedUserId === u.id ? "bg-muted" : "hover:bg-muted/60"
                    }`}
                  >
                    <span>{u.name}</span>
                    <Badge variant="outline" className="ml-2 text-[10px]">
                      {u.status}
                    </Badge>
                  </button>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="text-xs text-muted-foreground px-2 py-2">
                    No matches.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
          <div className="border-t px-3 py-2">
            <ScrollArea className="h-40">
              <div className="space-y-2">
                {activeMessages.map((msg) => (
                  <div key={msg.id} className="text-xs">
                    <div className="text-muted-foreground">{msg.sender}</div>
                    <div className="text-foreground">{msg.content}</div>
                    {msg.translation?.sourceLanguage &&
                      msg.translation?.targetLanguage && (
                        <div className="text-[10px] text-muted-foreground">
                          {msg.translation.sourceLanguage} →{" "}
                          {msg.translation.targetLanguage}
                        </div>
                      )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>
          <div className="border-t px-3 py-2 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Message..."
                className="h-8 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleSend()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <VoiceTranslateControl
              compact
              onCommit={(payload) => {
                const text = payload.translation || payload.transcript;
                setNewMessage(text);
                handleSend(
                  {
                    text,
                    sourceLanguage: payload.sourceLanguage,
                    targetLanguage: payload.targetLanguage,
                  },
                  text,
                );
              }}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
