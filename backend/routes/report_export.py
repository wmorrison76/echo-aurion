"""
Universal Report Export Engine
================================
Export any report to PDF, Excel (XLSX), CSV with configurable:
- Paper size (Letter, A4, Legal, Tabloid)
- Margins (normal, narrow, wide, custom)
- Orientation (portrait, landscape)
"""
import io
import csv
import json
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from typing import Optional, Dict, List, Any

from database import db

router = APIRouter(prefix="/api/export", tags=["export"])

_now = lambda: datetime.now(timezone.utc).isoformat()

PAPER_SIZES = {
    "letter": {"width": "8.5in", "height": "11in"},
    "a4": {"width": "210mm", "height": "297mm"},
    "legal": {"width": "8.5in", "height": "14in"},
    "tabloid": {"width": "11in", "height": "17in"},
}

MARGIN_PRESETS = {
    "normal": {"top": "1in", "right": "1in", "bottom": "1in", "left": "1in"},
    "narrow": {"top": "0.5in", "right": "0.5in", "bottom": "0.5in", "left": "0.5in"},
    "wide": {"top": "1in", "right": "1.5in", "bottom": "1in", "left": "1.5in"},
}


class ExportRequest(BaseModel):
    report_type: str  # pnl, invoice, budget, daily_flash, vendor_comparison, outlet_health, gl_drilldown
    format: str = "pdf"  # pdf, xlsx, csv
    paper_size: str = "letter"
    orientation: str = "portrait"  # portrait, landscape
    margins: str = "normal"  # normal, narrow, wide
    custom_margins: Optional[Dict[str, str]] = None
    filters: Optional[Dict[str, Any]] = None
    title: Optional[str] = None


def _build_css(paper_size, orientation, margins, custom_margins):
    ps = PAPER_SIZES.get(paper_size, PAPER_SIZES["letter"])
    mg = custom_margins or MARGIN_PRESETS.get(margins, MARGIN_PRESETS["normal"])
    w, h = (ps["height"], ps["width"]) if orientation == "landscape" else (ps["width"], ps["height"])
    return f"""
    @page {{ size: {w} {h}; margin: {mg.get('top','1in')} {mg.get('right','1in')} {mg.get('bottom','1in')} {mg.get('left','1in')}; }}
    @media print {{ body {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }} }}
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{ font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10px; color: #1e293b; line-height: 1.4; }}
    .header {{ border-bottom: 2px solid #c8a97e; padding-bottom: 10px; margin-bottom: 16px; }}
    .header h1 {{ font-size: 18px; font-weight: 300; letter-spacing: 2px; color: #1e293b; }}
    .header .sub {{ font-size: 10px; color: #64748b; margin-top: 4px; }}
    .meta {{ display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 9px; color: #94a3b8; }}
    table {{ width: 100%; border-collapse: collapse; margin-bottom: 14px; }}
    th {{ padding: 6px 8px; text-align: left; font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }}
    td {{ padding: 5px 8px; border-bottom: 1px solid #f1f5f9; font-size: 9px; }}
    .mono {{ font-family: 'Courier New', monospace; }}
    .right {{ text-align: right; }}
    .section {{ margin-bottom: 16px; }}
    .section h2 {{ font-size: 12px; font-weight: 600; color: #1e293b; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }}
    .kpi-row {{ display: flex; gap: 16px; margin-bottom: 12px; }}
    .kpi {{ flex: 1; padding: 8px 10px; background: #f8fafc; border-radius: 4px; border: 1px solid #e2e8f0; }}
    .kpi-label {{ font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; }}
    .kpi-value {{ font-size: 16px; font-weight: 600; color: #1e293b; font-family: 'Courier New', monospace; }}
    .kpi-sub {{ font-size: 8px; color: #94a3b8; }}
    .alert {{ padding: 6px 10px; margin-bottom: 4px; border-radius: 3px; font-size: 9px; }}
    .alert-critical {{ background: #fef2f2; border-left: 3px solid #ef4444; color: #991b1b; }}
    .alert-warning {{ background: #fffbeb; border-left: 3px solid #f59e0b; color: #92400e; }}
    .footer {{ margin-top: 20px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 8px; color: #94a3b8; display: flex; justify-content: space-between; }}
    """


