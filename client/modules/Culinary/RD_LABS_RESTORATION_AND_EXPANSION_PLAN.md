# R&D Labs - Complete Restoration and Expansion Plan

## Executive Summary

The R&D Labs system was originally designed as a **comprehensive culinary research and experimentation platform** with professional-grade features for managing recipe development projects. The current implementation has the full UI/UX components built, but lacks:

1. Backend persistence (everything is localStorage-only)
2. Authentication integration (mocked users)
3. Real-time collaboration (local state only)
4. Data validation and schema enforcement
5. Production-grade error handling

This document outlines how to restore the full original vision and expand it with advanced features.

---

## Original R&D Labs Vision

### Core Purpose
A dedicated workspace for culinary teams to:
- Document experimental recipes with scientific rigor
- Track hypothesis, variables, sensory targets, and texture objectives
- Manage multi-person collaboration on recipe innovation
- Link experiments to actual production recipes
- Export/import research for backup and sharing
- Specialize workflows (Culinary vs. Pastry)

### Key Differentiators
1. **Scientific Methodology** - Hypothesis-driven experimentation
2. **Sensory Framework** - Structured sensory target documentation
3. **Future-of-Food Focus** - Texture constellations, flavor science, innovative angles
4. **Professional Collaboration** - Multi-user with roles (owner, editor, viewer)
5. **Recipe Integration** - Direct linkage to production recipes

---

## Current Implementation Status

### ✅ What Exists (UI/Store Layer)

**Components (13 total)**:
- ProjectDashboard - Project selection interface
- WorkbenchPanel - Experiment editing interface
- DiscoveryPanel - Research inspiration
- GlobalExperimentSearch - Full-text search with filters
- ExperimentTemplates - Pre-built experiment templates
- CollaborationPanel - Add/remove collaborators
- BatchOperations - Bulk actions on experiments
- RecipeLinkingPanel - Link recipes to experiments
- ExportImport - JSON backup/restore
- InsightsPanel - Analytics dashboard
- RDLabSessionSidebar - Metadata display
- RDLabsHelpPanel - In-app documentation
- PastryLabPortal - Pastry-specialized workspace

**Store (Zustand)**:
- 33 methods for state management
- Types: LabExperiment, LabCollaborator, LabTask, RDLabSnapshot
- Seed data: 3 experiments, 3 projects
- Serialization: serializeState/hydrateState

**Features Implemented**:
- Experiment creation/editing
- Status tracking (ideation → testing → ready → archived)
- Collaboration tracking (collaborator IDs)
- Recipe linking (IDs only)
- Batch operations (select multiple, bulk status)
- Search and filter (by status, specialization, owner, tags)
- Templates (culinary, pastry, both)
- Export/Import (JSON file-based)
- Discovery queue
- Insights display

### ❌ What's Missing (Persistence/Integration Layer)

1. **Backend API** - No endpoints to persist projects/experiments
2. **Authentication** - No connection to real user/auth context
3. **Real-time Sync** - No WebSocket/sync for multi-user editing
4. **Data Validation** - No schema validation on import
5. **Access Control** - No RBAC enforcement (mocked permissions)
6. **Recipe Store Integration** - Using mock AVAILABLE_RECIPES
7. **Collaborator Management** - Using mock AVAILABLE_COLLABORATORS
8. **Project Persistence** - Demo projects only (no durable storage)

---

## Restoration Plan - Phase 1: Production Basics

### Goal: Make R&D Labs production-ready with backend support

#### 1.1 Backend API Design

```typescript
// POST /api/rdlabs/projects
// Create or update a project
Request: { name, specialization, vision?, createdBy, collaborators[] }
Response: { id, name, createdAt, updatedAt, ... }

// GET /api/rdlabs/projects
// List user's projects with pagination
Response: { projects[], total, hasMore }

// GET /api/rdlabs/projects/:id
// Get project with all experiments
Response: { project, experiments[] }

// POST /api/rdlabs/projects/:id/experiments
// Create experiment in project
Request: { title, hypothesis, specialization, owner, ... }
Response: { id, ...experiment }

// PATCH /api/rdlabs/experiments/:id
// Update experiment
Request: { status?, notes?, tags?, variables?, ... }
Response: { ...experiment }

// DELETE /api/rdlabs/experiments/:id
// Archive experiment
Response: { success: true }

// POST /api/rdlabs/experiments/:id/collaborators
// Add collaborator
Request: { email, role }
Response: { collaborator }

// POST /api/rdlabs/experiments/:id/recipes
// Link recipe
Request: { recipeId, notes? }
Response: { ...experiment }
```

