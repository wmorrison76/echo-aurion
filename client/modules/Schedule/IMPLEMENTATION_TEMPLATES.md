# Implementation Templates & Code Examples

**Reference guide for implementing audit recommendations**

---

## 1. Input Validation Pattern

### Template: Validation Middleware

```typescript
// server/middleware/validation.ts
import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../lib/errors";

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated as any; // Now type-safe
      next();
    } catch (error: any) {
      throw new AppError(
        400,
        "Invalid query parameters",
        "VALIDATION_ERROR",
        { errors: error.errors }
      );
    }
  };
}

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error: any) {
      throw new AppError(
        400,
        "Invalid request body",
        "VALIDATION_ERROR",
        { errors: error.errors }
      );
    }
  };
}
```

### Template: Schema Definition

```typescript
// server/schemas/staff.ts
import { z } from "zod";

export const getSkillsSchema = z.object({
  dept_id: z.string().uuid("Invalid department UUID"),
});

export const setSkillLevelSchema = z.object({
  employee_id: z.string().uuid("Invalid employee UUID"),
  slug: z.string().min(1, "Skill slug required"),
  level: z.number().int().min(0).max(5, "Level must be 0-5"),
});

export const postRatingSchema = z.object({
  employee_id: z.string().uuid("Invalid employee UUID"),
  outlet_id: z.string().uuid("Invalid outlet UUID"),
  shift_date: z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid date"),
  punctuality: z.number().min(0).max(5),
  quality: z.number().min(0).max(5),
  teamwork: z.number().min(0).max(5),
  guest_feedback: z.number().min(0).max(5),
  notes: z.string().optional(),
});

export const forecastIntervalSchema = z.object({
  dept_id: z.string().uuid(),
  date: z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid date"),
  interval: z.enum(["15", "30"]).optional().default("15"),
  demand: z
    .array(
      z.object({
        ts: z.string(),
        required: z.number().min(0),
      })
    )
    .optional(),
});
```

### Usage in Route

```typescript
// server/api/routes/staff.ts
import { Router } from "express";
import { validateQuery, validateBody } from "../../middleware/validation";
import { getSkillsSchema, setSkillLevelSchema } from "../../schemas/staff";

const router = Router();

router.get("/skills", validateQuery(getSkillsSchema), async (req, res) => {
  // req.query is now validated and typed
  const { dept_id } = req.query as any;
  // Implementation
});

router.post(
  "/skills/level",
  validateBody(setSkillLevelSchema),
  async (req, res) => {
    // req.body is now validated and typed
    const { employee_id, slug, level } = req.body;
    // Implementation
  }
);

export default router;
```

---

## 2. Error Handling Pattern

### Template: AppError Class

```typescript
// server/lib/errors.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(details: Record<string, any>) {
    super(400, "Validation failed", "VALIDATION_ERROR", details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication required") {
    super(401, message, "AUTHENTICATION_ERROR");
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "Access denied") {
    super(403, message, "AUTHORIZATION_ERROR");
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, "NOT_FOUND");
  }
}

export class DatabaseError extends AppError {
  constructor(operation: string, table: string, details?: any) {
    super(
      500,
      `Database error during ${operation}`,
      "DATABASE_ERROR",
      { operation, table, ...details }
    );
  }
}
```

### Template: Error Handler Middleware

