import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  Users,
  Settings as SettingsIcon,
  Plus,
  X,
  Heart,
  Share2,
  MessageSquare,
  Pin,
  Phone,
  Video,
  Search,
  Menu,
  Paperclip,
  Mic,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/glass";
import MessageFormatter from "./MessageFormatter";
import VideoChatPanel from "./VideoChatPanel";
import EmojiPicker from "./EmojiPicker";
import ChatFileUpload from "./ChatFileUpload";
import { getAvatarDisplay } from "@/lib/avatar-utils";
import { VoiceTranslateControl } from "@/components/messaging/VoiceTranslateControl";

interface ChatMessage {
  id: string;
  sender: string;
  senderId: string;
  content: string;
  timestamp: number;
  isLocal: boolean;
  formattedContent?: FormattedContent;
  translation?: {
    text: string;
    sourceLanguage?: string;
    targetLanguage?: string;
  };
  reactions?: Record<string, string[]>;
  threadId?: string;
  parentMessageId?: string;
  threadCount?: number;
  isPinned?: boolean;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    preview?: string;
  }>;
}

interface FormattedContent {
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  link?: { text: string; url: string };
  raw: string;
}

interface User {
  id: string;
  name: string;
  status: "online" | "offline" | "away";
  isLocal: boolean;
  avatar?: string;
}

interface Conversation {
  id: string;
  name: string;
  type: "group" | "direct";
  participants: User[];
  lastMessage?: ChatMessage;
  unreadCount?: number;
}

interface VideoCallState {
  isActive: boolean;
  participantIds: string[];
  isMuted?: boolean;
  isVideoOn?: boolean;
}

const COLOR_PALETTE = {
  sent: "bg-blue-600/30",
  received: "bg-slate-700/30",
  reaction: "bg-amber-500/20",
  pinned: "border-l-4 border-amber-500",
  thread: "bg-slate-800/50",
};

