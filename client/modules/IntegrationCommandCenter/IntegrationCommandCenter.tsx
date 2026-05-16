import React, { useState, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
// LUCCCA Integration Command Center
// Admin-level hub for managing all external system connections,
// outlets, GL codes, vendor invoice routing, and OS-level integration
// ═══════════════════════════════════════════════════════════════

// ─── Data Types ────────────────────────────────────────────────

const INTEGRATION_CATEGORIES: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  POS: { label: "Point of Sale", color: "#f59e0b", icon: "💳" },
  PMS: { label: "Property Management", color: "#3b82f6", icon: "🏨" },
  ACCOUNTING: { label: "Accounting & GL", color: "#10b981", icon: "📊" },
  INVENTORY: { label: "Inventory & Supply", color: "#8b5cf6", icon: "📦" },
  LABOR: { label: "Labor & Scheduling", color: "#ec4899", icon: "👥" },
  ANALYTICS: { label: "Analytics & BI", color: "#06b6d4", icon: "📈" },
  COMMUNICATION: { label: "Communication", color: "#f97316", icon: "📧" },
  PROCUREMENT: { label: "Procurement", color: "#14b8a6", icon: "🛒" },
};

type VendorSystem = {
  id: string;
  name: string;
  category: string;
  logo: string;
  status: string;
  apiDocs?: string;
  features: string[];
};

