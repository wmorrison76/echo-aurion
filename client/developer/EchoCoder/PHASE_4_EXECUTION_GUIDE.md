# Phase 4 Execution Guide - Module Pages Responsive Refactoring

**Scope:** 16 Module Pages  
**Estimated Time:** 2-3 days for complete implementation  
**Pattern:** Use template below + responsive utilities

---

## QUICK REFERENCE: REFACTORING CHECKLIST

### Per-Page Refactoring (15-20 minutes)

```
1. [ ] Add imports: ResponsiveContainer, ResponsiveGrid, useBreakpoint
2. [ ] Wrap main div with <ResponsiveContainer className="py-6 sm:py-8">
3. [ ] Update header typography (text-2xl sm:text-3xl)
4. [ ] Replace grid-cols with ResponsiveGrid
5. [ ] Update spacing (gap-4 sm:gap-6, p-4 sm:p-6)
6. [ ] Update button sizes (use isMobile variable)
7. [ ] Test on mobile (xs: 375px), tablet (md: 768px), desktop (lg: 1024px)
8. [ ] Verify dark mode works
9. [ ] Check accessibility (ARIA labels, focus states)
10. [ ] TypeScript validation (npm run typecheck)
```

---

## UNIVERSAL TEMPLATE

```tsx
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  ResponsiveGrid,
  useBreakpoint,
} from "@/components/layout";
import { [YourIcon] } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function [YourPage]() {
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "xs" || breakpoint === "sm";
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <ResponsiveContainer className="py-6 sm:py-8">
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <[YourIcon] className="h-6 w-6 sm:h-8 sm:w-8" />
              <span>[Your Page Title]</span>
            </h1>
            <p className="text-xs sm:text-base text-muted-foreground mt-2">
              [Page description]
            </p>
          </div>
          <Button 
            className="w-full sm:w-auto text-xs sm:text-sm"
            size={isMobile ? "sm" : "default"}
          >
            [Action]
          </Button>
        </div>

        {/* Content Grid */}
        <ResponsiveGrid 
          cols={{ xs: 1, sm: 2, md: 2, lg: 3, xl: 4 }}
          gap="lg"
        >
          {/* Cards/Items */}
          {items.map((item) => (
            <Card key={item.id} className="hover:border-primary/50 transition">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">{item.title}</CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  {item.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  {item.tags?.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full text-xs sm:text-sm"
                >
                  View
                </Button>
              </CardContent>
            </Card>
          ))}
        </ResponsiveGrid>
      </div>
    </ResponsiveContainer>
  );
}
```

---

## MODULE PAGES - GROUP BY GROUP

### GROUP 1: CULINARY & KITCHEN (4 Pages)

#### Canvas.tsx
**Current Issues:** Hard-coded width, non-responsive canvas
**Changes:**
- Wrap with ResponsiveContainer
- Use ResponsiveGrid for tool panels
- Make canvas full-width on mobile
- Stack tool panels vertically on mobile

**Pattern:** Editor page with sidebar
```tsx
<ResponsiveContainer>
  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-80px)]">
    <div className="lg:col-span-3 border rounded">{/* Canvas */}</div>
    <div className="lg:col-span-1">{/* Tools Sidebar */}</div>
  </div>
</ResponsiveContainer>
```

#### Culinary.tsx
**Current Issues:** Grid not responsive
**Changes:**
- Replace hard-coded columns with ResponsiveGrid
- Add responsive header with breadcrumbs
- Implement sticky filters on mobile

**Pattern:** Card grid with filters
```tsx
<ResponsiveContainer>
  <ResponsiveGrid cols={{ xs: 1, sm: 2, md: 3, lg: 4 }} gap="lg">
    {recipes.map(recipe => <RecipeCard key={recipe.id} {...recipe} />)}
  </ResponsiveGrid>
</ResponsiveContainer>
```

#### Pastry.tsx
**Current Issues:** Similar to Culinary
**Pattern:** Same as Culinary.tsx

#### Schedule.tsx
**Current Issues:** Timeline not responsive
**Pattern:** Timeline with responsive event cards
```tsx
<ResponsiveContainer>
  {/* Header */}
  {/* Timeline - can become vertical on mobile */}
  <div className="space-y-2 sm:space-y-4">
    {events.map(event => <EventCard key={event.id} {...event} />)}
  </div>
</ResponsiveContainer>
```

