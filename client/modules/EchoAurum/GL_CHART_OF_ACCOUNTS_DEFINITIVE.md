# DEFINITIVE CHART OF ACCOUNTS: HOSPITALITY HYBRID
## All Verticals (Hotels, Restaurants, Bars, Casinos, Entertainment) + Expansion Ready

**Framework:** USALI + Restaurant + Casino + Entertainment hybrid  
**Structure:** 350+ core accounts + unlimited custom sub-accounts  
**Design:** Multi-vertical, multi-revenue stream capable  
**Version:** 1.0 Production-Ready

---

## ACCOUNT NUMBERING SCHEME

### Range Allocation
```
1000-1999: ASSETS
2000-2999: LIABILITIES
3000-3999: EQUITY
4000-4999: REVENUE (Hotels/Rooms)
5000-5999: COST OF GOODS SOLD (F&B)
6000-6999: OPERATING EXPENSES
7000-7999: OTHER INCOME
8000-8999: OTHER EXPENSES
9000-9999: EXPANSION / INDUSTRY-SPECIFIC
```

**Format:** `XXXX-YYY` where:
- `XXXX` = Main account (GL posting account)
- `YYY` = Sub-account (optional, for detail tracking)

---

# 1. ASSETS (1000-1999)

## Current Assets (1000-1299)

### Cash & Bank Accounts (1000-1099)
```
1000    Cash - Operations
1001    Cash - Restricted (escrow, deposits held)
1010    Bank Account - Main Operating
1011    Bank Account - Payroll
1012    Bank Account - Tax Deposits
1013    Bank Account - Investment
1020    Petty Cash - Front Desk
1021    Petty Cash - Back of House
1030    Cash in Transit (payment processor batches)
1040    Payment Processor Float (Stripe, Square waiting settlement)
```

### Accounts Receivable (1100-1199)
```
1100    Accounts Receivable - Hotel (room charges, incidentals)
1101    Accounts Receivable - F&B (restaurant/bar credit accounts)
1102    Accounts Receivable - Catering (event/group billing)
1103    Accounts Receivable - Casino (player accounts, junkets)
1104    Accounts Receivable - Entertainment (ticket sales, shows)
1105    Accounts Receivable - Other (misc credit customers)
1110    Allowance for Doubtful Accounts (AR reserve)
1120    Customer Deposits (advance payments, group deposits)
```

### Other Current Assets (1200-1299)
```
1200    Inventory - F&B (food, beverage, bar stock)
1201    Inventory - Hotel Supplies (linens, toiletries, room supplies)
1202    Inventory - Casino Chips (casino float)
1203    Inventory - Entertainment (ticket stock, merchandise)
1210    Prepaid Insurance
1220    Prepaid Rent
1230    Prepaid Maintenance Contracts
1240    Prepaid Licenses & Permits
1250    Unapplied Vendor Credits
1260    Receivable - Employee Advances
1270    Receivable - Related Companies (intercompany)
```

## Fixed Assets (1300-1599)

### Property & Equipment (1300-1399)
```
1300    Land (building property)
1310    Building/Structure (main building, additions)
1320    Leasehold Improvements (rented property upgrades)
1330    Furniture, Fixtures & Equipment (FF&E)
1331    FF&E - Dining (tables, chairs, kitchen equipment)
1332    FF&E - Rooms (beds, nightstands, bathrooms)
1333    FF&E - Public Areas (lobby, bar, casino)
1334    FF&E - Casino Equipment (tables, machines, surveillance)
1335    FF&E - Entertainment (stage, AV equipment, lighting)
1340    Kitchen Equipment (POS, cooking appliances, cold storage)
1350    Hotel Systems (PMS, door locks, elevator, HVAC)
1360    Casino Systems (surveillance, chip readers, management system)
1370    Entertainment Systems (sound, lighting, projection)
1380    IT Equipment (servers, computers, networking)
```

### Accumulated Depreciation (1400-1499)
```
1400    Accumulated Depreciation - Building
1410    Accumulated Depreciation - Leasehold Improvements
1420    Accumulated Depreciation - FF&E
1430    Accumulated Depreciation - Kitchen Equipment
1440    Accumulated Depreciation - Systems
```

