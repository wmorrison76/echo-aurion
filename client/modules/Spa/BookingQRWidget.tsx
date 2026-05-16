/**
 * BookingQRWidget
 * ---------------
 * Shows the QR code for a hotel's public booking page. Hotel ops can
 * copy the URL, download the PNG/SVG, and embed it on their website.
 */
import React, { useEffect, useState } from "react";
import { Copy, Download, QrCode as QrIcon, ExternalLink } from "lucide-react";

const ACCENT = "#c8a97e";
const BORDER = "rgba(255,255,255,0.08)";
const API = typeof window !== "undefined" ? window.location.origin : "";

export default function BookingQRWidget({ hotelSlug = "sunset-resort" }: { hotelSlug?: string }) {
  const [slug, setSlug] = useState(hotelSlug);
  const [meta, setMeta] = useState<{ url: string; png_base64: string; hotel_slug: string } | null>(null);
  const [svgUrl, setSvgUrl] = useState<string>("");

  const load = async (s: string) => {
    try {
      const r = await fetch(`${API}/api/spa-booking/qr/${s}/meta`);
      if (r.ok) setMeta(await r.json());
      setSvgUrl(`${API}/api/spa-booking/qr/${s}`);
    } catch { /* */ }
  };
  useEffect(() => { load(slug); }, [slug]);

  const copy = () => { if (meta?.url) navigator.clipboard.writeText(meta.url); };
  const downloadPng = () => {
    if (!meta) return;
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${meta.png_base64}`;
    a.download = `spa-booking-${slug}.png`;
    a.click();
  };
  const downloadSvg = () => {
    if (!svgUrl) return;
    window.open(svgUrl + "?download=1", "_blank");
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#0b1020", border: `1px solid ${BORDER}` }} data-testid="booking-qr-widget">
      <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: BORDER }}>
        <QrIcon className="w-4 h-4" style={{ color: ACCENT }} />
        <div>
          <div className="text-[9px] font-mono uppercase tracking-[0.2em]" style={{ color: `${ACCENT}99` }}>Public Booking QR</div>
          <div className="text-[12px] text-white mt-0.5">Print on cards · embed on website · share link</div>
        </div>
      </div>

      <div className="p-5 grid grid-cols-[160px_1fr] gap-5">
        {/* QR image */}
        <div className="rounded-lg p-3 flex items-center justify-center" style={{ background: "#ffffff" }}>
          {meta ? (
            <img src={`data:image/png;base64,${meta.png_base64}`} alt="QR code" className="w-[136px] h-[136px]" data-testid="booking-qr-image" />
          ) : (
            <div className="w-[136px] h-[136px] flex items-center justify-center text-[10px] text-black/30">Loading…</div>
          )}
        </div>
        <div>
          <div className="text-[9px] font-mono uppercase tracking-wider text-white/40 mb-1">Hotel slug</div>
          <input value={slug} onChange={e => setSlug(e.target.value.trim().toLowerCase().replace(/\s+/g, "-"))}
            className="w-full px-3 py-2 rounded text-[12px] text-white bg-transparent outline-none font-mono"
            style={{ border: `1px solid ${BORDER}` }} data-testid="booking-qr-slug" />
          <div className="text-[9px] text-white/30 mt-1">e.g. sunset-resort, la-casona, aventura-beach</div>

          {meta && (
            <>
              <div className="text-[9px] font-mono uppercase tracking-wider text-white/40 mb-1 mt-3">Public URL</div>
              <div className="flex items-center gap-1">
                <div className="flex-1 px-3 py-2 rounded text-[11px] text-white/70 font-mono overflow-hidden text-ellipsis whitespace-nowrap"
                  style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${BORDER}` }}>
                  {meta.url}
                </div>
                <button onClick={copy} className="p-2 rounded" title="Copy"
                  style={{ background: `${ACCENT}12`, color: ACCENT, border: `1px solid ${ACCENT}30` }} data-testid="booking-qr-copy">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <a href={meta.url} target="_blank" rel="noreferrer" className="p-2 rounded" title="Open"
                  style={{ background: `${ACCENT}12`, color: ACCENT, border: `1px solid ${ACCENT}30` }}>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button onClick={downloadPng}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-[10px] font-medium"
                  style={{ background: ACCENT, color: "#0b1020" }} data-testid="booking-qr-download-png">
                  <Download className="w-3 h-3" /> PNG
                </button>
                <button onClick={downloadSvg}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-[10px] font-medium"
                  style={{ background: `${ACCENT}15`, color: ACCENT, border: `1px solid ${ACCENT}30` }}>
                  <Download className="w-3 h-3" /> SVG (print)
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