#### 1.2 Database Schema (PostgreSQL)

```sql
CREATE TABLE rdlab_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  specialization ENUM('culinary', 'pastry', 'both'),
  vision TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  created_by TEXT,
  UNIQUE(user_id, name)
);

CREATE TABLE rdlab_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES rdlab_projects(id),
  title TEXT NOT NULL,
  status ENUM('ideation', 'testing', 'ready', 'archived'),
  owner TEXT NOT NULL,
  hypothesis TEXT,
  notes TEXT,
  tags TEXT[],
  specialization ENUM('culinary', 'pastry', 'both'),
  variables_under_test TEXT[],
  sensory_targets TEXT[],
  test_plan TEXT[],
  equipment TEXT[],
  launch_window TEXT,
  texture_objectives TEXT[],
  flavor_constellations TEXT[],
  future_food_angles TEXT[],
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE rdlab_collaborators (
  id UUID PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES rdlab_experiments(id),
  user_id UUID NOT NULL,
  role ENUM('owner', 'editor', 'viewer') DEFAULT 'editor',
  joined_at TIMESTAMP DEFAULT now()
);

CREATE TABLE rdlab_recipe_links (
  id UUID PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES rdlab_experiments(id),
  recipe_id TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

#### 1.3 Auth Integration

**Current Issue**: Hard-coded "Current User" in RecipeInputPage

**Solution**:
```typescript
// In useRDLabStore or a new useAuthContext
const user = useAuthContext(); // Get from your auth provider
const userId = user?.id;
const userName = user?.name ?? "Anonymous";

// When creating experiment:
const id = createExperiment({
  ...input,
  owner: userName,
  // Store userId for backend correlation
});

// When adding collaborator:
const addCollaborator = (experimentId, collaboratorEmail) => {
  // Call backend to invite user
  // Backend resolves email → userId
  // Store adds collaborator ID
};
```

#### 1.4 Store Modifications

```typescript
// Add async persistence methods to store
type RDLabState = {
  // ... existing fields
  
  // New async methods
  saveToPersistence: (snapshot: RDLabSnapshot) => Promise<void>;
  loadFromPersistence: (projectId: string) => Promise<void>;
  syncWithBackend: () => Promise<void>;
  
  // Backend references
  activeProjectId: string | null;
  setActiveProjectId: (id: string) => void;
  isDirty: boolean; // Track if local changes need syncing
  lastSyncTime: number;
};

// Implementation pattern:
const createExperiment = useCallback(
  async (input: NewExperimentInput): Promise<string> => {
    // 1. Create locally
    const id = generateExperimentId();
    const experiment = { id, ...input };
    setExperiments(prev => [experiment, ...prev]);
    
    // 2. Mark dirty
    setIsDirty(true);
    
    // 3. If connected, sync to backend
    if (activeProjectId) {
      try {
        await fetch(`/api/rdlabs/projects/${activeProjectId}/experiments`, {
          method: 'POST',
          body: JSON.stringify(experiment),
        });
        setLastSyncTime(Date.now());
      } catch (error) {
        // Keep local state, queue for retry
        console.warn('Sync failed, queued for retry', error);
      }
    }
    
    return id;
  },
  [activeProjectId],
);
```

#### 1.5 Implementation Steps

1. **Create backend endpoints** (Netlify functions or express server)
   - Time: 6-8 hours
   
2. **Add auth context integration**
   - Time: 2-3 hours
   - Replace hard-coded user references
   
3. **Update store with persistence methods**
   - Time: 4-6 hours
   - Add sync logic, error handling, retry queue
   
4. **Migrate localStorage to backend**
   - Time: 3-4 hours
   - Keep localStorage as cache, backend as source of truth
   
5. **Add data validation on import**
   - Time: 2-3 hours
   - JSON schema validation, version migration

**Phase 1 Total**: ~18-24 hours of development

---

## Expansion Plan - Phase 2: Advanced Collaboration

### Goal: Enable real-time multi-user experimentation

#### 2.1 Real-time Sync Architecture

**Option A: Supabase Realtime** (Recommended for quick MVP)
```typescript
// Subscribe to experiment changes
const realtimeSubscription = supabase
  .from(`rdlab_experiments:project_id=eq.${projectId}`)
  .on('*', (payload) => {
    // Merge incoming changes with local state
    mergeRemoteUpdate(payload);
  })
  .subscribe();
