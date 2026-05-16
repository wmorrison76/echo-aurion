# Development Guidelines

## Code Style & Conventions

### TypeScript
- Always use explicit types for function parameters and returns
- Avoid `any` - use `unknown` if needed, then narrow with type guards
- Use interfaces for object shapes, types for unions/primitives
- Keep types in `shared/types/*.d.ts` for client-server sharing

### React Components
- Use functional components with hooks only
- Name components with PascalCase
- Keep components focused on single responsibility
- Extract complex logic to custom hooks
- Use TSX file extension

### File Structure
```typescript
// Component structure
export const MyComponent: React.FC<Props> = ({ prop1, prop2 }) => {
  // Hooks first
  const { data } = useData();
  const [state, setState] = useState(initialValue);

  // Effects
  useEffect(() => {
    // side effects
  }, [dependencies]);

  // Handlers
  const handleClick = () => { /* ... */ };

  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
};

interface Props {
  prop1: string;
  prop2?: number;
}
```

## Multi-Tenant Requirements

### Every Request Must Include
```typescript
{
  org_id: string;
  outlet_id: string;
  dept_id: string;
}
```

### API Route Pattern
```typescript
router.get("/", async (req, res) => {
  try {
    const { org_id, outlet_id, dept_id } = req.query;
    
    // Validate required params
    if (!org_id || !outlet_id || !dept_id) {
      return res.status(400).json({ error: "Required params missing" });
    }

    // Query scoped to tenant
    const { data, error } = await supabase
      .from("table")
      .select("*")
      .eq("org_id", org_id)
      .eq("outlet_id", outlet_id)
      .eq("dept_id", dept_id);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
```

### Component Pattern
```typescript
export const MyComponent: React.FC = () => {
  const { tenancy, loading } = useTenancy();

  // Wait for tenancy to load
  if (loading) {
    return <div>Loading...</div>;
  }

  // Ensure tenancy is configured
  if (!tenancy.org_id || !tenancy.outlet_id || !tenancy.dept_id) {
    return <div>Please select organization, outlet, and department</div>;
  }

  return (
    // Use tenancy.org_id, tenancy.outlet_id, tenancy.dept_id in API calls
  );
};
```

## Adding New Features

### Add a New API Route

**1. Create server/api/routes/myroute.ts**
```typescript
import { Router } from "express";
import { supabase } from "../../lib/db";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { org_id, outlet_id, dept_id } = req.query;
    
    if (!org_id || !outlet_id || !dept_id) {
      return res.status(400).json({ error: "Missing required params" });
    }

    // Implement endpoint
    res.json({ data: [] });
  } catch (err: any) {
    console.error("Error:", err);
    res.status(500).json({ error: err?.message || "Internal Server Error" });
  }
});

export default router;
```

**2. Register in server/index.ts**
```typescript
import myRoute from "./api/routes/myroute";

export function createServer() {
  const app = express();
  
  // ... existing middleware ...
  
  app.use("/api/myroute", myRoute);
  
  return app;
}
```

### Add a New Component

**1. Create client/components/MyComponent.tsx**
```typescript
import React, { useState } from "react";
import { useTenancy } from "@/hooks/useTenancy";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  title?: string;
}

export const MyComponent: React.FC<Props> = ({ title = "My Component" }) => {
  const { tenancy } = useTenancy();
  const [loading, setLoading] = useState(false);

  if (!tenancy.org_id) {
    return <div>Please select organization</div>;
  }

  return (
    <Card className="p-4">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      {/* Component content */}
    </Card>
  );
};
```

**2. Use in Dashboard or Page**
```typescript
import { MyComponent } from "@/components/MyComponent";

export function Dashboard() {
  return (
    <div>
      <MyComponent title="Custom Title" />
    </div>
  );
}
```

### Add a New Hook

**1. Create client/hooks/useMyHook.ts**
```typescript
import { useState, useCallback } from "react";
import { useTenancy } from "./useTenancy";

export function useMyHook() {
  const { tenancy } = useTenancy();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!tenancy.org_id) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/myroute?org_id=${tenancy.org_id}&outlet_id=${tenancy.outlet_id}&dept_id=${tenancy.dept_id}`
      );

      if (!res.ok) throw new Error(`API error: ${res.statusText}`);

      const result = await res.json();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [tenancy]);

  return { data, loading, error, fetchData };
}
```

**2. Use in Components**
```typescript
import { useMyHook } from "@/hooks/useMyHook";

export function MyComponent() {
  const { data, loading, error, fetchData } = useMyHook();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div>{/* render data */}</div>;
}
```

## Error Handling

### API Errors
```typescript
try {
  const res = await fetch(url);
  
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  
  const data = await res.json();
} catch (err) {
  const message = err instanceof Error ? err.message : "Unknown error";
  setError(message);
  console.error("API error:", err);
}
```

### Server Errors
```typescript
router.get("/", async (req, res) => {
  try {
    // Implementation
  } catch (err: any) {
    console.error("Error details:", err);
    
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    res.status(statusCode).json({ error: message });
  }
});
```

## Testing Patterns

### Component Testing
```typescript
import { render, screen } from "@testing-library/react";
import { MyComponent } from "./MyComponent";

describe("MyComponent", () => {
  it("renders title", () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText("Test")).toBeInTheDocument();
  });
});
```

### Hook Testing
```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { useMyHook } from "@/hooks/useMyHook";

describe("useMyHook", () => {
  it("fetches data", async () => {
    const { result } = renderHook(() => useMyHook());
    
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
  });
});
```

## Performance Optimization

### Memoization
```typescript
import { useMemo, useCallback } from "react";

