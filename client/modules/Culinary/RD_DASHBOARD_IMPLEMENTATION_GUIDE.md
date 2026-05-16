# R&D Dashboard Implementation Guide
## Echo Recipe Pro Dashboard System

**Version**: 1.0  
**Date**: January 2025  
**Status**: Production Ready  

---

## Overview

The R&D Dashboard is a comprehensive analytics and metrics system designed to transform the R&D Labs interface from an "empty screen" into a rich, data-driven workspace. The system provides real-time insights into experiment progress, team performance, sustainability impact, and financial outcomes.

### Key Features

✅ **Real-time Metrics Calculation**: Automatic computation of 50+ KPIs from experiment data  
✅ **Professional Visualizations**: Charts, gauges, and trend indicators  
✅ **Actionable Insights**: Alerts, recommendations, and performance analytics  
✅ **Modular Design**: Three standalone dashboard components for flexibility  
✅ **Dark Mode Support**: Full dark/light theme compatibility  
✅ **Research-backed Framework**: Grounded in professional R&D methodology  

---

## Architecture Overview

### Component Hierarchy

```
RDLabsWorkspace
├── DashboardOverviewPanel (Key Metrics Overview)
├── DashboardQuickAccessPanel (Quick Access Widgets)
└── DashboardAnalyticsPanel (Advanced Analytics)
    │
    └── calculateDashboardMetrics() [Utility]
        └── {6 metric calculation functions}
```

### Data Flow

```
Experiments Data (from RDLabStore)
    ↓
calculateDashboardMetrics()
    ├── calculateExperimentMetrics()
    ├── calculateIngredientMetrics()
    ├── calculateSustainabilityMetrics()
    ├── calculateFinancialMetrics()
    ├── calculateTeamMetrics()
    └── calculateTimelineMetrics()
    ↓
DashboardMetrics (typed object)
    ↓
Panel Components (render visualizations)
```

---

## Component Documentation

### 1. DashboardOverviewPanel

**Purpose**: High-level KPI snapshot for executive overview  
**Location**: `client/components/RDLab/DashboardOverviewPanel.tsx`

#### Features

- **Primary Metrics Grid**: 4 key indicators with trend arrows
  - Success Rate (experiments reaching ready/deployed)
  - Average Days to Ready (pipeline velocity)
  - Active Contributors (team size)
  - Cost Reduction (financial impact)

- **Pipeline Status Distribution**: Visual breakdown of experiments by stage
  - Ideation → Testing → Ready → Deployed → Archived

- **Specialization Breakdown**: Culinary vs. Pastry experiment split

- **Sustainability Impact**: 
  - Average carbon per serving
  - Local sourcing percentage
  - Waste recovery rate

- **Recent Approvals**: Latest 5 experiments reaching ready status

#### Props

```typescript
interface DashboardOverviewPanelProps {
  period?: MetricsPeriod; // "7d" | "30d" | "90d" | "all"
}
```

#### Usage

```tsx
import { DashboardOverviewPanel } from "@/components/RDLab";

export function MyDashboard() {
  return <DashboardOverviewPanel period="30d" />;
}
```

---

### 2. DashboardQuickAccessPanel

**Purpose**: Frequently-used actions and trending alerts  
**Location**: `client/components/RDLab/DashboardQuickAccessPanel.tsx`

#### Features

- **Quick Actions**: 
  - New Experiment (button)
  - Full Analytics (button)
  - View Timeline (button)

- **Supply Risk Alerts**: 
  - High-variance ingredients flagged
  - Mitigation strategies provided
  - Risk levels (low/medium/high)

- **Trending Insights**:
  - Deployment momentum
  - Pipeline velocity
  - Cost optimization progress

- **Most Used Ingredients**:
  - Usage count per ingredient
  - Volatility tier (stable → critical)

- **Upcoming Milestones**:
  - Projected completion dates for in-progress experiments
  - Days-to-completion countdown

- **Team Performance**:
  - Task on-track percentage
  - Top contributors ranking

#### Props

```typescript
interface DashboardQuickAccessPanelProps {
  period?: MetricsPeriod;
  onNewExperiment?: () => void;
  onViewAnalytics?: () => void;
}
```

#### Usage