def _fmt(n):
    if not n and n != 0:
        return "$0"
    return f"${abs(n):,.0f}" if abs(n) >= 1 else "$0"


def _wrap_html(body, title, css):
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><title>{title}</title><style>{css}</style></head><body>
    <div class="header"><h1>{title}</h1><div class="sub">LUCCCA Enterprise Hospitality Framework</div></div>
    <div class="meta"><span>Generated: {datetime.now(timezone.utc).strftime('%B %d, %Y %H:%M UTC')}</span><span>Confidential</span></div>
    {body}
    <div class="footer"><span>LUCCCA Enterprise &copy; {datetime.now().year}</span><span>Powered by EchoAi&sup3;</span></div>
    </body></html>"""


# ── Report Generators ──

def _generate_pnl_report(filters):
    gl = list(db["gl_entries"].find({}, {"_id": 0}).limit(2000))
    total_rev = sum(e["amount"] for e in gl if e.get("entry_type") == "revenue")
    food_cogs = sum(e["amount"] for e in gl if e.get("gl_code") == "5000")
    bev_cogs = sum(e["amount"] for e in gl if e.get("gl_code") == "5100")
    labor_boh = sum(e["amount"] for e in gl if e.get("gl_code") == "6000")
    labor_foh = sum(e["amount"] for e in gl if e.get("gl_code") == "6010")
    labor_mgmt = sum(e["amount"] for e in gl if e.get("gl_code") == "6020")
    labor_ben = sum(e["amount"] for e in gl if e.get("gl_code") == "6050")
    rent = sum(e["amount"] for e in gl if e.get("gl_code") == "7000")
    util = sum(e["amount"] for e in gl if e.get("gl_code") == "7500")
    mkt = sum(e["amount"] for e in gl if e.get("gl_code") == "8000")
    maint = sum(e["amount"] for e in gl if e.get("gl_code") == "8500")
    ins = sum(e["amount"] for e in gl if e.get("gl_code") == "7200")
    total_exp = sum(e["amount"] for e in gl if e.get("entry_type") == "expense")

    lines = [
        ("Revenue", "", total_rev, ""),
        ("Food Cost of Sales", "5000", food_cogs, f"{food_cogs/total_rev*100:.1f}%" if total_rev else ""),
        ("Beverage Cost of Sales", "5100", bev_cogs, f"{bev_cogs/total_rev*100:.1f}%" if total_rev else ""),
        ("Gross Profit", "", total_rev - food_cogs - bev_cogs, f"{(total_rev-food_cogs-bev_cogs)/total_rev*100:.1f}%" if total_rev else ""),
        ("Kitchen/BOH Labor", "6000", labor_boh, ""),
        ("FOH Service Labor", "6010", labor_foh, ""),
        ("Management Salary", "6020", labor_mgmt, ""),
        ("Benefits & Insurance", "6050", labor_ben, ""),
        ("Total Labor", "", labor_boh+labor_foh+labor_mgmt+labor_ben, f"{(labor_boh+labor_foh+labor_mgmt+labor_ben)/total_rev*100:.1f}%" if total_rev else ""),
        ("Rent & Occupancy", "7000", rent, ""),
        ("Utilities", "7500", util, ""),
        ("Marketing", "8000", mkt, ""),
        ("Repairs & Maintenance", "8500", maint, ""),
        ("Insurance", "7200", ins, ""),
        ("Total Expenses", "", total_exp, ""),
        ("EBITDA", "", total_rev - total_exp, f"{(total_rev-total_exp)/total_rev*100:.1f}%" if total_rev else ""),
    ]

    rows = ""
    for name, gl_code, amount, pct in lines:
        bold = "font-weight:600;" if name in ("Revenue", "Gross Profit", "Total Labor", "Total Expenses", "EBITDA") else ""
        bg = "background:#f8fafc;" if name in ("Revenue", "Gross Profit", "Total Labor", "Total Expenses", "EBITDA") else ""
        rows += f'<tr style="{bold}{bg}"><td>{name}</td><td class="mono">{gl_code}</td><td class="mono right">{_fmt(amount)}</td><td class="mono right">{pct}</td></tr>'

    return f"""
    <div class="section"><h2>Profit & Loss Statement</h2>
    <table><thead><tr><th>Account</th><th>GL Code</th><th class="right">Amount</th><th class="right">% Rev</th></tr></thead><tbody>{rows}</tbody></table></div>"""


def _generate_invoice_report(filters):
    invoices = list(db["invoices"].find({}, {"_id": 0}).sort("invoice_date", -1).limit(100))
    rows = ""
    total = 0
    for inv in invoices:
        total += inv.get("total", 0)
        rows += f'<tr><td class="mono">{inv.get("invoice_number","")}</td><td>{inv.get("vendor_name","")}</td><td class="mono">{inv.get("invoice_date","")}</td><td class="mono">{inv.get("due_date","")}</td><td class="mono right">{_fmt(inv.get("total",0))}</td><td>{inv.get("status","")}</td></tr>'

    return f"""
    <div class="section"><h2>Invoice Register</h2>
    <div class="kpi-row"><div class="kpi"><div class="kpi-label">Total Invoices</div><div class="kpi-value">{len(invoices)}</div></div>
    <div class="kpi"><div class="kpi-label">Total Amount</div><div class="kpi-value">{_fmt(total)}</div></div></div>
    <table><thead><tr><th>Invoice #</th><th>Vendor</th><th>Date</th><th>Due</th><th class="right">Total</th><th>Status</th></tr></thead><tbody>{rows}</tbody></table></div>"""


