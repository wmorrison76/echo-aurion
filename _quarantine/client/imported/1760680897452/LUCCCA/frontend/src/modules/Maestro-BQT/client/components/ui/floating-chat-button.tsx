/**
 * Floating Chat Button
 * Global access to communication features from anywhere in the application
 */

import React, { useState } from 'react';
import { MessageSquare, X, Phone, Video, Bell } from 'lucide-react';
import { Button } from './button';
import { Badge } from './badge';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { useCommunicationStore } from '../../stores/communicationStore';
import { ChatPanel } from '../panels/ChatPanel';
import { cn } from '../../lib/utils';

interface FloatingChatButtonProps {
  className?: string;
}

export const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    activeCall,
    isChatPanelOpen,
    toggleChatPanel
  } = useCommunicationStore();

  const unreadCount = notifications.filter(n => !n.readAt && n.type === 'message').length;
  const urgentCount = notifications.filter(n => !n.readAt && n.priority === 'urgent').length;

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      toggleChatPanel();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <div className={cn("fixed bottom-6 right-6 z-50", className)}>
        <div className="relative">
          <Button
            onClick={handleToggle}
            className={cn(
              "h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300",
              "bg-primary hover:bg-primary/90",
              isOpen && "bg-primary/80",
              activeCall && "animate-pulse"
            )}
          >
            {isOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <MessageSquare className="h-6 w-6" />
            )}
          </Button>

          {/* Notification Badges */}
          {unreadCount > 0 && !isOpen && (
            <Badge
              variant={urgentCount > 0 ? "destructive" : "secondary"}
              className={cn(
                "absolute -top-2 -right-2 min-w-[1.5rem] h-6 rounded-full",
                urgentCount > 0 && "animate-pulse"
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}

          {/* Active Call Indicator */}
          {activeCall && (
            <div className="absolute -top-1 -left-1 w-4 h-4 bg-green-500 rounded-full animate-pulse border-2 border-white" />
          )}
        </div>
      </div>

      {/* Chat Panel Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl h-[80vh] max-h-[600px] shadow-2xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Team Communication
                </CardTitle>
                <div className="flex items-center gap-2">
                  {urgentCount > 0 && (
                    <Badge variant="destructive" className="animate-pulse">
                      {urgentCount} Urgent
                    </Badge>
                  )}
                  {activeCall && (
                    <Badge variant="default" className="bg-green-600">
                      <Phone className="h-3 w-3 mr-1" />
                      Call Active
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 h-full">
              <ChatPanel className="h-full border-0 shadow-none" />
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default FloatingChatButton;
