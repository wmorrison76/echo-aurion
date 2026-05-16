# Comparison: Upstream Echo Recipe Pro vs LUCCCA Culinary Module

This document compares the [upstream Echo Recipe Pro](https://github.com/wmorrison76/Echo-20Recipe-20Pro) repo (standalone app) with the LUCCCA Culinary module (panel-embedded) so we can align structure where it helps loading while keeping LUCCCA connections and updates.

**Upstream clone (for diffs):** `LUCCCA_Framework/upstream-echo-recipe-pro/` (from `git clone https://github.com/wmorrison76/Echo-20Recipe-20Pro.git`). Example: `diff upstream-echo-recipe-pro/client/App.tsx client/modules/Culinary/client/App.tsx`.

## Entry & bootstrap

| Aspect | Upstream (Echo Recipe Pro) | LUCCCA Culinary |
|--------|----------------------------|------------------|
| **Entry** | `index.html` → `/client/App.tsx`; App.tsx does `createRoot(container).render(<App />)` | Host app loads module; `client/modules/Culinary/index.tsx` is default export (panel wrapper) |
| **Router** | `BrowserRouter` in App.tsx wrapping `Routes` | No Router in module; relies on host’s `BrowserRouter` (see `client/App.tsx` MaybeRouter) |
| **Root element** | `#root` in index.html | Panel content is portaled by host into panel DOM node |

## App structure

| Layer | Upstream | LUCCCA Culinary |
|-------|----------|------------------|
| **App.tsx** | ErrorBoundary → QueryClient → Tooltip → Toaster → Sonner → AppDataProvider → **BrowserRouter** → Routes (/, /recipe/:id, /recipe/:id/view, *) | Panel wrapper (`index.tsx`) → App.tsx: ErrorBoundary → blue “App mounted” bar → Suspense → **Index** |
| **Index** | Simple: `TronBackdrop` → `min-h-screen` → **TopTabs** → **Tabs** (search, gallery, add-recipe, saas, production) via **useSearchParams("tab")** | Many providers → amber bar → Suspense → **RecipeContent** (sidebar + NAV_SECTIONS + active section) |
| **Main UI** | TopTabs + Tabs (URL-driven tab) | Left sidebar (NAV_SECTIONS) + main area (section component); no URL tabs |

## Providers

| Provider | Upstream | LUCCCA Culinary |
|----------|----------|------------------|
| QueryClient | ✓ | ✓ |
| TooltipProvider | ✓ | ✓ |
| Toaster / Sonner | ✓ | ✓ |
| AppDataProvider | ✓ | ✓ |
| **Router** | BrowserRouter in App | Host’s MaybeRouter (BrowserRouter) |
| LanguageProvider | — | ✓ (i18n) |
| AuthProvider | — | ✓ |
| YieldProvider | — | ✓ |
| PageToolbarProvider | — | ✓ |
| CollaborationProvider | — | ✓ |
| CulinaryInventoryProvider | — | ✓ (in panel wrapper) |

## Routing & navigation

- **Upstream**: Routes in App.tsx; Index uses `useSearchParams()` for tab; RecipeEditor/RecipeTemplate use `useParams`/`useNavigate`.
- **LUCCCA**: No Routes inside Culinary; RecipeContent uses local state `activeSection` for section; some sections (RecipeSearch, TabletSetup, RecipeEditor, etc.) use `useSearchParams`/`useNavigate` from `react-router-dom` — they expect to run under a Router (host provides it when panel is inside main app).

## Key file mapping

| Upstream | LUCCCA Culinary |
|----------|------------------|
| `client/App.tsx` (entry + Router + Routes) | `client/modules/Culinary/index.tsx` (wrapper) + `client/modules/Culinary/client/App.tsx` (no Router/Routes) |
| `client/pages/Index.tsx` (Tabs + TopTabs) | `client/modules/Culinary/client/pages/Index.tsx` (providers + RecipeContent) |
| `client/pages/sections/RecipeSearch.tsx` | `client/modules/Culinary/client/pages/sections/RecipeSearch.tsx` |
| `client/context/AppDataContext.tsx` | `client/modules/Culinary/client/context/AppDataContext.tsx` (extended) |

## What we keep (LUCCCA connections & updates)

- All LUCCCA providers (Language, Auth, Yield, PageToolbar, Collaboration, CulinaryInventory).
- Panel-aware wrapper, layout fixes, and debug bars until panel loads.
- Sidebar + NAV_SECTIONS + section components (RecipeSearch, AddRecipe, etc.) and all integrations (Echo Training, inventory, etc.).
- Host Router: panel is rendered inside host’s `MaybeRouter` → Router context is available; no need to add BrowserRouter inside the module. Optionally add **MemoryRouter** when `useInRouterContext()` is false so the module works when embedded without a host Router.

## What we aligned / can align for loading

1. **Router fallback** (done): Added `CulinaryRouterWrapper` in `index.tsx`: if `useInRouterContext()` is false, wrap in `MemoryRouter` with `initialEntries={["/"]}` so `useSearchParams`/`useNavigate` in sections don’t throw and the panel can load. Same pattern as EchoAurum/OrderingInventory.
2. **Entry chain**: Keep App → Index → RecipeContent; ensure the Index wrapper div has explicit `minHeight` so the amber/lime debug bars and RecipeContent get space (already done).
3. **Upstream simplicity**: Upstream Index is minimal (Tabs + sections). Our RecipeContent is the real “main page”; we keep it but ensure no provider or import fails when run inside the panel (e.g. `@/` resolving to host, auth/i18n available).

## How to use this comparison

- **Loading / blank panel**: Ensure Router context (host or MemoryRouter fallback), layout height chain (minHeights), and no throwing providers; use debug bars to see how far the tree renders.
- **Merging upstream changes**: When pulling from [Echo-20Recipe-20Pro](https://github.com/wmorrison76/Echo-20Recipe-20Pro), merge into `client/modules/Culinary/client/` (App, pages, context, components); keep `index.tsx` panel wrapper and LUCCCA-specific providers and wiring.