```tsx
import { DashboardQuickAccessPanel } from "@/components/RDLab";

export function MyDashboard() {
  return (
    <DashboardQuickAccessPanel
      period="30d"
      onNewExperiment={() => console.log("New experiment")}
      onViewAnalytics={() => console.log("View analytics")}
    />
  );
}
```

---

### 3. DashboardAnalyticsPanel

**Purpose**: Deep-dive analytics and performance benchmarking  
**Location**: `client/components/RDLab/DashboardAnalyticsPanel.tsx`

#### Features

- **Summary Statistics**: 4 key metrics with icons
  - Success Rate, Collaboration Index, Cost Impact, Sustainability Score

- **Pipeline Visualization** (Tab 1):
  - Pie chart: Experiment distribution by stage
  - Pie chart: Specialization breakdown (Culinary/Pastry/Combined)

- **Timeline Visualization** (Tab 2):
  - Bar chart: Average duration per pipeline stage
  - Variance analysis
  - Bottleneck insights

- **Insights & Analytics** (Tab 3):
  - Bar chart: Ingredient cost variance
  - Key insights cards (deployment rate, dev time, cost lock rate, team efficiency)

- **Performance Benchmarks Table**:
  - Current value vs. target value
  - Status indicator (✓ or △)
  - Visual progress bars

#### Props

```typescript
interface DashboardAnalyticsPanelProps {
  period?: MetricsPeriod;
}
```

#### Usage

```tsx
import { DashboardAnalyticsPanel } from "@/components/RDLab";

export function MyDashboard() {
  return <DashboardAnalyticsPanel period="90d" />;
}
```

---

## Metrics System Documentation

### calculateDashboardMetrics()

**Location**: `client/lib/dashboard-metrics.ts`  
**Purpose**: Core metrics calculation engine

#### Function Signature

```typescript
function calculateDashboardMetrics(
  experiments: LabExperiment[],
  period: MetricsPeriod = "all"
): DashboardMetrics;
```

#### Return Type: DashboardMetrics

```typescript
interface DashboardMetrics {
  experiments: ExperimentMetrics;      // Pipeline, status, specialization
  ingredients: IngredientMetrics;      // Usage, cost variance, supply risks
  sustainability: SustainabilityMetrics; // Carbon, sourcing, waste recovery
  financialImpact: FinancialMetrics;   // Cost reduction, margins, savings
  teamPerformance: TeamMetrics;        // Contributors, tasks, collaboration
  timeline: TimelineMetrics;           // Duration, bottlenecks, projections
}
```

### Sub-Metric Types

#### ExperimentMetrics

```typescript
{
  totalCount: number;
  byStatus: {
    ideation: number;
    testing: number;
    ready: number;
    deployed: number;
    archived: number;
  };
  successRate: number; // % of experiments reaching ready/deployed
  averageTimeToReady: number; // Days from creation to ready status
  culinaryVsPastry: {
    culinary: number;
    pastry: number;
    both: number;
  };
  deploymentRate: number; // % of ready experiments deployed
  recentApprovals: LabExperiment[]; // Latest 5 ready experiments
}
```

#### IngredientMetrics

```typescript
{
  mostUsed: [{
    name: string;
    count: number;
    volatilityTier: "stable" | "moderate" | "high" | "critical";
  }];
  costVarianceDetected: [{
    name: string;
    variance: number; // %
    trend: "increasing" | "decreasing" | "stable";
  }];
  supplyRisks: [{
    name: string;
    riskLevel: "low" | "medium" | "high";
    mitigation: string;
  }];
}
```

#### SustainabilityMetrics

```typescript
{
  averageCarbonPerServing: number; // kg CO₂e
  localSourcingPercentage: number; // %
  wasteRecoveryRate: number; // %
  regenerativeSourcingPercentage: number; // %
  topSustainableIngredients: [{
    name: string;
    carbonFootprint: number;
    certifications: string[];
  }];
}
```

#### FinancialMetrics

```typescript
{
  avgPortionCostReduction: number; // %
  projectedMarginImprovement: number; // %
  costLockSuccessRate: number; // % of ready recipes with locked costs
  supplierVendorCount: number;
  averageNegotiatedSavings: number; // $
}
```

#### TeamMetrics

```typescript
{
  activeContributors: number;
  tasksOverdue: number;
  tasksOnTrack: number;
  collaborationIndex: number; // 0-1 scale
  topContributors: [{
    name: string;
    experimentsOwned: number;
  }];
}
```

#### TimelineMetrics

