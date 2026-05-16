import { useState, useEffect } from "react";
import type { CamState } from "@/lib/camera";
export interface CameraBookmarkData extends CamState {
  slot: number;
  id?: string;
}
export function useCameraBookmarks(session: string) {
  const [bookmarks, setBookmarks] = useState<
    Record<number, CameraBookmarkData>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false); // Load bookmarks on mount useEffect(() => { const loadBookmarks = async () => { try { setLoading(true); const response = await fetch( `/api/studio/bookmarks/${encodeURIComponent(session)}` ); if (response.ok) { const data = await response.json(); const bookmarkMap: Record<number, CameraBookmarkData> = {}; data.forEach((b: any) => { bookmarkMap[b.slot] = { pos: [b.pos_x, b.pos_y, b.pos_z], target: [b.target_x, b.target_y, b.target_z], slot: b.slot, id: b.id, }; }); setBookmarks(bookmarkMap); } } catch (err) { console.error("Failed to load bookmarks:", err); } finally { setLoading(false); } }; loadBookmarks(); }, [session]); const saveBookmark = async (slot: number, state: CamState) => { try { setSaving(true); const response = await fetch("/api/studio/bookmarks", { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ session, slot, pos_x: state.pos[0], pos_y: state.pos[1], pos_z: state.pos[2], target_x: state.target[0], target_y: state.target[1], target_z: state.target[2], }), }); if (response.ok) { const { bookmark } = await response.json(); setBookmarks((prev) => ({ ...prev, [slot]: { pos: state.pos, target: state.target, slot, id: bookmark?.id, }, })); return true; } return false; } catch (err) { console.error("Failed to save bookmark:", err); return false; } finally { setSaving(false); } }; const getBookmark = (slot: number): CameraBookmarkData | null => { return bookmarks[slot] || null; }; const hasSavedSlots = (): number[] => { return Object.keys(bookmarks).map(Number); }; return { bookmarks, loading, saving, saveBookmark, getBookmark, hasSavedSlots, };
}
