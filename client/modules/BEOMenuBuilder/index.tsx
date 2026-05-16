import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Search, Upload, DollarSign,
  Utensils, Coffee, Wine, Salad, Cake, Music, Flower2, Shield, Car, Plus,
  Minus, X, FileText, History, RefreshCw, Check, Info, GlassWater, Beef,
} from "lucide-react";

const API = window.location.origin;
const GET = (p: string) => fetch(`${API}/api/banquet-menus${p}`).then(r => r.json());
const POST = (p: string, b: any = {}) =>
  fetch(`${API}/api/banquet-menus${p}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(r => r.json());

const FONT = { fontFamily: "'IBM Plex Sans', system-ui, sans-serif" };
const MONO = { fontFamily: "'IBM Plex Mono', monospace" };
const BG = "#04060d";
const SURFACE = "rgba(255,255,255,0.025)";
const BORDER = "rgba(255,255,255,0.06)";
const ACCENT = "#c8a97e";
const ACCENT_DIM = "rgba(200,169,126,0.12)";
const SELECT_COLOR = "#3b82f6";

const SECTION_ICONS: Record<string, any> = {
  "BREAKFAST": Coffee,
  "BREAKS": Coffee,
  "LUNCH": Utensils,
  "DINNER": Beef,
  "RECEPTION": GlassWater,
  "BEVERAGE": Wine,
  "ADD-ONS & SERVICES": Music,
};

const DIETARY_COLORS: Record<string, string> = {
  "D": "#f59e0b", "G": "#a855f7", "N": "#ef4444", "S": "#ec4899",
  "VE": "#22c55e", "VG": "#10b981",
};

interface MenuItem {
  id: string; name: string; description: string; group: string;
  select_rule: string; section: string; subsection: string;
  dietary_info: string; price: string; price_numeric: number;
  base_package_price: number; note: string;
}

interface SelectedItem extends MenuItem {
  quantity: number;
  adjusted_price: number;
}

interface Category {
  name: string;
  subsections: { name: string; price: string; price_numeric: number; item_count: number }[];
}

export default function BEOMenuBuilderPanel() {
  const [menus, setMenus] = useState<any[]>([]);
  const [activeMenuId, setActiveMenuId] = useState("bm-pier66-v1");
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeSection, setActiveSection] = useState("");
  const [activeSubsection, setActiveSubsection] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [availableItems, setAvailableItems] = useState<MenuItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [searchAvailable, setSearchAvailable] = useState("");
  const [searchSelected, setSearchSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestCount, setGuestCount] = useState(80);
  const [serviceChargePct, setServiceChargePct] = useState(26);
  const [taxPct, setTaxPct] = useState(7);

  // Load menus and seed if needed
  useEffect(() => {
    const init = async () => {
      const menuRes = await GET("");
      if (!menuRes.menus?.length) {
        await POST("/seed-pier66");
        const retry = await GET("");
        setMenus(retry.menus || []);
      } else {
        setMenus(menuRes.menus);
      }
    };
    init();
  }, []);

  // Load categories when menu selected
  useEffect(() => {
    if (!activeMenuId) return;
    GET(`/${activeMenuId}/categories`).then(d => {
      setCategories(d.categories || []);
      if (d.categories?.length && !activeSection) {
        setActiveSection(d.categories[0].name);
        setExpandedSections(new Set([d.categories[0].name]));
        if (d.categories[0].subsections?.length) {
          setActiveSubsection(d.categories[0].subsections[0].name);
        }
      }
    });
  }, [activeMenuId]);

  // Load items when subsection changes
  useEffect(() => {
    if (!activeMenuId || !activeSection || !activeSubsection) return;
    setLoading(true);
    GET(`/${activeMenuId}/items?section=${encodeURIComponent(activeSection)}&subsection=${encodeURIComponent(activeSubsection)}`)
      .then(d => { setAvailableItems(d.items || []); setLoading(false); });
  }, [activeMenuId, activeSection, activeSubsection]);

  const toggleSection = (name: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const selectSubsection = (section: string, sub: string) => {
    setActiveSection(section);
    setActiveSubsection(sub);
    setExpandedSections(prev => new Set([...prev, section]));
  };

  const addItem = useCallback((item: MenuItem) => {
    setSelectedItems(prev => {
      const existing = prev.find(s => s.id === item.id);
      if (existing) {
        return prev.map(s => s.id === item.id ? { ...s, quantity: s.quantity + 1 } : s);
      }
      return [...prev, { ...item, quantity: 1, adjusted_price: item.price_numeric || item.base_package_price }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setSelectedItems(prev => prev.filter(s => s.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, delta: number) => {
    setSelectedItems(prev => prev.map(s => {
      if (s.id !== id) return s;
      const newQty = Math.max(1, s.quantity + delta);
      return { ...s, quantity: newQty };
    }));
  }, []);

  const updatePrice = useCallback((id: string, price: number) => {
    setSelectedItems(prev => prev.map(s => s.id === id ? { ...s, adjusted_price: price } : s));
  }, []);

  const moveAllVisible = useCallback(() => {
    const filtered = filteredAvailable;
    setSelectedItems(prev => {
      const existing = new Set(prev.map(s => s.id));
      const newItems = filtered.filter(i => !existing.has(i.id)).map(i => ({
        ...i, quantity: 1, adjusted_price: i.price_numeric || i.base_package_price,
      }));
      return [...prev, ...newItems];
    });
  }, [availableItems, searchAvailable]);

  // Filtered items
  const filteredAvailable = useMemo(() => {
    if (!searchAvailable.trim()) return availableItems;
    const t = searchAvailable.toLowerCase();
    return availableItems.filter(i => i.name.toLowerCase().includes(t) || i.description.toLowerCase().includes(t));
  }, [availableItems, searchAvailable]);

  const filteredSelected = useMemo(() => {
    if (!searchSelected.trim()) return selectedItems;
    const t = searchSelected.toLowerCase();
    return selectedItems.filter(i => i.name.toLowerCase().includes(t) || i.section.toLowerCase().includes(t));
  }, [selectedItems, searchSelected]);

  const selectedIds = useMemo(() => new Set(selectedItems.map(s => s.id)), [selectedItems]);

  // Cost calculations
  const costs = useMemo(() => {
    let packageTotal = 0;
    let addOnTotal = 0;
    const bySection: Record<string, number> = {};

    for (const item of selectedItems) {
      const lineTotal = item.adjusted_price * item.quantity;
      const key = `${item.section} > ${item.subsection}`;
      bySection[key] = (bySection[key] || 0) + lineTotal;

      if (item.base_package_price > 0 && item.adjusted_price === item.base_package_price) {
        packageTotal += lineTotal;
      } else {
        addOnTotal += lineTotal;
      }
    }

    const subtotal = packageTotal + addOnTotal;
    const perGuest = subtotal / Math.max(guestCount, 1);
    const serviceCharge = subtotal * guestCount * (serviceChargePct / 100);
    const tax = (subtotal * guestCount + serviceCharge) * (taxPct / 100);
    const grandTotal = subtotal * guestCount + serviceCharge + tax;

    return { packageTotal, addOnTotal, subtotal, perGuest, serviceCharge, tax, grandTotal, bySection };
  }, [selectedItems, guestCount, serviceChargePct, taxPct]);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ ...FONT, background: BG, color: "#e2e8f0" }}
      data-testid="beo-menu-builder-panel">
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${BORDER}` }} className="flex-shrink-0">
        <div className="flex items-center gap-4 px-5 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: ACCENT_DIM, border: `1px solid rgba(200,169,126,0.25)` }}>
              <FileText className="w-4 h-4" style={{ color: ACCENT }} />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-white">BEO MENU BUILDER</div>
              <div className="text-[9px] tracking-[0.2em] uppercase" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
                Click & Add | Pricing | Cost Breakdown
              </div>
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.6)" }}>Guests:</span>
              <input type="number" value={guestCount} onChange={e => setGuestCount(parseInt(e.target.value) || 1)}
                className="w-14 bg-transparent text-[12px] text-white font-medium text-center outline-none"
                data-testid="guest-count-input" min={1} />
            </div>
            <div className="px-2.5 py-1 rounded-md text-[11px] font-medium" data-testid="selected-count"
              style={{ background: selectedItems.length ? "rgba(59,130,246,0.1)" : SURFACE, color: selectedItems.length ? SELECT_COLOR : "rgba(148,163,184,0.5)", border: `1px solid ${selectedItems.length ? "rgba(59,130,246,0.2)" : BORDER}` }}>
              {selectedItems.length} items selected
            </div>
            {selectedItems.length > 0 && (
              <>
                <button onClick={() => {
                  const name = prompt("Template name:", "Corporate Breakfast");
                  if (!name) return;
                  fetch(`${API}/api/banquet-menus/templates/save`, {
                    method: "POST", headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({ name, event_type: "corporate", guest_count: guestCount, items: selectedItems.map(i => ({name:i.name, section:i.section, subsection:i.subsection, price_numeric:i.adjusted_price, quantity:i.quantity})), service_charge_pct: serviceChargePct, tax_pct: taxPct })
                  }).then(r => r.json()).then(() => alert("Template saved!"));
                }} className="px-2 py-1 rounded-md text-[10px] font-medium"
                  style={{ background: "rgba(168,85,247,0.08)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.15)" }}
                  data-testid="save-template-btn">Save Template</button>
                <button onClick={() => {
                  const name = prompt("Event name:", "New Event");
                  if (!name) return;
                  fetch(`${API}/api/banquet-menus/create-beo`, {
                    method: "POST", headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({ event_name: name, guest_count: guestCount, items: selectedItems.map(i => ({name:i.name, section:i.section, subsection:i.subsection, adjusted_price:i.adjusted_price, quantity:i.quantity, dietary_info:i.dietary_info})), service_charge_pct: serviceChargePct, tax_pct: taxPct })
                  }).then(r => r.json()).then(d => alert(`BEO Created: ${d.beo_number}\nTotal: $${d.financial?.total?.toLocaleString()}`));
                }} className="px-2 py-1 rounded-md text-[10px] font-medium"
                  style={{ background: "rgba(34,197,94,0.08)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.15)" }}
                  data-testid="create-beo-btn">Create BEO</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main content: Sidebar + Two Panels + Cost */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Category Navigation */}
        <div className="w-56 flex-shrink-0 overflow-y-auto" style={{ borderRight: `1px solid ${BORDER}`, background: "rgba(0,0,0,0.2)" }}
          data-testid="category-sidebar">
          <div className="py-2">
            {categories.map(cat => {
              const Icon = SECTION_ICONS[cat.name] || Utensils;
              const isExpanded = expandedSections.has(cat.name);
              return (
                <div key={cat.name}>
                  <button onClick={() => toggleSection(cat.name)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors"
                    data-testid={`section-${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
                    style={{ color: activeSection === cat.name ? ACCENT : "rgba(148,163,184,0.7)" }}>
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider flex-1">{cat.name}</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {isExpanded && (
                    <div className="pl-3 pb-1">
                      {cat.subsections.map(sub => (
                        <button key={sub.name} onClick={() => selectSubsection(cat.name, sub.name)}
                          className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left rounded-sm transition-all"
                          data-testid={`subsection-${sub.name.toLowerCase().replace(/\s+/g, '-')}`}
                          style={{
                            background: activeSubsection === sub.name && activeSection === cat.name ? "rgba(200,169,126,0.08)" : "transparent",
                            color: activeSubsection === sub.name && activeSection === cat.name ? ACCENT : "rgba(148,163,184,0.5)",
                            borderLeft: activeSubsection === sub.name && activeSection === cat.name ? `2px solid ${ACCENT}` : "2px solid transparent",
                          }}>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] truncate">{sub.name}</div>
                            <div className="text-[9px]" style={{ ...MONO, color: "rgba(148,163,184,0.35)" }}>
                              {sub.price} | {sub.item_count} items
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Two panels with arrows */}
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT PANEL: Available Items */}
          <div className="flex-1 flex flex-col overflow-hidden" style={{ borderRight: `1px solid ${BORDER}` }}
            data-testid="available-items-panel">
            <div className="px-4 py-2 flex-shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[11px] font-semibold text-white uppercase tracking-wider">
                  {activeSubsection || "Select Category"}
                </div>
                <button onClick={moveAllVisible} className="text-[9px] px-2 py-0.5 rounded" data-testid="add-all-btn"
                  style={{ background: "rgba(59,130,246,0.1)", color: SELECT_COLOR, border: "1px solid rgba(59,130,246,0.2)" }}>
                  Add All
                </button>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                <Search className="w-3 h-3" style={{ color: "rgba(148,163,184,0.4)" }} />
                <input value={searchAvailable} onChange={e => setSearchAvailable(e.target.value)}
                  placeholder="Search items..." className="flex-1 bg-transparent text-[10px] outline-none text-white placeholder:text-gray-600"
                  data-testid="search-available" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1" data-testid="available-items-list">
              {loading ? (
                <div className="flex items-center justify-center py-10 text-[11px]" style={{ color: "rgba(148,163,184,0.4)" }}>
                  Loading items...
                </div>
              ) : filteredAvailable.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-[11px]" style={{ color: "rgba(148,163,184,0.4)" }}>
                  <Utensils className="w-6 h-6 mb-2 opacity-30" />
                  Select a category from the sidebar
                </div>
              ) : (
                filteredAvailable.map(item => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <div key={item.id}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-md transition-all cursor-pointer group"
                      data-testid={`available-item-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => !isSelected && addItem(item)}
                      style={{
                        background: isSelected ? "rgba(59,130,246,0.06)" : SURFACE,
                        border: `1px solid ${isSelected ? "rgba(59,130,246,0.15)" : BORDER}`,
                        opacity: isSelected ? 0.5 : 1,
                      }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-medium text-white">{item.name}</span>
                          {item.group && (
                            <span className="text-[8px] px-1 py-0 rounded" style={{ background: "rgba(200,169,126,0.08)", color: ACCENT }}>
                              {item.group}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <div className="text-[9px] mt-0.5 truncate" style={{ color: "rgba(148,163,184,0.45)" }}>
                            {item.description}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 mt-1">
                          {item.dietary_info && item.dietary_info.split('/').map(code => (
                            <span key={code} className="text-[7px] font-bold px-1 rounded"
                              style={{ background: `${DIETARY_COLORS[code.trim()] || '#666'}20`, color: DIETARY_COLORS[code.trim()] || '#666' }}>
                              {code.trim()}
                            </span>
                          ))}
                          {item.select_rule && (
                            <span className="text-[8px] italic" style={{ color: "rgba(148,163,184,0.35)" }}>
                              ({item.select_rule})
                            </span>
                          )}
                        </div>
                      </div>
                      {item.price ? (
                        <div className="text-[10px] font-medium flex-shrink-0" style={{ ...MONO, color: ACCENT }}>{item.price}</div>
                      ) : item.base_package_price > 0 ? (
                        <div className="text-[9px] flex-shrink-0" style={{ color: "rgba(148,163,184,0.35)" }}>incl.</div>
                      ) : null}
                      {!isSelected && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronRight className="w-4 h-4" style={{ color: SELECT_COLOR }} />
                        </div>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5" style={{ color: SELECT_COLOR }} />}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* CENTER: Arrow controls */}
          <div className="w-10 flex-shrink-0 flex flex-col items-center justify-center gap-2" style={{ background: "rgba(0,0,0,0.15)" }}
            data-testid="arrow-controls">
            <button onClick={moveAllVisible} className="w-7 h-7 rounded flex items-center justify-center transition-colors hover:bg-white/10"
              style={{ border: `1px solid ${BORDER}` }} title="Add all visible">
              <ChevronRight className="w-4 h-4" style={{ color: SELECT_COLOR }} />
              <ChevronRight className="w-4 h-4 -ml-2.5" style={{ color: SELECT_COLOR }} />
            </button>
            <button onClick={() => setSelectedItems([])} className="w-7 h-7 rounded flex items-center justify-center transition-colors hover:bg-white/10"
              style={{ border: `1px solid ${BORDER}` }} title="Remove all" data-testid="clear-all-btn">
              <ChevronLeft className="w-4 h-4" style={{ color: "#ef4444" }} />
              <ChevronLeft className="w-4 h-4 -ml-2.5" style={{ color: "#ef4444" }} />
            </button>
          </div>

          {/* RIGHT PANEL: Selected Items (BEO) */}
          <div className="flex-1 flex flex-col overflow-hidden" data-testid="selected-items-panel">
            <div className="px-4 py-2 flex-shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: SELECT_COLOR }}>
                  BEO Menu Selection ({selectedItems.length})
                </div>
                {selectedItems.length > 0 && (
                  <button onClick={() => setSelectedItems([])} className="text-[9px] px-2 py-0.5 rounded"
                    style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
                    data-testid="clear-selection-btn">
                    Clear All
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                <Search className="w-3 h-3" style={{ color: "rgba(148,163,184,0.4)" }} />
                <input value={searchSelected} onChange={e => setSearchSelected(e.target.value)}
                  placeholder="Search selected..." className="flex-1 bg-transparent text-[10px] outline-none text-white placeholder:text-gray-600"
                  data-testid="search-selected" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1" data-testid="selected-items-list">
              {filteredSelected.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-[11px]" style={{ color: "rgba(148,163,184,0.4)" }}>
                  <ChevronLeft className="w-6 h-6 mb-2 opacity-30" />
                  Click items on the left to add to BEO
                </div>
              ) : (
                filteredSelected.map(item => (
                  <div key={item.id} className="flex items-center gap-2 px-2.5 py-2 rounded-md"
                    data-testid={`selected-item-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                    style={{ background: "rgba(59,130,246,0.04)", border: `1px solid rgba(59,130,246,0.1)` }}>
                    <button onClick={() => removeItem(item.id)} className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center hover:bg-red-500/20 transition"
                      data-testid={`remove-${item.name.toLowerCase().replace(/\s+/g, '-')}`}>
                      <X className="w-3 h-3 text-red-400" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium text-white truncate">{item.name}</div>
                      <div className="text-[8px]" style={{ color: "rgba(148,163,184,0.4)" }}>
                        {item.section} &gt; {item.subsection}
                        {item.group && ` > ${item.group}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => updateQuantity(item.id, -1)}
                        className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10 transition"
                        style={{ border: `1px solid ${BORDER}` }}>
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="text-[10px] w-5 text-center font-medium" style={{ ...MONO }}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)}
                        className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10 transition"
                        style={{ border: `1px solid ${BORDER}` }}>
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <span className="text-[9px]" style={{ color: "rgba(148,163,184,0.4)" }}>$</span>
                      <input type="number" value={item.adjusted_price} step={0.5}
                        onChange={e => updatePrice(item.id, parseFloat(e.target.value) || 0)}
                        className="w-14 bg-transparent text-[11px] font-medium text-right outline-none"
                        style={{ ...MONO, color: ACCENT }}
                        data-testid={`price-${item.name.toLowerCase().replace(/\s+/g, '-')}`} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Cost Breakdown */}
      <div className="flex-shrink-0 px-5 py-3" style={{ borderTop: `1px solid ${BORDER}`, background: "rgba(0,0,0,0.3)" }}
        data-testid="cost-breakdown">
        <div className="flex items-start gap-6">
          {/* Section breakdown */}
          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "rgba(148,163,184,0.5)" }}>
              By Section
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              {Object.entries(costs.bySection).slice(0, 8).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-[9px] truncate" style={{ color: "rgba(148,163,184,0.45)" }}>{key}</span>
                  <span className="text-[9px] font-medium" style={{ ...MONO, color: "rgba(255,255,255,0.6)" }}>
                    ${(val as number).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="w-72 flex-shrink-0">
            <div className="text-[9px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "rgba(148,163,184,0.5)" }}>
              Pricing Summary ({guestCount} guests)
            </div>
            <div className="space-y-0.5">
              <div className="flex justify-between text-[10px]">
                <span style={{ color: "rgba(148,163,184,0.5)" }}>Per-person subtotal</span>
                <span style={{ ...MONO, color: "rgba(255,255,255,0.7)" }}>${costs.perGuest.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span style={{ color: "rgba(148,163,184,0.5)" }}>Food & Beverage ({guestCount}x)</span>
                <span style={{ ...MONO, color: "rgba(255,255,255,0.7)" }}>${(costs.subtotal * guestCount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span style={{ color: "rgba(148,163,184,0.5)" }}>
                  Service Charge ({serviceChargePct}%)
                </span>
                <span style={{ ...MONO, color: "rgba(255,255,255,0.5)" }}>${costs.serviceCharge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span style={{ color: "rgba(148,163,184,0.5)" }}>Tax ({taxPct}%)</span>
                <span style={{ ...MONO, color: "rgba(255,255,255,0.5)" }}>${costs.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[12px] font-semibold pt-1" style={{ borderTop: `1px solid ${BORDER}` }}>
                <span style={{ color: ACCENT }}>Grand Total</span>
                <span style={{ ...MONO, color: ACCENT }}>${costs.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
