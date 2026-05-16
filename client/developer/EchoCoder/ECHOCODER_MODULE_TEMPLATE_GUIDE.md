# EchoCoder Module Development Template Guide

> The Complete Playbook for Building Enterprise Features - Learn from 4 Tiers of Production-Ready Code

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Database Schema Pattern](#database-schema-pattern)
3. [Backend Route Pattern](#backend-route-pattern)
4. [Frontend Service Pattern](#frontend-service-pattern)
5. [UI Component Pattern](#ui-component-pattern)
6. [Help System Integration](#help-system-integration)
7. [Integration Checklist](#integration-checklist)
8. [Advanced Patterns](#advanced-patterns)

---

## Architecture Overview

Every enterprise feature follows a 4-layer architecture:

```
┌─────────────────────────────────────┐
│   Frontend UI Components            │  (React, TypeScript, Tailwind)
│   - Pages, Panels, Dialogs          │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Frontend Services                 │  (API Wrappers, State Management)
│   - API calls, error handling       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Backend Routes (Express)          │  (REST endpoints, business logic)
│   - CRUD, validation, complex ops   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Database Schema (Supabase)        │  (Tables, indexes, triggers, RLS)
│   - Data models, relationships      │
└─────────────────────────────────────┘
```

---

## Database Schema Pattern

### Template Structure

```sql
-- 1. MAIN TABLE (Entity storage)
CREATE TABLE IF NOT EXISTS public.{feature_name} (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  {core_fields} NOT NULL,
  {optional_fields},
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. RELATED TABLES (Relations, history, logs)
CREATE TABLE IF NOT EXISTS public.{feature_name}_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  {feature_name}_id UUID NOT NULL REFERENCES public.{feature_name}(id) ON DELETE CASCADE,
  action VARCHAR(50),
  changes JSONB,
  changed_by VARCHAR(100),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. INDEXES (Performance optimization)
CREATE INDEX IF NOT EXISTS idx_{feature_name}_workspace ON public.{feature_name}(workspace_id);
CREATE INDEX IF NOT EXISTS idx_{feature_name}_created ON public.{feature_name}(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_{feature_name}_status ON public.{feature_name}(status);

-- 4. TRIGGERS (Auto-update timestamps, maintain audit trail)
CREATE OR REPLACE FUNCTION update_{feature_name}_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER {feature_name}_timestamp BEFORE UPDATE ON public.{feature_name}
  FOR EACH ROW EXECUTE FUNCTION update_{feature_name}_timestamp();
```

### Schema Best Practices

- ✅ Always have `workspace_id` for multi-tenancy
- ✅ Use `JSONB` for flexible metadata/config
- ✅ Include `created_at` and `updated_at` timestamps
- ✅ Create indexes on frequently queried fields (workspace, status, dates)
- ✅ Use CASCADE DELETE for related tables
- ✅ Use triggers for audit trails and auto-updates

---

## Backend Route Pattern

### Template Structure (Express Router)

```typescript
import express, { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

const router: Router = express.Router();

let supabase: ReturnType<typeof createClient> | null = null;

if (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY) {
  supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );
}

const ensureSupabase = (req: Request, res: Response, next: Function) => {
  if (!supabase) {
    return res.status(503).json({ error: "Supabase not configured" });
  }
  next();
};

router.use(ensureSupabase);

// ===== STANDARD CRUD ENDPOINTS =====

// List items
router.get("/", async (req: Request, res: Response) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const { data, count, error } = await supabase!
      .from("table_name")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (error) throw error;

    res.json({
      data: data || [],
      total: count || 0,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create item
router.post("/", async (req: Request, res: Response) => {
  try {
    const { field1, field2, workspace_id } = req.body;

    if (!field1 || !workspace_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { data, error } = await supabase!
      .from("table_name")
      .insert({ field1, field2, workspace_id })
      .select();

    if (error) throw error;

    res.json({
      success: true,
      message: "Item created",
      data: data[0],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get item
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase!
      .from("table_name")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update item
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase!
      .from("table_name")
      .update({ ...updates, updated_at: new Date() })
      .eq("id", id)
      .select();

    if (error) throw error;

    res.json({
      success: true,
      message: "Item updated",
      data: data[0],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete item
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await supabase!.from("table_name").delete().eq("id", id);

    res.json({
      success: true,
      message: "Item deleted",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### Route Best Practices

- ✅ Always use consistent response format: `{ success, message, data }`
- ✅ Validate required fields before database operations
- ✅ Use proper HTTP status codes (400, 404, 409, 500)
- ✅ Return count with list endpoints for pagination
- ✅ Include `updated_at` in update operations
- ✅ Handle duplicate key errors (409 status)
- ✅ Use proper error messages for client debugging

---

## Frontend Service Pattern

```typescript
// services/featureService.ts

const API_BASE = "/api/feature";

interface Feature {
  id: string;
  workspace_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export const featureService = {
  // List
  async list(params: { limit?: number; offset?: number } = {}) {
    const query = new URLSearchParams();
    if (params.limit) query.append("limit", params.limit.toString());
    if (params.offset) query.append("offset", params.offset.toString());

    const response = await fetch(`${API_BASE}?${query}`);
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  // Create
  async create(data: Partial<Feature>) {
    const response = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  // Get
  async get(id: string) {
    const response = await fetch(`${API_BASE}/${id}`);
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  // Update
  async update(id: string, data: Partial<Feature>) {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  // Delete
  async delete(id: string) {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },
};
```

---

## UI Component Pattern

```typescript
// components/FeaturePanel.tsx

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { featureService } from "@/services/featureService";

export function FeaturePanel() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const result = await featureService.list();
      setItems(result.data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (name: string) => {
    try {
      const result = await featureService.create({ name });
      setItems([...items, result.data]);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-900/20 text-red-200 rounded">
            {error}
          </div>
        )}

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-center p-2 border rounded">
                <span>{item.name}</span>
                <Button size="sm" variant="outline">
                  Edit
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Help System Integration

### Pattern for Help Guides

```typescript
// lib/feature-help-content.ts

export const FEATURE_HELP_GUIDES = {
  overview: {
    id: "feature-overview",
    title: "Feature Overview",
    description: "Learn about the feature",
    difficulty: "beginner",
    timeEstimate: 5,
    content: `# Feature Overview\n\nYour detailed guide content...`,
    relatedGuides: [],
  },
};

export const FEATURE_WALKTHROUGHS = {
  first_time: {
    id: "feature-first-time",
    title: "First Time Setup",
    steps: [
      {
        number: 1,
        title: "Step 1",
        description: "Description",
        action: "Action to take",
        tips: ["Tip 1"],
      },
    ],
  },
};
```

---

## Integration Checklist

- [ ] Create database schema (`lib/supabase/feature-schema.sql`)
- [ ] Create backend routes (`server/routes/feature.ts`)
- [ ] Create frontend service (`client/services/featureService.ts`)
- [ ] Create UI component (`client/components/FeaturePanel.tsx`)
- [ ] Create help content (`client/lib/feature-help-content.ts`)
- [ ] Add route to `server/index.ts` (`app.use("/api/feature", featureRouter)`)
- [ ] Add component to appropriate page
- [ ] Test all CRUD operations
- [ ] Test error handling
- [ ] Test with different user roles
- [ ] Document API endpoints
- [ ] Create unit tests

---

## Advanced Patterns

### Filtering & Search

```typescript
// In backend route
let query = supabase!
  .from("table")
  .select("*");

if (search) {
  query = query.or(`field1.ilike.%${search}%,field2.ilike.%${search}%`);
}

if (status) {
  query = query.eq("status", status);
}

if (from_date) {
  query = query.gte("created_at", from_date);
}
```

### Pagination

```typescript
const { data, count } = await query
  .range(offset, offset + limit - 1);

return {
  data,
  total: count,
  hasMore: offset + limit < count
};
```

### Batch Operations

```typescript
const records = items.map(item => ({
  ...item,
  workspace_id,
}));

const { data, error } = await supabase!
  .from("table")
  .upsert(records, { onConflict: "id" });
```

### Aggregations

```typescript
// Count by status
const { data } = await supabase!
  .from("table")
  .select("status, count");

const stats = {};
data.forEach(row => {
  stats[row.status] = row.count;
});
```

---

## Summary

This template captures the patterns used to build 4 tiers of enterprise features:
- **Tier 1**: 5 features (~1,500 LOC)
- **Tier 2**: 5 features (~1,800 LOC)
- **Tier 3**: 5 features (~2,100 LOC)
- **Tier 4**: 4 features (~1,600 LOC)

**Total: 19 Production Features, 7,000+ LOC, 130+ API Endpoints**

Use these patterns to build the next 100 features with consistency and quality.
