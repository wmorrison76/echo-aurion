import { Router } from 'express';
import { getSupabase } from '../lib/supabase';

export const scheduleRouter = Router();

scheduleRouter.post('/upsert', async (req, res) => {
  const supa = getSupabase();
  if (!supa) return res.status(503).json({ error: 'Supabase not configured' });
  const { outlet, weekStartISO, data } = req.body || {};
  if (!outlet || !weekStartISO || !data) return res.status(400).json({ error: 'outlet, weekStartISO, data required' });
  const week = weekStartISO.slice(0,10);
  const row = { outlet, week_start: week, data };
  const { error } = await supa.from('schedules').upsert(row, { onConflict: 'outlet,week_start' });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

scheduleRouter.get('/get', async (req, res) => {
  const supa = getSupabase();
  if (!supa) return res.status(503).json({ error: 'Supabase not configured' });
  const outlet = String(req.query.outlet||'');
  const weekStartISO = String(req.query.weekStartISO||'');
  if (!outlet || !weekStartISO) return res.status(400).json({ error: 'outlet and weekStartISO required' });
  const week = weekStartISO.slice(0,10);
  const { data, error } = await supa.from('schedules').select('*').eq('outlet', outlet).eq('week_start', week).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, record: data });
});