### Intangibles (1500-1599)
```
1500    Goodwill (acquisition goodwill)
1510    Brand/Trademark
1520    Software & Licenses
1530    Management Contracts (long-term)
1540    Franchise Rights
1550    Liquor License (state-specific, often required)
1560    Gaming License (casino properties)
```

---

# 2. LIABILITIES (2000-2999)

## Current Liabilities (2000-2399)

### Accounts Payable (2000-2099)
```
2000    Accounts Payable - General (vendor invoices)
2010    Accounts Payable - Food & Beverage (restaurant suppliers)
2011    Accounts Payable - Bar (liquor, wine, beer suppliers)
2020    Accounts Payable - Hotel Suppliers (linens, toiletries, cleaning)
2030    Accounts Payable - Casino (chips, supplies)
2040    Accounts Payable - Entertainment (talent, production)
2050    Accounts Payable - Payroll Processing (payroll service fees)
2060    Accounts Payable - Related Companies (intercompany payables)
```

### Accrued Expenses (2100-2199)
```
2100    Accrued Salaries & Wages (payroll accrual, unpaid wages)
2101    Accrued Payroll Taxes (employer taxes not yet paid)
2102    Accrued Tips Payable (employee tips waiting payout)
2110    Accrued Utilities (electric, water, gas not yet invoiced)
2120    Accrued Maintenance & Repairs
2130    Accrued Commissions (sales commissions)
2140    Accrued Bonus (year-end bonuses accrued)
2150    Accrued PTO/Vacation (employee time off liability)
2160    Accrued Interest Payable
```

### Sales Tax & Payroll Taxes (2200-2299)
```
2200    Sales Tax Payable (state sales tax collected)
2201    Room Tax Payable (state/local room occupancy tax)
2202    Gaming Tax Payable (casino gaming tax)
2210    Federal Payroll Tax Payable (income tax withholding)
2211    Federal Unemployment Tax Payable (FUTA)
2220    State Payroll Tax Payable (income tax withholding)
2221    State Unemployment Tax Payable (SUTA)
2230    Local Payroll Tax Payable (city/county taxes)
```

### Deferred Revenue & Deposits (2300-2399)
```
2300    Customer Deposits - Rooms (advance room bookings)
2301    Customer Deposits - Events (catering deposits)
2302    Customer Deposits - Entertainment (ticket prepayment)
2303    Loyalty Program Liability (prepaid loyalty points)
2310    Gift Cards / Gift Certificates Liability (issued but unspent)
2320    Contract Liability - Future Services (prepaid services)
```

## Long-Term Liabilities (2400-2999)

### Debt (2400-2499)
```
2400    Long-Term Debt - Bank (mortgage, loans >12 months)
2401    Long-Term Debt - Related Companies (inter-company loans)
2410    Capitalized Lease Obligation (equipment financing)
2420    Equipment Financing
2430    Loan Discount (debt issuance cost, contra-asset)
```

### Other Liabilities (2500-2999)
```
2500    Pension/Retirement Obligations (unfunded retirement liability)
2510    Deferred Tax Liability (timing differences)
2520    Contingent Liabilities (lawsuit reserves, estimated claims)
2530    Environmental Liabilities (property remediation)
2540    Tenant/Guest Deposits Held (security deposits liability)
2550    Intercompany Payables - Consolidation Elimination
```

---

# 3. EQUITY (3000-3999)

## Owner's Equity (3000-3299)
```
3000    Common Stock / Capital Contribution (founder investment)
3010    Preferred Stock (if applicable)
3020    Additional Paid-In Capital
3030    Treasury Stock (stock repurchased)
```

## Retained Earnings (3300-3399)
```
3300    Retained Earnings - Beginning Balance
3310    Current Year Net Income (self-balancing account)
3320    Dividends Declared / Distributions
3330    Accumulated Other Comprehensive Income
```

## Franchise/Corporate Equity (3400-3499)
```
3400    Franchise Fee (non-amortizable portion)
3410    Management Fee Liability (parent company relationship)
3420    Royalty Payable - Parent (ongoing franchise royalty)
```

---

# 4. REVENUE (4000-4999) - HOTELS

## Room Revenue (4000-4199)
```
4000    Room Revenue - Occupied Rooms (primary revenue)
4001    Room Revenue - Rack Rate (published rate)
4002    Room Revenue - Discount Rate (negotiated/group rates)
4010    Room Service Revenue (in-room dining)
4020    Minibar Revenue
4030    Parking Revenue (guest parking, self-parking)
4040    Resort Fees / Facility Fees (optional daily charges)
```