const VENDOR_SYSTEMS: VendorSystem[] = [
  {
    id: "toast",
    name: "Toast POS",
    category: "POS",
    logo: "🍞",
    status: "available",
    apiDocs: "https://doc.toasttab.com",
    features: [
      "Sales data sync",
      "Menu push",
      "Labor data",
      "Item-level reporting",
    ],
  },
  {
    id: "aloha",
    name: "Aloha POS (NCR)",
    category: "POS",
    logo: "🌺",
    status: "available",
    apiDocs: "https://developer.ncr.com",
    features: ["Sales sync", "Item mix", "Void tracking", "Guest counts"],
  },
  {
    id: "square",
    name: "Square POS",
    category: "POS",
    logo: "⬜",
    status: "connected",
    apiDocs: "https://developer.squareup.com",
    features: [
      "Payment data",
      "Inventory sync",
      "Employee data",
      "Location management",
    ],
  },
  {
    id: "lightspeed",
    name: "Lightspeed",
    category: "POS",
    logo: "⚡",
    status: "connected",
    apiDocs: "https://developers.lightspeedhq.com",
    features: [
      "Restaurant POS sync",
      "Retail POS sync",
      "Inventory",
      "Reporting",
    ],
  },
  {
    id: "micros",
    name: "Oracle MICROS",
    category: "POS",
    logo: "🔵",
    status: "available",
    apiDocs: "https://docs.oracle.com/en/industries/food-beverage",
    features: ["Simphony sync", "RES sync", "Revenue centers", "Menu items"],
  },
  {
    id: "clover",
    name: "Clover POS",
    category: "POS",
    logo: "🍀",
    status: "available",
    apiDocs: "https://docs.clover.com",
    features: ["Orders", "Inventory", "Employees", "Reporting"],
  },
  {
    id: "revel",
    name: "Revel Systems",
    category: "POS",
    logo: "🎯",
    status: "available",
    features: ["iPad POS sync", "Inventory", "Employee management"],
  },
  {
    id: "opera",
    name: "Oracle Opera PMS",
    category: "PMS",
    logo: "🎭",
    status: "available",
    apiDocs: "https://docs.oracle.com/en/industries/hospitality",
    features: [
      "Room revenue",
      "F&B charges",
      "Guest profiles",
      "Banquet events",
      "AR integration",
    ],
  },
  {
    id: "mews",
    name: "Mews PMS",
    category: "PMS",
    logo: "🏢",
    status: "available",
    apiDocs: "https://mews-systems.gitbook.io",
    features: [
      "Reservations",
      "Revenue data",
      "Guest data",
      "Space management",
    ],
  },
  {
    id: "cloudbeds",
    name: "Cloudbeds",
    category: "PMS",
    logo: "☁️",
    status: "available",
    features: ["Revenue", "Occupancy", "F&B outlets", "Rate management"],
  },
  {
    id: "protel",
    name: "protel PMS",
    category: "PMS",
    logo: "🔑",
    status: "available",
    features: ["Room data", "F&B charges", "Conference & banqueting"],
  },
  {
    id: "stayntouch",
    name: "StayNTouch",
    category: "PMS",
    logo: "📱",
    status: "available",
    features: ["Mobile PMS", "Guest experience", "Revenue data"],
  },
  {
    id: "bi-analytics",
    name: "BI Analytics Engine",
    category: "ACCOUNTING",
    logo: "⚔️",
    status: "available",
    apiDocs: "https://actabl.com",
    features: [
      "Labor analytics",
      "Revenue forecasting",
      "Budget variance",
      "GL integration",
      "Multi-property rollup",
    ],
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    category: "ACCOUNTING",
    logo: "📗",
    status: "available",
    apiDocs: "https://developer.intuit.com",
    features: [
      "GL sync",
      "AP/AR",
      "Bank feeds",
      "Journal entries",
      "Vendor bills",
    ],
  },
  {
    id: "xero",
    name: "Xero",
    category: "ACCOUNTING",
    logo: "📘",
    status: "available",
    apiDocs: "https://developer.xero.com",
    features: ["GL sync", "Invoicing", "Bank reconciliation", "Multi-currency"],
  },
  {
    id: "sage",
    name: "Sage Intacct",
    category: "ACCOUNTING",
    logo: "📙",
    status: "available",
    features: [
      "Multi-entity GL",
      "Dimensions",
      "Statistical accounts",
      "Custom reports",
    ],
  },
  {
    id: "m3",
    name: "M3 Accounting",
    category: "ACCOUNTING",
    logo: "🔢",
    status: "available",
    features: ["Hotel accounting", "Daily revenue", "Statistics", "GL export"],
  },
  {
    id: "r365",
    name: "Restaurant365",
    category: "ACCOUNTING",
    logo: "📅",
    status: "available",
    apiDocs: "https://restaurant365.com",
    features: [
      "AP automation",
      "GL",
      "Bank rec",
      "Inventory valuation",
      "Recipe costing",
    ],
  },
  {
    id: "sysco",
    name: "Sysco",
    category: "PROCUREMENT",
    logo: "🚚",
    status: "available",
    features: [
      "Order placement",
      "Price lists",
      "Delivery tracking",
      "Product catalog",
    ],
  },
  {
    id: "usfoods",
    name: "US Foods",
    category: "PROCUREMENT",
    logo: "🇺🇸",
    status: "available",
    features: [
      "MOXé ordering",
      "Price feeds",
      "Delivery scheduling",
      "Product search",
    ],
  },
  {
    id: "marketman",
    name: "MarketMan",
    category: "INVENTORY",
    logo: "📋",
    status: "available",
    features: [
      "Inventory counts",
      "Purchase orders",
      "Recipe costing",
      "Waste tracking",
    ],
  },
  {
    id: "birchstreet",
    name: "BirchStreet",
    category: "PROCUREMENT",
    logo: "🌳",
    status: "available",
    features: [
      "eProcurement",
      "Invoice automation",
      "Spend analytics",
      "Contract management",
    ],
  },
  {
    id: "craftable",
    name: "Craftable (BevSpot)",
    category: "INVENTORY",
    logo: "🍺",
    status: "available",
    features: [
      "Beverage inventory",
      "Cost tracking",
      "Ordering",
      "Variance reporting",
    ],
  },
  {
    id: "7shifts",
    name: "7shifts",
    category: "LABOR",
    logo: "📅",
    status: "available",
    apiDocs: "https://developers.7shifts.com",
    features: [
      "Schedule sync",
      "Labor forecasting",
      "Time clock",
      "Tip pooling",
    ],
  },
  {
    id: "hotschedules",
    name: "HotSchedules",
    category: "LABOR",
    logo: "🔥",
    status: "available",
    features: [
      "Scheduling",
      "Labor compliance",
      "Forecasting",
      "Communication",
    ],
  },
  {
    id: "adp",
    name: "ADP Workforce",
    category: "LABOR",
    logo: "🅰️",
    status: "available",
    apiDocs: "https://developers.adp.com",
    features: ["Payroll sync", "Time & attendance", "Benefits", "HR data"],
  },
  {
    id: "paychex",
    name: "Paychex",
    category: "LABOR",
    logo: "💲",
    status: "available",
    features: ["Payroll", "HR", "Time tracking", "Benefits"],
  },
  {
    id: "revinate",
    name: "Revinate",
    category: "ANALYTICS",
    logo: "📊",
    status: "available",
    features: [
      "Guest sentiment",
      "Review aggregation",
      "Email marketing",
      "Revenue attribution",
    ],
  },
  {
    id: "duetto",
    name: "Duetto",
    category: "ANALYTICS",
    logo: "🎵",
    status: "available",
    features: [
      "Revenue strategy",
      "Forecasting",
      "Rate intelligence",
      "Group pricing",
    ],
  },
  {
    id: "str",
    name: "STR (CoStar)",
    category: "ANALYTICS",
    logo: "⭐",
    status: "available",
    features: [
      "Competitive benchmarking",
      "Market data",
      "STAR reports",
      "Trend analysis",
    ],
  },
  {
    id: "outlook",
    name: "Microsoft Outlook",
    category: "COMMUNICATION",
    logo: "📧",
    status: "available",
    apiDocs: "https://learn.microsoft.com/graph",
    features: ["Email integration", "Calendar sync", "Contacts", "Tasks"],
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    category: "COMMUNICATION",
    logo: "💬",
    status: "available",
    features: [
      "Channel messaging",
      "Video calls",
      "File sharing",
      "Bot integration",
    ],
  },
  {
    id: "slack",
    name: "Slack",
    category: "COMMUNICATION",
    logo: "💜",
    status: "available",
    apiDocs: "https://api.slack.com",
    features: ["Notifications", "Alerts", "Bot commands", "File sharing"],
  },
  {
    id: "gmail",
    name: "Google Workspace",
    category: "COMMUNICATION",
    logo: "📨",
    status: "available",
    features: ["Gmail", "Calendar", "Drive", "Sheets export"],
  },
];

