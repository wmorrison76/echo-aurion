# Developer Integration Guide

## How to Use the New Features in Your Components

### Quick Start

#### Import Utilities
```typescript
// Customer & Service Types
import {
  getAllCustomers,
  getServiceConceptsByType,
  getUpcomingServiceEvents,
  calculateServiceMetrics,
} from '@/lib/customer-service-utils';

// Plate Costing
import {
  getAveragePlateCost,
  calculateMenuItemCosting,
  getTotalWasteCostByRecipe,
} from '@/lib/plate-costing-utils';

// Supplier API
import {
  getSupplierMetrics,
  compareSupplierPrices,
  getPurchaseOrdersByStatus,
} from '@/lib/supplier-api-utils';

// Responsive
import { useResponsive, useIsMobile } from '@/hooks/use-responsive';

// Accessibility
import { generateAriaLabel, focusManagement } from '@/lib/a11y-utils';

// Performance
import { debounce, memoize, measurePerformance } from '@/lib/performance-utils';
```

---

## Feature-Specific Integration Examples

### 1. Customer & Service Types

#### Get All VIP Customers
```typescript
import { getVIPCustomers } from '@/lib/customer-service-utils';

export function VIPCustomersList() {
  const vipCustomers = getVIPCustomers();
  
  return (
    <div>
      {vipCustomers.map(customer => (
        <div key={customer.id}>{customer.name}</div>
      ))}
    </div>
  );
}
```

#### Calculate Service Revenue
```typescript
import { calculateServiceMetrics } from '@/lib/customer-service-utils';

export function EventRevenue({ eventId }) {
  const metrics = calculateServiceMetrics(eventId);
  
  return (
    <Card>
      <h3>Revenue: ${metrics.projectedRevenue.toFixed(2)}</h3>
      <p>Profit Margin: {metrics.profitMargin.toFixed(1)}%</p>
    </Card>
  );
}
```

#### Check Customer Dietary Restrictions
```typescript
import { filterCustomersByDietaryRestriction } from '@/lib/customer-service-utils';

export function VeganCustomers() {
  const vegans = filterCustomersByDietaryRestriction('vegetarian');
  
  return (
    <ul>
      {vegans.map(c => <li key={c.id}>{c.name}</li>)}
    </ul>
  );
}
```

---

### 2. Plate Costing & Analysis

#### Track Recipe Profitability
```typescript
import { 
  calculateMenuItemCosting,
  getAveragePlateCost,
  getStandardDeviationOfPlateCost,
} from '@/lib/plate-costing-utils';

export function RecipeProfitability({ recipeId, price, targetMargin }) {
  const costing = calculateMenuItemCosting(recipeId, price, targetMargin);
  
  return (
    <div>
      <p>Avg Cost: ${costing.averagePlateCost.toFixed(2)}</p>
      <p>Margin: {costing.actualMargin.toFixed(1)}%</p>
      <p>Status: {costing.status}</p>
      {costing.recommendations.map((rec, i) => (
        <li key={i}>{rec}</li>
      ))}
    </div>
  );
}
```

#### Analyze Waste Impact
```typescript
import { getTotalWasteCostByRecipe } from '@/lib/plate-costing-utils';

export function WasteAnalysis({ recipeId }) {
  const wasteCost = getTotalWasteCostByRecipe(recipeId);
  
  return <p>Waste Impact: ${wasteCost.toFixed(2)}</p>;
}
```

#### Check Yield Consistency
```typescript
import { 
  getYieldAnalysisByIngredient,
  isYieldBelowExpected,
} from '@/lib/plate-costing-utils';

export function IngredientYield({ ingredientId }) {
  const analysis = getYieldAnalysisByIngredient(ingredientId);
  const isBelowExpected = isYieldBelowExpected(ingredientId);
  
  return (
    <div>
      <p>Current Yield: {analysis?.yieldPercent}%</p>
      <p>Expected: {analysis?.expectedYieldPercent}%</p>
      {isBelowExpected && <Alert>Investigate yield loss!</Alert>}
    </div>
  );
}
```

---

### 3. Supplier Management

#### Compare Supplier Prices
```typescript
import { compareSupplierPrices } from '@/lib/supplier-api-utils';

export function IngredientSourceComparison() {
  const suppliers = ['sup-sysco', 'sup-us-foods', 'sup-gfs'];
  const comparison = compareSupplierPrices('Beef short rib', 'lb', suppliers);
  
  return (
    <Table>
      {comparison.suppliers.map(s => (
        <tr key={s.supplierId}>
          <td>{s.supplierName}</td>
          <td>${s.unitPrice.toFixed(2)}/unit</td>
          <td>{s.availability}</td>
          <td>{s.leadTimeDays}d</td>
        </tr>
      ))}
    </Table>
  );
}
```

