/**
 * iter266.10 · Ingredient Cost Lookup Panel
 * ==========================================
 * Surfaces the multi-vendor ingredient pricing data from the invoice
 * scanner output as a first-class panel under Ordering & Inventory.
 *
 * Live wiring:
 *   - Pulls from `useVendorSkuLookup` hook → GET /api/vendor-skus/lookup
 *   - Returns matches across all 14 vendors currently seeded (Sysco,
 *     US Foods, Gordon Food Service, Mr Greens, Halperns, Cusanos,
 *     Premier Meats, Aurora Seafood, Pacific Spirits, Island Dairy,
 *     Coastal Produce, Five-Star Paper, Blue Line Chemicals, Rapid Linen)
 *   - Shows current unit price + UoM + pack size + last invoice number
 *     + last invoice date (so manager knows the price freshness)
 *   - Best-price highlight (lowest matched price wins green badge)
 *
 * Used by lower-salary managers per William to understand operation
 * costs without diving into the full Recipe Builder.
 */

import React, { useMemo, useState } from "react";
import { useVendorSkuLookup } from "@/lib/useVendorSkuLookup";
import { useAuth } from "@/lib/auth-context";
import { useThemeTokens } from "@/styles/design-tokens";
import { Search, Package, ArrowDown, Calendar, FileText, TrendingDown } from "lucide-react";

export default function IngredientCostLookupPanel() {
  const t = useThemeTokens();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const userOutlets = useMemo(
    () => (user?.outlet_ids || []).filter(o => o && o !== "all"),
    [user?.outlet_ids],
  );
  // If user has 1 outlet → scope to it; otherwise global pool.
  const scopedOutlet = userOutlets.length === 1 ? userOutlets[0] : undefined;
  const { matches, loading } = useVendorSkuLookup(query, { limit: 12, outletId: scopedOutlet });

  // Group by description to compare prices side-by-side
  const grouped = useMemo(() => {
    const m: Record<string, typeof matches> = {};
    for (const x of matches) {
      const key = x.description.toLowerCase().slice(0, 60);
      (m[key] = m[key] || []).push(x);
    }
    return Object.entries(m);
  }, [matches]);

  const cheapestId = useMemo(() => {
    if (!matches.length) return null;
    return matches.reduce((a, b) =>
      (a.current_unit_price < b.current_unit_price ? a : b)).id;
  }, [matches]);

  return (
    <div
      data-testid="ingredient-cost-lookup-root"
      style={{
        height: "100%", overflow: "auto",
        background: t.panelBg, color: t.textPrimary,
        padding: "20px 24px",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: t.textPrimary, display: "flex", alignItems: "center", gap: 10 }}>
          <Package size={18} style={{ color: t.accent }} />
          Ingredient Cost Lookup
        </h2>
        <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>
          Live multi-vendor pricing from your invoice history.
          {scopedOutlet && <span style={{ color: t.accent, marginLeft: 8 }}>· scoped to {scopedOutlet}</span>}
        </div>
      </div>

      {/* Search */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: t.surface, border: `1px solid ${t.border}`,
        borderRadius: 6, padding: "10px 14px", marginBottom: 18,
      }}>
        <Search size={16} style={{ color: t.textMuted }} />
        <input
          data-testid="ingredient-lookup-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Type an ingredient (e.g. parmesan, salmon, olive oil, chicken breast)…"
          autoFocus
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            color: t.textPrimary, fontSize: 14, fontFamily: "inherit",
          }}
        />
        {loading && <span style={{ fontSize: 11, color: t.textMuted }}>Searching…</span>}
      </div>

      {/* Results */}
      {query.trim().length < 2 ? (
        <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: t.textMuted }}>
          Type at least 2 characters to search. Common examples:{" "}
          <em>parmesan</em>, <em>chicken breast</em>, <em>olive oil</em>, <em>tomato</em>, <em>salmon</em>.
        </div>
      ) : !matches.length && !loading ? (
        <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: t.textMuted }}>
          No matches in vendor SKU catalog. Try a different keyword, or have receiving log a fresh invoice.
        </div>
      ) : (
        <div data-testid="ingredient-lookup-results" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {grouped.map(([key, group]) => (
            <div key={key} style={{
              background: t.surface, border: `1px solid ${t.border}`,
              borderRadius: 6, overflow: "hidden",
            }}>
              <div style={{ padding: "10px 16px", borderBottom: `1px solid ${t.border}`, fontWeight: 700, color: t.textPrimary }}>
                {group[0].description}
                {group.length > 1 && (
                  <span style={{ fontSize: 10, color: t.textMuted, marginLeft: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    · compare {group.length} vendors
                  </span>
                )}
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: `${t.border}30`, fontSize: 10, color: t.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    <th style={{ padding: "6px 10px", textAlign: "left" }}>Vendor</th>
                    <th style={{ padding: "6px 10px", textAlign: "left" }}>Item Code</th>
                    <th style={{ padding: "6px 10px", textAlign: "left" }}>Pack</th>
                    <th style={{ padding: "6px 10px", textAlign: "right" }}>Price / UoM</th>
                    <th style={{ padding: "6px 10px", textAlign: "left" }}>Last Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {group.map(sku => {
                    const isBest = sku.id === cheapestId;
                    return (
                      <tr key={sku.id} data-testid={`sku-row-${sku.id}`} style={{
                        borderTop: `1px solid ${t.border}`,
                        background: isBest ? `${t.accent}10` : "transparent",
                      }}>
                        <td style={{ padding: "8px 10px", fontWeight: 600 }}>
                          {sku.vendor_name}
                          {isBest && (
                            <span style={{
                              marginLeft: 8, padding: "2px 6px", borderRadius: 3,
                              background: "rgba(34,197,94,0.15)", color: "#22c55e",
                              fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase",
                              display: "inline-flex", alignItems: "center", gap: 3,
                            }}>
                              <TrendingDown size={9} /> Best price
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "8px 10px", fontFamily: "monospace", color: t.textSecondary, fontSize: 11 }}>
                          {sku.item_code || "—"}
                        </td>
                        <td style={{ padding: "8px 10px", color: t.textSecondary, fontSize: 11 }}>
                          {sku.pack_size || "—"}
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: 700,
                          color: isBest ? "#22c55e" : t.textPrimary }}>
                          ${sku.current_unit_price.toFixed(2)}
                          <span style={{ fontSize: 10, color: t.textMuted, marginLeft: 4 }}>
                            / {sku.current_uom || "ea"}
                          </span>
                        </td>
                        <td style={{ padding: "8px 10px", color: t.textSecondary, fontSize: 11 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <FileText size={10} />{sku.last_invoice_number || "—"}
                          </span>
                          {sku.last_invoice_date && (
                            <span style={{ display: "block", color: t.textMuted, fontSize: 10, marginTop: 2 }}>
                              <Calendar size={9} style={{ display: "inline", marginRight: 3 }} />
                              {new Date(sku.last_invoice_date).toLocaleDateString()}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 18, fontSize: 10, color: t.textMuted, textAlign: "right" }}>
        Live data · {matches.length} match{matches.length === 1 ? "" : "es"} · debounced 200ms
      </div>
    </div>
  );
}