```typescript
// server/middleware/errorHandler.ts
import { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = req.headers["x-request-id"] as string;

  if (err instanceof AppError) {
    logger.error(err.message, {
      requestId,
      statusCode: err.statusCode,
      code: err.code,
      details: err.details,
    });

    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
      requestId,
      timestamp: new Date().toISOString(),
    });
  } else {
    logger.error("Unexpected error", {
      requestId,
      error: err.message,
      stack: err.stack,
    });

    res.status(500).json({
      error: "Internal Server Error",
      code: "INTERNAL_ERROR",
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### Usage in Routes

```typescript
// Before (bad)
router.get("/skills", async (req, res) => {
  try {
    const { dept_id } = req.query as any;
    if (!dept_id) {
      return res.status(400).json({ error: "dept_id required" });
    }
    const { data, error } = await supabase.from("skills").select("*");
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json({ skills: data });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// After (good)
router.get("/skills", validateQuery(getSkillsSchema), async (req, res) => {
  const { dept_id } = req.query as any; // Already validated

  const { data, error } = await supabase.from("skills").select("*");
  if (error) {
    throw new DatabaseError("select", "skills", { original: error });
  }

  res.json({ skills: data });
});

// Error handler middleware catches any thrown errors
```

---

## 3. Authorization Pattern

### Template: Tenant Validation

```typescript
// server/lib/tenantValidation.ts
import { Request } from "express";
import { AuthorizationError } from "./errors";

export function validateTenantAccess(
  req: Request,
  requiredRole?: string
): { org_id: string; outlet_id: string; dept_id: string } {
  const user = (req as any).user; // Set by authenticateUser middleware

  if (!user) {
    throw new AuthorizationError("User not authenticated");
  }

  const org_id = req.body.org_id || req.query.org_id;
  const outlet_id = req.body.outlet_id || req.query.outlet_id;
  const dept_id = req.body.dept_id || req.query.dept_id;

  // Verify user belongs to org
  if (user.org_id !== org_id) {
    throw new AuthorizationError(
      "Access denied: User does not belong to this organization"
    );
  }

  // Verify user role if required
  if (requiredRole && !hasRequiredRole(user.role, requiredRole)) {
    throw new AuthorizationError(
      `Access denied: User role "${user.role}" insufficient for "${requiredRole}"`
    );
  }

  return { org_id, outlet_id, dept_id };
}

function hasRequiredRole(userRole: string, requiredRole: string): boolean {
  const roleHierarchy: Record<string, number> = {
    EMPLOYEE: 1,
    DEPT_MGR: 2,
    GM: 3,
    ADMIN: 4,
  };

  return (roleHierarchy[userRole] || 0) >= (roleHierarchy[requiredRole] || 0);
}
```

### Template: Authorization Middleware

```typescript
// server/middleware/authz.ts
import { Request, Response, NextFunction } from "express";
import { AuthenticationError, AuthorizationError } from "../lib/errors";

export function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // In production, validate actual JWT token
  // For now, check Authorization header (mock)
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    // In development, allow without auth
    // In production, require auth
    if (process.env.NODE_ENV === "production") {
      throw new AuthenticationError("Authorization header required");
    }
    (req as any).user = {
      id: "mock-user",
      org_id: "mock-org",
      role: "ADMIN",
    };
  } else {
    // Parse JWT token (pseudo-code)
    const token = authHeader.replace("Bearer ", "");
    // Verify token with your auth provider
    // (req as any).user = verifyToken(token);
  }

  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      throw new AuthenticationError();
    }

    if (!roles.includes(user.role)) {
      throw new AuthorizationError(
        `Access denied: Required one of [${roles.join(", ")}], got ${user.role}`
      );
    }

    next();
  };
}
```

### Usage in Routes

```typescript
// server/api/routes/staff.ts
import { Router } from "express";
import { requireRole } from "../../middleware/authz";
import { validateTenantAccess } from "../../lib/tenantValidation";

const router = Router();

// Only DEPT_MGR, GM, ADMIN can access staff routes
router.post(
  "/rate",
  requireRole("DEPT_MGR", "GM", "ADMIN"),
  validateTenantAccess,
  async (req, res) => {
    const { org_id, outlet_id, dept_id } = req.body;
    // User is validated to belong to this org and have required role
    // Implementation
  }
);
```

---

## 4. Database Constraints

### SQL: Ratings Table Constraints

```sql
-- Add constraints to ratings table
ALTER TABLE ratings 
ADD CONSTRAINT punctuality_range CHECK (punctuality >= 0 AND punctuality <= 5),
ADD CONSTRAINT quality_range CHECK (quality >= 0 AND quality <= 5),
ADD CONSTRAINT teamwork_range CHECK (teamwork >= 0 AND teamwork <= 5),
ADD CONSTRAINT guest_feedback_range CHECK (guest_feedback >= 0 AND guest_feedback <= 5);

-- Add index for common queries
CREATE INDEX idx_ratings_dept_date ON ratings(dept_id, shift_date DESC);
CREATE INDEX idx_ratings_employee ON ratings(employee_id);

-- Add RLS policy (employees see own, managers see dept)
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY ratings_employee_see_own ON ratings
  FOR SELECT USING (
    employee_id = auth.uid()
  );

CREATE POLICY ratings_manager_see_dept ON ratings
  FOR SELECT USING (
    dept_id IN (SELECT dept_id FROM employees WHERE org_id = auth.tenant_id())
  );

CREATE POLICY ratings_manager_insert ON ratings
  FOR INSERT WITH CHECK (
    dept_id IN (SELECT dept_id FROM employees WHERE org_id = auth.tenant_id())
  );
```

### SQL: Other Key Constraints

```sql
-- Add org_id to departments (CRITICAL)
ALTER TABLE departments 
ADD COLUMN org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE;

-- Unique constraints
ALTER TABLE employee_skills 
ADD CONSTRAINT unique_emp_skill UNIQUE(employee_id, skill_slug);

ALTER TABLE skills 
ADD CONSTRAINT unique_skill_slug UNIQUE(org_id, slug);

