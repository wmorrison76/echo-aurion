import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const sections = [
  {
    slug: "orgs",
    label: "Multi‑tenant Orgs/SSO",
    body: (
      <div className="space-y-2 text-sm">
        <p className="font-medium">What it includes</p>
        <ul className="list-disc pl-5">
          <li>Organizations with roles (Owner, Admin, Editor, Viewer)</li>
          <li>Invite by email, role-based access control, audit trail</li>
          <li>SSO via OAuth2/OIDC (Google, Microsoft, Okta)</li>
        </ul>
        <p className="font-medium">Implementation notes</p>
        <ul className="list-disc pl-5">
          <li>
            Use Supabase Auth or Auth.js; RBAC tables (orgs, memberships, roles)
          </li>
          <li>Row-level security by org_id on all records</li>
          <li>Sentry for security/event logging</li>
        </ul>
      </div>
    ),
  },
  {
    slug: "workspaces",
    label: "Team Workspaces / Sync",
    body: (
      <div className="space-y-2 text-sm">
        <p className="font-medium">What it includes</p>
        <ul className="list-disc pl-5">
          <li>Shared collections, real-time presence, comments</li>
          <li>Cloud sync with optimistic updates and conflict resolution</li>
        </ul>
        <p className="font-medium">Implementation notes</p>
        <ul className="list-disc pl-5">
          <li>Supabase Realtime or Convex for live sync</li>
          <li>Activity feed with per-entity history</li>
        </ul>
      </div>
    ),
  },
  {
    slug: "pricing",
    label: "Pricing/COGS/Menu",
    body: (
      <div className="space-y-2 text-sm">
        <p className="font-medium">What it includes</p>
        <ul className="list-disc pl-5">
          <li>Ingredient costs, yield factors, recipe COGS</li>
          <li>Menu engineering (stars, plowhorses, etc.)</li>
        </ul>
        <p className="font-medium">Implementation notes</p>
        <ul className="list-disc pl-5">
          <li>Normalized ingredients, suppliers, price history</li>
          <li>Dashboards with margin and price recommendations</li>
        </ul>
      </div>
    ),
  },
  {
    slug: "inventory",
    label: "Inventory & Suppliers",
    body: (
      <div className="space-y-2 text-sm">
        <p className="font-medium">What it includes</p>
        <ul className="list-disc pl-5">
          <li>Supplier catalogs, unit conversions, allergens</li>
          <li>Par levels, stock counts, purchase orders</li>
        </ul>
        <p className="font-medium">Implementation notes</p>
        <ul className="list-disc pl-5">
          <li>Catalog import (CSV/API), unit-normalized SKUs</li>
          <li>PO workflow with approval and receiving</li>
        </ul>
      </div>
    ),
  },
  {
    slug: "nutrition",
    label: "Nutrition/Allergens",
    body: (
      <div className="space-y-2 text-sm">
        <p className="font-medium">What it includes</p>
        <ul className="list-disc pl-5">
          <li>Automatic nutrition labels and allergen flags</li>
          <li>Diet suitability (vegan, keto, halal)</li>
        </ul>
        <p className="font-medium">Implementation notes</p>
        <ul className="list-disc pl-5">
          <li>USDA/Spoonacular datasets; calculated per serving</li>
          <li>Label templates for print/web</li>
        </ul>
      </div>
    ),
  },
  {
    slug: "haccp",
    label: "HACCP/Compliance",
    body: (
      <div className="space-y-2 text-sm">
        <p className="font-medium">What it includes</p>
        <ul className="list-disc pl-5">
          <li>Critical control points, temp logs, corrective actions</li>
          <li>Daily/shift checklists with sign-off</li>
        </ul>
        <p className="font-medium">Implementation notes</p>
        <ul className="list-disc pl-5">
          <li>Form builder + templated logs; immutable audit</li>
          <li>PDF exports for inspectors</li>
        </ul>
      </div>
    ),
  },
  {
    slug: "approvals",
    label: "Approvals/Versioning",
    body: (
      <div className="space-y-2 text-sm">
        <p className="font-medium">What it includes</p>
        <ul className="list-disc pl-5">
          <li>Draft → Review → Approved workflow with comments</li>
          <li>Version snapshots, diffs, rollbacks</li>
        </ul>
        <p className="font-medium">Implementation notes</p>
        <ul className="list-disc pl-5">
          <li>Immutable version table; reviewer assignments</li>
          <li>Notifications via email/Zapier</li>
        </ul>
      </div>
    ),
  },
  {
    slug: "api",
    label: "API/Webhooks/Zapier",
    body: (
      <div className="space-y-2 text-sm">
        <p className="font-medium">What it includes</p>
        <ul className="list-disc pl-5">
          <li>Public REST/GraphQL, API keys per org</li>
          <li>Outgoing webhooks and Zapier actions</li>
        </ul>
        <p className="font-medium">Implementation notes</p>
        <ul className="list-disc pl-5">
          <li>Rate limits, audit logs, HMAC signatures</li>
          <li>Docs portal with examples</li>
        </ul>
      </div>
    ),
  },
  {
    slug: "mobile",
    label: "Mobile/Offline",
    body: (
      <div className="space-y-2 text-sm">
        <p className="font-medium">What it includes</p>
        <ul className="list-disc pl-5">
          <li>PWA with home-screen install</li>
          <li>Offline edits and background sync</li>
        </ul>
        <p className="font-medium">Implementation notes</p>
        <ul className="list-disc pl-5">
          <li>Service worker, IndexedDB cache, conflict resolution</li>
          <li>Responsive pages for phones/tablets</li>
        </ul>
      </div>
    ),
  },
  {
    slug: "multi",
    label: "Multi-location",
    body: (
      <div className="space-y-2 text-sm">
        <p className="font-medium">What it includes</p>
        <ul className="list-disc pl-5">
          <li>Sites/locations with overrides and rollouts</li>
          <li>Centralized content with local variations</li>
        </ul>
        <p className="font-medium">Implementation notes</p>
        <ul className="list-disc pl-5">
          <li>Inheritance model by location_id</li>
          <li>Release waves and publish windows</li>
        </ul>
      </div>
    ),
  },
  {
    slug: "billing",
    label: "Billing/Subscriptions",
    body: (
      <div className="space-y-2 text-sm">
        <p className="font-medium">What it includes</p>
        <ul className="list-disc pl-5">
          <li>Plans, seats, meter-based usage, invoices</li>
          <li>Trials, coupons, dunning and proration</li>
        </ul>
        <p className="font-medium">Implementation notes</p>
        <ul className="list-disc pl-5">
          <li>Stripe Billing + Customer Portal</li>
          <li>Org-scoped entitlements checked server-side</li>
        </ul>
      </div>
    ),
  },
];

export default function SaasRoadmapSection() {
  return (
    <div className="container mx-auto px-4 py-4">
      <div className="rounded-xl border p-3 bg-white/95 dark:bg-zinc-900 ring-1 ring-black/5 dark:ring-sky-500/15 mb-3">
        <div className="text-sm text-muted-foreground">LUCCCA SaaS Roadmap</div>
        <div className="text-base font-semibold">Capabilities</div>
      </div>
      <Tabs defaultValue={sections[0].slug} className="w-full">
        <TabsList className="flex flex-wrap gap-1 p-1 bg-muted rounded-lg">
          {sections.map((s) => (
            <TabsTrigger key={s.slug} value={s.slug} className="text-xs">
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {sections.map((s) => (
          <TabsContent key={s.slug} value={s.slug}>
            <div className="rounded-xl border p-4 bg-white/95 dark:bg-zinc-900 ring-1 ring-black/5 dark:ring-sky-500/15">
              {s.body}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
