import { useState, useEffect } from "react";
export interface AnnotationData {
  id?: string;
  session: string;
  camera_slot: number;
  text: string;
  created_at?: string;
}
export function useAnnotations(session: string) {
  const [annotations, setAnnotations] = useState<AnnotationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false); // Load annotations on mount useEffect(() => { const loadAnnotations = async () => { try { setLoading(true); const response = await fetch( `/api/studio/annotations/${encodeURIComponent(session)}` ); if (response.ok) { const data = await response.json(); setAnnotations(data); } } catch (err) { console.error("Failed to load annotations:", err); } finally { setLoading(false); } }; loadAnnotations(); }, [session]); const saveAnnotation = async ( text: string, cameraSlot: number = 0 ): Promise<boolean> => { try { setSaving(true); const response = await fetch("/api/studio/annotations", { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ session, camera_slot: cameraSlot, text, }), }); if (response.ok) { const { annotation } = await response.json(); setAnnotations((prev) => [annotation, ...prev]); return true; } return false; } catch (err) { console.error("Failed to save annotation:", err); return false; } finally { setSaving(false); } }; const getAnnotationsForSlot = (slot: number): AnnotationData[] => { return annotations.filter((a) => a.camera_slot === slot); }; return { annotations, loading, saving, saveAnnotation, getAnnotationsForSlot, };
}
