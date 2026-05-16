/** * EventDetailPopup Component * Resizable modal for displaying comprehensive event details * Features: * - Tabs: Details, Permissions, Attachments, Audit Log * - Inline PDF viewer for BEO/REO * - Edit mode for event properties * - Conflict resolution suggestions * - Access control indicators */ import React, {
  useState,
  useRef,
  useEffect,
} from "react";
import {
  X,
  Edit2,
  Save,
  Share2,
  FileText,
  Lock,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Trash2,
  Download,
} from "lucide-react";
import { cn } from "@/lib/glass";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CalendarEvent, EventPermission } from "@/types/calendar";
import {
  useEventPermissions,
  useEventAttachments,
  useEventAuditLog,
} from "../hooks/useEventPermissions";
import { useUpdateEvent, useDeleteEvent } from "../hooks/useCalendarEvents";
import { useEventConflicts } from "../hooks/useConflictDetection";
type TabType = "details" | "permissions" | "attachments" | "audit";
interface EventDetailPopupProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onEventUpdated?: (event: CalendarEvent) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canShare?: boolean;
} /** * EventDetailPopup Component */
export const EventDetailPopup: React.FC<EventDetailPopupProps> = ({
  event,
  onClose,
  onEventUpdated,
  canEdit = true,
  canDelete = true,
  canShare = true,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("details");
  const [isEditing, setIsEditing] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ width: 700, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 }); // Form state for editing const [editData, setEditData] = useState<Partial<CalendarEvent>>({}); // Modal reference const modalRef = useRef<HTMLDivElement>(null); const headerRef = useRef<HTMLDivElement>(null); // Hooks const { permissions } = useEventPermissions(event?.id || null); const { attachments } = useEventAttachments(event?.id || null); const { auditLog } = useEventAuditLog(event?.id || null); const { conflicts } = useEventConflicts(event?.id || null); const { updateEvent: updateEventData, isUpdating } = useUpdateEvent( event?.id ||"", ); const { deleteEvent, isDeleting } = useDeleteEvent(); /** * Initialize edit mode */ useEffect(() => { if (event && isEditing) { setEditData({ title: event.title, description: event.description, location_room: event.location_room, guest_count: event.guest_count, notes: event.notes, }); } }, [event, isEditing]); if (!event) { return null; } /** * Handle drag start */ const handleDragStart = (e: React.MouseEvent) => { if ((e.target as HTMLElement).closest("[data-no-drag]")) return; setIsDragging(true); setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y }); }; /** * Handle drag move */ useEffect(() => { const handleDragMove = (e: MouseEvent) => { if (!isDragging) return; setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y, }); }; const handleDragEnd = () => { setIsDragging(false); }; if (isDragging) { window.addEventListener("mousemove", handleDragMove); window.addEventListener("mouseup", handleDragEnd); return () => { window.removeEventListener("mousemove", handleDragMove); window.removeEventListener("mouseup", handleDragEnd); }; } }, [isDragging, dragStart]); /** * Handle resize start */ const handleResizeStart = (e: React.MouseEvent) => { e.stopPropagation(); setIsResizing(true); setResizeStart({ x: e.clientX, y: e.clientY }); }; /** * Handle resize move */ useEffect(() => { const handleResizeMove = (e: MouseEvent) => { if (!isResizing) return; const deltaX = e.clientX - resizeStart.x; const deltaY = e.clientY - resizeStart.y; setSize({ width: Math.max(400, size.width + deltaX), height: Math.max(300, size.height + deltaY), }); setResizeStart({ x: e.clientX, y: e.clientY }); }; const handleResizeEnd = () => { setIsResizing(false); }; if (isResizing) { window.addEventListener("mousemove", handleResizeMove); window.addEventListener("mouseup", handleResizeEnd); return () => { window.removeEventListener("mousemove", handleResizeMove); window.removeEventListener("mouseup", handleResizeEnd); }; } }, [isResizing, resizeStart, size]); /** * Handle save changes */ const handleSaveChanges = async () => { try { await updateEventData(editData); setIsEditing(false); onEventUpdated?.(event); } catch (error) { console.error("Error updating event:", error); } }; /** * Handle delete event */ const handleDeleteEvent = async () => { if (!window.confirm("Are you sure you want to delete this event?")) return; try { await deleteEvent(event.id); onClose(); } catch (error) { console.error("Error deleting event:", error); } }; const eventDate = new Date(event.start_time); const hasConflicts = conflicts.length > 0; return ( <> {/* Overlay */} <div className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40" onClick={onClose} /> {/* Modal */} <div ref={modalRef} className="fixed bg-background dark:bg-surface rounded-lg shadow-2xl z-50 flex flex-col border border-slate-200 dark:border-border" style={{ left: `${position.x}px`, top: `${position.y}px`, width: `${size.width}px`, height: `${size.height}px`, userSelect: isDragging ?"none" :"auto", }} > {/* Header - Draggable */} <div ref={headerRef} onMouseDown={handleDragStart} className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-border bg-slate-50 dark:bg-slate-800 rounded-t-lg cursor-move hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" > <div className="flex-1 min-w-0"> <h2 className="text-lg font-bold truncate">{event.title}</h2> <p className="text-xs text-muted-foreground"> {eventDate.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit", })} </p> </div> {/* Status badge */} <Badge className="mx-2" variant={event.status ==="confirmed" ?"default" :"outline"} > {event.status} </Badge> {/* Close button */} <button onClick={onClose} data-no-drag className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors" > <X className="w-5 h-5" /> </button> </div> {/* Tab navigation */} <div className="flex gap-1 px-4 pt-3 border-b border-slate-200 dark:border-border bg-slate-50 dark:bg-slate-800" data-no-drag > {( ["details","permissions","attachments","audit"] as TabType[] ).map((tab) => ( <button key={tab} onClick={() => setActiveTab(tab)} className={cn("px-3 py-2 rounded-t text-sm font-medium transition-colors", activeTab === tab ?"bg-background dark:bg-surface border-b-2 border-blue-500" :"text-muted-foreground hover:text-foreground dark:hover:text-slate-200", )} > {tab.charAt(0).toUpperCase() + tab.slice(1)} </button> ))} </div> {/* Content */} <div className="flex-1 overflow-y-auto p-4"> {activeTab ==="details" && ( <EventDetailsTab event={event} isEditing={isEditing} editData={editData} onEditChange={setEditData} conflicts={conflicts} hasConflicts={hasConflicts} canEdit={canEdit} /> )} {activeTab ==="permissions" && ( <EventPermissionsTab eventId={event.id} permissions={permissions} canShare={canShare} /> )} {activeTab ==="attachments" && ( <EventAttachmentsTab attachments={attachments} /> )} {activeTab ==="audit" && <EventAuditTab auditLog={auditLog} />} </div> {/* Footer */} <div className="flex gap-2 p-4 border-t border-slate-200 dark:border-border bg-slate-50 dark:bg-slate-800 rounded-b-lg" data-no-drag > {isEditing ? ( <> <Button variant="default" size="sm" onClick={handleSaveChanges} disabled={isUpdating} > <Save className="w-4 h-4 mr-1" /> Save </Button> <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} > Cancel </Button> </> ) : ( <> {canEdit && ( <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} > <Edit2 className="w-4 h-4 mr-1" /> Edit </Button> )} {canShare && ( <Button variant="outline" size="sm" onClick={() => setActiveTab("permissions")} > <Share2 className="w-4 h-4 mr-1" /> Share </Button> )} {canDelete && ( <Button variant="outline" size="sm" onClick={handleDeleteEvent} disabled={isDeleting} className="text-red-600 hover:text-red-700" > <Trash2 className="w-4 h-4 mr-1" /> Delete </Button> )} </> )} <div className="flex-1" /> {/* Resize handle */} <div onMouseDown={handleResizeStart} className="w-4 h-4 cursor-se-resize opacity-30 hover:opacity-100 transition-opacity" title="Drag to resize" > <div className="w-full h-full border-r-2 border-b-2 border-slate-400 dark:border-slate-600" /> </div> </div> </div> </> );
}; // =====================================================
// TAB COMPONENTS
// ===================================================== /** * Event Details Tab */
const EventDetailsTab: React.FC<{
  event: CalendarEvent;
  isEditing: boolean;
  editData: Partial<CalendarEvent>;
  onEditChange: (data: Partial<CalendarEvent>) => void;
  conflicts: any[];
  hasConflicts: boolean;
  canEdit: boolean;
}> = ({
  event,
  isEditing,
  editData,
  onEditChange,
  conflicts,
  hasConflicts,
  canEdit,
}) => {
  return (
    <div className="space-y-4">
      {" "}
      {/* Conflict warning */}{" "}
      {hasConflicts && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          {" "}
          <div className="flex items-start gap-2">
            {" "}
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />{" "}
            <div className="flex-1">
              {" "}
              <h4 className="font-semibold text-sm text-red-900 dark:text-red-100">
                {" "}
                Conflict Detected{" "}
              </h4>{" "}
              <p className="text-xs text-red-800 dark:text-red-200 mt-1">
                {" "}
                This event has {conflicts.length} unresolved conflict(s){" "}
              </p>{" "}
            </div>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Details grid */}{" "}
      <div className="grid grid-cols-2 gap-4">
        {" "}
        {/* Title */}{" "}
        <div className="col-span-2">
          {" "}
          <label className="text-xs font-semibold text-muted-foreground block mb-1">
            {" "}
            Title{" "}
          </label>{" "}
          {isEditing ? (
            <input
              type="text"
              value={editData.title || ""}
              onChange={(e) =>
                onEditChange({ ...editData, title: e.target.value })
              }
              className="w-full px-2 py-1 border rounded dark:bg-slate-800 dark:border-border"
            />
          ) : (
            <p className="text-sm font-medium">{event.title}</p>
          )}{" "}
        </div>{" "}
        {/* Date/Time */}{" "}
        <div>
          {" "}
          <label className="text-xs font-semibold text-muted-foreground block mb-1 flex items-center gap-1">
            {" "}
            <Calendar className="w-3 h-3" /> Date & Time{" "}
          </label>{" "}
          <p className="text-sm">
            {" "}
            {new Date(event.start_time).toLocaleDateString()} •{""}{" "}
            {new Date(event.start_time).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
          </p>{" "}
        </div>{" "}
        {/* Location */}{" "}
        <div>
          {" "}
          <label className="text-xs font-semibold text-muted-foreground block mb-1 flex items-center gap-1">
            {" "}
            <MapPin className="w-3 h-3" /> Location{" "}
          </label>{" "}
          {isEditing ? (
            <input
              type="text"
              value={editData.location_room || ""}
              onChange={(e) =>
                onEditChange({ ...editData, location_room: e.target.value })
              }
              className="w-full px-2 py-1 border rounded dark:bg-slate-800 dark:border-border"
            />
          ) : (
            <p className="text-sm">{event.location_room || "-"}</p>
          )}{" "}
        </div>{" "}
        {/* Guest Count */}{" "}
        <div>
          {" "}
          <label className="text-xs font-semibold text-muted-foreground block mb-1 flex items-center gap-1">
            {" "}
            <Users className="w-3 h-3" /> Guests{" "}
          </label>{" "}
          {isEditing ? (
            <input
              type="number"
              value={editData.guest_count || 0}
              onChange={(e) =>
                onEditChange({
                  ...editData,
                  guest_count: parseInt(e.target.value),
                })
              }
              className="w-full px-2 py-1 border rounded dark:bg-slate-800 dark:border-border"
            />
          ) : (
            <p className="text-sm">{event.guest_count || "-"}</p>
          )}{" "}
        </div>{" "}
        {/* Revenue */}{" "}
        {event.revenue && (
          <div>
            {" "}
            <label className="text-xs font-semibold text-muted-foreground block mb-1 flex items-center gap-1">
              {" "}
              <DollarSign className="w-3 h-3" /> Revenue{" "}
            </label>{" "}
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              {" "}
              ${event.revenue.toLocaleString()}{" "}
            </p>{" "}
          </div>
        )}{" "}
        {/* Department */}{" "}
        {event.department && (
          <div>
            {" "}
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              {" "}
              Department{" "}
            </label>{" "}
            <p className="text-sm">{event.department}</p>{" "}
          </div>
        )}{" "}
      </div>{" "}
      {/* Notes */}{" "}
      {(event.notes || isEditing) && (
        <div>
          {" "}
          <label className="text-xs font-semibold text-muted-foreground block mb-1">
            {" "}
            Notes{" "}
          </label>{" "}
          {isEditing ? (
            <textarea
              value={editData.notes || ""}
              onChange={(e) =>
                onEditChange({ ...editData, notes: e.target.value })
              }
              className="w-full px-2 py-1 border rounded dark:bg-slate-800 dark:border-border h-24 resize-none"
            />
          ) : (
            <p className="text-sm text-muted-foreground"> {event.notes} </p>
          )}{" "}
        </div>
      )}{" "}
    </div>
  );
}; /** * Event Permissions Tab */
const EventPermissionsTab: React.FC<{
  eventId: string;
  permissions: EventPermission[];
  canShare: boolean;
}> = ({ eventId, permissions, canShare }) => {
  return (
    <div className="space-y-4">
      {" "}
      <div className="text-sm text-muted-foreground">
        {" "}
        {permissions.length === 0 ? (
          <p>No specific permissions set. Only owner can access.</p>
        ) : (
          <div className="space-y-2">
            {" "}
            {permissions.map((perm) => (
              <div
                key={perm.id}
                className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded"
              >
                {" "}
                <div>
                  {" "}
                  <p className="font-medium">
                    {" "}
                    {perm.user_id
                      ? "User"
                      : perm.team_id
                        ? "Team"
                        : "Role"}{" "}
                  </p>{" "}
                  <Badge variant="outline" className="text-xs mt-1">
                    {" "}
                    {perm.access_level}{" "}
                  </Badge>{" "}
                </div>{" "}
                <Lock className="w-4 h-4 text-slate-400" />{" "}
              </div>
            ))}{" "}
          </div>
        )}{" "}
      </div>{" "}
      {canShare && (
        <Button variant="outline" size="sm" className="w-full">
          {" "}
          <Share2 className="w-4 h-4 mr-2" /> Add Permissions{" "}
        </Button>
      )}{" "}
    </div>
  );
}; /** * Event Attachments Tab */
const EventAttachmentsTab: React.FC<{ attachments: any[] }> = ({
  attachments,
}) => {
  return (
    <div className="space-y-3">
      {" "}
      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attachments</p>
      ) : (
        attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-border"
          >
            {" "}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {" "}
              <FileText className="w-4 h-4 flex-shrink-0 text-muted-foreground" />{" "}
              <div className="flex-1 min-w-0">
                {" "}
                <p className="text-sm font-medium truncate">
                  {" "}
                  {attachment.file_name}{" "}
                </p>{" "}
                <p className="text-xs text-muted-foreground">
                  {" "}
                  {(attachment.file_size || 0) / 1024 / 1024 > 0
                    ? `${((attachment.file_size || 0) / 1024 / 1024).toFixed(2)} MB`
                    : "PDF"}{" "}
                </p>{" "}
              </div>{" "}
            </div>{" "}
            <a
              href={attachment.attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors flex-shrink-0"
            >
              {" "}
              <Download className="w-4 h-4" />{" "}
            </a>{" "}
          </div>
        ))
      )}{" "}
    </div>
  );
}; /** * Event Audit Log Tab */
const EventAuditTab: React.FC<{ auditLog: any[] }> = ({ auditLog }) => {
  return (
    <div className="space-y-2">
      {" "}
      {auditLog.length === 0 ? (
        <p className="text-sm text-muted-foreground">No audit entries</p>
      ) : (
        auditLog.map((entry) => (
          <div
            key={entry.id}
            className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-xs border border-slate-200 dark:border-border"
          >
            {" "}
            <div className="flex items-center justify-between mb-1">
              {" "}
              <p className="font-medium capitalize">{entry.action}</p>{" "}
              <p className="text-muted-foreground">
                {" "}
                {new Date(entry.created_at).toLocaleDateString()}{" "}
              </p>{" "}
            </div>{" "}
            <p className="text-muted-foreground"> {entry.user_id} </p>{" "}
          </div>
        ))
      )}{" "}
    </div>
  );
};
export default EventDetailPopup;
