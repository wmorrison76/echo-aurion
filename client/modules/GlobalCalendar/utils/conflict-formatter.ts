/** * Conflict Formatter Utility * Formats conflict data for human-readable display */ import { CalendarConflict, CalendarEvent, ConflictSeverity, ConflictType,
} from"@/types/calendar"; /** * Format conflict message based on type and events */
export function formatConflictMessage( conflict: CalendarConflict, event1: CalendarEvent, event2: CalendarEvent,
): string { const time1 = formatTime(event1.start_time); const time2 = formatTime(event2.start_time); switch (conflict.conflict_type) { case"location": return `"${event1.title}" (${time1}) conflicts with"${event2.title}" (${time2}) in ${event1.location_room}`; case"time": return `"${event1.title}" and"${event2.title}" overlap on ${formatDate(event1.start_time)}`; case"resource": return `"${event1.title}" and"${event2.title}" require the same resource`; case"personnel": return `"${event1.title}" and"${event2.title}" involve conflicting personnel`; default: return conflict.message; }
} /** * Format time string */
export function formatTime(timestamp: string): string { const date = new Date(timestamp); return date.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit", hour12: true, });
} /** * Format date string */
export function formatDate(timestamp: string): string { const date = new Date(timestamp); return date.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric", });
} /** * Format date and time */
export function formatDateTime(timestamp: string): string { const date = new Date(timestamp); return date.toLocaleString("en-US", { weekday:"short", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit", hour12: true, });
} /** * Get human-readable conflict type */
export function getConflictTypeLabel(type: ConflictType): string { const labels: Record<ConflictType, string> = { location:"Location Conflict", time:"Time Overlap", resource:"Resource Conflict", personnel:"Personnel Conflict", }; return labels[type] ||"Conflict";
} /** * Get human-readable severity label */
export function getSeverityLabel(severity: ConflictSeverity): string { const labels: Record<ConflictSeverity, string> = { critical:"Critical", warning:"Warning", info:"Information", }; return labels[severity] ||"Unknown";
} /** * Get severity color (for UI) */
export function getSeverityColor(severity: ConflictSeverity): string { const colors: Record<ConflictSeverity, string> = { critical:"bg-red-100 text-red-900 border-red-300", warning:"bg-yellow-100 text-yellow-900 border-yellow-300", info:"bg-blue-100 text-blue-900 border-primary", }; return colors[severity] ||"bg-slate-100 text-foreground border-slate-300";
} /** * Get severity icon name */
export function getSeverityIcon(severity: ConflictSeverity): string { const icons: Record<ConflictSeverity, string> = { critical:"alert-triangle", warning:"alert-circle", info:"info", }; return icons[severity] ||"alert-circle";
} /** * Format event overlap duration */
export function formatOverlapDuration( event1: CalendarEvent, event2: CalendarEvent,
): string { const start1 = new Date(event1.start_time).getTime(); const end1 = new Date(event1.end_time).getTime(); const start2 = new Date(event2.start_time).getTime(); const end2 = new Date(event2.end_time).getTime(); const overlapStart = Math.max(start1, start2); const overlapEnd = Math.min(end1, end2); const overlapMs = overlapEnd - overlapStart; if (overlapMs <= 0) { return"No overlap"; } const minutes = Math.floor(overlapMs / 60000); const hours = Math.floor(minutes / 60); if (hours > 0) { return `${hours}h ${minutes % 60}m overlap`; } else { return `${minutes}m overlap`; }
} /** * Format conflict summary for display */
export function formatConflictSummary(conflict: CalendarConflict): string { const severity = getSeverityLabel(conflict.severity); const type = getConflictTypeLabel(conflict.conflict_type); return `${severity} - ${type}`;
} /** * Generate suggested resolutions */
export function generateResolutionSuggestions( conflict: CalendarConflict, event1: CalendarEvent, event2: CalendarEvent,
): string[] { const suggestions: string[] = []; if ( conflict.conflict_type ==="location" || conflict.conflict_type ==="resource" ) { suggestions.push(`Use alternative location for"${event1.title}"`); suggestions.push(`Use alternative location for"${event2.title}"`); suggestions.push("Contact location manager for scheduling review"); } if (conflict.conflict_type ==="time") { const event2End = new Date(event2.end_time); event2End.setHours(event2End.getHours() + 1); suggestions.push( `Reschedule"${event1.title}" to ${event2End.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", })}`, ); const event1End = new Date(event1.end_time); event1End.setHours(event1End.getHours() + 1); suggestions.push( `Reschedule"${event2.title}" to ${event1End.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", })}`, ); } if (conflict.conflict_type ==="personnel") { suggestions.push("Contact involved departments to resolve personnel conflict", ); suggestions.push("Review personnel scheduling availability"); } return suggestions.slice(0, 3); // Return top 3 suggestions
} /** * Format conflict details for email/notification */
export function formatConflictForNotification( conflict: CalendarConflict, event1: CalendarEvent, event2: CalendarEvent,
): string { return `
${getSeverityLabel(conflict.severity)} - ${getConflictTypeLabel(conflict.conflict_type)} Event 1: ${event1.title} Time: ${formatDateTime(event1.start_time)} - ${formatTime(event1.end_time)} Location: ${event1.location_room ||"N/A"} Guests: ${event1.guest_count || 0} Event 2: ${event2.title} Time: ${formatDateTime(event2.start_time)} - ${formatTime(event2.end_time)} Location: ${event2.location_room ||"N/A"} Guests: ${event2.guest_count || 0} Details: ${conflict.message} Suggested Actions:
${generateResolutionSuggestions(conflict, event1, event2) .map((s) => `- ${s}`) .join("\n")}
`;
} /** * Check if conflict is urgent (critical severity or same-day) */
export function isUrgentConflict( conflict: CalendarConflict, event1: CalendarEvent, event2: CalendarEvent,
): boolean { // Critical always urgent if (conflict.severity ==="critical") { return true; } // Same day as today const today = new Date().toISOString().split("T")[0]; const eventDate = event1.date || event1.start_time.split("T")[0]; return eventDate === today;
} /** * Deduplicate similar conflicts */
export function deduplicateConflicts( conflicts: CalendarConflict[],
): CalendarConflict[] { const seen = new Set<string>(); const deduped: CalendarConflict[] = []; for (const conflict of conflicts) { const key = [conflict.event_id_1, conflict.event_id_2].sort().join("-"); if (!seen.has(key)) { seen.add(key); deduped.push(conflict); } } return deduped;
} /** * Sort conflicts by severity and urgency */
export function sortConflicts( conflicts: CalendarConflict[], events: Map<string, CalendarEvent>,
): CalendarConflict[] { return [...conflicts].sort((a, b) => { // Critical first if (a.severity ==="critical" && b.severity !=="critical") return -1; if (a.severity !=="critical" && b.severity ==="critical") return 1; // Unresolved first if (!a.resolved_at && b.resolved_at) return -1; if (a.resolved_at && !b.resolved_at) return 1; // Unaknowledged first if (!a.acknowledged_at && b.acknowledged_at) return -1; if (a.acknowledged_at && !b.acknowledged_at) return 1; // Most recent first const timeA = new Date(a.detected_at).getTime(); const timeB = new Date(b.detected_at).getTime(); return timeB - timeA; });
}