-- Monetary field constraints
ALTER TABLE shifts 
ADD CONSTRAINT tips_nonnegative CHECK (tips_declared >= 0);

ALTER TABLE employees 
ADD CONSTRAINT hourly_rate_nonnegative CHECK (hourly_rate >= 0);

ALTER TABLE positions 
ADD CONSTRAINT base_rate_nonnegative CHECK (base_rate >= 0);

-- Date constraints
ALTER TABLE development_plans 
ADD CONSTRAINT end_after_start CHECK (end_date > start_date);

-- Check for soft deletes
ALTER TABLE employees 
ADD COLUMN deleted_at timestamptz DEFAULT NULL;

-- Query filter: WHERE deleted_at IS NULL
```

---

## 5. Pagination Pattern

### Template: Paginated Query

```typescript
// server/lib/pagination.ts
export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export function getPaginationParams(req: any): PaginationParams {
  const limit = Math.min(
    Math.max(parseInt(req.query.limit || "50"), 1),
    500
  );
  const offset = Math.max(parseInt(req.query.offset || "0"), 0);
  return { limit, offset };
}

export async function paginate<T>(
  query: any, // Supabase query builder
  limit: number,
  offset: number
): Promise<PaginationResult<T>> {
  const { data, count, error } = await query
    .select("*", { count: "exact" })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return {
    data: data || [],
    total: count || 0,
    offset,
    limit,
    hasMore: (count || 0) > offset + limit,
  };
}
```

### Usage in Routes

```typescript
// server/api/routes/events.ts
import { getPaginationParams, paginate } from "../../lib/pagination";

router.get("/", validateQuery(listEventsSchema), async (req, res) => {
  const { dept_id } = req.query as any;
  const { limit, offset } = getPaginationParams(req);

  const result = await paginate(
    supabase
      .from("events")
      .select("*")
      .eq("dept_id", dept_id)
      .order("service_date", { ascending: false }),
    limit,
    offset
  );

  res.json(result);
});

// Response:
// {
//   "data": [...],
//   "total": 150,
//   "offset": 0,
//   "limit": 50,
//   "hasMore": true
// }
```

### Frontend Usage

```typescript
// client/hooks/useEvents.ts
const [offset, setOffset] = useState(0);
const [events, setEvents] = useState([]);

const { data, isLoading } = useQuery({
  queryKey: ["events", deptId, offset],
  queryFn: async () => {
    const res = await fetch(
      `/api/events?dept_id=${deptId}&offset=${offset}&limit=50`
    );
    return res.json();
  },
});

const handleLoadMore = () => {
  if (data?.hasMore) {
    setEvents([...events, ...data.data]);
    setOffset(offset + 50);
  }
};
```

---

## 6. Structured Logging

### Template: Logger Service

```typescript
// server/lib/logger.ts
import { format } from "date-fns";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  data?: Record<string, any>;
  stack?: string;
}

class Logger {
  private isDev = process.env.NODE_ENV === "development";

  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, any>,
    stack?: string
  ) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...data,
      ...(stack && { stack }),
    };

    if (this.isDev) {
      console.log(
        `[${entry.timestamp}] ${level.toUpperCase()}: ${message}`,
        data
      );
    } else {
      // Production: JSON logs for parsing
      console.log(JSON.stringify(entry));
    }
  }

  debug(message: string, data?: Record<string, any>) {
    if (process.env.LOG_LEVEL === "debug" || this.isDev) {
      this.log("debug", message, data);
    }
  }

  info(message: string, data?: Record<string, any>) {
    this.log("info", message, data);
  }

  warn(message: string, data?: Record<string, any>) {
    this.log("warn", message, data);
  }

  error(message: string, data?: Record<string, any>, error?: Error) {
    this.log("error", message, data, error?.stack);
  }
}