```

**Option B: WebSocket** (More control, needs server infrastructure)
```typescript
// Connect to experiment channel
const ws = new WebSocket(`wss://api.example.com/rdlabs/${projectId}/sync`);
ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  handleRemoteChange(type, data);
};
```

#### 2.2 Conflict Resolution

```typescript
// When local and remote changes collide:
type ConflictResolution = {
  // Use operational transformation or CRDT
  // Example: Last-write-wins with timestamp
  local: { timestamp: number, value: any },
  remote: { timestamp: number, value: any },
  resolved: any, // timestamp > uses that version
};

// Store all changes with timestamps
const appendVariable = useCallback(
  (experimentId: string, variable: string) => {
    const timestamp = Date.now();
    const change = { experimentId, variable, timestamp, userId };
    
    // Optimistic local update
    setExperiments(prev => /* apply change */);
    
    // Queue for sync
    queuedChanges.push(change);
    
    // Send to server
    syncChanges([change]);
  },
);
```

#### 2.3 Presence Awareness

```typescript
// Show who's editing what
type EditorPresence = {
  userId: string;
  experimentId: string;
  cursorPosition?: number;
  lastActive: number;
};

// Track in store:
const [presence, setPresence] = useState<EditorPresence[]>([]);

// Display in WorkbenchPanel:
<div className="text-sm text-slate-400">
  {presence.map(p => (
    <span key={p.userId}>{p.userId} editing...</span>
  ))}
</div>
```

#### 2.4 Implementation Steps

1. **Set up Supabase/WebSocket connection**
   - Time: 4-6 hours
   
2. **Implement sync queue and conflict resolution**
   - Time: 8-10 hours
   
3. **Add presence tracking UI**
   - Time: 3-4 hours
   
4. **Build activity timeline/audit log**
   - Time: 4-6 hours

**Phase 2 Total**: ~20-26 hours

---

## Expansion Plan - Phase 3: Advanced Features

### 3.1 Experiment Versioning

```typescript
// Save versions of experiments as they progress
CREATE TABLE rdlab_experiment_versions (
  id UUID PRIMARY KEY,
  experiment_id UUID REFERENCES rdlab_experiments(id),
  version_number INT,
  snapshot LabExperiment,
  changed_by TEXT,
  created_at TIMESTAMP,
  changelog TEXT, -- "Added 3 variables, changed status to testing"
);

// UI: Timeline view of experiment evolution
// Show: "Version 1 (Ideation) → Version 2 (Testing) → Version 3 (Ready)"
// Ability to revert to previous versions
```

### 3.2 AI-Powered Insights

```typescript
// Suggest next variables based on hypothesis
const suggestedVariables = await fetch('/api/rdlabs/suggest-variables', {
  method: 'POST',
  body: JSON.stringify({ hypothesis, specialization }),
}).then(r => r.json());
// Returns: ["Temperature variation", "Ingredient ratio", ...]

// Validate sensory targets against scientific norms
const validation = await validateSensoryTargets(sensoryTargets);
// Returns: { valid: [], warnings: [], suggestions: [] }

// Summarize experiment progress
const summary = await summarizeExperiment(experimentId);
// Returns: "2 of 5 variables tested, 80% ready"
```

### 3.3 Automated Test Planning

```typescript
// Generate test plan from variables
const testPlan = await generateTestPlan({
  variables: ["temperature 18°C vs 22°C", "koji inoculation 15% vs 20%"],
  hypothesis: "...",
  timeline: "2 weeks",
});
// Returns structured test plan with steps, timing, expected outcomes

