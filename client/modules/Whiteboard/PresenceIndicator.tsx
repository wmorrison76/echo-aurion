import React from "react";
import { ParticipantInfo } from "./types";
import { User, Edit2, Eye } from "lucide-react";
import { cn } from "@/lib/glass";
interface PresenceIndicatorProps {
  participants: ParticipantInfo[];
  currentUserId: string;
  onParticipantHover?: (participant: ParticipantInfo | null) => void;
}
export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  participants,
  currentUserId,
  onParticipantHover,
}) => {
  const activeParticipants = participants.filter(
    (p) => p.isActive && p.userId !== currentUserId,
  );
  const isEditing = (participant: ParticipantInfo) =>
    participant.selectedTool && participant.selectedTool !== "select";
  if (activeParticipants.length === 0) {
    return (
      <div className="text-xs text-foreground/50 flex items-center gap-2">
        {" "}
        <User size={14} /> You{" "}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {" "}
      {/* Current user */}{" "}
      <div className="text-xs text-foreground/60 flex items-center gap-2">
        {" "}
        <div
          className="w-2 h-2 rounded-full bg-primary"
          style={{
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        />{" "}
        You (editing){" "}
      </div>{" "}
      {/* Other participants */}{" "}
      <div className="space-y-2">
        {" "}
        {activeParticipants.map((participant) => (
          <div
            key={participant.userId}
            onMouseEnter={() => onParticipantHover?.(participant)}
            onMouseLeave={() => onParticipantHover?.(null)}
            className={cn(
              "text-xs p-2 rounded border transition-colors cursor-pointer",
              isEditing(participant)
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-cyan-500/30 bg-cyan-500/5",
            )}
          >
            {" "}
            <div className="flex items-center gap-2">
              {" "}
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: participant.color }}
              />{" "}
              <span className="font-medium text-foreground">
                {" "}
                {participant.userName}{" "}
              </span>{" "}
              {isEditing(participant) ? (
                <Edit2 size={12} className="text-amber-600 ml-auto" />
              ) : (
                <Eye size={12} className="text-cyan-600 ml-auto" />
              )}{" "}
            </div>{" "}
            {participant.selectedTool && (
              <p className="text-xs text-foreground/50 mt-1 ml-4">
                {" "}
                {isEditing(participant)
                  ? `Using ${participant.selectedTool}`
                  : "Viewing"}{" "}
              </p>
            )}{" "}
          </div>
        ))}{" "}
      </div>{" "}
      {/* Online count */}{" "}
      <div className="pt-2 border-t border-border/20">
        {" "}
        <p className="text-xs text-foreground/50">
          {" "}
          {participants.length} online{" "}
        </p>{" "}
      </div>{" "}
      {/* Styling for pulse animation */}{" "}
      <style>{` @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } } `}</style>{" "}
    </div>
  );
};