export const logger = new Logger();
```

### Usage in Routes

```typescript
// server/api/routes/staff.ts
router.post("/rate", async (req, res) => {
  const { requestId } = req;
  const { employee_id, shift_date } = req.body;

  logger.info("Creating rating", { requestId, employee_id, shift_date });

  try {
    const { data, error } = await supabase
      .from("ratings")
      .insert({ ...req.body });

    if (error) {
      logger.error("Rating creation failed", { requestId, error });
      throw new DatabaseError("insert", "ratings", error);
    }

    logger.info("Rating created successfully", {
      requestId,
      rating_id: data[0]?.id,
    });

    res.json({ ok: true, rating_id: data[0]?.id });
  } catch (err) {
    logger.error("Unexpected error in /rate", { requestId }, err as Error);
    throw err;
  }
});
```

---

## 7. Frontend Error Boundary

### Template: React Error Boundary

```typescript
// client/components/ErrorBoundary.tsx
import React from "react";
import { logger } from "@/lib/logger";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorId: "",
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `err-${Date.now()}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error("Component error caught", {
      errorId: this.state.errorId,
      error: error.message,
      component: errorInfo.componentStack,
    });

    // Optionally send to error tracking service
    // Sentry.captureException(error, { tags: { errorId: this.state.errorId } });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
          <div className="max-w-md p-8 space-y-4">
            <h1 className="text-2xl font-bold text-destructive">
              Oops, something went wrong
            </h1>
            <p className="text-muted-foreground">
              We're working to fix this. Here's your error ID:
            </p>
            <code className="block p-2 bg-muted text-xs rounded">
              {this.state.errorId}
            </code>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="text-xs">
                <summary>Error details</summary>
                <pre className="mt-2 p-2 bg-muted overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded"
              >
                Reload
              </button>
              <button
                onClick={() =>
                  window.location.href = `mailto:support@example.com?subject=Error ${this.state.errorId}`
                }
                className="px-4 py-2 bg-secondary rounded"
              >
                Report
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Usage in App.tsx

```typescript
// client/App.tsx
import { ErrorBoundary } from "@/components/ErrorBoundary";

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
```

---

## 8. N+1 Query Fixes

### Before (N+1 Problem)

```typescript
// ❌ BAD: 2+ queries
router.get("/performance", async (req, res) => {
  const { dept_id } = req.query as any;

  // Query 1: Get all shifts
  const { data: shifts } = await supabase
    .from("shifts")
    .select("*")
    .eq("dept_id", dept_id);

  // Query 2: Get all employees (separate)
  const empIds = [...new Set(shifts.map((s: any) => s.employee_id))];
  const { data: emps } = await supabase
    .from("employees")
    .select("*")
    .in("id", empIds);

  // Map employees into shifts
  const empMap = Object.fromEntries(emps.map((e: any) => [e.id, e]));
  const result = shifts.map((s: any) => ({
    ...s,
    employee: empMap[s.employee_id],
  }));

  res.json(result);
});
```

### After (Single Query with JOIN)

```typescript
// ✅ GOOD: 1 query with JOIN
router.get("/performance", async (req, res) => {
  const { dept_id } = req.query as any;

  // Single query with JOIN
  const { data: results } = await supabase
    .from("shifts")
    .select(
      `
      *,
      employees (
        id,
        first_name,
        last_name,
        hourly_rate,
        role_title
      )
    `
    )
    .eq("dept_id", dept_id);

  // Already combined, no mapping needed
  res.json(results);
});
```

### Alternative: Using Database Views

```sql
-- Create a view in Supabase
CREATE VIEW shifts_with_employees AS
SELECT
  s.*,
  e.first_name,
  e.last_name,
  e.hourly_rate,
  e.role_title
FROM shifts s
LEFT JOIN employees e ON s.employee_id = e.id;

-- Index it for performance
CREATE INDEX idx_shifts_emp_view_dept ON shifts_with_employees(dept_id);
```

```typescript
// Query the view (1 query, pre-joined)
const { data } = await supabase
  .from("shifts_with_employees")
  .select("*")
  .eq("dept_id", dept_id);
```

---

## Quick Implementation Checklist

### Week 1 Checklist

- [ ] Create `server/schemas/` directory with validation files
- [ ] Create `server/middleware/validation.ts`
- [ ] Create `server/lib/errors.ts` with AppError classes
- [ ] Create `server/middleware/errorHandler.ts`
- [ ] Update `server/index.ts` to use error handler middleware
- [ ] Add `validateQuery` to all GET routes
- [ ] Add `validateBody` to all POST/PATCH routes
- [ ] Add `requireRole` to sensitive routes
- [ ] Run database migrations for constraints
- [ ] Test: Call endpoint with invalid data → Should get 400, not 500

### Week 2 Checklist

- [ ] Create `server/lib/pagination.ts`
- [ ] Add pagination to list endpoints (GET /events, /shifts, /performance)
- [ ] Create `server/lib/logger.ts`
- [ ] Add request ID middleware
- [ ] Replace `console.log` with logger calls
- [ ] Create `client/components/ErrorBoundary.tsx`
- [ ] Wrap App.tsx with ErrorBoundary
- [ ] Fix N+1 queries (JOIN instead of separate queries)
- [ ] Add database indices
- [ ] Load test: 100 concurrent users, measure response time

### Verification Commands

```bash
# Type check
npm run typecheck

# Run any existing tests
npm run test

# Build
npm run build

# Load test (requires k6 or Artillery)
# k6 run loadtest.js

# Lint (if configured)
# npm run lint
```

---

**Use these templates to implement the audit recommendations**
