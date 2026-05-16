/**
 * Messaging Launcher Button
 * Button for opening team messaging panel from toolbar
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { TeamMessaging } from './TeamMessaging';
import { useQuery } from '@tanstack/react-query';

interface MessagingLauncherProps {
  className?: string;
  compact?: boolean; // Show as mini panel vs full screen
}

export const MessagingLauncher: React.FC<MessagingLauncherProps> = ({
  className = '',
  compact = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState('default');
  const [unreadCount, setUnreadCount] = useState(0);
  const socket = useSocket();
  
  // Fetch channels
  const channelsQuery = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const response = await fetch('/api/messaging/channels');
      if (!response.ok) throw new Error('Failed to fetch channels');
      return response.json();
    },
    initialData: { channels: [{ id: 'default', name: 'General' }] },
  });
  
  // Fetch unread count
  const unreadQuery = useQuery({
    queryKey: ['unreadCount'],
    queryFn: async () => {
      const response = await fetch('/api/messaging/unread-count');
      if (!response.ok) throw new Error('Failed to fetch unread count');
      return response.json();
    },
    refetchInterval: 5000, // Poll every 5 seconds
  });
  
  useEffect(() => {
    setUnreadCount(unreadQuery.data?.unreadCount || 0);
  }, [unreadQuery.data]);
  
  // Listen for new messages
  useEffect(() => {
    if (!socket) return;
    
    socket.on('new-message', () => {
      unreadQuery.refetch();
    });
    
    return () => {
      socket.off('new-message');
    };
  }, [socket, unreadQuery]);
  
  if (compact) {
    return (
      <>
        {/* Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          title="Team Messages (M)"
          className={`relative hover:bg-slate-100 ${className}`}
        >
          <MessageSquare className="w-5 h-5" />
          
          {/* Unread badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
        
        {/* Messaging panel */}
        {isOpen && (
          <div className="fixed bottom-24 right-4 z-50 shadow-2xl">
            <TeamMessaging
              channelId={selectedChannel}
              channelName={
                channelsQuery.data?.channels.find(c => c.id === selectedChannel)?.name ||
                'Messages'
              }
              onClose={() => setIsOpen(false)}
              compact
            />
          </div>
        )}
      </>
    );
  }
  
  // Full screen mode
  return (
    <div className="h-screen flex flex-col">
      {/* Header with channel selector */}
      <div className="border-b p-4 bg-white">
        <h1 className="font-bold text-xl mb-4">Messages</h1>
        
        {/* Channel tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {channelsQuery.data?.channels.map(channel => (
            <Button
              key={channel.id}
              variant={selectedChannel === channel.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedChannel(channel.id)}
              className="whitespace-nowrap"
            >
              {channel.name}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Messaging component */}
      <TeamMessaging
        channelId={selectedChannel}
        channelName={
          channelsQuery.data?.channels.find(c => c.id === selectedChannel)?.name ||
          'Messages'
        }
        className="flex-1"
      />
    </div>
  );
};

export default MessagingLauncher;
