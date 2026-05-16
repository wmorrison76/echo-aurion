# Seed Data Scripts

Utilities for populating the database with demo data and managing test datasets.

## Overview

These scripts provide a convenient way to:

- Populate the database with realistic demo data for testing and demonstrations
- Clean up demo data after testing
- Generate sample reports and exports
- Test application features with various data scenarios

## Scripts

### 1. Seed Demo Data

**File:** `seedDemoData.ts`

Populates the database with comprehensive demo data across all tables.

```bash
ts-node scripts/seed/seedDemoData.ts
```

**Generated Data:**

#### Outlets (5 records)

- Downtown Store (active)
- Mall Location (active)
- Airport Hub (active)
- Riverside Cafe (active)
- Tech Park Outlet (inactive)

#### Inventory Items (~36 records)

- Beverages: Water, Soft Drink, Coffee, Tea, Juice, Smoothie, Iced Beverage
- Appetizers: Appetizer Platter, Chips & Dip, Nachos, Buffalo Wings, Bruschetta
- Main Courses: Grilled Salmon, Ribeye Steak, Chicken Parmesan, Pasta Carbonara, Burger
- Desserts: Chocolate Cake, Tiramisu, Cheesecake, Ice Cream, Pie
- Sides: French Fries, Rice Pilaf, Steamed Vegetables, Mashed Potatoes, Bread Basket
- Salads: Caesar Salad, Garden Salad, Caprese Salad, Greek Salad, Spinach Salad

#### Invoices (50 records)

- Statuses: paid, pending, overdue, partially_paid
- Date range: Last 90 days
- Amount range: $500 - $5,500

#### Invoice Items (variable, 1-10 per invoice)

- Quantity: 1-50 units
- Unit price: $10 - $210
- Total price: $100 - $1,100

#### Purchase Orders (30 records)

- Statuses: draft, sent, confirmed, received, cancelled
- Date range: Last 60 days
- Amount range: $300 - $3,300

#### Audit Logs (100 records)

- Actions: CREATE, UPDATE, DELETE, VIEW, EXPORT
- Resource types: invoice, inventory_item, purchase_order, user, outlet
- Date range: Last 30 days

**Output Example:**

```
╔════════════════════════════════════════════════════════════════════╗
║                   Seeding Demo Database                            ║
╚════════════════════════════════════════════════════════════════════╝

Seeding outlets...
Seeding products...
Seeding invoices...
Seeding invoice items...
Seeding purchase orders...
Seeding audit logs...

╔════════════════════════════════════════════════════════════════════╗
║                       Seeding Summary                              ║
╚════════════════════════════════════════════════════════════════════╝

✓ outlets: 5 records
✓ inventory_items: 36 records
✓ invoices: 50 records
✓ invoice_items: 250+ records
✓ purchase_orders: 30 records
✓ audit_logs: 100 records

✓ Successfully seeded 6/6 tables
✓ Total records created: 471
```

### 2. Cleanup Demo Data

**File:** `seedDataCleanup.ts`

Removes all demo data from the database.

```bash
# Clean all tables
ts-node scripts/seed/seedDataCleanup.ts

# Clean all tables (explicit)
ts-node scripts/seed/seedDataCleanup.ts all

# Clean specific table
ts-node scripts/seed/seedDataCleanup.ts table invoices
```

**Cleanup Order:**
The script respects foreign key relationships and deletes in this order:

1. invoice_items
2. invoices
3. purchase_order_items
4. purchase_orders
5. inventory_items
6. audit_logs
7. outlets

**Output Example:**

```
✓ invoice_items: 250+ records deleted
✓ invoices: 50 records deleted
✓ purchase_orders: 30 records deleted
✓ inventory_items: 36 records deleted
✓ audit_logs: 100 records deleted
✓ outlets: 5 records deleted

✓ Successfully cleaned 6/6 tables
✓ Total records deleted: 471
```

## Usage Scenarios

### Development Testing

```bash
# Start with clean database
ts-node scripts/seed/seedDataCleanup.ts

# Seed demo data
ts-node scripts/seed/seedDemoData.ts

# Run tests
npm test

# Clean up after testing
ts-node scripts/seed/seedDataCleanup.ts
```

### Demo Presentations