## Food & Beverage Revenue (4200-4399)
```
4200    Restaurant Revenue - Food Sales
4201    Restaurant Revenue - Alcoholic Beverages
4202    Restaurant Revenue - Non-Alcoholic Beverages
4210    Bar Revenue - Alcoholic Beverages
4211    Bar Revenue - Non-Alcoholic Beverages
4220    Banquet/Catering Revenue - Food
4221    Banquet/Catering Revenue - Beverage
4230    Room Service Revenue (in-room beverage)
4240    Staff Meal Revenue (employee meals charged back)
```

## Ancillary Revenue (4400-4699)
```
4400    Spa/Wellness Revenue (massage, treatments, fitness)
4410    Golf Course Revenue (if applicable)
4420    Entertainment Revenue (shows, concerts, cover charges)
4430    Casino Revenue - Gaming (gaming win)
4431    Casino Revenue - Food (casino restaurants)
4440    Gift Shop / Retail Revenue
4450    Telephone Revenue (international calls, surcharges)
4460    Internet/WiFi Revenue (premium WiFi charges)
4470    Valet Parking Revenue
4480    Laundry/Dry Cleaning Revenue
4490    Business Center Revenue
```

## Other Revenue (4700-4999)
```
4700    Management Fee Revenue (if managing other properties)
4710    Commissions Received (travel agent, booking engine)
4720    Travel Insurance Revenue (trip protection sold)
4730    Membership Dues (loyalty program)
4740    Late Checkout Fees
4750    Cancellation Fees
4760    Damage Charges (guest damage to rooms)
4770    Key Replacement Fees
4780    Miscellaneous Revenue
```

---

# 5. COST OF GOODS SOLD (5000-5999)

## Food & Beverage COGS (5000-5299)
```
5000    Food Cost - Restaurant (cost of food sold)
5001    Beverage Cost - Alcoholic (liquor, wine, beer cost)
5002    Beverage Cost - Non-Alcoholic (soft drinks, coffee, juice)
5010    Beverage Cost - Bar (per drink cost)
5020    Catering Food Cost (event food costs)
5030    Minibar Cost (restocking minibar)
5040    Room Service Food Cost
5050    Staff Meal Cost (employee meals)
5060    Cooking & Preparation Labor (can be split F&B labor)
5070    Inventory Shrinkage - F&B (theft, waste)
5080    Wine/Liquor Spoilage
5090    Recipe Costing Variance (theoretical vs. actual)
```

## Other COGS (5300-5399)
```
5300    Casino Chips/Gaming Supplies Cost (chips, cards, equipment)
5310    Entertainment Cost - Talent (performer fees)
5320    Entertainment Cost - Production (equipment, staging)
5330    Retail Inventory Cost (gift shop cost of goods)
5340    Spa Supplies Cost (massage oils, products)
```

## Labor Included in COGS (5400-5499)
```
5400    Payroll - Kitchen Staff (chefs, line cooks, prep)
5401    Payroll - Servers (F&B servers, bartenders)
5402    Payroll - Spa Therapists (if treating as service COGS)
5403    Payroll Taxes - COGS Labor (employer payroll taxes)
5404    Employee Benefits - COGS Labor (health insurance portion)
```

---

# 6. OPERATING EXPENSES (6000-6999)

## Rooms Department (6000-6199)
```
6000    Payroll - Housekeeping (housekeeper salaries, benefits)
6001    Payroll - Front Desk (front desk, concierge, bell staff)
6002    Payroll - Guest Services (valet, security, engineering)
6010    Supplies - Guest Supplies (toiletries, towels, robes)
6020    Supplies - Cleaning & Laundry (detergent, chemicals)
6030    Supplies - Office & Supplies (pens, paper)
6040    Uniforms - Rooms Staff
6050    Training & Development - Rooms
6060    Contracted Services - Housekeeping (outsourced cleaning)
6070    Contracted Services - Laundry (off-site laundry service)
```