---

### GROUP 2: TEAM & MANAGEMENT (4 Pages)

#### ChefNet.tsx
**Current Issues:** Chat + user list not optimized for mobile
**Pattern:** 2-column on desktop, tabs on mobile
```tsx
<ResponsiveContainer>
  {isMobile ? (
    <Tabs>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="chat">Chat</TabsTrigger>
        <TabsTrigger value="users">Team</TabsTrigger>
      </TabsList>
      <TabsContent value="chat">{/* Chat */}</TabsContent>
      <TabsContent value="users">{/* Users */}</TabsContent>
    </Tabs>
  ) : (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2">{/* Chat */}</div>
      <div>{/* Users */}</div>
    </div>
  )}
</ResponsiveContainer>
```

#### CRM.tsx
**Current Issues:** Data table not responsive
**Pattern:** Responsive data table
```tsx
<ResponsiveContainer>
  <div className="overflow-x-auto">
    <table className="w-full text-xs sm:text-sm">
      {/* Hide non-critical columns on mobile */}
      <thead>
        <tr>
          <th className="text-left p-2">{/* Name */}</th>
          <th className="hidden sm:table-cell p-2">{/* Email */}</th>
          <th className="text-right p-2">{/* Actions */}</th>
        </tr>
      </thead>
    </table>
  </div>
</ResponsiveContainer>
```

#### Aurum.tsx
**Current Issues:** Premium features layout not responsive
**Pattern:** Feature cards grid
```tsx
<ResponsiveContainer>
  <ResponsiveGrid cols={{ xs: 1, sm: 1, md: 2, lg: 3 }} gap="lg">
    {features.map(feature => <FeatureCard key={feature.id} {...feature} />)}
  </ResponsiveGrid>
</ResponsiveContainer>
```

#### Inventory.tsx
**Current Issues:** Inventory list/grid not responsive
**Pattern:** Same as CRM.tsx (table) or ResponsiveGrid (cards)

---

### GROUP 3: ADVANCED FEATURES (4 Pages)

#### EchoCoder.tsx
**Current Issues:** Code generation UI not responsive
**Pattern:** 2-column on desktop, editor focus on mobile
```tsx
<ResponsiveContainer>
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
    <div>{/* Input */}</div>
    <div>{/* Output */}</div>
  </div>
</ResponsiveContainer>
```

#### VisualEditor.tsx
**Pattern:** Similar to Canvas.tsx
```tsx
<ResponsiveContainer>
  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
    <div className="lg:col-span-3">{/* Editor */}</div>
    <div className="lg:col-span-1">{/* Inspector */}</div>
  </div>
</ResponsiveContainer>
```

#### Generated.tsx
**Pattern:** Display grid for generated items
```tsx
<ResponsiveContainer>
  <ResponsiveGrid cols={{ xs: 1, sm: 2, md: 3, lg: 4 }} gap="lg">
    {generated.map(item => <GeneratedItemCard key={item.id} {...item} />)}
  </ResponsiveGrid>
</ResponsiveContainer>
```

#### Orchestrator.tsx
**Pattern:** Workflow diagram with responsive legend
```tsx
<ResponsiveContainer>
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <div className="lg:col-span-2">{/* Diagram */}</div>
    <div className="lg:col-span-1">{/* Legend/Info */}</div>
  </div>
</ResponsiveContainer>
```

---

### GROUP 4: INTEGRATION & CONFIG (4 Pages)

#### Settings.tsx
**Pattern:** Form with sections
```tsx
<ResponsiveContainer>
  <div className="max-w-2xl space-y-6 sm:space-y-8">
    {/* Settings sections */}
    {sections.map(section => (
      <Card key={section.id}>
        <CardHeader><CardTitle>{section.title}</CardTitle></CardHeader>
        <CardContent>{section.content}</CardContent>
      </Card>
    ))}
  </div>
</ResponsiveContainer>
```

#### GitIntegration.tsx
#### WebhookManager.tsx
#### Sandbox.tsx
**Pattern:** Form-based pages similar to Settings.tsx

---

## RESPONSIVE SIZING CONVENTIONS

Use these consistently across all pages:

### Typography Scaling
```tsx
// Headings
<h1 className="text-2xl sm:text-3xl font-bold">Title</h1>
<h2 className="text-xl sm:text-2xl font-bold">Subtitle</h2>
<h3 className="text-lg sm:text-xl font-bold">Section</h3>

// Body text
<p className="text-xs sm:text-sm">Description</p>
<p className="text-xs sm:text-base">Regular text</p>

// Labels
<label className="text-xs sm:text-sm font-medium">Label</label>
```

### Spacing Scaling
```tsx
// Gaps
gap="md" {/* = gap-3 sm:gap-4 sm:gap-6 */}
gap="lg" {/* = gap-4 sm:gap-6 */}

// Padding
className="p-4 sm:p-6" {/* = padding: 1rem; @sm: 1.5rem; */}
className="px-3 sm:px-4"
className="py-2 sm:py-4"

// Margins
className="mb-4 sm:mb-6"
className="mt-6 sm:mt-8"
```

### Button Sizing
```tsx
// On mobile
<Button size={isMobile ? "sm" : "default"} className="w-full sm:w-auto">
  Action
</Button>

// Or always responsive
<Button className="text-xs sm:text-sm h-8 sm:h-10">Action</Button>
```

---

## TESTING CHECKLIST PER PAGE

- [ ] TypeScript: `npm run typecheck`
- [ ] Mobile (xs: 375px): Single column, full-width buttons
- [ ] Tablet (sm: 640px): Responsive layouts
- [ ] Tablet (md: 768px): Enhanced layouts
- [ ] Desktop (lg: 1024px): Multi-column layouts visible
- [ ] Dark mode: All colors readable
- [ ] Keyboard: Tab navigation works
- [ ] Accessibility: ARIA labels present
- [ ] Console: No errors/warnings

---

## IMPLEMENTATION SEQUENCE

### Day 1: Culinary & Kitchen (4 pages) + Team & Management (4 pages)
```
Morning:
- Canvas.tsx (30 min)
- Culinary.tsx (15 min)
- Pastry.tsx (15 min)
- Schedule.tsx (20 min)

Afternoon:
- ChefNet.tsx (25 min)
- CRM.tsx (20 min)
- Aurum.tsx (15 min)
- Inventory.tsx (20 min)

Total: ~2 hours
```

### Day 2: Advanced Features (4 pages) + Integration & Config (4 pages)
```
Morning:
- EchoCoder.tsx (25 min)
- VisualEditor.tsx (25 min)
- Generated.tsx (15 min)
- Orchestrator.tsx (25 min)

Afternoon:
- Settings.tsx (20 min)
- GitIntegration.tsx (15 min)
- WebhookManager.tsx (15 min)
- Sandbox.tsx (15 min)

Total: ~2.5 hours
```

### Quality Assurance: 30-60 minutes
- Run full test suite
- Manual testing on multiple devices
- Accessibility audit

---

## EXPECTED RESULTS

After completing Phase 4:
- ✅ 16 module pages fully responsive
- ✅ All pages support 6 breakpoints (xs, sm, md, lg, xl, 2xl)
- ✅ 35-50% scroll reduction across all pages
- ✅ Full dark mode support
- ✅ 95+ accessibility score
- ✅ Zero TypeScript errors
- ✅ Consistent UI patterns

**Total Phase 4 Effort:** 2-3 days
**Total Phase 4 LOC:** ~2,000+

---

## COMMON PATTERNS QUICK REFERENCE

### Pattern 1: Simple Grid
```tsx
<ResponsiveGrid cols={{ xs: 1, sm: 2, md: 3, lg: 4 }} gap="lg">
  {items.map(item => <Card key={item.id}>{...}</Card>)}
</ResponsiveGrid>
```

### Pattern 2: 2-Column
```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
  <div className="lg:col-span-2">{/* Main */}</div>
  <div>{/* Sidebar */}</div>
</div>
```

### Pattern 3: Tabs on Mobile
```tsx
{isMobile ? (
  <Tabs>
    <TabsList className="grid grid-cols-2 gap-1">
      <TabsTrigger value="tab1">Tab 1</TabsTrigger>
      <TabsTrigger value="tab2">Tab 2</TabsTrigger>
    </TabsList>
    ...
  </Tabs>
) : (
  <div className="grid grid-cols-2 gap-4">{/* Side by side */}</div>
)}
```

---

This guide provides everything needed to complete Phase 4 efficiently.
Simply follow the template, apply the patterns, and use the implementation sequence.

**Ready to begin Phase 4? Start with Canvas.tsx!**
