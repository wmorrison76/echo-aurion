/** * Helper to build an event-detail path or URL. * * Adjust the implementation to match your routing: * - For React Router: `/events/${eventId}` * - For Next.js: `/events/${eventId}` * - Or return an absolute URL if needed. */
export function getEventDetailPath(eventId: string): string {
  return `/events/${eventId}`;
}
