/** * ConflictAlertBanner Component * Displays conflict information with: * - Severity indicators * - Event details involved * - Quick action buttons * - Dismiss/Acknowledge options */ import React, {
  useState,
} from "react";
import {
  AlertTriangle,
  Clock,
  MapPin,
  Users,
  X,
  Check,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/glass";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarConflict, CalendarEvent } from "@/types/calendar";
import { formatConflictMessage } from "../utils/conflict-formatter";
interface ConflictAlertBannerProps {
  conflict: CalendarConflict;
  event1?: CalendarEvent;
  event2?: CalendarEvent;
  onAcknowledge?: () => Promise<void>;
  onResolve?: () => Promise<void>;
  onClose?: () => void;
  expanded?: boolean;
  compact?: boolean;
} /** * ConflictAlertBanner Component */
export const ConflictAlertBanner: React.FC<ConflictAlertBannerProps> = ({
  conflict,
  event1,
  event2,
  onAcknowledge,
  onResolve,
  onClose,
  expanded: initialExpanded = false,
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [isLoading, setIsLoading] = useState(false);
  const [isAcknowledged, setIsAcknowledged] = useState(
    !!conflict.acknowledged_at,
  );
  /** * Handle acknowledge */ const handleAcknowledge = async () => {
    if (!onAcknowledge) return;
    setIsLoading(true);
    try {
      await onAcknowledge();
      setIsAcknowledged(true);
    } finally {
      setIsLoading(false);
    }
  };
  /** * Handle resolve */ const handleResolve = async () => {
    if (!onResolve) return;
    setIsLoading(true);
    try {
      await onResolve();
      onClose?.();
    } finally {
      setIsLoading(false);
    }
  }; // Get severity color const severityColors: Record< string, { bg: string; border: string; text: string; icon: string } > = { critical: { bg:"bg-red-50 dark:bg-red-900/20", border:"border-red-200 dark:border-red-800", text:"text-red-900 dark:text-red-100", icon:"text-red-600 dark:text-red-400", }, warning: { bg:"bg-yellow-50 dark:bg-yellow-900/20", border:"border-yellow-200 dark:border-yellow-800", text:"text-yellow-900 dark:text-yellow-100", icon:"text-yellow-600 dark:text-yellow-400", }, info: { bg:"bg-blue-50 dark:bg-blue-900/20", border:"border-blue-200 dark:border-blue-800", text:"text-blue-900 dark:text-blue-100", icon:"text-primary dark:text-blue-400", }, }; const colors = severityColors[conflict.severity] || severityColors.info; const formattedMessage = event1 && event2 ? formatConflictMessage(conflict, event1, event2) : conflict.message; if (compact) { // Compact version for dashboard return ( <div className={cn("p-3 rounded-lg border flex items-start gap-3", colors.bg, colors.border, )} > <AlertTriangle className={cn("w-5 h-5 flex-shrink-0 mt-0.5", colors.icon)} /> <div className="flex-1 min-w-0"> <p className={cn("text-sm font-semibold", colors.text)}> {conflict.conflict_type ==="location" ?"Location Conflict" :"Time Conflict"} </p> <p className={cn("text-xs mt-1", colors.text)}>{formattedMessage}</p> </div> </div> ); } // Full version return ( <div className={cn("rounded-lg border overflow-hidden", colors.bg, colors.border, isAcknowledged &&"opacity-75", )} > {/* Header */} <div className={cn("flex items-start justify-between gap-3 p-4", isExpanded &&"border-b", colors.border, )} > <div className="flex items-start gap-3 flex-1 min-w-0"> <AlertTriangle className={cn("w-6 h-6 flex-shrink-0 mt-0.5", colors.icon)} /> <div className="flex-1 min-w-0"> <div className="flex items-center gap-2 mb-1"> <h4 className={cn("font-semibold", colors.text)}> {conflict.severity.charAt(0).toUpperCase() + conflict.severity.slice(1)}{""} Conflict </h4> <Badge variant={ conflict.severity ==="critical" ?"destructive" :"secondary" } className="text-xs capitalize" > {conflict.conflict_type} </Badge> {isAcknowledged && ( <Badge variant="outline" className="text-xs"> <Check className="w-2.5 h-2.5 mr-1" /> Acknowledged </Badge> )} </div> <p className={cn("text-sm", colors.text)}>{formattedMessage}</p> {/* Quick event preview */} {(event1 || event2) && ( <div className="mt-2 text-xs space-y-1"> {event1 && ( <div className="flex items-center gap-1 text-foreground"> <span className="font-medium">{event1.title}</span> {event1.location_room && ( <> <span>•</span> <MapPin className="w-3 h-3" /> <span>{event1.location_room}</span> </> )} </div> )} {event2 && ( <div className="flex items-center gap-1 text-foreground"> <span className="font-medium">{event2.title}</span> {event2.location_room && ( <> <span>•</span> <MapPin className="w-3 h-3" /> <span>{event2.location_room}</span> </> )} </div> )} </div> )} </div> </div> {/* Actions */} <div className="flex items-center gap-2 flex-shrink-0"> <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="p-1 h-8 w-8" > <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded &&"rotate-180", )} /> </Button> {onClose && ( <Button variant="ghost" size="sm" onClick={onClose} className="p-1 h-8 w-8" > <X className="w-4 h-4" /> </Button> )} </div> </div> {/* Expanded Content */} {isExpanded && ( <div className={cn("p-4 space-y-4 border-t", colors.border)}> {/* Event details comparison */} {event1 && event2 && ( <div className="grid grid-cols-2 gap-4"> <div className="space-y-2"> <h5 className="font-medium text-sm">Event 1</h5> <div className="space-y-1 text-xs"> <div className="font-semibold text-foreground"> {event1.title} </div> {event1.location_room && ( <div className="flex items-center gap-1"> <MapPin className="w-3 h-3" /> {event1.location_room} </div> )} <div className="flex items-center gap-1"> <Clock className="w-3 h-3" /> {new Date(event1.start_time).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", })} </div> {event1.guest_count && ( <div className="flex items-center gap-1"> <Users className="w-3 h-3" /> {event1.guest_count} guests </div> )} </div> </div> <div className="space-y-2"> <h5 className="font-medium text-sm">Event 2</h5> <div className="space-y-1 text-xs"> <div className="font-semibold text-foreground"> {event2.title} </div> {event2.location_room && ( <div className="flex items-center gap-1"> <MapPin className="w-3 h-3" /> {event2.location_room} </div> )} <div className="flex items-center gap-1"> <Clock className="w-3 h-3" /> {new Date(event2.start_time).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", })} </div> {event2.guest_count && ( <div className="flex items-center gap-1"> <Users className="w-3 h-3" /> {event2.guest_count} guests </div> )} </div> </div> </div> )} {/* Resolution notes */} {conflict.resolution_notes && ( <div className="bg-background dark:bg-slate-800/50 p-3 rounded border border-slate-200 dark:border-border"> <p className="text-xs font-medium text-foreground mb-1"> Resolution Notes </p> <p className="text-xs text-muted-foreground"> {conflict.resolution_notes} </p> </div> )} {/* Action buttons */} {!conflict.resolved_at && ( <div className="flex gap-2"> {onAcknowledge && !isAcknowledged && ( <Button variant="outline" size="sm" onClick={handleAcknowledge} disabled={isLoading} className="flex-1" > <Check className="w-4 h-4 mr-1" /> Acknowledge </Button> )} {onResolve && ( <Button variant="default" size="sm" onClick={handleResolve} disabled={isLoading} className="flex-1" > Resolve Conflict </Button> )} </div> )} {conflict.resolved_at && ( <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-xs text-green-900 dark:text-green-100"> <p className="font-medium">Resolved</p> <p>{conflict.resolution_notes}</p> </div> )} </div> )} </div> );
}; /** * Conflict Alert Stack - Display multiple conflicts */
export const ConflictAlertStack: React.FC<{
  conflicts: Array<
    CalendarConflict & { event1?: CalendarEvent; event2?: CalendarEvent }
  >;
  onAcknowledge?: (conflictId: string) => Promise<void>;
  onResolve?: (conflictId: string) => Promise<void>;
  maxVisible?: number;
}> = ({ conflicts, onAcknowledge, onResolve, maxVisible = 3 }) => {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const visibleConflicts = conflicts
    .filter((c) => !dismissedIds.has(c.id))
    .slice(0, maxVisible);
  const hiddenCount = conflicts.length - visibleConflicts.length;
  return (
    <div className="space-y-3">
      {" "}
      {visibleConflicts.map((conflict) => (
        <ConflictAlertBanner
          key={conflict.id}
          conflict={conflict}
          event1={conflict.event1}
          event2={conflict.event2}
          onAcknowledge={
            onAcknowledge ? () => onAcknowledge(conflict.id) : undefined
          }
          onResolve={onResolve ? () => onResolve(conflict.id) : undefined}
          onClose={() => {
            setDismissedIds((prev) => new Set([...prev, conflict.id]));
          }}
          compact={false}
        />
      ))}{" "}
      {hiddenCount > 0 && (
        <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-border rounded text-sm text-muted-foreground">
          {" "}
          {hiddenCount} more conflict{hiddenCount !== 1 ? "s" : ""} not
          shown{" "}
        </div>
      )}{" "}
    </div>
  );
};
export default ConflictAlertBanner;
