//src/contracts/events/Reservation.v1.ts
// ============================
import { z } from "zod";

export const ReservationV1 = z.object({
_version: z.literal(1),
eventId: z.string().uuid(),
reservationId: z.string(),
outletId: z.string(),
guestName: z.string(),
guestCount: z.number(),
ts: z.number(),
status: z.enum(["confirmed", "seated", "cancelled"]),
});

export type ReservationV1 = z.infer<any>;