export default function EnhancedNetworkChat() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showUserManager, setShowUserManager] = useState(false);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [videoCall, setVideoCall] = useState<VideoCallState>({
    isActive: false,
    participantIds: [],
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const [userName, setUserName] = useState(() => {
    try {
      return (
        localStorage.getItem("network-chat-username") ||
        `User-${Math.random().toString(36).substr(2, 9)}`
      );
    } catch {
      return `User-${Math.random().toString(36).substr(2, 9)}`;
    }
  });
  const [tempUserName, setTempUserName] = useState(userName);
  const [showGroupCreation, setShowGroupCreation] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedGroupUsers, setSelectedGroupUsers] = useState<Set<string>>(
    new Set(),
  );
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAudioDataRef = useRef<number>(Date.now());
  const chatPollFailureCountRef = useRef(0);
  const chatWarnedInitRef = useRef(false);
  const chatWarnedUsersRef = useRef(false);
  const chatWarnedMessagesRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem("network-chat-username", userName);
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }, [userName]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedThread]);

  const initializeChat = useCallback(async () => {
    if (chatPollFailureCountRef.current >= 3) return;

    let hadFailure = false;
    try {
      const orgId = "test-org";
      const headers = {
        "Content-Type": "application/json",
        "X-Org-ID": orgId,
      };

      // Set current user
      try {
        const initResponse = await fetch("/api/chat/init", {
          method: "POST",
          headers,
          body: JSON.stringify({ userName, orgId }),
        });

        if (initResponse.ok) {
          try {
            const initData = await initResponse.json();
            setCurrentUser({
              id: initData.userId || `user-${Date.now()}`,
              name: userName,
              status: "online",
              isLocal: true,
            });
            chatWarnedInitRef.current = false;
          } catch {
            hadFailure = true;
            if (!chatWarnedInitRef.current) {
              console.warn("Chat init: invalid response (not JSON), using defaults");
              chatWarnedInitRef.current = true;
            }
            setCurrentUser({
              id: `user-${Date.now()}`,
              name: userName,
              status: "online",
              isLocal: true,
            });
          }
        } else {
          setCurrentUser({
            id: `user-${Date.now()}`,
            name: userName,
            status: "online",
            isLocal: true,
          });
        }
      } catch (err) {
        hadFailure = true;
        if (!chatWarnedInitRef.current) {
          console.warn("Chat init failed, using defaults:", err);
          chatWarnedInitRef.current = true;
        }
        setCurrentUser({
          id: `user-${Date.now()}`,
          name: userName,
          status: "online",
          isLocal: true,
        });
      }

      // Fetch users (optional) — keep for default conversation below
      let latestUsers: User[] = [];
      try {
        const usersResponse = await fetch("/api/chat/users", { headers });
        if (usersResponse.ok) {
          try {
            const usersData = await usersResponse.json();
            const list = Array.isArray(usersData.users) ? usersData.users : [];
            latestUsers = list;
            setUsers(list);
            chatWarnedUsersRef.current = false;
          } catch {
            hadFailure = true;
            if (!chatWarnedUsersRef.current) {
              console.warn("Failed to fetch chat users: invalid response (not JSON)");
              chatWarnedUsersRef.current = true;
            }
            setUsers([]);
          }
        } else {
          hadFailure = true;
          // Don't warn on 404 – chat API may simply not be deployed
          if (usersResponse.status !== 404 && !chatWarnedUsersRef.current) {
            console.warn("Failed to fetch chat users: server returned", usersResponse.status);
            chatWarnedUsersRef.current = true;
          }
          setUsers([]);
        }
      } catch (err) {
        hadFailure = true;
        if (!chatWarnedUsersRef.current) {
          console.warn("Failed to fetch chat users:", err);
          chatWarnedUsersRef.current = true;
        }
        setUsers([]);
      }

      // Fetch messages (optional)
      try {
        const messagesResponse = await fetch("/api/chat/messages", { headers });
        if (messagesResponse.ok) {
          try {
            const messagesData = await messagesResponse.json();
            const raw = messagesData.messages || [];
            const normalizedMessages = (Array.isArray(raw) ? raw : []).map(
              (msg: any) => ({
                ...msg,
                senderId: msg.senderId || msg.sender?.id || `user-${msg.id}`,
              }),
            );
            setMessages(normalizedMessages);
            chatWarnedMessagesRef.current = false;
          } catch {
            hadFailure = true;
            if (!chatWarnedMessagesRef.current) {
              console.warn("Failed to fetch chat messages: invalid response (not JSON)");
              chatWarnedMessagesRef.current = true;
            }
            setMessages([]);
          }
        } else {
          hadFailure = true;
          // Don't warn on 404 – chat API may simply not be deployed
          if (messagesResponse.status !== 404 && !chatWarnedMessagesRef.current) {
            console.warn("Failed to fetch chat messages: server returned", messagesResponse.status);
            chatWarnedMessagesRef.current = true;
          }
          setMessages([]);
        }
      } catch (err) {
        hadFailure = true;
        if (!chatWarnedMessagesRef.current) {
          console.warn("Failed to fetch chat messages:", err);
          chatWarnedMessagesRef.current = true;
        }
        setMessages([]);
      }

      if (hadFailure) {
        chatPollFailureCountRef.current += 1;
      } else {
        chatPollFailureCountRef.current = 0;
      }

      // Set up default conversation if needed
      if (!selectedConversation) {
        const groupConv: Conversation = {
          id: "general",
          name: "General",
          type: "group",
          participants:
            latestUsers.length > 0
              ? latestUsers
              : [
                  {
                    id: "system",
                    name: "System",
                    status: "online",
                    isLocal: false,
                  },
                ],
        };
        setConversations([groupConv]);
        setSelectedConversation("general");
      }
    } catch (err) {
      chatPollFailureCountRef.current += 1;
      console.error("Failed to initialize chat:", err);
    }
  }, [userName, selectedConversation]);

  useEffect(() => {
    initializeChat();

    const pollInterval = setInterval(() => {
      initializeChat();
    }, 2000);
    return () => clearInterval(pollInterval);
  }, [initializeChat]);

  // Handle panel drops in chat
  useEffect(() => {
    const handlePanelEmbedRequested = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.target === "network-chat" || !detail?.target) {
        // Panel was dropped on chat - create a message with panel info
        if (!selectedConversation || !currentUser) return;

        const panelMessage: ChatMessage = {
          id: `panel-${Date.now()}`,
          sender: currentUser.name,
          senderId: currentUser.id,
          content: `📊 Shared panel: ${detail.title || detail.panelId}`,
          timestamp: Date.now(),
          isLocal: true,
          attachments: [
            {
              id: detail.id || `panel-${Date.now()}`,
              name: `${detail.title || "Panel"}.panel`,
              type: "panel",
              size: 0,
            },
          ],
        };

        setMessages((prev) => [...prev, panelMessage]);
      }
    };

    window.addEventListener(
      "panel-embed-requested",
      handlePanelEmbedRequested as EventListener,
    );

    return () => {
      window.removeEventListener(
        "panel-embed-requested",
        handlePanelEmbedRequested as EventListener,
      );
    };
  }, [selectedConversation, currentUser]);

  // Handle drag-over on chat area
  useEffect(() => {
    const chatArea = chatAreaRef.current;
    if (!chatArea) return;

    const handleDragOver = (e: DragEvent) => {
      const types = e.dataTransfer?.types || [];
      if (types.includes("application/json")) {
        setIsDragOver(true);
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer!.dropEffect = "copy";
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (!chatArea.contains(relatedTarget)) {
        setIsDragOver(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      try {
        const panelData = e.dataTransfer?.getData("application/json");
        if (panelData) {
          const data = JSON.parse(panelData);
          
          // Dispatch panel embed event
          window.dispatchEvent(
            new CustomEvent("panel-embed-requested", {
              detail: {
                id: data.id || `panel-${Date.now()}`,
                panelId: data.panelId,
                title: data.title,
                type: data.type || "mini-panel",
                config: data.config || data,
                target: "network-chat",
              },
            }),
          );
        }
      } catch (error) {
        console.error("Failed to handle panel drop in chat:", error);
      }
    };

    chatArea.addEventListener("dragover", handleDragOver);
    chatArea.addEventListener("dragleave", handleDragLeave);
    chatArea.addEventListener("drop", handleDrop);

    return () => {
      chatArea.removeEventListener("dragover", handleDragOver);
      chatArea.removeEventListener("dragleave", handleDragLeave);
      chatArea.removeEventListener("drop", handleDrop);
    };
  }, []);

  const handleSendMessage = async (
    e?: React.FormEvent | React.KeyboardEvent,
  ) => {
    if (e) {
      e.preventDefault();
    }

    if (!messageInput.trim() || !selectedConversation) return;

    const safeUserId = currentUser?.id || `user-${Date.now()}`;
    const safeSender = userName || "Anonymous";

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: safeSender,
      senderId: safeUserId,
      content: messageInput,
      timestamp: Date.now(),
      isLocal: true,
      parentMessageId: selectedThread || undefined,
      reactions: {},
      attachments:
        uploadedFiles.length > 0
          ? uploadedFiles.map((f) => ({
              id: f.id || `file-${Date.now()}`,
              name: f.file?.name || "File",
              type: f.type || "other",
              size: f.file?.size || 0,
              preview: f.preview,
            }))
          : undefined,
    };

    try {
      const orgId = "test-org";
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Org-ID": orgId,
        },
        body: JSON.stringify(newMessage),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Failed to send message: ${response.status} - ${errorText}`,
        );
        return;
      }

      await response.json();
      setMessages((prev) => [...prev, newMessage]);
      setMessageInput("");
      setUploadedFiles([]);
      setShowFileUpload(false);
      inputRef.current?.focus();
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const handleSendTranslatedMessage = async (
    payload: { transcript: string; translation: string; sourceLanguage?: string; targetLanguage: string },
  ) => {
    if (!selectedConversation) return;
    const text = payload.translation || payload.transcript;
    const safeUserId = currentUser?.id || `user-${Date.now()}`;
    const safeSender = userName || "Anonymous";
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: safeSender,
      senderId: safeUserId,
      content: text,
      timestamp: Date.now(),
      isLocal: true,
      parentMessageId: selectedThread || undefined,
      reactions: {},
      translation: {
        text,
        sourceLanguage: payload.sourceLanguage,
        targetLanguage: payload.targetLanguage,
      },
    };
    try {
      const orgId = "test-org";
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Org-ID": orgId,
        },
        body: JSON.stringify(newMessage),
      });
      if (!response.ok) return;
      await response.json();
      setMessages((prev) => [...prev, newMessage]);
    } catch (err) {
      console.error("Failed to send translated message:", err);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const newContent = messageInput + emoji;
    setMessageInput(newContent);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleSendMessage(e);
    }
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    try {
      const message = messages.find((m) => m.id === messageId);
      if (!message) return;

      const updatedReactions = { ...message.reactions };
      if (!updatedReactions[emoji]) {
        updatedReactions[emoji] = [];
      }
      if (!updatedReactions[emoji].includes(currentUser?.id || "")) {
        updatedReactions[emoji].push(currentUser?.id || "");
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, reactions: updatedReactions } : m,
        ),
      );
    } catch (err) {
      console.error("Failed to add reaction:", err);
    }
  };

  const handleAddUser = async (userId: string) => {
    if (!selectedConversation || !currentUser) return;

    try {
      const updatedConversations = conversations.map((conv) => {
        if (conv.id === selectedConversation) {
          const user = users.find((u) => u.id === userId);
          if (user && !conv.participants.find((p) => p.id === userId)) {
            return {
              ...conv,
              participants: [...conv.participants, user],
            };
          }
        }
        return conv;
      });

      setConversations(updatedConversations);
    } catch (err) {
      console.error("Failed to add user:", err);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!selectedConversation) return;

    try {
      const updatedConversations = conversations.map((conv) => {
        if (conv.id === selectedConversation) {
          return {
            ...conv,
            participants: conv.participants.filter((p) => p.id !== userId),
          };
        }
        return conv;
      });

      setConversations(updatedConversations);
    } catch (err) {
      console.error("Failed to remove user:", err);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedGroupUsers.size === 0 || !currentUser)
      return;

    try {
      const selectedParticipants = users.filter((u) =>
        selectedGroupUsers.has(u.id),
      );
      selectedParticipants.push(currentUser);

      const groupId = `group-${Date.now()}`;
      const newConversation: Conversation = {
        id: groupId,
        name: newGroupName,
        type: "group",
        participants: selectedParticipants,
      };

      setConversations((prev) => [...prev, newConversation]);
      setSelectedConversation(groupId);
      setShowGroupCreation(false);
      setNewGroupName("");
      setSelectedGroupUsers(new Set());
    } catch (err) {
      console.error("Failed to create group:", err);
    }
  };

  const handleToggleGroupUser = (userId: string) => {
    const newSelected = new Set(selectedGroupUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedGroupUsers(newSelected);
  };

  const handleStartVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      audioChunksRef.current = [];
      lastAudioDataRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          lastAudioDataRef.current = Date.now();

          if (pauseTimerRef.current) {
            clearTimeout(pauseTimerRef.current);
          }

          pauseTimerRef.current = setTimeout(async () => {
            const timeSinceLast = Date.now() - lastAudioDataRef.current;
            if (
              timeSinceLast > 100 &&
              mediaRecorderRef.current?.state === "recording"
            ) {
              await handleStopVoiceRecording();
            }
          }, 150);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(50);
      setIsVoiceRecording(true);
      setVoiceTranscript("");
    } catch (err) {
      console.error("Failed to start voice recording:", err);
    }
  };

  const handleStopVoiceRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) return;

    const mediaRecorder = mediaRecorderRef.current;

    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
    }

    return new Promise<void>((resolve) => {
      mediaRecorder.onstop = async () => {
        setIsVoiceRecording(false);
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        audioChunksRef.current = [];

        try {
          const formData = new FormData();
          formData.append("audio", audioBlob);

          const response = await fetch("/api/voice/transcribe", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) throw new Error("Transcription failed");
          const data = await response.json();

          const transcribedText = data.text || "";
          setVoiceTranscript(transcribedText);

          if (transcribedText.trim() && selectedConversation) {
            const safeUserId = currentUser?.id || `user-${Date.now()}`;
            const safeSender = userName || "Anonymous";

            const newMessage: ChatMessage = {
              id: `msg-${Date.now()}`,
              sender: safeSender,
              senderId: safeUserId,
              content: transcribedText,
              timestamp: Date.now(),
              isLocal: true,
              parentMessageId: selectedThread || undefined,
              reactions: {},
            };

            try {
              const orgId = "test-org";
              const apiResponse = await fetch("/api/chat/messages", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Org-ID": orgId,
                },
                body: JSON.stringify(newMessage),
              });

              if (!apiResponse.ok) {
                const errorText = await apiResponse.text();
                console.error(
                  `Failed to send voice message: ${apiResponse.status} - ${errorText}`,
                );
              } else {
                await apiResponse.json();
                setMessages((prev) => [...prev, newMessage]);
              }
            } catch (err) {
              console.error("Failed to send voice message:", err);
            }
          }
        } catch (err) {
          console.error("Failed to transcribe audio:", err);
        }

        resolve();
      };

      mediaRecorder.stop();
    });
  }, [currentUser, userName, selectedConversation, selectedThread]);

  const handleCancelVoiceRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
    }
    audioChunksRef.current = [];
    setIsVoiceRecording(false);
    setVoiceTranscript("");
  };

  const handleStartVideoCall = async () => {
    if (!selectedConversation) return;

    const conv = conversations.find((c) => c.id === selectedConversation);
    if (!conv) return;

    setVideoCall({
      isActive: true,
      participantIds: conv.participants.map((p) => p.id),
      isMuted: false,
      isVideoOn: true,
    });
  };

  const handleEndVideoCall = () => {
    setVideoCall({ isActive: false, participantIds: [] });
  };

  const handlePinMessage = async (messageId: string) => {
    try {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, isPinned: !m.isPinned } : m,
        ),
      );
    } catch (err) {
      console.error("Failed to pin message:", err);
    }
  };

  const currentConversation = conversations.find(
    (c) => c.id === selectedConversation,
  );
  const filteredMessages = selectedThread
    ? messages.filter(
        (m) => m.parentMessageId === selectedThread || m.id === selectedThread,
      )
    : messages.filter((m) => !m.parentMessageId);

  return (
    <div
      className={cn(
        "w-full h-full flex bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950",
      )}
    >
      {/* Mobile Menu Button */}
      {isMobile && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed top-4 left-4 z-50 p-2 bg-blue-600/20 rounded-lg"
        >
          <Menu size={20} className="text-white" />
        </button>
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "flex-shrink-0 bg-slate-900/80 border-r border-slate-700/50 flex flex-col transition-all",
          isMobile
            ? sidebarOpen
              ? "absolute left-0 top-0 w-72 h-full z-40"
              : "hidden"
            : "w-72",
        )}
      >
        {/* Header */}
        <div className="p-2 border-b border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-sm font-bold text-white">Chat</h1>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-0.5 hover:bg-slate-800 rounded"
              >
                <X size={18} className="text-white" />
              </button>
            )}
          </div>
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-800/50 border-slate-700 h-8 text-sm"
          />
        </div>

        {/* User Status */}
        <div className="px-4 py-3 bg-slate-800/30 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentUser && (
                <>
                  {(() => {
                    const avatar = getAvatarDisplay(
                      currentUser?.id,
                      currentUser?.name,
                    );
                    return (
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white overflow-hidden",
                          avatar?.color || "bg-blue-500",
                        )}
                      >
                        {avatar?.url ? (
                          <img
                            src={avatar.url}
                            alt={currentUser?.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          avatar?.initials || "?"
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
              <div className="flex-1">
                <p className="text-xs font-medium text-white truncate">
                  {userName}
                </p>
                <p className="text-[10px] text-green-400">● Online</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSettings(true)}
              className="h-6 w-6 p-0"
            >
              <SettingsIcon size={14} className="text-slate-400" />
            </Button>
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-0.5">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  setSelectedConversation(conv.id);
                  if (isMobile) setSidebarOpen(false);
                }}
                className={cn(
                  "w-full text-left px-2 py-1 rounded-lg transition-colors text-xs",
                  selectedConversation === conv.id
                    ? "bg-blue-600/40 text-white font-medium"
                    : "text-slate-300 hover:bg-slate-800/50",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">
                    {conv.type === "group" ? "#" : "@"} {conv.name}
                  </span>
                  {conv.unreadCount ? (
                    <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                      {conv.unreadCount}
                    </span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Create New Conversation */}
        <div className="p-2 border-t border-slate-700/50 space-y-1">
          <Button
            onClick={() => setShowUserManager(true)}
            className="w-full bg-blue-600/40 hover:bg-blue-600/60 text-white text-sm h-8"
          >
            <Plus size={14} className="mr-2" />
            New Conversation
          </Button>
          <Button
            onClick={() => setShowGroupCreation(true)}
            className="w-full bg-green-600/40 hover:bg-green-600/60 text-white text-sm h-8"
          >
            <Users size={14} className="mr-2" />
            Create Group
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat Header */}
        {currentConversation && (
          <div className="flex-shrink-0 bg-slate-900/80 border-b border-slate-700/50 px-3 py-2 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">
                {currentConversation.type === "group" ? "#" : "@"}{" "}
                {currentConversation.name}
              </h2>
              <p className="text-xs text-slate-400">
                {currentConversation.participants.length} members
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleStartVideoCall}
                className="text-slate-300 hover:text-white"
                title="Start video call"
              >
                <Video size={18} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleStartVideoCall}
                className="text-slate-300 hover:text-white"
                title="Start audio call"
              >
                <Phone size={18} />
              </Button>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Drop Zone Overlay */}
          {isDragOver && (
            <div className="absolute inset-0 z-50 border-4 border-dashed border-blue-500 bg-blue-500/20 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-lg font-semibold text-blue-400">
                  📊 Drop Panel Here
                </p>
                <p className="text-sm text-blue-300 mt-1">
                  Release to share panel in chat
                </p>
              </div>
            </div>
          )}
          {/* Messages */}
          <div
            ref={chatAreaRef}
            className={cn(
              "flex-1 overflow-y-auto px-3 py-2 space-y-2",
              isDragOver && "bg-blue-500/5",
            )}
          >
            {filteredMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400">
                <p className="text-xs">
                  No messages yet. Start the conversation!
                </p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const avatarDisplay = getAvatarDisplay(
                  msg.senderId,
                  msg.sender,
                );
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "group flex gap-2 hover:bg-slate-800/20 p-1 rounded transition-colors text-xs",
                      msg.isPinned && COLOR_PALETTE.pinned,
                    )}
                  >
                    <div
                      className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white overflow-hidden",
                        avatarDisplay?.color || "bg-blue-500",
                      )}
                    >
                      {avatarDisplay?.url ? (
                        <img
                          src={avatarDisplay.url}
                          alt={msg.sender}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        avatarDisplay?.initials || "?"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-white">
                          {msg.sender}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-200 break-words mt-1">
                        {msg.content}
                      </p>
                      {msg.translation?.text && (
                        <p className="text-xs text-slate-400 mt-1">
                          {msg.translation.sourceLanguage || "auto"} →{" "}
                          {msg.translation.targetLanguage}: {msg.translation.text}
                        </p>
                      )}

                      {/* Reactions */}
                      {msg.reactions &&
                        Object.keys(msg.reactions).length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {Object.entries(msg.reactions).map(
                              ([emoji, userIds]) => (
                                <button
                                  key={emoji}
                                  onClick={() =>
                                    handleAddReaction(msg.id, emoji)
                                  }
                                  className={cn(
                                    "text-xs px-2 py-1 rounded-full transition-colors",
                                    userIds.includes(currentUser?.id || "")
                                      ? COLOR_PALETTE.reaction
                                      : "bg-slate-800/50 hover:bg-slate-700/50",
                                  )}
                                >
                                  {emoji} {userIds.length}
                                </button>
                              ),
                            )}
                          </div>
                        )}

                      {/* File Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {msg.attachments.map((attachment) => (
                            <div
                              key={attachment.id}
                              className="flex items-center gap-2 bg-slate-800/50 rounded px-3 py-2"
                            >
                              {attachment.type === "image" &&
                              attachment.preview ? (
                                <img
                                  src={attachment.preview}
                                  alt={attachment.name}
                                  className="h-16 w-16 rounded object-cover"
                                />
                              ) : (
                                <Paperclip
                                  size={16}
                                  className="text-slate-400"
                                />
                              )}
                              <div className="text-xs text-slate-300">
                                <p className="font-medium truncate max-w-32">
                                  {attachment.name}
                                </p>
                                <p className="text-slate-500">
                                  ({(attachment.size / 1024 / 1024).toFixed(2)}{" "}
                                  MB)
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Message Actions */}
                      <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAddReaction(msg.id, "❤️")}
                          className="h-7 w-7 p-0"
                        >
                          <Heart size={14} className="text-slate-400" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedThread(msg.id)}
                          className="h-7 w-7 p-0"
                        >
                          <MessageSquare size={14} className="text-slate-400" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePinMessage(msg.id)}
                          className="h-7 w-7 p-0"
                        >
                          <Pin
                            size={14}
                            className={cn(
                              msg.isPinned
                                ? "text-amber-500"
                                : "text-slate-400",
                            )}
                          />
                        </Button>
                      </div>

                      {/* Thread Preview */}
                      {msg.threadCount ? (
                        <button
                          onClick={() => setSelectedThread(msg.id)}
                          className="text-xs text-blue-400 hover:text-blue-300 mt-2"
                        >
                          {msg.threadCount} replies
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Right Sidebar - Members */}
          {currentConversation && !isMobile && (
            <div className="flex-shrink-0 w-64 bg-slate-900/50 border-l border-slate-700/50 flex flex-col">
              <div className="p-4 border-b border-slate-700/50">
                <h3 className="text-sm font-semibold text-white mb-3">
                  Members
                </h3>
                <div className="space-y-2">
                  {currentConversation.participants.map((participant) => {
                    const pAvatar = getAvatarDisplay(
                      participant.id,
                      participant.name,
                    );
                    return (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between p-2 rounded hover:bg-slate-800/50 group"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white overflow-hidden",
                              pAvatar?.color || "bg-blue-500",
                            )}
                          >
                            {pAvatar?.url ? (
                              <img
                                src={pAvatar.url}
                                alt={participant.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              pAvatar?.initials || "?"
                            )}
                          </div>
                          <span className="text-xs text-slate-300">
                            {participant.name}
                          </span>
                          {participant.status === "online" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          )}
                        </div>
                        {participant.id !== currentUser?.id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveUser(participant.id)}
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                          >
                            <X size={12} className="text-red-400" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add Members */}
              <div className="p-4 flex-1 overflow-y-auto">
                <h3 className="text-xs font-semibold text-slate-400 mb-2">
                  Add Members
                </h3>
                <div className="space-y-1">
                  {users
                    .filter(
                      (u) =>
                        !currentConversation.participants.find(
                          (p) => p.id === u.id,
                        ),
                    )
                    .map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleAddUser(user.id)}
                        className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-green-500/20 text-slate-300 hover:text-green-300 transition-colors"
                      >
                        <Plus size={12} className="inline mr-1" />
                        {user.name}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 bg-slate-900/80 border-t border-slate-700/50 px-3 py-2">
          {/* File Upload Preview */}
          {showFileUpload && (
            <div className="mb-2">
              <ChatFileUpload
                onFilesSelected={(files) => setUploadedFiles(files)}
              />
            </div>
          )}

          {/* File Upload Summary */}
          {uploadedFiles.length > 0 && (
            <div className="mb-2 p-2 bg-slate-800/50 rounded flex items-center justify-between text-xs">
              <span className="text-xs text-slate-300">
                {uploadedFiles.length} file
                {uploadedFiles.length !== 1 ? "s" : ""} selected
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setUploadedFiles([]);
                  setShowFileUpload(false);
                }}
                className="h-5 w-5 p-0"
              >
                <X size={14} />
              </Button>
            </div>
          )}

          {/* Input Controls */}
          <div className="flex gap-1 items-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowFileUpload(!showFileUpload)}
              className="h-7 w-7 p-0"
              title="Attach files"
            >
              <Paperclip size={14} className="text-slate-400" />
            </Button>

            <EmojiPicker onSelect={handleEmojiSelect} />

            <textarea
              ref={inputRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type message..."
              className="flex-1 h-7 px-2 py-1 bg-slate-800/50 border border-slate-700 rounded text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />

            {isVoiceRecording ? (
              <Button
                onClick={handleCancelVoiceRecording}
                className="bg-red-600 hover:bg-red-700 text-white h-7 px-2 text-xs"
                title="Stop recording"
              >
                <Square size={12} className="mr-0.5" />
                Recording...
              </Button>
            ) : (
              <Button
                onClick={handleStartVoiceRecording}
                variant="ghost"
                className="h-7 w-7 p-0"
                title="Record voice message (auto-send on 100ms pause)"
              >
                <Mic size={18} className="text-slate-400" />
              </Button>
            )}

            <VoiceTranslateControl
              compact
              onCommit={(payload) => {
                setMessageInput(payload.translation || payload.transcript);
                handleSendTranslatedMessage(payload);
              }}
            />

            <Button
              onClick={(e) => handleSendMessage(e as any)}
              disabled={!messageInput.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white h-7 px-2"
            >
              <Send size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* Video Call Panel */}
      <VideoChatPanel
        isActive={videoCall.isActive}
        participantIds={videoCall.participantIds}
        participantNames={
          currentConversation
            ? Object.fromEntries(
                currentConversation.participants.map((p) => [p.id, p.name]),
              )
            : {}
        }
        onEnd={handleEndVideoCall}
        isMuted={videoCall.isMuted}
        isVideoOn={videoCall.isVideoOn}
        onToggleMute={() =>
          setVideoCall((v) => ({ ...v, isMuted: !v.isMuted }))
        }
        onToggleVideo={() =>
          setVideoCall((v) => ({ ...v, isVideoOn: !v.isVideoOn }))
        }
      />

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-slate-900 rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Settings</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSettings(false)}
                className="h-6 w-6 p-0"
              >
                <X size={18} className="text-white" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Display Name
                </label>
                <Input
                  value={tempUserName}
                  onChange={(e) => setTempUserName(e.target.value)}
                  className="bg-slate-800/50 border-slate-700 text-white"
                />
              </div>
              <Button
                onClick={() => {
                  if (tempUserName.trim()) {
                    setUserName(tempUserName);
                    setShowSettings(false);
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Group Creation Modal */}
      {showGroupCreation && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center overflow-y-auto">
          <div className="bg-slate-900 rounded-lg p-6 max-w-md w-full mx-4 my-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Create New Group
              </h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowGroupCreation(false);
                  setNewGroupName("");
                  setSelectedGroupUsers(new Set());
                }}
                className="h-6 w-6 p-0"
              >
                <X size={18} className="text-white" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Group Name
                </label>
                <Input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Project Team, Developers"
                  className="bg-slate-800/50 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Select Members ({selectedGroupUsers.size})
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {users.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-slate-800/50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedGroupUsers.has(user.id)}
                        onChange={() => handleToggleGroupUser(user.id)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 cursor-pointer"
                      />
                      <div
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white overflow-hidden flex-shrink-0",
                          getAvatarDisplay(user.id, user.name)?.color ||
                            "bg-blue-500",
                        )}
                      >
                        {getAvatarDisplay(user.id, user.name)?.initials || "?"}
                      </div>
                      <span className="text-sm text-slate-300">
                        {user.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <Button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || selectedGroupUsers.size === 0}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white"
              >
                <Users size={16} className="mr-2" />
                Create Group
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