#### Track Supplier Performance
```typescript
import { 
  getSupplierMetrics,
  rankSuppliersByReliability,
} from '@/lib/supplier-api-utils';

export function SupplierRanking() {
  const ranked = rankSuppliersByReliability();
  
  return (
    <div>
      {ranked.map(supplier => (
        <Card key={supplier.supplierId}>
          <h3>{supplier.supplierName}</h3>
          <p>On-Time: {supplier.onTimeDeliveryPercent.toFixed(1)}%</p>
          <p>Quality: {supplier.qualityScore.toFixed(1)}/5</p>
        </Card>
      ))}
    </div>
  );
}
```

#### Manage Purchase Orders
```typescript
import { 
  getPurchaseOrdersByStatus,
  getTotalOrderAmount,
} from '@/lib/supplier-api-utils';

export function ActiveOrders() {
  const confirmedOrders = getPurchaseOrdersByStatus('confirmed');
  const period = { 
    startDate: Date.now() - 30*24*60*60*1000, 
    endDate: Date.now() 
  };
  const amount = getTotalOrderAmount(period);
  
  return (
    <div>
      <p>30-Day Spend: ${amount.toFixed(2)}</p>
      <p>Confirmed Orders: {confirmedOrders.length}</p>
    </div>
  );
}
```

---

### 4. Responsive Design

#### Adapt Layout Based on Screen Size
```typescript
import { useResponsive, ResponsiveGrid } from '@/components/responsive-grid';

export function Dashboard() {
  const viewport = useResponsive();
  
  return (
    <div>
      {viewport.isMobile && <h1>Mobile Dashboard</h1>}
      {viewport.isDesktop && <h1>Desktop Dashboard</h1>}
      
      <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 3 }} gap="md">
        {/* Cards auto-resize based on viewport */}
      </ResponsiveGrid>
    </div>
  );
}
```

#### Mobile-Optimized Component
```typescript
import { MobileCard, MobilePageHeader } from '@/components/mobile-layout';

export function MobileMenu() {
  return (
    <div>
      <MobilePageHeader 
        title="Menu Items"
        subtitle="Popular dishes"
      />
      <MobileCard clickable onClick={() => { /* handle */ }}>
        <h3>Grilled Salmon</h3>
        <p>$32.00</p>
      </MobileCard>
    </div>
  );
}
```

#### Conditional Rendering
```typescript
import { useIsMobile, useIsTablet, useIsDesktop } from '@/hooks/use-responsive';

export function ResponsiveTable() {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return <MobileList items={items} />;
  }
  
  return <DesktopTable data={items} />;
}
```

---

### 5. Accessibility

#### Create Accessible Buttons
```typescript
import { generateAriaLabel } from '@/lib/a11y-utils';

export function DeleteButton({ itemName }) {
  return (
    <button aria-label={generateAriaLabel('Delete', itemName)}>
      Delete
    </button>
  );
}
```

#### Focus Management
```typescript
import { focusManagement } from '@/lib/a11y-utils';

export function Modal({ open, onClose }) {
  const modalRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (open) {
      focusManagement.focusFirstElement(modalRef.current);
    }
  }, [open]);
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    focusManagement.trapFocus(modalRef.current, e);
  };
  
  return (
    <div ref={modalRef} onKeyDown={handleKeyDown}>
      {/* Modal content */}
    </div>
  );
}
```

#### Keyboard Activation
```typescript
import { handleKeyboardActivation } from '@/lib/a11y-utils';

export function AccessibleCard({ onClick }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => handleKeyboardActivation(e, onClick)}
      onClick={onClick}
    >
      Click or press Enter/Space
    </div>
  );
}
```

---

### 6. Performance Optimization

#### Debounce Search Input
```typescript
import { debounce } from '@/lib/performance-utils';

export function SupplierSearch() {
  const [search, setSearch] = useState('');
  
  const handleSearch = debounce((query: string) => {
    // API call or search logic
    console.log('Searching for:', query);
  }, 300);
  
  return (
    <input
      onChange={(e) => {
        setSearch(e.target.value);
        handleSearch(e.target.value);
      }}
      placeholder="Search suppliers..."
    />
  );
}
```

#### Memoize Expensive Calculations
```typescript
import { memoize } from '@/lib/performance-utils';

const calculateComplexMetrics = memoize((recipeId: string) => {
  // Expensive calculation
  return calculateServiceMetrics(recipeId);
});

export function MetricsPanel({ recipeId }) {
  const metrics = calculateComplexMetrics(recipeId);
  return <div>{metrics.profitMargin}%</div>;
}
```

#### Measure Performance
```typescript
import { measurePerformance } from '@/lib/performance-utils';

export function DataTable() {
  const { result, duration } = measurePerformance(
    'renderTable',
    () => getAllCustomers()
  );
  
  console.log(`Table rendered in ${duration}ms`);
  return <Table data={result} />;
}
```

#### Check Network Conditions
```typescript
import { getNetworkInfo } from '@/lib/performance-utils';

export function ImageGallery() {
  const network = getNetworkInfo();
  
  // Use lower quality images on slow networks
  const quality = network.effectiveType === '4g' ? 'high' : 'low';
  
  return <Gallery quality={quality} />;
}
```

