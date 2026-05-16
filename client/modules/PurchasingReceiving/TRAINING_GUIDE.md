# Echo Ops Training & Onboarding Guide

## Quick Navigation

- [Admin Training](#admin-training)
- [Manager Training](#manager-training)
- [Receiver Training](#receiver-training)
- [Chef Training](#chef-training)
- [Finance Training](#finance-training)
- [Quick Start Checklist](#quick-start-checklist)

---

## Admin Training

### Role Overview

As an admin, you have full system access. Your responsibilities include:

- Managing user accounts and permissions
- Configuring organization settings
- Setting up integrations
- Monitoring system health
- Managing compliance and audit trails

### Getting Started (Day 1)

#### 1. Access the Admin Panel

```
Navigate to: /admin
```

#### 2. Initial Organization Setup

1. **Review Organization Settings**
   - Go to Admin → Organization Settings
   - Verify organization name and tier
   - Check enabled features
   - Configure security settings

2. **Add Your Team**
   - Admin → User Management
   - Click "Add User"
   - Enter name and email
   - Assign role (Admin, Manager, Receiver, Chef, Finance)
   - If outlet-specific, select outlet
   - Send invitation

3. **Set Data Retention Policies**
   - Admin → Retention Policies
   - Review default settings:
     - Invoices: 7 years (2555 days)
     - Audit Logs: 1 year (365 days)
     - Session Data: 90 days
   - Adjust as needed for compliance

#### 3. Configure Integrations

1. Go to **Integrations** page
2. For each system you want to connect:
   - Click "Add Integration"
   - Select provider (QuickBooks, NetSuite, SendGrid, etc.)
   - Follow OAuth flow or enter API credentials
   - Test connection
   - Enable sync

**Currently Available:**

- Accounting: QuickBooks Online, Xero
- ERP: NetSuite, SAP
- Email: SendGrid

### Week 1 Checklist

- [ ] Complete organization setup
- [ ] Add all team members
- [ ] Test all user roles can login
- [ ] Configure 2FA requirements
- [ ] Set IP whitelist (optional)
- [ ] Connect first integration
- [ ] Review audit logs
- [ ] Schedule team training sessions

### Common Tasks

**Task: Reset User Password**

```
1. Admin → User Management
2. Find user
3. Click Edit
4. Send password reset link
```

**Task: Audit Recent Changes**

```
1. Admin → Audit Logs
2. Filter by action or user
3. Review timestamp and details
4. Export if needed
```

**Task: Export Organization Data**

```
1. Compliance → Data Exports
2. Click "New Export Request"
3. Select data types
4. Choose format (JSON/CSV/PDF)
5. Wait for completion
6. Download when ready
```

### Monthly Admin Tasks

- [ ] Review system health (Monitoring dashboard)
- [ ] Audit user access levels
- [ ] Check integration sync status
- [ ] Review compliance audit trail
- [ ] Check backup status
- [ ] Verify security policies

---

## Manager Training

### Role Overview

Managers oversee one or more outlets. Your responsibilities include:

- Managing outlet operations
- Creating and monitoring purchase orders
- Reviewing analytics and dashboards
- Managing outlet-specific inventory

### Day 1: Dashboard Orientation

#### 1. Access Your Dashboard

```
Navigate to: /multi-outlet (if multi-outlet org) or /dashboard
```

#### 2. Understand Key Metrics

Your dashboard shows:

- **Total Outlets** - number of locations you manage
- **Total Invoices** - cumulative count
- **Total Spend** - organization-wide or outlet-specific
- **Unique Vendors** - supplier count

#### 3. Switch Between Outlets (If Multi-Outlet)

1. Click **Outlet Selector** in top navigation
2. Choose outlet from dropdown
3. View outlet-specific data
4. Dashboard updates automatically

#### 4. Review Organization View

```
Admin → Organization View
Shows:
- KPI cards (invoices, spend, vendors, tier)
- Spend comparison bar chart across outlets
- Monthly spend trend
- Outlet performance table
```

### Week 1 Tasks

**Create Your First Purchase Order**

1. Go to **Purchasing**
2. Review Order Guide (suggested items with par levels)
3. Select items needing orders
4. Confirm quantities
5. Submit to vendor

**Review Forecasting**

1. Go to **Forecasting & Optimization**
2. Review demand forecast (14 days)
3. Check supplier recommendations
4. Review seasonal patterns
5. View procurement recommendations

**Check Analytics**

1. Go to **Analytics**
2. Review outlet performance
3. Check cost trends
4. Analyze invoice variances

### Common Manager Tasks

**Monitor Inventory Levels**

```
1. Dashboard → Scroll to Outlet Performance
2. Click outlet name
3. View inventory metrics
4. Check Par vs On-Hand
5. Review low stock alerts
```

**Compare Outlets**

```
1. Multi-Outlet Dashboard → Outlet Comparison
2. View performance ranking
3. Identify outliers
4. Drill into details
```

**Export Monthly Report**

```
1. Analytics → Select date range
2. Click Export
3. Choose format (PDF/CSV)
4. Share with stakeholders
```

### Monthly Manager Checklist

- [ ] Review outlet KPIs
- [ ] Approve pending purchase orders
- [ ] Check inventory forecasts
- [ ] Analyze cost trends
- [ ] Compare outlet performance
- [ ] Review supplier optimization recommendations
- [ ] Schedule team meetings

---

## Receiver Training

### Role Overview

Receivers handle incoming inventory. Your responsibilities include:

- Receiving and processing invoices
- Scanning barcodes
- Updating inventory
- Processing deliveries
- Reporting discrepancies

### Day 1: Basic Operations

#### 1. Understanding the Receiving Workflow

```
Invoice Received
    ↓
Scan with hardware scanner (or manual entry)
    ↓
Match to Purchase Order
    ↓
Verify quantities and condition
    ↓
Update inventory (automatic)
    ↓
Create inventory lots (with expiry dates)
    ↓
Complete transaction
```

#### 2. Setting Up Your Scanner

1. Go to **Hardware**
2. Click "Connect Scanner"
3. Choose connection type:
   - USB (WebUSB)
   - WiFi (auto-detect)
4. Test by scanning a barcode
5. Confirm successful scan

#### 3. First Receiving Task

1. Go to **Receiving**
2. Click "New Delivery"
3. Enter vendor name
4. Scan first invoice barcode
5. Confirm invoice details
6. Scan item barcodes one by one
7. Verify quantities match
8. Mark items received

### Daily Receiver Tasks

**Process Incoming Delivery**

```
1. Receiving page → New Delivery
2. Scan invoice barcode
3. For each item:
   - Scan item barcode
   - Enter quantity
   - Note condition (if damaged)
4. Review summary
5. Click "Complete Delivery"
```

**Handle Missing or Damaged Items**

```
1. During receiving, note discrepancies
2. Click "Add Exception"
3. Select type (missing/damaged)
4. Document quantity and items
5. Create ticket for manager
```

**View Inventory Updates**

```
1. Go to Inventory
2. Search for item
3. View on-hand balance
4. Check lot expiry dates
5. Review cost per unit
```

### Receiving Best Practices

✓ Always scan barcodes (don't type manually)
✓ Verify condition of items immediately
✓ Note any discrepancies with PO
✓ Mark items with short shelf life
✓ Don't leave partial deliveries incomplete
✓ Report scanner issues immediately

### Receiver Troubleshooting

**Scanner Not Scanning**

1. Check USB/WiFi connection
2. Test with different barcode
3. Restart scanner
4. Check Hardware settings

**Barcode Not Recognized**

1. Check barcode is scannable
2. Verify item is in system
3. Use manual lookup
4. Contact manager

**Quantity Mismatch**

1. Recount items
2. Document discrepancy
3. Create ticket
4. Wait for manager approval

---

## Chef Training

### Role Overview

Chefs manage recipes and ingredients. Your responsibilities include:

- Managing recipes
- Costing recipes
- Viewing ingredient availability
- Planning menu items

### Day 1: Getting Started

#### 1. Access Recipe Management

```
Navigate to: /recipes
```

#### 2. View Recipe Costing

1. Go to **Recipes**
2. Select a recipe
3. View ingredient list
4. See per-portion cost
5. Check ingredient on-hand levels

#### 3. Check Ingredient Availability

```
1. Click on ingredient
2. View:
   - On-hand quantity
   - Par level
   - Last receiving date
   - Current cost per unit
3. Note if running low
```

### Daily Chef Tasks

**Review Menu Feasibility**

```
1. Recipes → Select dish
2. Check all ingredients in stock
3. Calculate total cost
4. Verify portion count available
```

**Create New Recipe**

```
1. Recipes → New Recipe
2. Enter recipe name
3. Add ingredients:
   - Ingredient name
   - Quantity needed
   - Unit
4. Add preparation steps
5. Calculate yield
6. Save
```

**Cost a Dish**

```
1. Recipe → View Recipe
2. System auto-calculates:
   - Total ingredient cost
   - Cost per portion
   - Suggested menu price
3. Review profitability
```

---

## Finance Training

### Role Overview

Finance staff handle reporting and analysis. Your responsibilities include:

- Analyzing invoices and costs
- Reporting on spend
- Variance analysis
- Financial forecasting

### Day 1: Finance Dashboard

#### 1. Access Finance Tools

```
Navigate to: /finance or /analytics
```

#### 2. Understand Key Reports

```
Invoice Summary
├── Total invoices
├── Average invoice value
├── Outstanding invoices
└── Paid invoices

Cost Analysis
├── Total spend (MTD/YTD)
├── Spend by vendor
├── Spend by category
└── Cost trends

Variance Analysis
├── Price variances
├── Quantity discrepancies
└── Timing differences
```

#### 3. Generate Your First Report

1. Go to **Advanced Analytics**
2. Select date range
3. Choose outlets
4. Select metrics
5. Click "Generate Report"
6. Review charts
7. Export as PDF

### Weekly Finance Tasks

**Invoice Variance Review**

```
1. Analytics → Cost Analysis
2. Filter by vendor
3. Check for price changes > 5%
4. Investigate causes
5. Document findings
6. Alert manager if needed
```

**Spending Forecast**

```
1. Analytics → Predictive Analytics
2. Review 30-day forecast
3. Compare to budget
4. Identify trends
5. Alert if exceeding projections
```

**Outlet Comparison**

```
1. Analytics → Outlet Comparison
2. View spend per outlet
3. Calculate per-unit costs
4. Identify outliers
5. Request explanations
```

### Monthly Finance Checklist

- [ ] Close all invoices for month
- [ ] Reconcile to general ledger
- [ ] Review variance analysis
- [ ] Generate management reports
- [ ] Prepare budget vs. actual
- [ ] Review forecasts for next month
- [ ] Archive completed invoices

---

## Quick Start Checklist

### For New Users (All Roles)

**Day 1**

- [ ] Create your account
- [ ] Set password
- [ ] Enable 2FA (if required)
- [ ] Review role permissions
- [ ] Complete role-specific training

**Week 1**

- [ ] Access all relevant pages
- [ ] Review sample data
- [ ] Complete first task
- [ ] Ask questions if needed

**Week 2-4**

- [ ] Become independent
- [ ] Help other users
- [ ] Suggest improvements

### For New Admins

**Week 1**

- [ ] Set up organization
- [ ] Add team members
- [ ] Configure integrations
- [ ] Set security policies
- [ ] Review audit logs

**Weeks 2-4**

- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Schedule training
- [ ] Document procedures

### For New Managers

**Week 1**

- [ ] Learn dashboard
- [ ] Create purchase orders
- [ ] Review analytics
- [ ] Meet receivers
- [ ] Set performance goals

**Weeks 2-4**

- [ ] Analyze trends
- [ ] Optimize suppliers
- [ ] Review forecasts
- [ ] Train team members

### For New Receivers

**Week 1**

- [ ] Connect scanner
- [ ] Process first delivery
- [ ] Learn barcode matching
- [ ] Understand inventory
- [ ] Ask questions

**Weeks 2-4**

- [ ] Process independently
- [ ] Handle exceptions
- [ ] Improve speed
- [ ] Mentor new staff

---

## Keyboard Shortcuts

| Shortcut           | Action          |
| ------------------ | --------------- |
| `Cmd/Ctrl + K`     | Search          |
| `Cmd/Ctrl + Enter` | Submit form     |
| `Cmd/Ctrl + S`     | Save/Quick save |
| `Esc`              | Close dialog    |
| `Cmd/Ctrl + /`     | Toggle sidebar  |
| `?`                | Help/shortcuts  |

---

## Support Resources

### Getting Help

1. **In-App Help**
   - Click `?` on any page
   - Hover over icons for tooltips
   - Check data tooltips

2. **Documentation**
   - System docs: https://docs.echo-ops.example.com
   - Admin guide: See SYSTEM_DOCUMENTATION.md
   - API docs: https://api.echo-ops.example.com/docs

3. **Contact Support**
   - Email: support@echo-ops.example.com
   - Slack: #echo-ops-support
   - Phone: 1-800-ECHO-OPS (during business hours)

### Common Questions

**Q: How do I reset my password?**
A: Click "Forgot Password" on login. You'll receive a reset link via email.

**Q: Can I access multiple outlets?**
A: Yes, if your role allows. Use the Outlet Selector to switch.

**Q: How often is data synced with integrations?**
A: By default, hourly. Check Integration Manager for specific sync times.

**Q: How long is data kept?**
A: See Data Retention section in Admin → Compliance. Most data kept 2-7 years.

**Q: How do I export data?**
A: Go to Compliance → Data Exports. Request in JSON/CSV/PDF format.

---

## Video Training (Coming Soon)

- Getting Started with Echo Ops (5 min)
- Receiving Workflow (10 min)
- Creating Purchase Orders (8 min)
- Advanced Analytics (12 min)
- Troubleshooting Common Issues (7 min)

_Videos available at: https://learn.echo-ops.example.com_

---

_Last Updated: 2024_
_Version: 1.0_