export const MyComponent: React.FC = () => {
  // Memoize expensive computations
  const expensiveValue = useMemo(() => {
    return complexCalculation();
  }, [dependencies]);

  // Memoize callbacks
  const handleClick = useCallback(() => {
    doSomething();
  }, [dependencies]);

  return <div />;
};
```

### List Rendering
```typescript
// Good: add key and memoize
{items.map((item) => (
  <MemoizedItem key={item.id} item={item} />
))}

// Avoid: no key or using index
{items.map((item, idx) => (
  <Item key={idx} item={item} />
))}
```

### Query Optimization
```typescript
// Fetch only needed fields
const { data } = await supabase
  .from("shifts")
  .select("id, employee_id, starts_at, ends_at")  // Limit fields
  .eq("dept_id", deptId)
  .limit(100);  // Limit results

// Use indices for common queries
.eq("outlet_id", outletId)  // Index exists
.gte("starts_at", weekStart)  // Index exists
```

## Security Best Practices

### Never Expose Secrets
```typescript
// ❌ WRONG: Secret in client code
const apiKey = "sk-...";

// ✅ CORRECT: Call server endpoint
const response = await fetch("/api/myroute", {
  method: "POST",
  body: JSON.stringify({ /* data */ })
  // Server handles secrets
});
```

### Validate Tenant Access
```typescript
// ✅ CORRECT: Always check tenant scope
if (userOrgId !== requestOrgId) {
  return res.status(403).json({ error: "Forbidden" });
}

// Query scoped to tenant
.eq("org_id", orgId)
.eq("outlet_id", outletId)
.eq("dept_id", deptId)
```

### Sanitize User Input
```typescript
// Use prepared statements (Supabase handles this)
const { data } = await supabase
  .from("table")
  .select("*")
  .eq("id", userInput);  // Safe with Supabase

// Validate and parse
const parsed = parseInt(userInput, 10);
if (isNaN(parsed)) {
  return res.status(400).json({ error: "Invalid input" });
}
```

## Git Workflow

### Commit Messages
```bash
# Good
git commit -m "Add tip pool scenario comparison"
git commit -m "Fix SPLH calculation for overtime hours"

# Bad
git commit -m "fix"
git commit -m "changes"
```

### Branch Naming
```bash
feature/tip-pool-studio
bugfix/splh-calculation
refactor/tenancy-hook
docs/architecture-guide
```

## Testing Checklist

Before pushing code:
- [ ] Code compiles (`npm run typecheck`)
- [ ] No console errors in dev tools
- [ ] All props typed correctly
- [ ] Tenancy context accessed correctly
- [ ] API endpoints have required params
- [ ] Error handling implemented
- [ ] Loading states displayed
- [ ] Mobile responsive (if UI)

## Documentation

### Comments
```typescript
// ✅ Good: Explains WHY
// Using gen_random_uuid() in SQL to avoid concurrent ID collisions
const id = "generated-server-side";

// ❌ Bad: Explains WHAT (code already says what)
// Set ID
const id = "...";
```

### JSDoc
```typescript
/**
 * Calculate payroll with OT/DT thresholds
 * 
 * @param hours - Total hours worked (not including breaks)
 * @param rate - Hourly wage in USD
 * @param policy - Payroll policy (OT thresholds, multipliers)
 * @returns Payroll breakdown with regular/OT/DT components
 * 
 * @example
 * const result = applyPolicy({
 *   daily: [8, 9, 8, 10],
 *   baseRate: 20,
 *   policy: { weekly_ot_threshold: 40, ot_multiplier: 1.5 }
 * });
 */
export function applyPolicy(config) {
  // implementation
}
```

## Debugging Tips

### Browser DevTools
```javascript
// Check tenancy context
localStorage.getItem("shiftflow:tenancy")

// Check API calls
fetch("/api/schedule", { /* params */ })
  .then(r => r.json())
  .then(console.log)

// Time execution
console.time("myFunction");
myFunction();
console.timeEnd("myFunction");
```

### Server Logs
```bash
# Check terminal output when npm run dev
# Look for console.error() messages

# Supabase dashboard: check Database logs
# Check for failed RLS policies or constraint violations
```

### Supabase Dashboard
- SQL Editor: Test queries
- Authentication: Manage users
- Logs: View database operations
- Database: Inspect data directly

## Common Pitfalls

### ❌ Forgetting to Scope by Tenant
```typescript
// WRONG: Returns data from all orgs
const { data } = await supabase
  .from("shifts")
  .select("*");
```

### ✅ Always Scope
```typescript
// CORRECT: Only this org's data
const { data } = await supabase
  .from("shifts")
  .select("*")
  .eq("org_id", orgId)
  .eq("outlet_id", outletId)
  .eq("dept_id", deptId);
```

### ❌ Not Handling Loading/Error States
```typescript
// WRONG: No feedback to user
const { data } = useFetch("/api/data");
return <div>{data.map(...)}</div>;
```

### ✅ Show State
```typescript
// CORRECT
const { data, loading, error } = useFetch("/api/data");
if (loading) return <div>Loading...</div>;
if (error) return <div>Error: {error}</div>;
return <div>{data.map(...)}</div>;
```

### ❌ Props Typing
```typescript
// WRONG: No type safety
export const MyComponent = (props) => {
  return <div>{props.title}</div>;
};
```

### ✅ Type Props
```typescript
// CORRECT
interface Props {
  title: string;
  optional?: number;
}

export const MyComponent: React.FC<Props> = ({ title, optional }) => {
  return <div>{title}</div>;
};
```

---

**Last Updated**: 2024  
**Version**: 1.0.0

Follow these guidelines to maintain code quality, security, and consistency across the project.
