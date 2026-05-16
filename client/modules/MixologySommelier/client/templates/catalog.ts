export type Template = {
  id: string;
  name: string;
  description: string;
  kind:
    | "landing"
    | "dashboard"
    | "docs"
    | "blog"
    | "portfolio"
    | "store"
    | "admin"
    | "auth"
    | "pricing"
    | "gallery"
    | "help"
    | "analytics"
    | "sidebar"
    | "minimal"
    | "marketing";
};
export const templates: Template[] = [
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean, centered content with simple sections.",
    kind: "minimal",
  },
  {
    id: "sidebar",
    name: "Sidebar",
    description: "Left navigation sidebar with content area.",
    kind: "sidebar",
  },
  {
    id: "dashboard",
    name: "Dashboard",
    description: "Cards, charts, and KPIs for product back‑office.",
    kind: "dashboard",
  },
  {
    id: "landing",
    name: "Landing",
    description: "Hero, features, social proof, and CTA footer.",
    kind: "landing",
  },
  {
    id: "blog",
    name: "Blog",
    description: "Post feed, categories, and article page.",
    kind: "blog",
  },
  {
    id: "docs",
    name: "Docs",
    description: "Docs with sidebar TOC, search, and content.",
    kind: "docs",
  },
  {
    id: "portfolio",
    name: "Portfolio",
    description: "Grid projects, case studies, and contact.",
    kind: "portfolio",
  },
  {
    id: "store",
    name: "Storefront",
    description: "Product grid, PDP, cart, and checkout.",
    kind: "store",
  },
  {
    id: "marketing",
    name: "Marketing",
    description: "Sections for features, pricing, FAQ, and signup.",
    kind: "marketing",
  },
  {
    id: "admin",
    name: "Admin",
    description: "Tables, filters, forms, and settings.",
    kind: "admin",
  },
  {
    id: "analytics",
    name: "Analytics",
    description: "Time series, breakdowns, and funnels.",
    kind: "analytics",
  },
  {
    id: "help",
    name: "Help Center",
    description: "Knowledge base, categories, articles, and search.",
    kind: "help",
  },
  {
    id: "auth",
    name: "Auth",
    description: "Sign in/up, forgot password, and profile.",
    kind: "auth",
  },
  {
    id: "pricing",
    name: "Pricing",
    description: "Tiered plans, toggles, and comparison table.",
    kind: "pricing",
  },
  {
    id: "gallery",
    name: "Gallery",
    description: "Masonry grid, filters, and lightbox.",
    kind: "gallery",
  },
];