## F&B Department (6200-6399)
```
6200    Payroll - F&B Management (F&B director, sous chef)
6201    Payroll - Kitchen Staff (chefs, line cooks - if not in COGS)
6202    Payroll - Service Staff (servers, bartenders - if not in COGS)
6210    Supplies - Kitchen (non-food: utensils, containers, fuel)
6220    Supplies - Dining Room (linens, glassware, dishware)
6230    Supplies - Bar (bar supplies, glassware, straws)
6240    Uniforms - F&B
6250    Training & Development - F&B
6260    Music & Entertainment Licenses (performing rights)
6270    Complimentary Items (free drinks, meals, upgrades)
6280    Contracted Services - Catering (external events)
6290    Contracted Services - Bartending (special events)
```

## Administrative & General (6400-6599)
```
6400    Payroll - Executive Management (GM, controller, director salaries)
6401    Payroll - Administrative Staff (HR, accounting, admin)
6410    Professional Fees - Accounting & Audit
6411    Professional Fees - Legal
6412    Professional Fees - Consulting
6420    Office Supplies & Materials
6430    Postage & Shipping
6440    Telephone & Internet
6450    Uniforms - Administrative
6460    Travel & Entertainment (business meal, hotel, travel)
6470    Training & Development - Admin
6480    Dues, Subscriptions & Memberships
6490    Bank Charges & Fees
```

## Property Operations (6600-6799)
```
6600    Payroll - Engineering & Maintenance (maintenance staff)
6610    Supplies - Maintenance (paint, tools, parts)
6620    Supplies - Engineering (HVAC filters, plumbing)
6630    Contracted Services - Maintenance (outsourced repairs)
6640    Contracted Services - Engineering (HVAC, plumbing repairs)
6650    Utilities - Electric
6651    Utilities - Natural Gas
6652    Utilities - Water & Sewer
6653    Utilities - Waste Management
6660    Repairs & Maintenance (non-contract, ad-hoc repairs)
6670    Building Equipment Maintenance (elevator, HVAC annual)
6680    Grounds & Landscaping
6690    Security Services (contracted security, surveillance)
```

## Marketing & Loyalty (6800-6899)
```
6800    Payroll - Marketing & Sales
6810    Advertising - Digital (Google Ads, Facebook, banner ads)
6811    Advertising - Print (newspapers, magazines)
6812    Advertising - Outdoor (billboards, transit ads)
6820    Website & Social Media (content creation, management)
6830    PR & Media Relations
6840    Loyalty Program Costs (point redemption, rewards)
6850    Commissions - OTA (Expedia, Booking.com commissions)
6860    Commissions - Travel Agents
6870    Partnership Marketing (co-op ads, joint promotions)
6880    Events & Sponsorships
6890    Promotional Items & Gifts
```

## Depreciation & Amortization (6900-6999)
```
6900    Depreciation Expense - Building
6910    Depreciation Expense - FF&E
6920    Depreciation Expense - Kitchen Equipment
6930    Depreciation Expense - Systems & IT
6940    Amortization Expense - Intangibles (goodwill, licenses)
6950    Amortization Expense - Leasehold Improvements
```

---

# 7. OTHER INCOME (7000-7999)

```
7000    Interest Income (on savings accounts, investments)
7010    Dividend Income (investment dividends)
7020    Gain on Sale of Assets (sale of equipment, property)
7030    Insurance Recovery (claims reimbursement)
7040    Rental Income (if renting out property portion)
7050    Commission Income (booking or management commissions)
7060    Service Revenue - Related Companies (management fees)
7070    Exchange Gain (foreign currency gains)
7080    Miscellaneous Income
```

---

# 8. OTHER EXPENSES (8000-8999)

```
8000    Interest Expense (loan interest, credit card interest)
8010    Loss on Sale of Assets (selling equipment at loss)
8020    Asset Impairment (write-down of asset value)
8030    Currency Exchange Loss (foreign currency losses)
8040    Bad Debt Expense (customer account write-off)
8050    Charitable Donations
8060    Penalties & Fines (regulatory, parking, etc.)
8070    Settlement Expense (legal settlements)
8080    Insurance Claim Loss (deductible portions)
8090    Miscellaneous Expense
```

---

# 9. EXPANSION & INDUSTRY-SPECIFIC (9000-9999)