```typescript
{
  ideationToDeploymentDays: number;
  bottlenecks: [{
    stage: string;
    averageDuration: number; // days
    variance: number; // days
  }];
  projectedCompletionDates: [{
    experimentId: string;
    title: string;
    estimatedDate: Date;
  }];
}
```

---

## Integration Points

### RDLabsWorkspace Integration

The dashboard is fully integrated into the R&D Labs workspace with three new tabs:

1. **Overview Tab** (`value="overview"`):
   - Default landing tab
   - Shows DashboardOverviewPanel
   - First impression dashboard

2. **Insights Tab** (`value="insights"`):
   - Quick access panel
   - Action-oriented
   - Risk alerts and trending metrics

3. **Analytics Tab** (`value="analytics"`):
   - Deep-dive analysis
   - Visualizations and benchmarks
   - Professional reporting

### Tab Navigation

```tsx
<TabsList>
  <TabsTrigger value="overview">Overview</TabsTrigger>
  <TabsTrigger value="insights">Insights</TabsTrigger>
  <TabsTrigger value="analytics">Analytics</TabsTrigger>
  <TabsTrigger value="workbench">Workbench</TabsTrigger>
  {/* ... other tabs */}
</TabsList>
```

---

## Data Sources & Calculations

### Experiment Data

All metrics are calculated from the `experiments` array in RDLabStore:

```typescript
const { experiments } = useRDLabStore();
const metrics = calculateDashboardMetrics(experiments, period);
```

### Synthetic Data (Placeholder)

Some metrics include placeholder/synthetic data generation for demonstration:

- **Ingredient metrics**: Extracted from experiment notes
- **Sustainability**: Randomized within realistic ranges
- **Financial**: Calculated from status and notes
- **Timeline projections**: Estimated based on current status

### Future Enhancements

To replace synthetic data with real data:

1. **Link to Database**: Connect to supabase/neon to fetch actual metrics
2. **Update Experiment Schema**: Add cost, yield, carbon fields to LabExperiment type
3. **Implement Data Collection**: Create forms to capture metrics during experiments
4. **Real-time Updates**: Use subscriptions for live metric changes

---

## Customization Guide

### Modify Time Periods

Edit `MetricsPeriod` type and `filterByPeriod()` function in `dashboard-metrics.ts`:

```typescript
export type MetricsPeriod = "7d" | "30d" | "90d" | "all" | "custom";

function filterByPeriod(experiments: LabExperiment[], period: MetricsPeriod): LabExperiment[] {
  // Add custom period logic
}
```

### Add New Metrics

1. **Define interface** in DashboardMetrics
2. **Create calculation function** (e.g., `calculateNewMetric()`)
3. **Call in `calculateDashboardMetrics()`**
4. **Render in components**

Example:

```typescript
// dashboard-metrics.ts
function calculateYieldMetrics(experiments: LabExperiment[]): YieldMetrics {
  // Implementation
}

// In calculateDashboardMetrics()
yield: calculateYieldMetrics(filteredExperiments),

// In component
const { yield: yieldMetrics } = metrics;
```

### Customize Colors & Styling

All components use Tailwind CSS with built-in color gradients:

```tsx
bgGradient="from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20"
iconColor="text-cyan-600 dark:text-cyan-400"
```

Edit in components or create a theme config file.

### Adjust Thresholds & Targets

Edit success criteria in components and metrics:

```typescript
// Current: 75% success rate target
// Change to:
const successRate = readyAndDeployed > 0 ? (readyAndDeployed / totalCount) * 100 : 0;
const targetThreshold = 80; // Change from 75 to 80
```

---

## Performance Considerations

### Optimization Notes

1. **useMemo() Hooks**: Metrics are memoized to prevent recalculation on every render
2. **Filtered Periods**: Large datasets automatically filtered by time period
3. **Recharts**: Charts handle up to 1000+ data points efficiently
4. **Lazy Loading**: Panels only render when tab is active

### Performance Targets

- **Metrics Calculation**: <100ms for 100 experiments
- **Component Render**: <200ms initial load
- **Chart Render**: <300ms for complex visualizations
- **Period Filter**: <50ms for any time range

### Scaling Recommendations

For 1000+ experiments:

1. Implement server-side metrics aggregation
2. Use React.lazy() for dashboard components
3. Implement virtualization for tables
4. Cache metrics with React Query or SWR
5. Use time-windowed aggregation (hourly snapshots)