const MOCK_OUTLETS = [
  {
    id: "main-dining",
    name: "Main Dining Room",
    type: "restaurant",
    glPrefix: "5100",
    posSystem: "toast",
    revenueCenter: "RC-001",
  },
  {
    id: "rooftop-bar",
    name: "Rooftop Bar",
    type: "bar",
    glPrefix: "5200",
    posSystem: "toast",
    revenueCenter: "RC-002",
  },
  {
    id: "banquets",
    name: "Banquets & Catering",
    type: "banquet",
    glPrefix: "5300",
    posSystem: "micros",
    revenueCenter: "RC-003",
  },
  {
    id: "room-service",
    name: "In-Room Dining",
    type: "room-service",
    glPrefix: "5400",
    posSystem: "opera",
    revenueCenter: "RC-004",
  },
  {
    id: "pool-bar",
    name: "Pool Bar & Grill",
    type: "bar",
    glPrefix: "5500",
    posSystem: "square",
    revenueCenter: "RC-005",
  },
  {
    id: "pastry-shop",
    name: "Pastry Shop & Café",
    type: "retail",
    glPrefix: "5600",
    posSystem: "clover",
    revenueCenter: "RC-006",
  },
];

const MOCK_GL_MAPPINGS = [
  {
    code: "5100-100",
    description: "Food Revenue - Main Dining",
    outlet: "main-dining",
    category: "revenue",
  },
  {
    code: "5100-200",
    description: "Beverage Revenue - Main Dining",
    outlet: "main-dining",
    category: "revenue",
  },
  {
    code: "5100-510",
    description: "Food Cost - Main Dining",
    outlet: "main-dining",
    category: "cogs",
  },
  {
    code: "5100-520",
    description: "Beverage Cost - Main Dining",
    outlet: "main-dining",
    category: "cogs",
  },
  {
    code: "5100-610",
    description: "Salaries & Wages - Main Dining",
    outlet: "main-dining",
    category: "labor",
  },
  {
    code: "5200-100",
    description: "Beverage Revenue - Rooftop",
    outlet: "rooftop-bar",
    category: "revenue",
  },
  {
    code: "5200-510",
    description: "Food Cost - Rooftop",
    outlet: "rooftop-bar",
    category: "cogs",
  },
  {
    code: "5300-100",
    description: "Banquet Revenue",
    outlet: "banquets",
    category: "revenue",
  },
  {
    code: "5300-510",
    description: "Banquet Food Cost",
    outlet: "banquets",
    category: "cogs",
  },
];

const MOCK_CONNECTIONS = [
  {
    id: "conn-1",
    systemId: "square",
    status: "active",
    lastSync: "2 min ago",
    dataPoints: 12847,
    outlet: "pool-bar",
  },
  {
    id: "conn-2",
    systemId: "lightspeed",
    status: "active",
    lastSync: "5 min ago",
    dataPoints: 8923,
    outlet: "main-dining",
  },
  {
    id: "conn-3",
    systemId: "toast",
    status: "error",
    lastSync: "2 hrs ago",
    dataPoints: 45201,
    outlet: "rooftop-bar",
    error: "Auth token expired",
  },
];

const API_BASE = "/api/integration-command-center";

type Stats = {
  connectedCount: number;
  totalSystems: number;
  outletsCount: number;
  glCodesCount: number;
  dataPointsSynced: number;
};

type ConnectionRow = {
  id: string;
  systemId: string;
  status: string;
  lastSync: string;
  dataPoints: number;
  outlet: string;
  error?: string;
};

const fetchOpts: RequestInit = { credentials: "include" };

async function fetchStats(): Promise<Stats | null> {
  try {
    const r = await fetch(`${API_BASE}/stats`, fetchOpts);
    if (r.ok) return await r.json();
  } catch (_) {}
  return null;
}

async function fetchConnections(): Promise<ConnectionRow[]> {
  try {
    const r = await fetch(`${API_BASE}/connections`, fetchOpts);
    if (r.ok) {
      const data = await r.json();
      return data.connections ?? [];
    }
  } catch (_) {}
  return [];
}

async function connectSystem(systemId: string): Promise<boolean> {
  try {
    const r = await fetch(`${API_BASE}/connections`, {
      ...fetchOpts,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemId }),
    });
    return r.ok;
  } catch (_) {
    return false;
  }
}

