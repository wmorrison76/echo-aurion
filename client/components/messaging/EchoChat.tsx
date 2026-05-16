import React, { useState, useRef, useEffect } from 'react';
import { useEchoChat } from '@/hooks/useEchoChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Send,
  Plus,
  Paperclip,
  Smile,
  Phone,
  Video,
  Search,
  X,
  Edit2,
  Trash2,
  MessageSquare,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VoiceTranslateControl } from '@/components/messaging/VoiceTranslateControl';

interface EchoChatProps {
  userId: string;
  orgId: string;
  userName?: string;
}

export const EchoChat: React.FC<EchoChatProps> = ({
  userId,
  orgId,
  userName = 'User',
}) => {
  const {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    messages,
    onlineUsers,
    loading,
    searchResults,
    typingUsers,
    callState,
    sendMessage,
    createConversation,
    addReaction,
    search,
    startCall,
    endCall,
    handleTyping,
    fetchThreadReplies,
  } = useEchoChat(userId, orgId, userName);

  const [messageText, setMessageText] = useState('');
  const [showNewConv, setShowNewConv] = useState(false);
  const [newParticipants, setNewParticipants] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [expandedReactions, setExpandedReactions] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Set up video feed
  useEffect(() => {
    if (callState.active && videoRef.current && callState.stream) {
      videoRef.current.srcObject = callState.stream;
    }
  }, [callState]);

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    await sendMessage(messageText);
    setMessageText('');
  };

  const handleCreateConversation = async () => {
    if (!newParticipants.trim()) return;
    const participants = newParticipants.split(',').map((p) => p.trim());
    await createConversation('group', participants, participants.join(', '));
    setNewParticipants('');
    setShowNewConv(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length > 0) search(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleVideoCall = async () => {
    if (onlineUsers.length === 0) {
      alert('No other users online');
      return;
    }

    if (callState.active) {
      endCall();
    } else {
      // Start call with first online user
      const targetUser = onlineUsers[0];
      await startCall(targetUser.id);
    }
  };

  const currentConv = conversations.find((c) => c.id === currentConversationId);

  return (
    <div className="flex h-full bg-background rounded-lg border overflow-hidden">
      {/* Left Sidebar - Conversations & Online Users */}
      <div className="w-64 flex flex-col border-r">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-lg">EchoChat</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNewConv(!showNewConv)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* New Conversation Form */}
        {showNewConv && (
          <div className="border-b p-3 space-y-2">
            <Input
              placeholder="User emails"
              value={newParticipants}
              onChange={(e) => setNewParticipants(e.target.value)}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreateConversation}
                className="flex-1"
              >
                Create
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowNewConv(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  setCurrentConversationId(conv.id);
                  setSelectedThread(null);
                }}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                  currentConversationId === conv.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                <div className="truncate font-medium">{conv.name}</div>
                <div className="text-xs opacity-70">
                  {conv.participants.length} members
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* Online Users */}
        <div className="border-t p-3">
          <div className="text-xs font-semibold mb-2 text-muted-foreground">
            ONLINE ({onlineUsers.length})
          </div>
          <div className="space-y-1">
            {onlineUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-2 px-2 py-1 rounded text-sm hover:bg-muted cursor-pointer"
              >
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="flex-1 truncate">{user.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentConversationId ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-semibold">{currentConv?.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {currentConv?.participants.length} participants
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSearch(!showSearch)}
                >
                  <Search className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleVideoCall}
                  className={callState.active ? 'bg-red-500 text-white' : ''}
                >
                  <Video className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Search Box */}
            {showSearch && (
              <div className="p-3 border-b">
                <Input
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  autoFocus
                />
                {searchResults.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {searchResults.map((msg) => (
                      <div
                        key={msg.id}
                        className="p-2 bg-muted rounded text-sm cursor-pointer hover:bg-muted/80"
                        onClick={() => {
                          setSearchQuery('');
                          setShowSearch(false);
                        }}
                      >
                        <div className="font-medium text-xs">{msg.senderName}</div>
                        <div className="text-xs line-clamp-2">{msg.text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Video Call Window */}
            {callState.active && (
              <div className="p-4 bg-muted border-b">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">Call Active</span>
                  <Button variant="ghost" size="sm" onClick={endCall}>
                    End Call
                  </Button>
                </div>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-40 bg-black rounded"
                />
              </div>
            )}

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center text-muted-foreground">Loading...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="group">
                      {/* Main Message */}
                      <div
                        className={cn(
                          'flex gap-3 mb-1',
                          msg.senderId === userId ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-xs rounded-lg p-3',
                            msg.senderId === userId
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          )}
                        >
                          <p className="text-xs font-semibold mb-1 opacity-75">
                            {msg.senderName}
                          </p>
                          <p className="text-sm break-words">{msg.text}</p>
                          {msg.richText?.translationText && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {msg.richText.sourceLanguage || "auto"} →{" "}
                              {msg.richText.targetLanguage}: {msg.richText.translationText}
                            </div>
                          )}
                          {msg.richText?.originalText && (
                            <div className="mt-1 text-xs text-muted-foreground italic">
                              Original: {msg.richText.originalText}
                            </div>
                          )}

                          {/* Attachments */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {msg.attachments.map((att) => (
                                <a
                                  key={att.id}
                                  href={att.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs underline opacity-80 hover:opacity-100 block"
                                >
                                  📎 {att.fileName}
                                </a>
                              ))}
                            </div>
                          )}

                          <p className="text-xs opacity-70 mt-1">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {msg.isEdited && ' (edited)'}
                          </p>
                        </div>

                        {/* Actions */}
                        {msg.senderId === userId && (
                          <div className="hidden group-hover:flex flex-col gap-1">
                            <Button variant="ghost" size="sm">
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Reactions */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex gap-1 px-3 flex-wrap text-xs">
                          {msg.reactions.map((r, i) => (
                            <div
                              key={i}
                              className="bg-muted px-2 py-1 rounded cursor-pointer hover:bg-muted/80"
                              onClick={() => addReaction(msg.id, r.emoji)}
                            >
                              {r.emoji}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Thread */}
                      {msg.threadReplyCount && msg.threadReplyCount > 0 && (
                        <button
                          onClick={() => {
                            setSelectedThread(
                              selectedThread === msg.id ? null : msg.id
                            );
                            fetchThreadReplies(msg.id);
                          }}
                          className="text-xs text-primary hover:underline px-3 mt-1"
                        >
                          <MessageSquare className="h-3 w-3 inline mr-1" />
                          {msg.threadReplyCount} replies
                        </button>
                      )}

                      {/* Expanded Thread */}
                      {selectedThread === msg.id && msg.threadReplies && (
                        <div className="ml-6 mt-2 space-y-2 border-l-2 border-muted pl-3">
                          {msg.threadReplies.map((reply) => (
                            <div key={reply.id} className="text-sm">
                              <p className="text-xs font-semibold mb-1">
                                {reply.senderName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {reply.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}

                {/* Typing Indicator */}
                {typingUsers.size > 0 && (
                  <div className="text-xs text-muted-foreground italic">
                    {Array.from(typingUsers).join(', ')} typing...
                  </div>
                )}

                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t p-3 space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message... (Shift+Enter for new line)"
                  value={messageText}
                  onChange={(e) => {
                    setMessageText(e.target.value);
                    handleTyping(userId, userName);
                  }}
                  onKeyDown={handleKeyDown}
                  className="text-sm flex-1"
                />

                <Button
                  variant="ghost"
                  size="sm"
                  title="Attach file"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <VoiceTranslateControl
                  compact
                  onCommit={(payload) => {
                    const text = payload.translation || payload.transcript;
                    sendMessage(text, {
                      originalText: payload.transcript,
                      translationText: text,
                      sourceLanguage: payload.sourceLanguage,
                      targetLanguage: payload.targetLanguage,
                    });
                  }}
                />

                <Button
                  variant="ghost"
                  size="sm"
                  title="Add emoji"
                >
                  <Smile className="h-4 w-4" />
                </Button>

                <Button
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  );
};