// Track test execution
const testResults = {
  testId: "test-1",
  executedAt: timestamp,
  results: { variable1: "passed", variable2: "failed" },
  notes: "Texture wobble measured at 1.1Hz",
  nextStep: "Adjust koji inoculation to 18%",
};
```

### 3.4 Team Analytics Dashboard

```typescript
// Insights per team:
- Total experiments: 42
- Success rate: 65%
- Most active contributor: A. Vega (15 experiments)
- Fastest to "ready": 3.2 weeks avg
- Most tested variable: Temperature
- Top specialization: Pastry (24 experiments)

// Timeline analytics:
- Experiments created per month
- Status distribution over time
- Recipe integration rate
```

### 3.5 Mobile Companion App

```typescript
// Quick experiment capture on mobile:
- Voice note to hypothesis
- Photo of result
- Quick sensory rating (1-10 scale)
- Sync back to desktop workbench
```

---

## Implementation Roadmap

### Week 1-2: Phase 1 (Backend Basics)
- [ ] Design and create backend API endpoints
- [ ] Set up database schema in Supabase/PostgreSQL
- [ ] Add auth context integration
- [ ] Implement store persistence layer
- [ ] Migrate from localStorage to backend

### Week 3-4: Phase 1 Continuation + Phase 2 Start
- [ ] Add data validation on import
- [ ] Implement WebSocket/Supabase sync
- [ ] Add conflict resolution logic
- [ ] Begin presence tracking

### Week 5-6: Phase 2 + Phase 3 Exploration
- [ ] Complete real-time collaboration
- [ ] Build activity timeline
- [ ] Design experiment versioning
- [ ] Explore AI integration for suggestions

### Week 7-8: Phase 3 Implementation
- [ ] Implement versioning system
- [ ] Add AI-powered insights
- [ ] Build team analytics dashboard
- [ ] Polish and optimize

---

## Priority Ranking

**Must Have (Phase 1)**:
1. Backend persistence ⭐⭐⭐⭐⭐
2. Auth integration ⭐⭐⭐⭐⭐
3. Data validation ⭐⭐⭐⭐

**Should Have (Phase 2)**:
1. Real-time collaboration ⭐⭐⭐⭐
2. Activity timeline ⭐⭐⭐
3. Recipe store integration ⭐⭐⭐

**Nice to Have (Phase 3)**:
1. Experiment versioning ⭐⭐
2. AI insights ⭐⭐
3. Mobile app ⭐
4. Team analytics ⭐

---

## Technical Decisions

### Database
**Choice**: Supabase (PostgreSQL)
**Reasons**: 
- Real-time subscriptions built-in
- Auth integration included
- JSON/array support for experiment fields
- Row-level security (RLS) for access control

### Real-time
**Choice**: Supabase Realtime over custom WebSocket
**Reasons**:
- Lower operational overhead
- Automatic reconnection
- Built-in presence tracking
- Already integrated with auth

### Frontend State
**Keep**: Zustand store with local cache
**Add**: Sync queue and conflict resolution
**Rationale**: Optimistic updates for great UX, backend as source of truth

---

## Success Metrics

1. **Phase 1**: 
   - 100% of local changes persist to backend
   - User auth correctly attributed to experiments
   - Export/import validates against schema

2. **Phase 2**:
   - Real-time sync latency < 500ms
   - No data loss during simultaneous edits
   - Presence shows active editors

3. **Phase 3**:
   - Experiment versioning tracks all changes
   - AI suggestions save 30 min per experiment
   - Team insights visible in dashboard

---

## Next Immediate Steps

1. **Create Supabase project** (if not using existing backend)
2. **Design database schema** and get approval
3. **Create first API endpoint** (/api/rdlabs/projects)
4. **Update store to call endpoint** and cache locally
5. **Test end-to-end**: Create experiment → Persist → Load on refresh

---

## Questions to Answer

1. **Auth Provider**: Which auth system (Supabase, Auth0, custom)?
2. **Database**: Use existing backend or Supabase?
3. **Team Size**: How many concurrent users expected?
4. **Timeline**: MVP in 2 weeks or 8 weeks?
5. **Mobile**: Priority or nice-to-have?
