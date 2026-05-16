/** iter254 · VendorSkuAutocomplete — drop-in dropdown that surfaces vendor
 *  SKU matches as the user types an ingredient. On click, the parent receives
 *  a populated row: { item, qty(="1"), unit, cost, vendor, item_code }.
 *
 *  Used inline by all three recipe builders (Culinary, Pastry, MaestroBQT).
 *  Only renders when the input has focus AND there are matches.
 */
import React from "react";
import { useVendorSkuLookup, type VendorSku } from "@/lib/useVendorSkuLookup";

interface Props {
  query: string;
  visible: boolean;
  onPick: (sku: VendorSku) => void;
  className?: string;
  testidPrefix?: string;
}

export function VendorSkuAutocomplete({ query, visible, onPick, className, testidPrefix = "sku-suggest" }: Props) {
  const { matches, loading } = useVendorSkuLookup(query, { limit: 6 });
  if (!visible || (query || "").trim().length < 2) return null;
  if (!loading && matches.length === 0) return null;

  return (
    <div data-testid={testidPrefix}
      className={`absolute z-[2147482900] mt-1 w-[400px] max-w-[90vw] rounded-md border border-amber-500/40 bg-[#0a0d18] shadow-xl ${className || ""}`}>
      <div className="px-3 py-2 text-[9px] tracking-widest text-amber-500 font-bold uppercase border-b border-white/5">
        ✦ FROM VENDOR INVOICES · LIVE PRICING
      </div>
      {loading && matches.length === 0 && (
        <div className="px-3 py-2 text-xs text-slate-400">Searching invoices…</div>
      )}
      {matches.map((m) => (
        <button key={m.id} type="button"
          data-testid={`${testidPrefix}-item-${m.id.replace(/[^a-z0-9]/gi, "-")}`}
          onClick={() => onPick(m)}
          className="w-full px-3 py-2 text-left hover:bg-amber-500/10 border-b border-white/5 last:border-0">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-slate-100 line-clamp-1">{m.description}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 flex gap-2 items-center">
                <span className="text-amber-500/80 font-semibold">{m.vendor_name}</span>
                {m.item_code && <span className="font-mono text-slate-500">· {m.item_code}</span>}
                {m.pack_size && <span>· {m.pack_size}</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[13px] font-extrabold text-amber-500 tabular-nums">${m.current_unit_price.toFixed(2)}</div>
              <div className="text-[9px] text-slate-500 uppercase">/ {m.current_uom || "ea"}</div>
            </div>
          </div>
          {m.last_invoice_number && (
            <div className="text-[8px] text-slate-600 mt-1 font-mono">
              Inv {m.last_invoice_number} · {m.last_invoice_date}
            </div>
          )}
        </button>
      ))}
      <div className="px-3 py-1.5 text-[8px] text-slate-600 italic border-t border-white/5">
        Click to autofill name + unit + cost into this row.
      </div>
    </div>
  );
}
