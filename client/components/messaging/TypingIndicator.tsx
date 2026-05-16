/**
 * Typing Indicator Component
 * Animated indicator showing who is typing
 */

import React from 'react';

interface TypingIndicatorProps {
  users: string[];
  compact?: boolean;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  users,
  compact = false,
}) => {
  if (users.length === 0) return null;
  
  const userList = users.slice(0, 2).join(', ');
  const extra = users.length > 2 ? ` and ${users.length - 2} more` : '';
  
  if (compact) {
    return (
      <div className="flex gap-2 items-center text-gray-500 text-sm italic">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
        </div>
        <span>
          {userList}{extra} is typing...
        </span>
      </div>
    );
  }
  
  return (
    <div className="flex gap-4 my-4 text-gray-600">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0" />
      
      {/* Typing Animation */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
        </div>
        <p className="text-sm italic">
          {userList}{extra} is typing...
        </p>
      </div>
    </div>
  );
};

export default TypingIndicator;