async function saveConfig(): Promise<boolean> {
  try {
    const r = await fetch(`${API_BASE}/config`, {
      ...fetchOpts,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    return r.ok;
  } catch (_) {
    return false;
  }
}

async function syncAll(): Promise<boolean> {
  try {
    const r = await fetch(`${API_BASE}/sync`, { ...fetchOpts, method: "POST" });
    return r.ok;
  } catch (_) {
    return false;
  }
}

async function fetchDesktopDownloads(): Promise<{
  mac: string;
  windows: string;
}> {
  try {
    const r = await fetch(`${API_BASE}/desktop/downloads`, fetchOpts);
    if (r.ok) {
      const d = await r.json();
      return { mac: d.mac ?? "", windows: d.windows ?? "" };
    }
  } catch (_) {}
  return { mac: "", windows: "" };
}

// ─── Sub-components ────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string; text: string }> = {
    connected: {
      bg: "rgba(16, 185, 129, 0.15)",
      color: "#10b981",
      text: "Connected",
    },
    active: {
      bg: "rgba(16, 185, 129, 0.15)",
      color: "#10b981",
      text: "Active",
    },
    available: {
      bg: "rgba(100, 116, 139, 0.15)",
      color: "#94a3b8",
      text: "Available",
    },
    error: { bg: "rgba(239, 68, 68, 0.15)", color: "#ef4444", text: "Error" },
    syncing: {
      bg: "rgba(59, 130, 246, 0.15)",
      color: "#3b82f6",
      text: "Syncing...",
    },
    pending: {
      bg: "rgba(245, 158, 11, 0.15)",
      color: "#f59e0b",
      text: "Pending",
    },
  };
  const s = styles[status] ?? styles.available;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.02em",
        background: s.bg,
        color: s.color,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: s.color,
          boxShadow:
            status === "active" || status === "connected"
              ? `0 0 6px ${s.color}`
              : "none",
        }}
      />
      {s.text}
    </span>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 20,
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: "#f1f5f9",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 22 }}>{icon}</span> {title}
        </h2>
        {subtitle && (
          <p style={{ margin: "4px 0 0 32px", fontSize: 13, color: "#64748b" }}>
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

function Card({
  children,
  style,
  onClick,
  hover,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
  hover?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:
          hovered && hover ? "rgba(30, 41, 59, 0.9)" : "rgba(15, 23, 42, 0.6)",
        border: "1px solid rgba(51, 65, 85, 0.5)",
        borderRadius: 12,
        padding: 16,
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s ease",
        transform: hovered && hover ? "translateY(-1px)" : "none",
        boxShadow: hovered && hover ? "0 4px 20px rgba(0,0,0,0.3)" : "none",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Btn({
  children,
  variant = "primary",
  size = "md",
  onClick,
  style,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  const variants: Record<
    string,
    { bg: string; color: string; border: string }
  > = {
    primary: {
      bg: "linear-gradient(135deg, #f59e0b, #d97706)",
      color: "#000",
      border: "none",
    },
    secondary: {
      bg: "rgba(51, 65, 85, 0.5)",
      color: "#e2e8f0",
      border: "1px solid rgba(71, 85, 105, 0.5)",
    },
    ghost: {
      bg: "transparent",
      color: "#94a3b8",
      border: "1px solid rgba(71, 85, 105, 0.3)",
    },
    danger: {
      bg: "rgba(239, 68, 68, 0.15)",
      color: "#ef4444",
      border: "1px solid rgba(239, 68, 68, 0.3)",
    },
    success: {
      bg: "rgba(16, 185, 129, 0.15)",
      color: "#10b981",
      border: "1px solid rgba(16, 185, 129, 0.3)",
    },
  };
  const sizes: Record<string, { padding: string; fontSize: number }> = {
    sm: { padding: "5px 12px", fontSize: 11 },
    md: { padding: "8px 16px", fontSize: 13 },
    lg: { padding: "10px 24px", fontSize: 14 },
  };
  const v = variants[variant] ?? variants.primary;
  const s = sizes[size] ?? sizes.md;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...s,
        background: v.bg,
        color: v.color,
        border: v.border,
        borderRadius: 8,
        fontWeight: 600,
        cursor: "pointer",
        letterSpacing: "0.01em",
        transition: "all 0.15s ease",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; icon: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 2,
        background: "rgba(15, 23, 42, 0.5)",
        padding: 3,
        borderRadius: 10,
        marginBottom: 24,
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          style={{
            flex: 1,
            padding: "10px 16px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.01em",
            transition: "all 0.2s ease",
            background:
              active === t.id ? "rgba(245, 158, 11, 0.15)" : "transparent",
            color: active === t.id ? "#f59e0b" : "#64748b",
            borderBottom:
              active === t.id ? "2px solid #f59e0b" : "2px solid transparent",
          }}
        >
          <span style={{ marginRight: 6 }}>{t.icon}</span>
          {t.label}
          {t.count !== undefined && (
            <span
              style={{
                marginLeft: 6,
                fontSize: 10,
                padding: "1px 6px",
                borderRadius: 10,
                background:
                  active === t.id
                    ? "rgba(245, 158, 11, 0.2)"
                    : "rgba(100, 116, 139, 0.2)",
              }}
            >
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Page Sections ─────────────────────────────────────────────

function IntegrationsMarketplace({
  searchQuery,
  connectedIds,
  onConnect,
  connectingId,
}: {
  searchQuery: string;
  connectedIds: Set<string>;
  onConnect: (systemId: string) => void;
  connectingId: string | null;
}) {
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const categories = [
    { id: "ALL", label: "All Systems", count: VENDOR_SYSTEMS.length },
    ...Object.entries(INTEGRATION_CATEGORIES).map(([id, cat]) => ({
      id,
      label: cat.label,
      count: VENDOR_SYSTEMS.filter((v) => v.category === id).length,
    })),
  ];

  const filtered = VENDOR_SYSTEMS.filter((v) => {
    const matchCat =
      selectedCategory === "ALL" || v.category === selectedCategory;
    const matchSearch =
      !searchQuery || v.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div>
      <SectionHeader
        icon="🔌"
        title="Integration Marketplace"
        subtitle={`${VENDOR_SYSTEMS.length} systems available · Connect any system in your hospitality tech stack`}
      />

      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}
      >
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedCategory(c.id)}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              border: "1px solid",
              borderColor:
                selectedCategory === c.id
                  ? "#f59e0b"
                  : "rgba(71, 85, 105, 0.4)",
              background:
                selectedCategory === c.id
                  ? "rgba(245, 158, 11, 0.12)"
                  : "transparent",
              color: selectedCategory === c.id ? "#f59e0b" : "#94a3b8",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {c.label} <span style={{ opacity: 0.6 }}>({c.count})</span>
          </button>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 12,
        }}
      >
        {filtered.map((system) => {
          const cat = INTEGRATION_CATEGORIES[system.category];
          const isConnected = connectedIds.has(system.id);
          const isConnecting = connectingId === system.id;
          return (
            <Card key={system.id} hover>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 28 }}>{system.logo}</span>
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        color: "#f1f5f9",
                        fontSize: 14,
                      }}
                    >
                      {system.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: cat.color,
                        fontWeight: 600,
                      }}
                    >
                      {cat.icon} {cat.label}
                    </div>
                  </div>
                </div>
                <StatusBadge status={isConnected ? "connected" : "available"} />
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 4,
                  marginBottom: 12,
                }}
              >
                {system.features.slice(0, 3).map((f, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: "rgba(51, 65, 85, 0.4)",
                      color: "#94a3b8",
                    }}
                  >
                    {f}
                  </span>
                ))}
                {system.features.length > 3 && (
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      color: "#64748b",
                    }}
                  >
                    +{system.features.length - 3} more
                  </span>
                )}
              </div>
              <Btn
                variant={isConnected ? "success" : "secondary"}
                size="sm"
                style={{ width: "100%" }}
                onClick={() =>
                  !isConnected && !isConnecting && onConnect(system.id)
                }
              >
                {isConnecting
                  ? "Connecting…"
                  : isConnected
                    ? "✓ Connected — Configure"
                    : "Connect →"}
              </Btn>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function OutletManager() {
  const [outlets] = useState(MOCK_OUTLETS);
  const [glMappings] = useState(MOCK_GL_MAPPINGS);
  const [selectedOutlet, setSelectedOutlet] = useState<string | null>(null);

  return (
    <div>
      <SectionHeader
        icon="🏪"
        title="Outlet Configuration"
        subtitle="Manage outlets, GL code mappings, and revenue center assignments"
        action={
          <Btn variant="primary" size="sm">
            + Add Outlet
          </Btn>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {outlets.map((outlet) => (
          <Card
            key={outlet.id}
            hover
            onClick={() =>
              setSelectedOutlet(outlet.id === selectedOutlet ? null : outlet.id)
            }
            style={{
              borderColor:
                selectedOutlet === outlet.id
                  ? "rgba(245, 158, 11, 0.5)"
                  : undefined,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <span style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 15 }}>
                {outlet.name}
              </span>
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: "rgba(245, 158, 11, 0.1)",
                  color: "#f59e0b",
                  fontWeight: 600,
                }}
              >
                {outlet.type.toUpperCase()}
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                fontSize: 12,
              }}
            >
              <div>
                <span style={{ color: "#64748b" }}>GL Prefix:</span>{" "}
                <span style={{ color: "#e2e8f0", fontFamily: "monospace" }}>
                  {outlet.glPrefix}
                </span>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>POS:</span>{" "}
                <span style={{ color: "#e2e8f0" }}>{outlet.posSystem}</span>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Rev Center:</span>{" "}
                <span style={{ color: "#e2e8f0", fontFamily: "monospace" }}>
                  {outlet.revenueCenter}
                </span>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>GL Codes:</span>{" "}
                <span style={{ color: "#e2e8f0" }}>
                  {glMappings.filter((g) => g.outlet === outlet.id).length}{" "}
                  mapped
                </span>
              </div>
            </div>

            {selectedOutlet === outlet.id && (
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: "1px solid rgba(51, 65, 85, 0.5)",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    color: "#94a3b8",
                    fontSize: 11,
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  GL Code Mappings
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  {glMappings
                    .filter((g) => g.outlet === outlet.id)
                    .map((gl) => (
                      <div
                        key={gl.code}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                          padding: "4px 8px",
                          borderRadius: 4,
                          background: "rgba(15, 23, 42, 0.5)",
                        }}
                      >
                        <span
                          style={{ fontFamily: "monospace", color: "#f59e0b" }}
                        >
                          {gl.code}
                        </span>
                        <span style={{ color: "#94a3b8" }}>
                          {gl.description}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            padding: "1px 6px",
                            borderRadius: 3,
                            background:
                              gl.category === "revenue"
                                ? "rgba(16, 185, 129, 0.15)"
                                : gl.category === "cogs"
                                  ? "rgba(239, 68, 68, 0.15)"
                                  : "rgba(59, 130, 246, 0.15)",
                            color:
                              gl.category === "revenue"
                                ? "#10b981"
                                : gl.category === "cogs"
                                  ? "#ef4444"
                                  : "#3b82f6",
                          }}
                        >
                          {gl.category}
                        </span>
                      </div>
                    ))}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <Btn variant="ghost" size="sm">
                    + Add GL Code
                  </Btn>
                  <Btn variant="ghost" size="sm">
                    Edit Outlet
                  </Btn>
                  <Btn variant="ghost" size="sm">
                    Invoice Routing
                  </Btn>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function ActiveConnections({
  connections,
  onSyncAll,
  syncing,
}: {
  connections: ConnectionRow[];
  onSyncAll: () => void;
  syncing: boolean;
}) {
  const list = connections.length > 0 ? connections : MOCK_CONNECTIONS;
  return (
    <div>
      <SectionHeader
        icon="⚡"
        title="Active Connections"
        subtitle="Real-time status of all connected systems"
        action={
          <Btn variant="ghost" size="sm" onClick={onSyncAll} disabled={syncing}>
            {syncing ? "Syncing…" : "↻ Sync All"}
          </Btn>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {list.map((conn) => {
          const system = VENDOR_SYSTEMS.find((v) => v.id === conn.systemId);
          const outlet = MOCK_OUTLETS.find((o) => o.id === conn.outlet);
          return (
            <Card
              key={conn.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 28 }}>{system?.logo}</span>
                <div>
                  <div
                    style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 14 }}
                  >
                    {system?.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    → {outlet?.name ?? conn.outlet}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>
                    {conn.dataPoints.toLocaleString()} records
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    Last sync: {conn.lastSync}
                  </div>
                </div>
                <StatusBadge status={conn.status} />
                {"error" in conn && conn.error && (
                  <span
                    style={{ fontSize: 11, color: "#ef4444", maxWidth: 140 }}
                  >
                    {conn.error}
                  </span>
                )}
                <Btn variant="ghost" size="sm">
                  Configure
                </Btn>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function InvoiceRouting() {
  const rules = [
    {
      vendor: "Sysco",
      pattern: "INV-*",
      outlet: "main-dining",
      gl: "5100-510",
      auto: true,
    },
    {
      vendor: "US Foods",
      pattern: "USF-*",
      outlet: "rooftop-bar",
      gl: "5200-510",
      auto: true,
    },
    {
      vendor: "Ben E. Keith",
      pattern: "BEK*",
      outlet: "banquets",
      gl: "5300-510",
      auto: false,
    },
    {
      vendor: "Shamrock Foods",
      pattern: "*",
      outlet: "pool-bar",
      gl: "5500-510",
      auto: true,
    },
  ];

  return (
    <div>
      <SectionHeader
        icon="📄"
        title="Invoice Routing & GL Auto-Mapping"
        subtitle="When invoices are scanned, LUCCCA auto-routes to the correct outlet and GL code based on vendor codes"
        action={
          <Btn variant="primary" size="sm">
            + Add Rule
          </Btn>
        }
      />

      <Card
        style={{
          marginBottom: 16,
          padding: 20,
          background: "rgba(245, 158, 11, 0.05)",
          borderColor: "rgba(245, 158, 11, 0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 24 }}>🔍</span>
          <div>
            <div style={{ fontWeight: 700, color: "#f59e0b", fontSize: 14 }}>
              How Invoice Auto-Routing Works
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#94a3b8",
                lineHeight: 1.6,
                marginTop: 4,
              }}
            >
              When a vendor invoice is scanned in Purchasing & Receiving,
              EchoAI³ reads the vendor code and invoice details. It matches
              against these rules to automatically assign the correct outlet and
              GL code. The inventory for that outlet updates in real-time.
              Exceptions go to the review queue.
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 20,
            fontSize: 12,
            color: "#64748b",
            paddingLeft: 36,
          }}
        >
          <span>📥 Invoice scanned</span>
          <span>→</span>
          <span>🤖 AI reads vendor code</span>
          <span>→</span>
          <span>🏪 Routes to outlet</span>
          <span>→</span>
          <span>📊 GL code assigned</span>
          <span>→</span>
          <span>📦 Inventory updated</span>
        </div>
      </Card>

      <div
        style={{
          border: "1px solid rgba(51, 65, 85, 0.5)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 120px 1fr 120px 80px 80px",
            padding: "10px 16px",
            background: "rgba(15, 23, 42, 0.8)",
            fontSize: 11,
            fontWeight: 700,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          <span>Vendor</span>
          <span>Pattern</span>
          <span>Outlet</span>
          <span>GL Code</span>
          <span>Auto</span>
          <span />
        </div>
        {rules.map((rule, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 120px 1fr 120px 80px 80px",
              padding: "12px 16px",
              borderTop: "1px solid rgba(51, 65, 85, 0.3)",
              fontSize: 13,
              alignItems: "center",
            }}
          >
            <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
              {rule.vendor}
            </span>
            <span
              style={{
                fontFamily: "monospace",
                color: "#f59e0b",
                fontSize: 12,
              }}
            >
              {rule.pattern}
            </span>
            <span style={{ color: "#94a3b8" }}>
              {MOCK_OUTLETS.find((o) => o.id === rule.outlet)?.name}
            </span>
            <span
              style={{
                fontFamily: "monospace",
                color: "#10b981",
                fontSize: 12,
              }}
            >
              {rule.gl}
            </span>
            <span>
              {rule.auto ? (
                <span
                  style={{ color: "#10b981", fontSize: 11, fontWeight: 600 }}
                >
                  ✓ Auto
                </span>
              ) : (
                <span
                  style={{ color: "#f59e0b", fontSize: 11, fontWeight: 600 }}
                >
                  ⊘ Review
                </span>
              )}
            </span>
            <Btn variant="ghost" size="sm">
              Edit
            </Btn>
          </div>
        ))}
      </div>
    </div>
  );
}

function DesktopIntegration({
  macUrl,
  windowsUrl,
  loading,
}: {
  macUrl: string;
  windowsUrl: string;
  loading: boolean;
}) {
  return (
    <div>
      <SectionHeader
        icon="🖥️"
        title="Desktop & OS Integration"
        subtitle="Enterprise feature: LUCCCA becomes your operational command center"
      />

      <Card
        style={{
          marginBottom: 16,
          padding: 24,
          background:
            "linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(139, 92, 246, 0.08))",
          borderColor: "rgba(245, 158, 11, 0.3)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 36 }}>🚀</span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9" }}>
              LUCCCA Command Center — Enterprise
            </div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
              Cloud-based with native desktop integration. Panels detach to
              separate screens. Direct OS integration with Outlook, file system,
              and local resources.
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {loading ? (
            <span style={{ color: "#94a3b8", fontSize: 13 }}>Loading…</span>
          ) : (
            <>
              {macUrl ? (
                <a
                  href={macUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  <Btn variant="primary" size="md">
                    Download Desktop Agent (macOS)
                  </Btn>
                </a>
              ) : (
                <Btn
                  variant="secondary"
                  size="md"
                  style={{ cursor: "default", opacity: 0.8 }}
                >
                  Download Desktop Agent (macOS) — Coming soon
                </Btn>
              )}
              {windowsUrl ? (
                <a
                  href={windowsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  <Btn variant="secondary" size="md">
                    Download Desktop Agent (Windows)
                  </Btn>
                </a>
              ) : (
                <Btn
                  variant="secondary"
                  size="md"
                  style={{ cursor: "default", opacity: 0.8 }}
                >
                  Download Desktop Agent (Windows) — Coming soon
                </Btn>
              )}
            </>
          )}
        </div>
      </Card>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}
      >
        {[
          {
            icon: "🪟",
            title: "Detachable Panels",
            desc: "Drag any module panel to a second monitor. Culinary on screen 1, Schedule on screen 2, EchoAI³ on screen 3.",
          },
          {
            icon: "📧",
            title: "Outlook Integration",
            desc: "Send POs, daily reports, and BEO summaries directly from LUCCCA. Calendar sync for events and tastings.",
          },
          {
            icon: "🖨️",
            title: "Local Print & Scan",
            desc: "Print prep sheets, labels, and BOH docs to local printers. Scan invoices with local scanner hardware.",
          },
          {
            icon: "💾",
            title: "Offline Mode",
            desc: "Critical functions work offline. Data syncs when connection restores. Kitchen never stops.",
          },
          {
            icon: "🔔",
            title: "Native Notifications",
            desc: "OS-level alerts for critical events: 86'd items, overtime warnings, delivery arrivals, temp alerts.",
          },
          {
            icon: "📁",
            title: "File System Access",
            desc: "Export reports to local folders. Watch folders for invoice scans. Automatic backup to local NAS.",
          },
        ].map((feature, i) => (
          <Card key={i}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{feature.icon}</div>
            <div
              style={{
                fontWeight: 700,
                color: "#f1f5f9",
                fontSize: 14,
                marginBottom: 4,
              }}
            >
              {feature.title}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#94a3b8",
                lineHeight: 1.5,
                marginBottom: 10,
              }}
            >
              {feature.desc}
            </div>
            <span
              style={{
                fontSize: 10,
                padding: "2px 8px",
                borderRadius: 4,
                background: "rgba(139, 92, 246, 0.15)",
                color: "#a78bfa",
                fontWeight: 600,
              }}
            >
              ENTERPRISE
            </span>
          </Card>
        ))}
      </div>
    </div>
  );
}

function EchoIntelligence() {
  return (
    <div>
      <SectionHeader
        icon="🧠"
        title="EchoAI³ Intelligence Layer"
        subtitle="When all systems connect through LUCCCA, Echo sees everything"
      />

      <Card
        style={{
          marginBottom: 16,
          padding: 24,
          background:
            "linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(139, 92, 246, 0.08))",
          borderColor: "rgba(6, 182, 212, 0.3)",
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "#f1f5f9",
            marginBottom: 12,
          }}
        >
          With full integration, EchoAI³ becomes the operational brain:
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          {[
            {
              title: "Cross-System Correlation",
              desc: "POS sales + Labor hours + Inventory levels + Weather data = predictive staffing that actually works",
            },
            {
              title: "Invoice Intelligence",
              desc: "Scanned invoice → AI extracts line items → auto-matches to recipes → updates food cost in real-time",
            },
            {
              title: "Anomaly Detection",
              desc: "Guardian AI sees when beverage cost at Rooftop Bar spikes 4% while sales are flat — theft or waste alert",
            },
            {
              title: "Vendor Negotiation",
              desc: "Network intelligence across all LUCCCA customers shows you're paying 8% more for chicken than your market average",
            },
            {
              title: "Predictive Procurement",
              desc: "Based on bookings (Opera) + events (BEO) + historical POS data = auto-generated purchase orders",
            },
            {
              title: "Financial Forecasting",
              desc: "Revenue from PMS + costs from AP + labor from payroll = real-time P&L by outlet, by day",
            },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                padding: 12,
                borderRadius: 8,
                background: "rgba(15, 23, 42, 0.5)",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: "#06b6d4",
                  fontSize: 13,
                  marginBottom: 4,
                }}
              >
                {item.title}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────

export default function IntegrationCommandCenter() {
  const [activeTab, setActiveTab] = useState("marketplace");
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [desktopDownloads, setDesktopDownloads] = useState<{
    mac: string;
    windows: string;
  }>({ mac: "", windows: "" });
  const [desktopDownloadsLoading, setDesktopDownloadsLoading] = useState(false);

  const connectedIds = new Set(connections.map((c) => c.systemId));

  const loadStats = useCallback(async () => {
    const s = await fetchStats();
    if (s) setStats(s);
  }, []);

  const loadConnections = useCallback(async () => {
    const c = await fetchConnections();
    setConnections(c);
  }, []);

  const refetch = useCallback(() => {
    loadStats();
    loadConnections();
  }, [loadStats, loadConnections]);

  useEffect(() => {
    loadStats();
    loadConnections();
  }, [loadStats, loadConnections]);

  useEffect(() => {
    if (
      activeTab === "desktop" &&
      !desktopDownloads.mac &&
      !desktopDownloads.windows
    ) {
      setDesktopDownloadsLoading(true);
      fetchDesktopDownloads().then((d) => {
        setDesktopDownloads(d);
        setDesktopDownloadsLoading(false);
      });
    }
  }, [activeTab, desktopDownloads.mac, desktopDownloads.windows]);

  const handleConnect = useCallback(
    async (systemId: string) => {
      setConnectingId(systemId);
      const ok = await connectSystem(systemId);
      setConnectingId(null);
      if (ok) refetch();
    },
    [refetch],
  );

  const handleSaveConfig = useCallback(async () => {
    const ok = await saveConfig();
    setSaveMessage(ok ? "Configuration saved." : "Save failed.");
    if (ok) loadStats();
    setTimeout(() => setSaveMessage(null), 3000);
  }, [loadStats]);

  const handleSyncAll = useCallback(async () => {
    setSyncing(true);
    const ok = await syncAll();
    setSyncing(false);
    if (ok) refetch();
  }, [refetch]);

  const tabs = [
    {
      id: "marketplace",
      label: "Marketplace",
      icon: "🔌",
      count: VENDOR_SYSTEMS.length,
    },
    {
      id: "connections",
      label: "Active",
      icon: "⚡",
      count: connections.length || MOCK_CONNECTIONS.length,
    },
    {
      id: "outlets",
      label: "Outlets & GL",
      icon: "🏪",
      count: stats?.outletsCount ?? MOCK_OUTLETS.length,
    },
    { id: "invoices", label: "Invoice Routing", icon: "📄" },
    { id: "desktop", label: "Desktop", icon: "🖥️" },
    { id: "echo", label: "EchoAI³", icon: "🧠" },
  ];

  const connectedCount =
    stats?.connectedCount ??
    MOCK_CONNECTIONS.filter((c) => c.status === "active").length;
  const totalSystems = stats?.totalSystems ?? VENDOR_SYSTEMS.length;
  const outletsCount = stats?.outletsCount ?? MOCK_OUTLETS.length;
  const glCodesCount = stats?.glCodesCount ?? MOCK_GL_MAPPINGS.length;
  const dataPointsSynced = stats?.dataPointsSynced ?? 66971;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0e1a",
        color: "#e2e8f0",
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          padding: "24px 32px",
          borderBottom: "1px solid rgba(51, 65, 85, 0.4)",
          background:
            "linear-gradient(180deg, rgba(15, 23, 42, 0.9), rgba(10, 14, 26, 0.95))",
          position: "sticky",
          top: 0,
          zIndex: 100,
          backdropFilter: "blur(20px)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: 14,
                  color: "#000",
                }}
              >
                L
              </div>
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 22,
                    fontWeight: 800,
                    color: "#f1f5f9",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Integration Command Center
                </h1>
                <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                  LUCCCA Framework · Admin Settings · Connect everything,
                  control everything
                </p>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search systems..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid rgba(71, 85, 105, 0.4)",
                background: "rgba(15, 23, 42, 0.6)",
                color: "#e2e8f0",
                fontSize: 13,
                width: 220,
                outline: "none",
              }}
            />
            <Btn variant="primary" size="md" onClick={handleSaveConfig}>
              Save Configuration
            </Btn>
            {saveMessage && (
              <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>
                {saveMessage}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 32, marginTop: 16 }}>
          {[
            {
              label: "Connected Systems",
              value: connectedCount,
              total: totalSystems,
              color: "#10b981",
            },
            {
              label: "Outlets Configured",
              value: outletsCount,
              color: "#f59e0b",
            },
            { label: "GL Codes Mapped", value: glCodesCount, color: "#3b82f6" },
            {
              label: "Data Points Synced",
              value:
                typeof dataPointsSynced === "number"
                  ? dataPointsSynced.toLocaleString()
                  : dataPointsSynced,
              color: "#8b5cf6",
            },
          ].map((stat, i) => (
            <div key={i}>
              <div style={{ fontSize: 20, fontWeight: 800, color: stat.color }}>
                {"total" in stat && stat.total != null
                  ? `${stat.value}/${stat.total}`
                  : String(stat.value)}
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 32px" }}>
        <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

        {activeTab === "marketplace" && (
          <IntegrationsMarketplace
            searchQuery={searchQuery}
            connectedIds={connectedIds}
            onConnect={handleConnect}
            connectingId={connectingId}
          />
        )}
        {activeTab === "connections" && (
          <ActiveConnections
            connections={connections}
            onSyncAll={handleSyncAll}
            syncing={syncing}
          />
        )}
        {activeTab === "outlets" && <OutletManager />}
        {activeTab === "invoices" && <InvoiceRouting />}
        {activeTab === "desktop" && (
          <DesktopIntegration
            macUrl={desktopDownloads.mac}
            windowsUrl={desktopDownloads.windows}
            loading={desktopDownloadsLoading}
          />
        )}
        {activeTab === "echo" && <EchoIntelligence />}
      </div>
    </div>
  );
}
