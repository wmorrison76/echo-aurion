import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { CalendarOutlet } from "@/types/calendar";
interface EventType {
  id: string;
  code: string;
  label: string;
  description?: string;
  color: string;
  icon?: string;
  is_active: boolean;
  sort_order: number;
}
interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  outlets: CalendarOutlet[];
  orgId: string;
  onEventCreated: (event: any) => void;
}
export function CreateEventModal({
  isOpen,
  onClose,
  selectedDate,
  outlets,
  orgId,
  onEventCreated,
}: CreateEventModalProps) {
  const [title, setTitle] = useState("");
  const [outletId, setOutletId] = useState("");
  const [eventTypeCode, setEventTypeCode] = useState("OTH");
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [location, setLocation] = useState("");
  const [guestCount, setGuestCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // Fetch event types on mount useEffect(() => { const fetchEventTypes = async () => { try { const response = await fetch("/api/beo/event-types/list", { method:"GET", headers: {"Content-Type":"application/json","X-Org-ID": orgId, }, }); if (response.ok) { const data = await response.json(); if (data.success && Array.isArray(data.data)) { setEventTypes(data.data); // Set default to first event type if (data.data.length > 0) { setEventTypeCode(data.data[0].code); } } } } catch (err) { console.error("[CREATE_EVENT] Error fetching event types:", err); // Silently fail - event types are optional } }; if (isOpen) { fetchEventTypes(); } }, [isOpen, orgId]); if (!isOpen) return null; const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); setError(null); // Validation if (!title.trim()) { setError("Event title is required"); return; } if (!outletId) { setError("Please select a calendar"); return; } setIsLoading(true); try { const payload = { title: title.trim(), outlet_id: outletId, event_type_code: eventTypeCode, start_time: `${selectedDate}T${startTime}:00Z`, end_time: `${selectedDate}T${endTime}:00Z`, location_room: location || null, guest_count: guestCount || 0, department: outlets.find((o) => o.id === outletId)?.name ||"", status:"pending", severity:"normal", }; console.log("[CREATE_EVENT] Submitting:", payload); const response = await fetch("/api/calendar/events", { method:"POST", headers: {"Content-Type":"application/json","X-Org-ID": orgId, }, body: JSON.stringify(payload), }); console.log("[CREATE_EVENT] Response status:", response.status); const data = await response.json(); console.log("[CREATE_EVENT] Response body:", data); if (!response.ok) { throw new Error(data.error ||"Failed to create event"); } if (data.success && data.data?.event) { console.log("[CREATE_EVENT] Success! Event:", data.data.event); onEventCreated(data.data.event); // Reset form setTitle(""); setOutletId(""); setEventTypeCode(eventTypes.length > 0 ? eventTypes[0].code :"OTH"); setStartTime("09:00"); setEndTime("10:00"); setLocation(""); setGuestCount(0); // Close modal onClose(); } else { throw new Error("Unexpected response format"); } } catch (err) { const errorMsg = err instanceof Error ? err.message :"Failed to create event"; console.error("[CREATE_EVENT] Error:", errorMsg); setError(errorMsg); } finally { setIsLoading(false); } }; const displayOutlets = outlets.filter( (o) => !["us-holidays","religious-holidays"].includes(o.id), ); return ( <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999999] p-4"> <Card className="w-full max-w-md"> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4"> <h3 className="text-lg font-semibold"> Add Event -{""} {(() => { const [year, month, day] = selectedDate.split("-"); const localDate = new Date( parseInt(year), parseInt(month) - 1, parseInt(day), ); return localDate.toLocaleDateString(); })()} </h3> <button onClick={onClose} className="text-muted-foreground hover:text-foreground dark:hover:text-slate-200" > ✕ </button> </CardHeader> <CardContent> <form onSubmit={handleSubmit} className="space-y-4"> {error && ( <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-900 dark:text-red-100"> {error} </div> )} {/* Title */} <div> <label className="block text-sm font-medium mb-1"> Event Title * </label> <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter event name" className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isLoading} /> </div> {/* Calendar Selection */} <div> <label className="block text-sm font-medium mb-1"> Calendar * </label> <select value={outletId} onChange={(e) => setOutletId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isLoading} > <option value="">-- Select a calendar --</option> {displayOutlets.map((outlet) => ( <option key={outlet.id} value={outlet.id}> {outlet.name} </option> ))} </select> </div> {/* Event Type */} <div> <label className="block text-sm font-medium mb-1"> Event Type </label> <select value={eventTypeCode} onChange={(e) => setEventTypeCode(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isLoading} > {eventTypes.map((type) => ( <option key={type.code} value={type.code}> {type.label} </option> ))} </select> {eventTypes.length === 0 && ( <p className="text-xs text-muted-foreground mt-1"> Loading event types... </p> )} </div> {/* Time Range */} <div className="grid grid-cols-2 gap-3"> <div> <label className="block text-sm font-medium mb-1"> Start Time </label> <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isLoading} /> </div> <div> <label className="block text-sm font-medium mb-1"> End Time </label> <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isLoading} /> </div> </div> {/* Location */} <div> <label className="block text-sm font-medium mb-1"> Location (Optional) </label> <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Room or location" className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isLoading} /> </div> {/* Guest Count */} <div> <label className="block text-sm font-medium mb-1"> Guest Count (Optional) </label> <input type="number" min="0" value={guestCount} onChange={(e) => setGuestCount(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isLoading} /> </div> {/* Buttons */} <div className="flex gap-3 pt-4"> <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="flex-1" > Cancel </Button> <Button type="submit" disabled={isLoading} className="flex-1 bg-primary hover:opacity-90" > {isLoading ?"Creating..." :"Create Event"} </Button> </div> </form> </CardContent> </Card> </div> );
}