def _generate_budget_report(filters):
    budget = db["budgets"].find_one({}, {"_id": 0}, sort=[("created_at", -1)])
    if not budget:
        return "<p>No budget data available</p>"

    rows = ""
    for m in range(1, 13):
        mm = budget["months"].get(str(m), {})
        rev = mm.get("revenue", {}).get("total", 0)
        ebitda = mm.get("ebitda", 0)
        margin = mm.get("ebitda_margin_pct", 0)
        covers = mm.get("drivers", {}).get("covers", 0)
        rows += f'<tr><td>{mm.get("month_name","")}</td><td class="mono right">{_fmt(rev)}</td><td class="mono right">{_fmt(ebitda)}</td><td class="mono right">{margin}%</td><td class="mono right">{covers:,}</td></tr>'

    ann = budget.get("annual", {})
    return f"""
    <div class="section"><h2>{budget.get("name","Budget")} — Annual Summary</h2>
    <div class="kpi-row">
    <div class="kpi"><div class="kpi-label">Annual Revenue</div><div class="kpi-value">{_fmt(ann.get("revenue",0))}</div></div>
    <div class="kpi"><div class="kpi-label">EBITDA</div><div class="kpi-value">{_fmt(ann.get("ebitda",0))}</div><div class="kpi-sub">{ann.get("ebitda_margin_pct",0)}% margin</div></div>
    <div class="kpi"><div class="kpi-label">Food Cost</div><div class="kpi-value">{ann.get("food_cost_pct",0)}%</div></div>
    <div class="kpi"><div class="kpi-label">Labor</div><div class="kpi-value">{ann.get("labor_pct",0)}%</div></div>
    </div>
    <table><thead><tr><th>Month</th><th class="right">Revenue</th><th class="right">EBITDA</th><th class="right">Margin</th><th class="right">Covers</th></tr></thead><tbody>{rows}</tbody></table></div>"""


