import { Router, Request, Response } from "express";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
export const eventStudio = Router(); // Lazy-load Supabase client
let supabase: SupabaseClient | null = null;
function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "Supabase credentials are not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.",
      );
    }
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}
interface EventCreatePayload {
  name: string;
  date: string;
  session: string;
  variantId?: string;
}
eventStudio.post(
  "/events/create",
  async (req: Request<unknown, unknown, EventCreatePayload>, res: Response) => {
    try {
      const { name, date, session, variantId } = req.body || {};
      if (!name || !session) {
        res.status(400).json({ error: "name and session required" });
        return;
      }
      const eventId = `EVT-${Date.now()}`;
      const { data, error } = await getSupabaseClient()
        .from("studio_events")
        .insert({
          event_id: eventId,
          name,
          date: date || new Date().toISOString().split("T")[0],
          session,
          variant_id: variantId,
        })
        .select();
      if (error) {
        console.error("Supabase insert error:", error);
        res.status(500).json({ error: error.message });
        return;
      }
      res.json({ ok: true, event: data?.[0] });
    } catch (err) {
      console.error("Event create error:", err);
      res.status(500).json({ error: "Failed to create event" });
    }
  },
);
eventStudio.get("/events/by-session", async (req: Request, res: Response) => {
  try {
    const session = String(req.query.session || "default");
    const { data, error } = await getSupabaseClient()
      .from("studio_events")
      .select("*")
      .eq("session", session)
      .order("created_at", { ascending: false });
    if (error) {
      const errorMessage = error?.message || JSON.stringify(error);
      console.error("Supabase query error:", errorMessage);
      res.status(500).json({ error: errorMessage });
      return;
    }
    res.json(data || []);
  } catch (err) {
    console.error("Event query error:", err);
    res.status(500).json({ error: "Failed to query events" });
  }
});
eventStudio.get("/events/:eventId", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { data, error } = await getSupabaseClient()
      .from("studio_events")
      .select("*")
      .eq("event_id", eventId)
      .single();
    if (error || !data) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    res.json(data);
  } catch (err) {
    console.error("Event get error:", err);
    res.status(500).json({ error: "Failed to fetch event" });
  }
});
eventStudio.delete("/events/:eventId", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { error } = await getSupabaseClient()
      .from("studio_events")
      .delete()
      .eq("event_id", eventId);
    if (error) {
      console.error("Supabase delete error:", error);
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Event delete error:", err);
    res.status(500).json({ error: "Failed to delete event" });
  }
});
