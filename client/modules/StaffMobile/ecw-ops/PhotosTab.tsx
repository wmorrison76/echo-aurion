/** iter224 · Food Photos tab — capture → Sonnet auto-name → chef confirm. */
import React from "react";
import { API } from "@/lib/api-url";

export function PhotosTab({ outletId }: { outletId: string }) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = React.useState<any[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [stations, setStations] = React.useState<any[]>([]);
  const [items, setItems] = React.useState<any[]>([]);
  const [stationId, setStationId] = React.useState("");
  const [itemId, setItemId] = React.useState("");

  React.useEffect(() => {
    void loadAll();
  }, [outletId]);

  async function loadAll() {
    const [p, s, i] = await Promise.all([
      fetch(`${API()}/api/ecw-ops/photos?outlet_id=${outletId}`).then((r) => r.json()),
      fetch(`${API()}/api/ecw-ops/stations?outlet_id=${outletId}`).then((r) => r.json()),
      fetch(`${API()}/api/ecw-ops/items?outlet_id=${outletId}`).then((r) => r.json()),
    ]);
    setPhotos(p?.rows || []);
    setStations(s?.rows || []);
    setItems(i?.rows || []);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const b64 = await fileToBase64(f);
      const r = await fetch(`${API()}/api/ecw-ops/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": "chef-william" },
        body: JSON.stringify({
          outlet_id: outletId,
          station_id: stationId || null,
          item_id: itemId || null,
          media_base64: b64,
        }),
      }).then((r) => r.json());
      if (r.ok) await loadAll();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function confirmPhoto(p: any, label: string) {
    const r = await fetch(`${API()}/api/ecw-ops/photos/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, confirmed: true }),
    }).then((r) => r.json());
    if (r.ok) await loadAll();
  }

  return (
    <div data-testid="photos-root" style={{ padding: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Food Photos</h2>
      <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
        Capture → Sonnet auto-names → confirm → stored with station + item tag.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        <select data-testid="photos-station-select" value={stationId} onChange={(e) => setStationId(e.target.value)}
          style={{ padding: "10px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 4, color: "#f5efe4", fontSize: 13 }}>
          <option value="">— Any station —</option>
          {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select data-testid="photos-item-select" value={itemId} onChange={(e) => setItemId(e.target.value)}
          style={{ padding: "10px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 4, color: "#f5efe4", fontSize: 13 }}>
          <option value="">— Any item —</option>
          {items.filter((it) => !stationId || it.station_id === stationId)
                .map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
        </select>
        <button data-testid="photos-capture-btn" onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            padding: 14, background: "rgba(200,169,126,0.15)",
            border: "1px solid rgba(200,169,126,0.4)", borderRadius: 8,
            color: "#c8a97e", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>
          {uploading ? "📷 Uploading & naming…" : "📷 Capture / upload photo"}
        </button>
        <input ref={fileRef} data-testid="photos-file-input" type="file"
          accept="image/*" capture="environment"
          style={{ display: "none" }} onChange={handleFile} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
        {photos.length === 0 && (
          <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "#64748b", textAlign: "center", padding: 24 }}>
            No photos yet. Take a photo to start building your visual menu.
          </div>
        )}
        {photos.map((p) => (
          <PhotoCard key={p.id} photo={p} onConfirm={(label) => void confirmPhoto(p, label)} />
        ))}
      </div>
    </div>
  );
}

function PhotoCard({ photo, onConfirm }: { photo: any; onConfirm: (label: string) => void }) {
  const [editLabel, setEditLabel] = React.useState(photo.label);
  const [editing, setEditing] = React.useState(false);
  return (
    <div data-testid={`photo-${photo.id}`} style={{
      borderRadius: 6, overflow: "hidden",
      border: `1px solid ${photo.confirmed ? "rgba(16,185,129,0.3)" : "rgba(251,191,36,0.3)"}`,
      background: "rgba(0,0,0,0.3)",
    }}>
      {photo.blob_url && (
        <img src={photo.blob_url} alt={photo.label}
          style={{ width: "100%", height: 100, objectFit: "cover" }} />
      )}
      <div style={{ padding: 8 }}>
        {!editing ? (
          <>
            <div style={{ fontSize: 12, color: "#f5efe4" }}>{photo.label}</div>
            {photo.auto_name && !photo.confirmed && (
              <div style={{ fontSize: 9, color: "#fbbf24", marginTop: 2 }}>🤖 Auto-named · tap to confirm</div>
            )}
            {photo.confirmed && <div style={{ fontSize: 9, color: "#10b981", marginTop: 2 }}>✓ Confirmed</div>}
            <button data-testid={`photo-edit-${photo.id}`} onClick={() => setEditing(true)}
              style={{ marginTop: 6, width: "100%", padding: "4px 6px", background: "transparent", border: "1px solid rgba(200,169,126,0.3)", borderRadius: 4, color: "#c8a97e", fontSize: 10, cursor: "pointer" }}>
              Edit / confirm
            </button>
          </>
        ) : (
          <>
            <input data-testid={`photo-label-${photo.id}`} value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              style={{ width: "100%", padding: "4px 6px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(200,169,126,0.3)", borderRadius: 3, color: "#f5efe4", fontSize: 11 }} />
            <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
              <button data-testid={`photo-confirm-${photo.id}`} onClick={() => { onConfirm(editLabel); setEditing(false); }}
                style={{ flex: 1, padding: "4px 6px", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 3, color: "#10b981", fontSize: 10, cursor: "pointer" }}>
                ✓ Confirm
              </button>
              <button onClick={() => { setEditing(false); setEditLabel(photo.label); }}
                style={{ padding: "4px 6px", background: "transparent", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 3, color: "#94a3b8", fontSize: 10, cursor: "pointer" }}>
                ✕
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
