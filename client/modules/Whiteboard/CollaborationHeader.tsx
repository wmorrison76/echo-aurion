import React, { useEffect, useState } from "react";
import { Users, Eye, Pencil, Clock } from "lucide-react";
import PresenceTracker from "./PresenceTracker";
import { UserPresence } from "./types/CollaborationTypes";
import { cn } from "@/lib/glass";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
interface CollaborationHeaderProps {
  presenceTracker: PresenceTracker | null;
  className?: string;
}
export const CollaborationHeader: React.FC<CollaborationHeaderProps> = ({
  presenceTracker,
  className,
}) => {
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const [statistics, setStatistics] = useState({
    total: 0,
    online: 0,
    idle: 0,
    editing: 0,
    offline: 0,
  });
  useEffect(() => {
    if (!presenceTracker) return;
    const updatePresence = () => {
      const users = presenceTracker.getActiveUsers();
      setActiveUsers(users);
      const stats = presenceTracker.getStatistics();
      setStatistics(stats);
    };
    updatePresence();
    const interval = setInterval(updatePresence, 1000);
    return () => clearInterval(interval);
  }, [presenceTracker]);
  if (activeUsers.length === 0) {
    return null;
  }
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-4 rounded-lg bg-slate-50 px-4 py-3 dark:bg-surface",
        className,
      )}
    >
      {" "}
      {/* Total Users Badge */}{" "}
      <TooltipProvider>
        {" "}
        <Tooltip>
          {" "}
          <TooltipTrigger asChild>
            {" "}
            <div className="flex items-center gap-2">
              {" "}
              <Users className="h-4 w-4 text-muted-foreground" />{" "}
              <span className="text-sm font-medium">
                {statistics.total}
              </span>{" "}
            </div>{" "}
          </TooltipTrigger>{" "}
          <TooltipContent>
            {" "}
            <div className="text-sm">
              {" "}
              <p>Online: {statistics.online}</p>{" "}
              <p>Editing: {statistics.editing}</p>{" "}
              <p>Idle: {statistics.idle}</p>{" "}
            </div>{" "}
          </TooltipContent>{" "}
        </Tooltip>{" "}
      </TooltipProvider>{" "}
      {/* User Avatars */}{" "}
      <div className="flex -space-x-2">
        {" "}
        {activeUsers.slice(0, 5).map((user) => (
          <TooltipProvider key={user.userId}>
            {" "}
            <Tooltip>
              {" "}
              <TooltipTrigger asChild>
                {" "}
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-slate-50 dark:ring-slate-900",
                  )}
                  style={{ backgroundColor: user.userColor, cursor: "pointer" }}
                >
                  {" "}
                  {user.userName.charAt(0).toUpperCase()}{" "}
                </div>{" "}
              </TooltipTrigger>{" "}
              <TooltipContent>
                {" "}
                <div className="text-sm">
                  {" "}
                  <p className="font-medium">{user.userName}</p>{" "}
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    {" "}
                    {user.status === "editing" && (
                      <>
                        {" "}
                        <Pencil className="h-3 w-3" /> <span>Editing</span>{" "}
                      </>
                    )}{" "}
                    {user.status === "idle" && (
                      <>
                        {" "}
                        <Clock className="h-3 w-3" /> <span>Idle</span>{" "}
                      </>
                    )}{" "}
                    {user.status === "online" && (
                      <>
                        {" "}
                        <Eye className="h-3 w-3" /> <span>Viewing</span>{" "}
                      </>
                    )}{" "}
                  </div>{" "}
                </div>{" "}
              </TooltipContent>{" "}
            </Tooltip>{" "}
          </TooltipProvider>
        ))}{" "}
      </div>{" "}
      {/* Additional User Count */}{" "}
      {activeUsers.length > 5 && (
        <span className="text-xs text-muted-foreground">
          {" "}
          +{activeUsers.length - 5} more{" "}
        </span>
      )}{" "}
      {/* Status Summary */}{" "}
      <div className="ml-auto flex gap-4 text-xs">
        {" "}
        <div className="flex items-center gap-1.5">
          {" "}
          <div className="h-2 w-2 rounded-full bg-green-500" />{" "}
          <span>{statistics.editing} editing</span>{" "}
        </div>{" "}
        <div className="flex items-center gap-1.5">
          {" "}
          <div className="h-2 w-2 rounded-full bg-yellow-500" />{" "}
          <span>{statistics.idle} idle</span>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};
export default CollaborationHeader;
