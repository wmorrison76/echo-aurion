// ============================
// 1. /src/contracts/events/Order.v1.ts
// ============================
import { z } from "zod";

export const OrderV1 = z.object({
_version: z.literal(1),
eventId: z.string().uuid(),
outletId: z.string(),
checkId: z.string(),
ts: z.number(), // epoch ms
guestId: z.string().nullable(),
items: z.array(
z.object({
sku: z.string(),
name: z.string(),
qty: z.number(),
price: z.number(),
})
),
total: z.number(),
paymentMethod: z.enum(["card", "cash", "house", "other"]).nullable(),
source: z.enum(["pos", "mobile", "kiosk"]),
});

export type OrderV1 = z.infer<any>;