def _generate_daily_flash_report(filters):
    pos_txns = list(db["pos_transactions"].find({}, {"_id": 0}).limit(5000))
    dates = sorted(set(t.get("closed_at", "")[:10] for t in pos_txns if t.get("closed_at")), reverse=True)
    latest = dates[0] if dates else ""
    y_txns = [t for t in pos_txns if t.get("closed_at", "").startswith(latest)]
    y_rev = sum(t.get("subtotal", 0) for t in y_txns)
    y_covers = sum(t.get("guest_count", 0) for t in y_txns)
    y_fc = sum(t.get("food_cost_total", 0) for t in y_txns)
    mtd_rev = sum(t.get("subtotal", 0) for t in pos_txns)
    mtd_covers = sum(t.get("guest_count", 0) for t in pos_txns)

    return f"""
    <div class="section"><h2>Daily Flash Report — {latest}</h2>
    <div class="kpi-row">
    <div class="kpi"><div class="kpi-label">Yesterday Revenue</div><div class="kpi-value">{_fmt(y_rev)}</div></div>
    <div class="kpi"><div class="kpi-label">Covers</div><div class="kpi-value">{y_covers}</div></div>
    <div class="kpi"><div class="kpi-label">Food Cost %</div><div class="kpi-value">{y_fc/max(y_rev,1)*100:.1f}%</div></div>
    <div class="kpi"><div class="kpi-label">Avg Check</div><div class="kpi-value">{_fmt(y_rev/max(len(y_txns),1))}</div></div>
    </div>
    <div class="kpi-row">
    <div class="kpi"><div class="kpi-label">MTD Revenue</div><div class="kpi-value">{_fmt(mtd_rev)}</div></div>
    <div class="kpi"><div class="kpi-label">MTD Covers</div><div class="kpi-value">{mtd_covers:,}</div></div>
    <div class="kpi"><div class="kpi-label">MTD Txns</div><div class="kpi-value">{len(pos_txns):,}</div></div>
    </div></div>"""


def _generate_vendor_report(filters):
    invoices = list(db["invoices"].find({}, {"_id": 0}).limit(500))
    vendor_spend = {}
    for inv in invoices:
        vn = inv.get("vendor_name", "Unknown")
        if vn not in vendor_spend:
            vendor_spend[vn] = {"vendor": vn, "count": 0, "total": 0, "category": inv.get("vendor_category", "")}
        vendor_spend[vn]["count"] += 1
        vendor_spend[vn]["total"] += inv.get("total", 0)

    vendors = sorted(vendor_spend.values(), key=lambda x: x["total"], reverse=True)
    rows = ""
    for v in vendors:
        rows += f'<tr><td>{v["vendor"]}</td><td>{v["category"]}</td><td class="mono right">{v["count"]}</td><td class="mono right">{_fmt(v["total"])}</td></tr>'

    return f"""
    <div class="section"><h2>Vendor Spend Analysis</h2>
    <table><thead><tr><th>Vendor</th><th>Category</th><th class="right">Invoices</th><th class="right">Total Spend</th></tr></thead><tbody>{rows}</tbody></table></div>"""


def _generate_outlet_health_report(filters):
    from routes.executive_command import _compute_outlet_metrics, OUTLETS

    rows = ""
    for oid, info in OUTLETS.items():
        metrics = _compute_outlet_metrics(oid)
        if not metrics:
            rows += f'<tr><td>{info["name"]}</td><td>{info["type"]}</td><td colspan="5" style="color:#94a3b8">No data</td></tr>'
            continue
        rows += f'<tr><td>{info["name"]}</td><td>{info["type"]}</td><td class="mono right">{_fmt(metrics["revenue"])}</td><td class="mono right">{metrics["food_cost_pct"]}%</td><td class="mono right">{_fmt(metrics["avg_check"])}</td><td class="mono right">{metrics["covers"]}</td><td class="mono right">{metrics["waste_pct"]}%</td></tr>'

    return f"""
    <div class="section"><h2>Outlet Health Report</h2>
    <table><thead><tr><th>Outlet</th><th>Type</th><th class="right">Revenue</th><th class="right">FC%</th><th class="right">Avg Check</th><th class="right">Covers</th><th class="right">Waste%</th></tr></thead><tbody>{rows}</tbody></table></div>"""


REPORT_GENERATORS = {
    "pnl": _generate_pnl_report,
    "invoice": _generate_invoice_report,
    "budget": _generate_budget_report,
    "daily_flash": _generate_daily_flash_report,
    "vendor_comparison": _generate_vendor_report,
    "outlet_health": _generate_outlet_health_report,
}