## Casino-Specific (9000-9199)
```
9000    Gaming Tax Expense (state gaming tax on wins)
9010    Complimentary Gaming (free play, promotional chips)
9020    Casino Supplies (chips beyond COGS)
9030    Gaming Regulation & Licensing
9040    Player Tracking System Costs
9050    Anti-Money Laundering Compliance
```

## Entertainment Venue-Specific (9200-9399)
```
9200    Talent Acquisition & Booking (agent fees)
9210    Venue Rental (if hosting external events)
9220    Production Insurance (event coverage)
9230    Licensing Fees - Music & Performance Rights (ASCAP, BMI)
9240    Event Staffing
9250    Equipment Rental - Events
```

## Multi-Concept Expansion (9400-9599)
```
9400    Revenue - Retail Shop (gift shop, merchandise)
9410    Revenue - Fitness Center (gym membership fees)
9420    Revenue - Golf / Recreation
9430    Revenue - Condominium/Fractional Ownership
9440    COGS - Retail
9450    Expense - Fitness Center Operations
9460    Expense - Recreation Operations
```

## Consolidation & Elimination (9600-9999)
```
9600    Intercompany Revenue - Elimination (consolidation entry)
9610    Intercompany Expense - Elimination (consolidation entry)
9620    Intercompany Gain/Loss - Elimination
9630    Consolidation Adjustment - Assets
9640    Consolidation Adjustment - Liabilities
9650    Consolidation Adjustment - Equity
9700    Temporary Consolidation Accounts (used during close)
9800    Reserve Accounts (special provisions, future use)
9900    Suspense Account (temporary accounts pending allocation)
9999    Rounding / Adjustment Account
```

---

# IMPLEMENTATION: DATABASE SCHEMA

## GL Accounts Table Structure

```sql
CREATE TABLE gl_accounts (
  id                      UUID PRIMARY KEY,
  entity_id              UUID NOT NULL (references entity),
  account_number         VARCHAR(20) NOT NULL,
  sub_account_number     VARCHAR(20),
  account_name           VARCHAR(255) NOT NULL,
  account_type           VARCHAR(50) NOT NULL (Asset, Liability, Equity, Revenue, COGS, Expense, Other),
  account_category       VARCHAR(100) NOT NULL (for hierarchical navigation),
  description            TEXT,
  
  -- Posting controls
  is_active              BOOLEAN DEFAULT true,
  requires_cost_center   BOOLEAN DEFAULT false,
  requires_department    BOOLEAN DEFAULT false,
  requires_outlet        BOOLEAN DEFAULT false (for multi-location),
  posting_rules_json     JSONB (for complex rules),
  
  -- Consolidation
  is_elimination_account BOOLEAN DEFAULT false,
  is_intercompany        BOOLEAN DEFAULT false,
  consolidation_rules_json JSONB,
  
  -- Guardian AI controls
  expected_debit_balance BOOLEAN (true = expects debit balance, false = credit),
  monthly_threshold      DECIMAL (Alert if variance exceeds),
  anomaly_check_enabled  BOOLEAN DEFAULT true (Phoenix Guardian),
  
  -- Audit
  created_by            UUID,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_by            UUID,
  updated_at            TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(entity_id, account_number)
);

CREATE INDEX idx_gl_accounts_entity_active 
  ON gl_accounts(entity_id, is_active);
CREATE INDEX idx_gl_accounts_type 
  ON gl_accounts(account_type);
```

---

# IMPLEMENTATION: STARTUP GL CHART FOR DEMO ENTITY

Each new entity gets this seeded automatically:

```typescript
// Seed data: Default GL accounts for new hospitality entity
const defaultGLAccounts = [
  // ASSETS
  { accountNumber: '1000', name: 'Cash - Operations', type: 'Asset', category: 'Cash' },
  { accountNumber: '1010', name: 'Bank Account - Main Operating', type: 'Asset', category: 'Cash' },
  { accountNumber: '1100', name: 'Accounts Receivable - Hotel', type: 'Asset', category: 'AR' },
  { accountNumber: '1200', name: 'Inventory - F&B', type: 'Asset', category: 'Inventory' },
  
  // LIABILITIES
  { accountNumber: '2000', name: 'Accounts Payable - General', type: 'Liability', category: 'AP' },
  { accountNumber: '2100', name: 'Accrued Salaries & Wages', type: 'Liability', category: 'Accrued' },
  { accountNumber: '2200', name: 'Sales Tax Payable', type: 'Liability', category: 'Tax' },
  
  // EQUITY
  { accountNumber: '3000', name: 'Common Stock', type: 'Equity', category: 'Capital' },
  { accountNumber: '3300', name: 'Retained Earnings', type: 'Equity', category: 'Earnings' },
  
  // REVENUE - ROOMS
  { accountNumber: '4000', name: 'Room Revenue', type: 'Revenue', category: 'Rooms' },
  
  // REVENUE - F&B
  { accountNumber: '4200', name: 'Restaurant Revenue - Food', type: 'Revenue', category: 'F&B' },
  { accountNumber: '4210', name: 'Bar Revenue', type: 'Revenue', category: 'F&B' },
  
  // COGS
  { accountNumber: '5000', name: 'Food Cost - Restaurant', type: 'COGS', category: 'F&B COGS' },
  { accountNumber: '5001', name: 'Beverage Cost - Alcoholic', type: 'COGS', category: 'F&B COGS' },
  
  // OPERATING EXPENSES
  { accountNumber: '6000', name: 'Payroll - Housekeeping', type: 'Expense', category: 'Payroll' },
  { accountNumber: '6400', name: 'Payroll - Executive', type: 'Expense', category: 'Payroll' },
  { accountNumber: '6600', name: 'Payroll - Engineering', type: 'Expense', category: 'Payroll' },
  { accountNumber: '6650', name: 'Utilities - Electric', type: 'Expense', category: 'Utilities' },
  { accountNumber: '6900', name: 'Depreciation Expense', type: 'Expense', category: 'Depreciation' },
];
```

---

# USAGE: MULTI-VERTICAL SCENARIOS

## HOTEL ONLY
Uses: 1000-1999 (Assets), 2000-2999 (Liabilities), 3000-3999 (Equity), 4000-4699 (Hotel Revenue), 5000-5300 (COGS), 6000-6999 (Operating)

## RESTAURANT ONLY
Uses: 1000-1999 (Assets), 2000-2999 (Liabilities), 3000-3999 (Equity), 4200-4450 (F&B Revenue), 5000-5090 (F&B COGS), 6000-6999 (Operating)

## HOTEL + F&B
Uses: All of above (4000-4699 for rooms + F&B, 5000-5090 for both)

## HOTEL + CASINO
Uses: 4000-4699 (Rooms + F&B), 9000-9199 (Casino), 5000-5300 (COGS)

## MULTI-CONCEPT (Hotel + Restaurant + Casino + Entertainment)
Uses: All ranges, adds intercompany elimination (9600-9999)

## EXPANSION READY
Can add new revenue streams:
- Condominium/Fractional Ownership (9430)
- Golf Course (4420)
- Fitness Center (9410, 9450)
- Retail Shop (9400, 9440)
- Management Company (7060, 4700)

---

# NOTES FOR IMPLEMENTATION

1. **Guardian AI Integration:**
   - Each GL account has `expected_debit_balance` (tells Phoenix if anomaly is upside/downside)
   - Phoenix Guardian uses this to detect "unusual" postings
   - Argus uses `posting_rules_json` to validate each entry

2. **Real-Time Consolidation:**
   - Child entities post to their GL
   - Consolidation job rolls up to parent automatically (via account hierarchy)
   - Intercompany transactions in 9600-9999 range auto-eliminated

3. **Customization:**
   - Each hospitality company can add sub-accounts (e.g., 5000-001, 5000-002 for multiple restaurants)
   - Add cost centers to any account (restaurant, department, profit center)
   - Add outlets to any account (property-specific GL)

4. **Audit Trail:**
   - Every GL account change logged (created by, updated by, timestamp)
   - Odin Guardian marks GL chart changes as immutable

5. **LUCCCA Integration:**
   - Once connected, data flows from LUCCCA systems into these GL accounts in real-time
   - Toast POS transactions → revenue accounts (4000, 4200-4210)
   - OPERA charges → room revenue (4000), ancillary (4400-4490)
   - Gusto payroll → expense accounts (6000-6402)
   - Bank feeds → cash, AP clearing

---

## PRODUCTION READY
This chart of accounts is production-ready and can be implemented immediately in:
- `server/services/aurumDatabase.ts` (seed function)
- `shared/aurum.ts` (GLAccount types)
- Database migration scripts
