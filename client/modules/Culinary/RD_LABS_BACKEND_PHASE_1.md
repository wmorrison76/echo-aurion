# R&D Labs Phase 1 - Backend Persistence

## Overview
This document outlines Phase 1 implementation for R&D Labs backend persistence, authentication integration, and API design.

## Phase 1: Production Basics (Weeks 1-2)

### 1.1 Database Schema
```sql
-- Experiments Table
CREATE TABLE experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  hypothesis TEXT,
  specialization TEXT CHECK (specialization IN ('culinary', 'pastry', 'cross-disciplinary')),
  status TEXT CHECK (status IN ('ideation', 'testing', 'ready', 'archived', 'deployed')) DEFAULT 'ideation',
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archived_at TIMESTAMP WITH TIME ZONE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_by_email TEXT
);

-- Experiment Steps Table
CREATE TABLE experiment_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  variables TEXT[], -- JSON array of variable names
  observations TEXT,
  results TEXT,
  status TEXT CHECK (status IN ('pending', 'in-progress', 'completed', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Experiment Variables Table
CREATE TABLE experiment_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('temperature', 'time', 'ingredient', 'ratio', 'technique', 'other')),
  baseline_value TEXT,
  test_value TEXT,
  unit TEXT,
  is_independent BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insights Table
CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  metric_type TEXT CHECK (metric_type IN ('margin', 'guest_sentiment', 'supplier_volatility', 'operational', 'custom')),
  value NUMERIC,
  unit TEXT,
  trend TEXT CHECK (trend IN ('improving', 'stable', 'declining')) DEFAULT 'stable',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Collaboration Access Table
CREATE TABLE experiment_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'editor', 'viewer')) DEFAULT 'viewer',
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(experiment_id, user_id)
);

-- Recipe Linking Table
CREATE TABLE experiment_recipe_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL,
  implementation_notes TEXT,
  status TEXT CHECK (status IN ('linked', 'testing', 'deployed', 'archived')) DEFAULT 'linked',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX experiments_user_id ON experiments(user_id);
CREATE INDEX experiments_status ON experiments(status);
CREATE INDEX experiments_created_at ON experiments(created_at DESC);
CREATE INDEX experiment_steps_experiment_id ON experiment_steps(experiment_id);
CREATE INDEX experiment_variables_experiment_id ON experiment_variables(experiment_id);
CREATE INDEX experiment_access_user_id ON experiment_access(user_id);
CREATE INDEX insights_experiment_id ON insights(experiment_id);
```

### 1.2 Authentication Integration
- Users table linked via `auth.users(id)` from Supabase Auth
- Row-Level Security (RLS) policies to restrict data access
- `created_by_email` and `created_by_name` for audit trails

### 1.3 API Endpoints

#### Experiments CRUD
- `POST /api/experiments` - Create experiment
- `GET /api/experiments` - List user's experiments with filtering
- `GET /api/experiments/:id` - Get experiment details
- `PATCH /api/experiments/:id` - Update experiment
- `DELETE /api/experiments/:id` - Soft delete/archive experiment

#### Experiment Steps
- `POST /api/experiments/:id/steps` - Add step
- `PATCH /api/experiments/:id/steps/:stepId` - Update step
- `DELETE /api/experiments/:id/steps/:stepId` - Delete step

#### Variables
- `POST /api/experiments/:id/variables` - Add variable
- `PATCH /api/experiments/:id/variables/:varId` - Update variable

#### Collaboration
- `POST /api/experiments/:id/access` - Invite collaborator
- `PATCH /api/experiments/:id/access/:accessId` - Update role
- `DELETE /api/experiments/:id/access/:accessId` - Revoke access

#### Recipe Linking
- `POST /api/experiments/:id/links` - Link recipe
- `GET /api/experiments/:id/links` - Get linked recipes
- `DELETE /api/experiments/:id/links/:linkId` - Unlink recipe

#### Insights
- `GET /api/experiments/:id/insights` - Get experiment insights
- `POST /api/insights/dashboard` - Get dashboard metrics

### 1.4 Response Format (Standardized)
```typescript
{
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}
```

## Phase 2: Advanced Features (Weeks 3-4)
- Real-time collaboration with Supabase Realtime
- Batch operations API
- Export/Import functionality
- Search and filtering across experiments
- Template system with CRUD operations

## Phase 3: Analytics & Optimization (Weeks 5-6)
- Experiment success metrics
- Correlation analysis
- Performance optimization
- Audit logging
- Advanced search with full-text search

## Success Criteria
✅ All CRUD operations work correctly
✅ User authentication verified
✅ RLS policies enforce data security
✅ API response times < 500ms
✅ Database backups configured
✅ Error handling comprehensive
