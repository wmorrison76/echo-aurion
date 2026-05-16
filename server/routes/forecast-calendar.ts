/**
 * API endpoint for calendar-based forecast data (Global Calendar events).
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { getOrgContext } from "../lib/org-resolver";
import { calendarService } from "../services/EnterpriseCalendarService";
import { extractCalendarForecastData } from "../services/forecast/calendar-integration";

const router = Router();
router.use(requireAuth);

const QuerySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const orgId = orgContext.orgId;
    const userId = orgContext.userId ?? (req as any).user?.id ?? "system";
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "start and end (YYYY-MM-DD) required" });
    }
    const { start, end } = parsed.data;

    const listEventsFn = async (
      oid: string,
      uid: string,
      filters: { start_date: string; end_date: string },
    ) => {
      const { events } = await calendarService.listEvents(oid, uid, {
        start_date: filters.start_date,
        end_date: filters.end_date,
        limit: 500,
        offset: 0,
      });
      return {
        events: events.map((e: any) => ({
          id: e.id,
          title: e.title,
          start: e.start_time ?? e.start,
          end: e.end_time ?? e.end,
          start_time: e.start_time,
          end_time: e.end_time,
          date: e.date,
          outlet_id: e.outlet_id,
          outletId: e.outlet_id,
          guest_count: e.guest_count,
          metadata: e.metadata,
        })),
      };
    };

    const points = await extractCalendarForecastData(
      orgId,
      { start, end },
      listEventsFn,
      userId,
    );

    return res.json({ success: true, data: points });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message ?? "Internal server error",
    });
  }
});

export default router;