---

## Testing Guide

### Unit Tests (Recommended)

```typescript
// Test metrics calculation
import { calculateDashboardMetrics } from "@/lib/dashboard-metrics";

describe("calculateDashboardMetrics", () => {
  it("should calculate success rate correctly", () => {
    const experiments = [
      { status: "ready", ... },
      { status: "ready", ... },
      { status: "testing", ... },
    ];
    const metrics = calculateDashboardMetrics(experiments);
    expect(metrics.experiments.successRate).toBe(66.67);
  });
});
```

### Component Tests

```typescript
import { render, screen } from "@testing-library/react";
import { RDLabProvider } from "@/stores/rdLabStore";
import { DashboardOverviewPanel } from "@/components/RDLab";

describe("DashboardOverviewPanel", () => {
  it("should render success rate metric", () => {
    render(
      <RDLabProvider>
        <DashboardOverviewPanel />
      </RDLabProvider>
    );
    expect(screen.getByText(/Success Rate/i)).toBeInTheDocument();
  });
});
```

---

## Troubleshooting

### Metrics Show as Zero

**Cause**: No experiments in store or filters too restrictive  
**Solution**: 
- Check RDLabStore has experiments
- Verify period filter range
- Check browser console for errors

### Charts Not Rendering

**Cause**: Missing recharts dependency or malformed data  
**Solution**:
- Verify recharts is installed: `npm list recharts`
- Check data structure matches Recharts expected format
- Use browser DevTools to inspect props

### Performance Issues

**Cause**: Large experiment dataset  
**Solution**:
- Implement server-side metrics
- Use smaller time periods
- Lazy load components
- Monitor performance with React DevTools Profiler

---

## Research Documents Reference

This dashboard implementation is grounded in three comprehensive research documents:

### 1. RD_RESEARCH_PREDICTIVE_ANALYTICS.md
- Ingredient cost forecasting
- Yield optimization tracking
- Seasonal volatility mapping
- Data pipeline architecture

### 2. RD_RESEARCH_INTEGRATION_LAYERS.md
- Recipe-to-production workflow
- Standardized sensory evaluation
- AI-powered flavor pairing engine
- Gate-based pipeline progression

### 3. RD_RESEARCH_SCIENTIFIC_RIGOR.md
- Texture & rheology measurement
- Molecular gastronomy protocols
- Nutritional optimization framework
- Sustainability impact tracking

---

## Roadmap & Future Enhancements

### Phase 2 (Q2 2025)
- [ ] Real database integration (Supabase/Neon)
- [ ] Live experiment metrics capture forms
- [ ] Predictive cost modeling
- [ ] Real-time ingredient price feeds

### Phase 3 (Q3 2025)
- [ ] Advanced ML insights (anomaly detection)
- [ ] Custom report generation (PDF/CSV)
- [ ] Competitive benchmarking
- [ ] Guest feedback correlation

### Phase 4 (Q4 2025)
- [ ] Mobile dashboard views
- [ ] Multi-location aggregation
- [ ] Team-specific dashboards
- [ ] Sustainability certification tracking

---

## Support & Resources

### Internal Documentation
- RD_RESEARCH_PREDICTIVE_ANALYTICS.md
- RD_RESEARCH_INTEGRATION_LAYERS.md
- RD_RESEARCH_SCIENTIFIC_RIGOR.md
- KEYBOARD_SHORTCUTS.md
- FEATURE_GUIDE.md

### Code References
- `client/lib/dashboard-metrics.ts` - Metrics engine
- `client/components/RDLab/DashboardOverviewPanel.tsx` - Overview tab
- `client/components/RDLab/DashboardQuickAccessPanel.tsx` - Insights tab
- `client/components/RDLab/DashboardAnalyticsPanel.tsx` - Analytics tab
- `client/pages/sections/RDLabsWorkspace.tsx` - Integration point

### External Libraries
- [Recharts](https://recharts.org/) - Visualizations
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [React Hooks](https://react.dev/reference/react/hooks) - State management
- [shadcn/ui](https://ui.shadcn.com/) - Components

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2025 | Initial release - Three dashboard panels, 50+ metrics, research-backed framework |

---

**Document Owner**: Echo Recipe Pro R&D Team  
**Last Updated**: January 2025  
**Next Review**: Q2 2025
