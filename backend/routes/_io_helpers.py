"""
Echo AURION · Shared utilities (iter263.5)

  - qr_png(url) → base64 PNG QR (real, scannable, not SVG)
  - print_ticket(ticket_text, printer_id?) → routes to a real network printer
    via env config; gracefully falls back to "stored ticket" mode in dev.
"""
from __future__ import annotations
import base64
import io
import os
import socket
from datetime import datetime, timezone
from typing import Tuple, Optional

try:
    import qrcode
    from qrcode.image.pil import PilImage
    HAS_QR = True
except Exception:
    HAS_QR = False


def qr_png(url: str, box_size: int = 8, border: int = 2) -> Tuple[str, str]:
    """Return (data_url, raw_b64). Falls back to a tiny SVG if pillow/qrcode
    are unavailable so the endpoint never breaks."""
    if not HAS_QR:
        svg = (
            f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='220' height='220'>"
            f"<rect width='100' height='100' fill='white'/>"
            f"<text x='50' y='50' text-anchor='middle' font-size='5' fill='#222'>{url[:30]}</text>"
            f"</svg>"
        )
        b64 = base64.b64encode(svg.encode()).decode()
        return f"data:image/svg+xml;base64,{b64}", b64
    img = qrcode.make(
        url,
        box_size=box_size,
        border=border,
        image_factory=PilImage,
    )
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    raw = buf.getvalue()
    b64 = base64.b64encode(raw).decode()
    return f"data:image/png;base64,{b64}", b64


# ════════════════════ PRINTER ADAPTER ════════════════════

def print_ticket(ticket_text: str, printer_id: str = "main-kitchen") -> dict:
    """Route to a real printer. Configurable via env:
       - PRINTER_<id>_HOST    e.g. 192.168.10.55
       - PRINTER_<id>_PORT    default 9100 (raw socket / Epson ESC/POS)
       - PRINTER_<id>_TIMEOUT default 4 (seconds)
    Falls back to stored-ticket mode if not configured.
    """
    key = printer_id.upper().replace("-", "_")
    host = os.environ.get(f"PRINTER_{key}_HOST")
    port = int(os.environ.get(f"PRINTER_{key}_PORT", "9100"))
    timeout = float(os.environ.get(f"PRINTER_{key}_TIMEOUT", "4"))

    if not host:
        return {
            "delivered": False,
            "mode": "stored",
            "printer_id": printer_id,
            "reason": (
                f"PRINTER_{key}_HOST not set in backend/.env. Ticket stored — "
                f"add `PRINTER_{key}_HOST=<ip>` (and optional `_PORT`, `_TIMEOUT`) to enable real printing."
            ),
            "ticket": ticket_text,
            "ts": datetime.now(timezone.utc).isoformat(),
        }

    try:
        with socket.create_connection((host, port), timeout=timeout) as sock:
            # ESC/POS: clear + bold + cut at end
            payload = b"\x1b@" + ticket_text.encode("utf-8", "ignore") + b"\n\n\n\x1di"
            sock.sendall(payload)
        return {
            "delivered": True,
            "mode": "raw-socket",
            "printer_id": printer_id,
            "host": host, "port": port,
            "ts": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        return {
            "delivered": False,
            "mode": "error",
            "printer_id": printer_id,
            "host": host, "port": port,
            "reason": f"{type(e).__name__}: {str(e)[:160]}",
            "ts": datetime.now(timezone.utc).isoformat(),
        }