---

## Data Flow Examples

### Complete Workflow: Create and Track an Event

```typescript
import {
  getServiceConceptById,
  getUpcomingServiceEvents,
  calculateServiceMetrics,
  getTotalCompValue,
} from '@/lib/customer-service-utils';
import {
  getAveragePlateCost,
  calculateMenuItemCosting,
} from '@/lib/plate-costing-utils';

export function EventPlanner({ eventId }) {
  // Get event details
  const event = getUpcomingServiceEvents(90)
    .find(e => e.id === eventId);
  
  if (!event) return <div>Event not found</div>;
  
  // Get service configuration
  const service = getServiceConceptById(event.serviceConcptId);
  
  // Calculate metrics
  const metrics = calculateServiceMetrics(eventId);
  const compValue = getTotalCompValue(eventId);
  
  // Analyze costs
  const plateCosts = event.assignedMenuId 
    ? [getAveragePlateCost(event.assignedMenuId || '')]
    : [];
  
  return (
    <div>
      <h2>{event.name}</h2>
      <p>Service: {service?.name}</p>
      <p>Covers: {metrics.totalCovers}</p>
      <p>Expected Revenue: ${metrics.projectedRevenue.toFixed(2)}</p>
      <p>Comps: ${compValue.toFixed(2)}</p>
      <p>Projected Profit: ${metrics.netProfit.toFixed(2)}</p>
    </div>
  );
}
```

### Cross-Module: Ingredient-Level Analysis

```typescript
import {
  getTotalWasteCostByRecipe,
  getYieldAnalysisByIngredient,
} from '@/lib/plate-costing-utils';
import {
  compareSupplierPrices,
  getSupplierMetrics,
} from '@/lib/supplier-api-utils';

export function IngredientAnalysis({ ingredientId, recipeName }) {
  // Cost from plating
  const wasteCost = getTotalWasteCostByRecipe(recipeName);
  const yieldAnalysis = getYieldAnalysisByIngredient(ingredientId);
  
  // Compare supplier options
  const suppliers = ['sup-sysco', 'sup-us-foods', 'sup-gfs'];
  const comparison = compareSupplierPrices(
    ingredientId,
    'lb',
    suppliers
  );
  
  // Check supplier reliability
  const bestSupplier = comparison.suppliers[0];
  const metrics = getSupplierMetrics(bestSupplier.supplierId);
  
  return (
    <div>
      <h3>{ingredientId}</h3>
      <p>Waste Cost: ${wasteCost.toFixed(2)}</p>
      <p>Yield: {yieldAnalysis?.yieldPercent}%</p>
      <p>Best Price: ${bestSupplier.unitPrice.toFixed(2)}</p>
      <p>Supplier Reliability: {metrics?.onTimeDeliveryPercent}%</p>
    </div>
  );
}
```

---

## Testing Utilities

### Mock Data for Testing
```typescript
import {
  MOCK_CUSTOMERS,
  MOCK_SERVICE_CONCEPTS,
  MOCK_PURCHASE_ORDERS,
} from '@/data/customer-service';

// In tests
describe('Customer Service', () => {
  test('should calculate service metrics', () => {
    const event = MOCK_SERVICE_EVENTS[0];
    const metrics = calculateServiceMetrics(event.id);
    
    expect(metrics.totalCovers).toBeGreaterThan(0);
    expect(metrics.profitMargin).toBeLessThanOrEqual(100);
  });
});
```

### Performance Testing
```typescript
import { measurePerformance } from '@/lib/performance-utils';

test('getAllCustomers should be fast', () => {
  const { duration } = measurePerformance(
    'getAllCustomers',
    () => getAllCustomers()
  );
  
  expect(duration).toBeLessThan(10); // Under 10ms
});
```

---

## Best Practices

### 1. Use Memoization for Complex Calculations
```typescript
const expensiveMetrics = useMemo(
  () => calculateServiceMetrics(eventId),
  [eventId]
);
```

### 2. Debounce User Input
```typescript
const debouncedSearch = useMemo(
  () => debounce((query) => searchRecipes(query), 300),
  []
);
```

### 3. Leverage Responsive Hooks
```typescript
const isMobile = useIsMobile();
const viewport = useResponsive();
```

### 4. Include Accessibility Attributes
```typescript
<button aria-label={generateAriaLabel('Delete', name)}>
  Delete
</button>
```

### 5. Monitor Performance
```typescript
const { result } = measurePerformance('dataFetch', fetchData);
```

---

## Extending the System

### Add New Data Source
```typescript
// 1. Create types/[feature].ts
// 2. Create data/[feature].ts with mock data
// 3. Create lib/[feature]-utils.ts with utilities
// 4. Create pages/sections/saas/[Feature]Workspace.tsx for UI
```

### Add New Responsive Component
```typescript
// 1. Add to components/mobile-layout.tsx or create new file
// 2. Import in components that need it
// 3. Use responsive hooks for behavior
```

---

**Last Updated**: December 2024
**Version**: 1.0