```bash
# Prepare database for demo
ts-node scripts/seed/seedDataCleanup.ts
ts-node scripts/seed/seedDemoData.ts

# Now run the application
npm run dev
```

### Load Testing

```bash
# Seed demo data multiple times to increase dataset size
for i in {1..10}; do
  ts-node scripts/seed/seedDemoData.ts
done
```

## Demo Data Characteristics

### Realistic Distributions

- **Invoice amounts:** Vary between $500 and $5,500 (realistic vendor invoices)
- **Inventory quantities:** 10-100 units on hand, par levels around 30
- **Product prices:** Realistic pricing by category
  - Beverages: $3.50
  - Appetizers: $8.95
  - Main Courses: $16.95
  - Desserts: $6.95
  - Sides: $4.95
  - Salads: $9.95

### Temporal Distribution

- **Invoices:** Spread across last 90 days
- **Purchase Orders:** Spread across last 60 days
- **Audit Logs:** Spread across last 30 days

This creates realistic time-series data for testing dashboards and analytics.

### Multi-Outlet Scenarios

Demo data is randomly distributed across outlets, allowing testing of:

- Multi-outlet dashboards
- Outlet-specific filtering
- Cross-outlet reporting
- Outlet comparisons

## Sample Data Examples

### Sample Invoice

```json
{
  "id": "uuid-1234",
  "invoice_number": "INV-01000",
  "vendor_name": "Vendor 5",
  "amount": 2456.78,
  "status": "paid",
  "outlet_id": "outlet-uuid",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Sample Inventory Item

```json
{
  "id": "uuid-5678",
  "product_name": "Grilled Salmon",
  "category": "Main Courses",
  "unit_price": 16.95,
  "quantity_on_hand": 45,
  "par_level": 30,
  "outlet_id": "outlet-uuid"
}
```

### Sample Purchase Order

```json
{
  "id": "uuid-9012",
  "po_number": "PO-05010",
  "vendor_name": "Supplier 8",
  "status": "confirmed",
  "total_amount": 1250.5,
  "outlet_id": "outlet-uuid",
  "created_at": "2024-01-20T14:45:00Z"
}
```

## Customizing Demo Data

To create custom demo data, you can:

1. **Modify seed values:**
   Edit `seedDemoData.ts` to change product names, outlet locations, or pricing.

2. **Adjust quantities:**
   Change the loops and array sizes to generate more or fewer records.

3. **Change date ranges:**
   Modify date calculations to generate data for specific periods.

4. **Add new entities:**
   Extend the seed script to populate additional tables or custom entities.

Example modification:

```typescript
// Change the number of invoices from 50 to 200
for (let i = 0; i < 200; i++) {
  // ... create invoice
}

// Change invoice amount range from $500-$5,500 to $1,000-$10,000
amount: parseFloat((Math.random() * 9000 + 1000).toFixed(2));
```

## Best Practices

### Testing

- Always clean data before seeding new data to avoid duplicates
- Use specific test outlets to isolate test data
- Clear demo data after tests complete

### Performance

- Seed data in batches to avoid memory issues with large datasets
- Use the cleanup script to remove unused data
- Monitor database size when seeding multiple times

### Data Integrity

- Respect foreign key relationships
- Ensure outlet references are valid
- Use realistic but varied data

## Troubleshooting

### Connection Errors

Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set correctly:

```bash
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_KEY
```

### Permission Denied

Verify you're using the service role key (not anon key):

```bash
# Service role key starts with 'eyJhbGc...' and is much longer
# Anon key is shorter and has limited permissions
```

### Foreign Key Violations

The cleanup script cleans in the correct order. If you get violations:

1. Check that all referenced tables exist
2. Ensure no other constraints are preventing deletion
3. Try cleaning individual tables: `ts-node scripts/seed/seedDataCleanup.ts table invoices`

### Out of Memory

If seeding large amounts of data:

1. Reduce batch size in the seed script
2. Seed in smaller iterations
3. Use the database directly for very large datasets

## Integration with CI/CD

```yaml
# Example GitHub Actions workflow
- name: Seed demo data
  run: ts-node scripts/seed/seedDemoData.ts

- name: Run tests
  run: npm test

- name: Cleanup
  run: ts-node scripts/seed/seedDataCleanup.ts
  if: always()
```

## Support

For issues with seed data scripts, refer to the main project documentation or contact your development team.
