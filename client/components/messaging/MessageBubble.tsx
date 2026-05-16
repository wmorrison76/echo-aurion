/**
 * Message Bubble Component
 * Displays individual messages with reactions and interactions
 */

import React, { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { MoreVertical, Trash2, Edit2, Copy } from "lucide-react";

/**
 * Safe mention renderer - parses mentions without XSS risk
 * SECURITY: Splits text by mentions and renders safely without dangerouslySetInnerHTML
 */
function renderMentionedContent(content: string): (string | React.ReactNode)[] {
  const mentionRegex = /@(\w+)/g;
  const parts: (string | React.ReactNode)[] = [];
  let lastIndex = 0;
  let matchIndex = 0;

  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }

    // Add mention as safe element
    parts.push(
      <span
        key={`mention-${matchIndex}`}
        className="text-blue-600 font-semibold"
      >
        @{match[1]}
      </span>,
    );

    lastIndex = match.index + match[0].length;
    matchIndex++;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [content];
}

interface Attachment {
  url: string;
  type: string;
  name: string;
}

interface MessageProps {
  message: {
    id: string;
    user_id: string;
    user_name: string;
    content: string;
    created_at: string;
    attachments?: Attachment[];
    mentioned_user_ids?: string[];
    read_by?: string[];
  };
  isOwn?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}

export const MessageBubble: React.FC<MessageProps> = ({
  message,
  isOwn = false,
  onEdit,
  onDelete,
  compact = false,
}) => {
  const [showActions, setShowActions] = useState(false);

  const createdDate = new Date(message.created_at);
  const timeAgo = formatDistanceToNow(createdDate, { addSuffix: true });

  // Safely render mentions without XSS risk
  const renderedContent = renderMentionedContent(message.content);

  if (compact) {
    return (
      <div className={`flex gap-2 mb-2 ${isOwn ? "flex-row-reverse" : ""}`}>
        {/* Avatar */}
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex-shrink-0" />

        {/* Bubble */}
        <div
          className={`
            max-w-xs px-3 py-2 rounded-lg text-sm
            ${
              isOwn
                ? "bg-blue-500 text-white rounded-br-none"
                : "bg-gray-200 text-gray-900 rounded-bl-none"
            }
          `}
        >
          <p
            className={
              isOwn ? "text-white" : "font-semibold text-xs text-gray-600 mb-1"
            }
          >
            {isOwn ? "" : message.user_name}
          </p>
          <p>{renderedContent}</p>
          <p
            className={`text-xs mt-1 ${isOwn ? "text-blue-100" : "text-gray-500"}`}
          >
            {timeAgo}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-4 group ${isOwn ? "flex-row-reverse" : ""}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
          {message.user_name.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* Message Content */}
      <div
        className={`flex-1 ${isOwn ? "items-end" : "items-start"} flex flex-col`}
      >
        <div className="flex items-baseline gap-2">
          <p className="font-semibold text-gray-900">{message.user_name}</p>
          <p className="text-xs text-gray-500">{timeAgo}</p>
        </div>

        {/* Message Text */}
        <div
          className={`
            max-w-md mt-1 px-4 py-3 rounded-lg
            ${
              isOwn
                ? "bg-blue-600 text-white rounded-br-none"
                : "bg-gray-100 text-gray-900 rounded-bl-none"
            }
          `}
        >
          <p className="break-words">{renderedContent}</p>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.attachments.map((attachment, idx) => (
                <a
                  key={idx}
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`
                    inline-flex items-center gap-2 px-3 py-2 rounded
                    ${
                      isOwn
                        ? "bg-blue-500 hover:bg-blue-700"
                        : "bg-white hover:bg-gray-200"
                    }
                    text-sm font-medium
                  `}
                >
                  📎 {attachment.name}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Read Receipts */}
        {message.read_by && message.read_by.length > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            ✓✓ Read by {message.read_by.length} person
            {message.read_by.length > 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      {showActions && isOwn && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="text-gray-500 hover:text-blue-600"
            title="Edit message"
          >
            <Edit2 className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-gray-500 hover:text-red-600"
            title="Delete message"
          >
            <Trash2 className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(message.content);
            }}
            className="text-gray-500 hover:text-green-600"
            title="Copy message"
          >
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