# ── Export Endpoints ──

@router.post("/report")
async def export_report(req: ExportRequest):
    """Export any report to PDF (HTML), XLSX, or CSV."""
    generator = REPORT_GENERATORS.get(req.report_type)
    if not generator:
        return {"error": f"Unknown report: {req.report_type}", "available": list(REPORT_GENERATORS.keys())}

    title = req.title or f"LUCCCA {req.report_type.replace('_', ' ').title()} Report"

    if req.format == "pdf":
        css = _build_css(req.paper_size, req.orientation, req.margins, req.custom_margins)
        body = generator(req.filters or {})
        html = _wrap_html(body, title, css)
        return Response(
            content=html, media_type="text/html",
            headers={"Content-Disposition": f'inline; filename="{req.report_type}_report.html"'},
        )

    elif req.format == "csv":
        data = _get_report_data(req.report_type, req.filters or {})
        output = io.StringIO()
        if data:
            writer = csv.DictWriter(output, fieldnames=data[0].keys())
            writer.writeheader()
            writer.writerows(data)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{req.report_type}_export.csv"'},
        )

    elif req.format == "xlsx":
        data = _get_report_data(req.report_type, req.filters or {})
        # Build simple XLSX-compatible CSV (tab-separated for Excel)
        output = io.StringIO()
        if data:
            writer = csv.DictWriter(output, fieldnames=data[0].keys(), dialect="excel-tab")
            writer.writeheader()
            writer.writerows(data)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="application/vnd.ms-excel",
            headers={"Content-Disposition": f'attachment; filename="{req.report_type}_export.xls"'},
        )

    return {"error": f"Unsupported format: {req.format}"}


def _get_report_data(report_type, filters):
    """Get structured data for CSV/Excel export."""
    if report_type == "pnl":
        gl = list(db["gl_entries"].find({}, {"_id": 0}).limit(2000))
        return [{"date": e.get("date"), "gl_code": e.get("gl_code"), "gl_name": e.get("gl_name"),
                 "type": e.get("entry_type"), "amount": e.get("amount"), "source": e.get("source")} for e in gl]
    elif report_type == "invoice":
        return [{"invoice_number": i.get("invoice_number"), "vendor": i.get("vendor_name"),
                 "date": i.get("invoice_date"), "due": i.get("due_date"), "total": i.get("total"),
                 "status": i.get("status"), "category": i.get("category")}
                for i in db["invoices"].find({}, {"_id": 0}).sort("invoice_date", -1).limit(500)]
    elif report_type == "budget":
        budget = db["budgets"].find_one({}, {"_id": 0}, sort=[("created_at", -1)])
        if not budget:
            return []
        return [{"month": m.get("month_name"), "revenue": m.get("revenue", {}).get("total"),
                 "food_cost": m.get("cost_of_sales", {}).get("food"), "bev_cost": m.get("cost_of_sales", {}).get("beverage"),
                 "labor": m.get("labor", {}).get("total"), "ebitda": m.get("ebitda"),
                 "margin_pct": m.get("ebitda_margin_pct"), "covers": m.get("drivers", {}).get("covers")}
                for m in budget.get("months", {}).values()]
    elif report_type == "vendor_comparison":
        from routes.vendor_intelligence import _build_price_index
        idx = _build_price_index()
        rows = []
        for item, vendors in idx.items():
            for vn, purchases in vendors.items():
                rows.append({"item": item, "vendor": vn, "latest_price": purchases[0]["price"],
                             "unit": purchases[0]["unit"], "purchase_count": len(purchases)})
        return rows
    return []


@router.get("/formats")
async def available_formats():
    """List available export formats and report types."""
    return {
        "formats": ["pdf", "csv", "xlsx"],
        "report_types": list(REPORT_GENERATORS.keys()),
        "paper_sizes": list(PAPER_SIZES.keys()),
        "orientations": ["portrait", "landscape"],
        "margin_presets": list(MARGIN_PRESETS.keys()),
    }
