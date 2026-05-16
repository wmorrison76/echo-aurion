// Help & Training System Types and Data export type HelpCategory = |"getting-started" |"pnl-management" |"gl-operations" |"ap-management" |"approvals" |"reconciliation" |"reporting" |"users-permissions" |"integrations" |"guardian-ai" |"best-practices" |"troubleshooting"; export type OnboardingPhase = |"welcome" |"setup" |"first-transaction" |"approvals" |"reporting" |"mastery"; export interface HelpArticle { id: string; title: string; category: HelpCategory; description: string; content: string; duration: number; // minutes to read difficulty:"beginner" |"intermediate" |"advanced"; relatedTopics: string[]; keywords: string[]; videoUrl?: string; lastUpdated: string;
} export interface OnboardingModule { id: string; phase: OnboardingPhase; title: string; description: string; estimatedTime: number; // minutes lessons: OnboardingLesson[]; prerequisite?: string; successCriteria: string[]; rolesApplicable: string[];
} export interface OnboardingLesson { id: string; title: string; content: string; videoUrl?: string; checklist: string[]; interactiveElement?: { type:"click-walkthrough" |"form-completion" |"feature-exploration"; description: string; };
} export interface FAQ { id: string; question: string; answer: string; category: HelpCategory; relatedArticles: string[]; upvotes: number; helpful: boolean;
} export interface GlossaryTerm { term: string; definition: string; relatedTerms: string[]; category: HelpCategory; example?: string;
} export interface WorkflowChecklist { id: string; title: string; description: string; category: HelpCategory; steps: ChecklistStep[]; estimatedTime: number; roles: string[];
} export interface ChecklistStep { id: string; title: string; description: string; tips: string[]; relatedHelp?: string;
} export interface InteractiveTutorial { id: string; title: string; description: string; steps: TutorialStep[]; category: HelpCategory; estimatedTime: number; targetRole: string; successMessage: string;
} export interface TutorialStep { id: string; title: string; instruction: string; targetElement?: string; // CSS selector for highlighting expectedAction: string; tips: string[]; helpArticle?: string;
} export interface ContextualHelp { id: string; featureName: string; shortTip: string; relatedArticles: string[]; videoThumbnail?: string; keywords: string[];
} // Knowledge Base: Help Articles
export const HELP_ARTICLES: HelpArticle[] = [ { id:"getting-started-welcome", title:"Welcome to EchoAurum", category:"getting-started", description:"Your first steps in the platform", content: `# Welcome to EchoAurum EchoAurum is a modern financial operations platform designed for hospitality enterprises. Whether you manage a single restaurant or a chain of 100+ outlets, EchoAurum provides the tools to manage your P&L, GL operations, AP workflows, and compliance needs. ## What You Can Do Here ### Multi-Outlet P&L Management
Manage profitability across all your outlets in one place. Set budgets, track forecasts, monitor actuals, and drill down into the details. ### General Ledger Operations
Post journal entries, maintain your chart of accounts, and ensure double-entry bookkeeping with AI-powered Guardian oversight. ### Accounts Payable
Manage invoices, approve payments, and maintain vendor relationships with intelligent matching and duplicate detection. ### Financial Reporting
Generate comprehensive financial reports including trial balance, income statements, balance sheets, and variance analysis. ### Guardian AI Oversight
Unique to EchoAurum, Guardian AI systems (Argus, Zelda, Phoenix, Odin) validate every transaction, prevent fraud, and maintain an immutable audit trail. ## Getting Started 1. **Set Up Your Profile** - Complete your user profile and set permissions
2. **Configure Outlets** - If managing multiple locations, add your outlets
3. **Chart of Accounts** - Review and customize your chart of accounts
4. **First Transaction** - Post your first journal entry with Guardian guidance
5. **Approvals** - Set up your approval workflows and hierarchy Let's begin!`, duration: 5, difficulty:"beginner", relatedTopics: ["onboarding-setup","chart-of-accounts"], keywords: ["welcome","getting started","first steps"], lastUpdated:"2024-01-15", }, { id:"pnl-setup-outlets", title:"Setting Up Your Outlets", category:"pnl-management", description:"Create and configure outlets (hotels, restaurants, spas)", content: `# Setting Up Your Outlets An outlet is any revenue-generating or cost-producing property in your organization (hotel, restaurant, spa, entertainment venue). ## Creating Your First Outlet 1. Navigate to the **Outlet Manager** in the Console
2. Click **Add New Outlet**
3. Fill in the following information: - **Outlet Code**: Unique identifier (e.g., HTL-001) - **Outlet Name**: Full name (e.g.,"Pacific Grove Resort - Main Hotel") - **Outlet Type**: Choose from Hotel, Restaurant, Spa, Entertainment, Other - **Location**: City/state/country - **Currency**: USD, EUR, etc. - **Status**: Active or Inactive 4. Click **Create Outlet** ## Organizing Outlets Hierarchically For large organizations, you can create a parent-child hierarchy: - **Pacific Grove Resort** (Parent) - **Main Hotel** (Child) - **Beach Restaurant** (Child) - **Spa & Wellness** (Child) This allows you to:
- Consolidate reporting
- Set permissions by outlet
- Track interdepartmental expenses ## What's Next Once outlets are created:
1. Configure **P&L Drivers** for each outlet
2. Set up **Budget** for the year
3. Start entering **Forecast** and **Actual** data`, duration: 8, difficulty:"beginner", relatedTopics: ["pnl-drivers","pnl-budgeting"], keywords: ["outlets","hotels","restaurants","setup"], lastUpdated:"2024-01-15", }, { id:"pnl-drivers-config", title:"Configuring P&L Drivers", category:"pnl-management", description:"Set up key performance indicators (KPIs) that drive your profitability", content: `# Configuring P&L Drivers P&L Drivers are the key performance indicators (KPIs) that drive your outlet's profitability. Common drivers include: ### Hotel Drivers
- **Room Nights**: Total occupied rooms per month
- **Average Daily Rate (ADR)**: Average price per room
- **Occupancy Rate (%)**: Percentage of available rooms occupied ### Restaurant Drivers
- **Covers**: Number of meals served
- **Check Average**: Average spend per guest
- **Labor Hours**: Total hours worked ### Universal Drivers
- **Guest Count**: Total number of visitors
- **Revenue per Guest**: Average revenue per visitor
- **Labor Percentage**: Labor cost as % of revenue ## Adding a Driver 1. Go to the outlet's **Driver Configuration** section
2. Click **Add Driver**
3. Select a driver type or enter a custom name
4. Enter monthly values (January through December)
5. The system will automatically calculate: - Annual total - Monthly average - Peak/low months - Monthly percent change ## Using Drivers for Forecasting Drivers are the foundation for AI-assisted forecasting (Phase 2). By establishing accurate drivers:
- AI can generate realistic P&L forecasts
- You can model different scenarios (occupancy up 5%, ADR down 2%, etc.)
- Variance analysis becomes more meaningful ## Best Practices 1. **Track seasonality** - Ensure your drivers reflect seasonal patterns
2. **Update monthly** - Keep drivers current as year progresses
3. **Use consistency** - Use same drivers across similar outlet types
4. **Document sources** - Know where each driver number comes from`, duration: 10, difficulty:"intermediate", relatedTopics: ["pnl-setup-outlets","forecasting"], keywords: ["drivers","KPI","occupancy","covers","ADR"], lastUpdated:"2024-01-15", }, { id:"gl-journal-entries", title:"Posting Journal Entries", category:"gl-operations", description:"Post double-entry bookkeeping entries with Guardian oversight", content: `# Posting Journal Entries Journal entries are the foundation of your general ledger. Every financial transaction is recorded as a journal entry following double-entry bookkeeping. ## Understanding Double-Entry Bookkeeping Every transaction has two sides:
- **Debit**: Increases assets/expenses, decreases liabilities/equity/revenue
- **Credit**: Decreases assets/expenses, increases liabilities/equity/revenue **Rule**: Debits must equal credits in every entry Example:
\`\`\`
Expense: Pay $1,000 for office supplies
Debit: 5310 Office Supplies $1,000
Credit: 1000 Cash $1,000
Total Debits = $1,000, Total Credits = $1,000 ✓
\`\`\` ## Creating a Journal Entry 1. Navigate to **GL Journal Entry System**
2. Click **New Entry**
3. Fill in header information: - **Date**: Transaction date (must be in open period) - **Reference**: Document reference (e.g.,"INV-2024-001") - **Description**: What is this entry for? - **Department**: Optional cost center - **Currency**: Transaction currency 4. Add line items: - **Account**: Select GL account - **Amount**: Entry amount - **Debit/Credit**: Choose side - **Cost Center**: If required by account - **Description**: Line-specific note 5. **Guardian Review** appears: - ✓ Argus validates account existence - ✓ Zelda checks for duplicates - ✓ Phoenix scans for anomalies - ✓ Odin prepares audit trail 6. Click **Post** (or **Submit for Approval** if workflow required) ## Guardian Validations Explained ### Argus: Data Compliance
Ensures your entry follows company rules:
- Account exists in chart of accounts
- Debits equal credits
- Required fields filled
- Cost center provided if needed
- Date in open period ### Zelda: Duplicate Detection
Checks if this entry was already posted:
- Same accounts, same amount, same date
- Similar entries within last 7 days ### Phoenix: Anomaly Detection
Flags unusual activity:
- Unusually large amount
- Off-hours posting
- Posting to restricted accounts
- Weekend transaction
- Posting to cash/bank account ### Odin: Audit Trail
Records who, what, when, why:
- Your name and timestamp
- Entry details
- Approver (if applicable)
- Reversals (if any) ## Common Entry Types ### Accrual Entry
Recording expense before payment:
\`\`\`
Debit: 5600 Utilities Expense $500
Credit: 2100 Accrued Utilities $500
\`\`\` ### Prepaid Expense
Recording advance payment:
\`\`\`
Debit: 1400 Prepaid Insurance $1,200
Credit: 1000 Cash $1,200
\`\`\` ### Monthly Allocation
Distributing costs across cost centers:
\`\`\`
Debit: 5100 Labor Expense (Kitchen) $5,000
Debit: 5100 Labor Expense (Front) $3,000
Credit: 2000 Wages Payable $8,000
\`\`\` ## Tips for Accurate Entries 1. **Be specific** - Detailed descriptions help auditors and future users
2. **Use cost centers** - Track expenses by department/location
3. **Post timely** - Don't batch entries from multiple periods
4. **Review carefully** - Use Guardian feedback before posting
5. **Keep documentation** - Store receipts/invoices as evidence`, duration: 12, difficulty:"beginner", relatedTopics: ["guardian-ai-overview","chart-of-accounts"], keywords: ["journal entry","debit","credit","double-entry","posting"], lastUpdated:"2024-01-15", }, { id:"guardian-ai-overview", title:"Understanding Guardian AI", category:"guardian-ai", description:"Your AI-powered financial oversight system", content: `# Understanding Guardian AI Guardian AI is your co-pilot accountant. Four AI systems work together to ensure accuracy, prevent fraud, and maintain compliance. ## The Four Guardians ### 1. Argus: Data Compliance
**What it does**: Validates every transaction follows company rules **Checks**:
- ✓ Account exists
- ✓ Debits equal credits
- ✓ Required fields completed
- ✓ Cost center provided if needed
- ✓ Date in open period
- ✓ Amount is positive **Example**:
\`\`\`
You're posting to account 5300 (Travel)
Argus requires cost center for this account
Status: ✗ FAILED - Cost center required
Action: Add cost center, then repost
\`\`\` ### 2. Zelda: Smart Reconciliation
**What it does**: Detects duplicates and auto-reconciles **Capabilities**:
- Duplicate invoice detection (same vendor, amount, date)
- Rounding difference auto-reconciliation
- Bank statement matching suggestions
- Transposed number detection (100 vs 010)
- Pre-fills common data **Example**:
\`\`\`
Invoice 1: ABC Restaurant, #INV-001, $500 (Jan 10)
Invoice 2: ABC Rest, #INV-001, $500 (Jan 12)
Zelda Alert: ⚠️ Likely duplicate invoice
Action: Review or merge with 1 click
Savings: Prevent $500 double-payment
\`\`\` ### 3. Phoenix: Fraud Detection
**What it does**: Identifies unusual transactions needing investigation **Detects**:
- Large amounts (>2x average)
- Off-hours posting (outside 6am-10pm)
- Unusual vendors (new, not in master)
- High-risk accounts (cash, transfers)
- Rapid succession posting
- Round numbers (common in fraud)
- Weekend posting **Example**:
\`\`\`
Transaction: $50,000 transfer at 2:47 AM
Account: 1000 - Cash (high-risk)
Vendor: New (not in master)
Phoenix Alerts: CRITICAL
• Large amount detected
• Off-hours posting
• Unknown vendor
• High-risk account
Action: Block posting, escalate to CFO
Result: Prevented fraud
\`\`\` ### 4. Odin: Immutable Audit Trail
**What it does**: Creates unbreakable record of all activity **Records**:
- Who created the transaction
- When it was created/posted/reversed
- Who approved it and why
- What changed (original vs. revised)
- Hash verification (can't be altered) **Example**:
\`\`\`
Entry JE-2024-001
Created: 2024-01-15 09:00 by John
Reviewed: 2024-01-15 14:00 by Sarah ("Q1 accrual")
Posted: 2024-01-15 14:15 by Sarah
Reversed: 2024-01-22 11:30 by John ("Incorrect amount")
✓ Immutable (hash verified)
✓ Auditor-ready (full history visible)
\`\`\` ## Guardian Benefits ### For You
- Catch errors before posting
- Prevent duplicate payments
- Reduce reconciliation time by 10x
- Sleep better (fraud detection running 24/7) ### For Your Auditor
- Complete, immutable audit trail
- Pre-audit validation (30-40% faster audit)
- Fraud detection evidence
- Control testing automated ### For Your Organization
- Reduce audit costs 30-40%
- Prevent fraud ($50K+ average catch)
- Prevent duplicate invoices ($18K+ annual)
- Reduce errors 80-90% ## ROI Example | Benefit | Monthly | Annual |
|---------|---------|--------|
| Duplicate prevention | $1,500 | $18,000 |
| Error prevention labor | $2,000 | $24,000 |
| Fraud prevention | $5,000+ | $60,000+ |
| Audit cost reduction | $1,000 | $12,000 |
| **Total** | **$9,500** | **$114,000** | **Cost**: $100/month = $1,200/year
**ROI**: 95x first year ## When Guardian Acts Guardian checks every transaction: 1. **Before Posting**: Validates data, checks for duplicates, scans for fraud
2. **During Approval**: Provides complete audit context
3. **In Reconciliation**: Suggests matches, flags discrepancies
4. **In Reporting**: Guarantees data integrity ## What You See ✅ **Passed**: All checks OK, safe to post
⚠️ **Warning**: Review recommended but won't block
🔴 **Failed**: Must fix before posting ## Tips for Guardian Success 1. **Read Guardian feedback** - It's telling you something important
2. **Document thoroughly** - Guardian learns from your decisions
3. **Use cost centers** - Enables better compliance checking
4. **Report suspicious activity** - Helps Phoenix improve
5. **Review audit trail** - Guardian's history is your defense`, duration: 15, difficulty:"beginner", relatedTopics: ["gl-journal-entries","fraud-prevention"], keywords: ["guardian","AI","fraud","compliance","audit"], lastUpdated:"2024-01-15", }, { id:"ap-invoice-workflow", title:"Invoice Processing Workflow", category:"ap-management", description:"Manage invoices from receipt to payment", content: `# Invoice Processing Workflow The invoice processing workflow in EchoAurum follows these stages: Receipt → Matching → Approval → Payment → Reconciliation ## Stage 1: Invoice Receipt ### Manual Entry
1. Navigate to **AP Invoice Manager**
2. Click **New Invoice**
3. Fill in invoice details: - **Vendor**: Select from master list - **Invoice Number**: Vendor's invoice number - **Invoice Date**: Date on invoice - **Due Date**: Payment due date - **Amount**: Total amount due - **Description**: What is this for? 4. Add line items: - **GL Account**: Where to expense - **Amount**: Line amount - **Cost Center**: Department/location - **Description**: Line detail ### Import from PO
If created against a purchase order:
1. Provide PO number
2. System pre-fills: Vendor, accounts, amounts
3. Confirm line items
4. Submit for matching ## Stage 2: Zelda Matching Zelda automatically checks:
- **Duplicate Detection**: Have we already entered this invoice?
- **PO Matching**: Does it match a PO?
- **Amount Matching**: Does invoice match PO + receipt?
- **Vendor Master**: Is vendor valid? ### Zelda Results ✓ **Perfect Match**: PO $1,000 = Receipt $1,000 = Invoice $1,000
→ Auto-approved, ready for posting ⚠️ **Over/Under 3%**: PO $1,000, Invoice $1,030 (3% variance)
→ Requires approval, explained variance ❌ **Duplicate Detected**: Same vendor, same amount, same date last week
→ Block, investigate, merge or reject ## Stage 3: Approval Workflow ### Based on Amount
- **Under $500**: Auto-approved (if matched)
- **$500-$5,000**: Requires department manager approval
- **$5,000-$25,000**: Requires director approval
- **Over $25,000**: Requires CFO approval ### Based on Vendor
- **New Vendors**: Always requires approval
- **Restricted Categories**: Always requires approval
- **Approved Vendors**: May auto-approve ### Approval View
When you receive an approval request:
1. Review invoice details
2. Check Guardian validation status
3. Review GL account assignment
4. Check cost center allocation
5. Approve or reject with comment
6. System notes your decision ## Stage 4: Payment Once approved:
1. Invoice enters **Payment Queue**
2. System groups by vendor
3. Scheduled for payment on due date
4. Exported to your payment method (ACH, check, card)
5. Payment recorded in GL ### Payment Status Tracking
- Draft → Approved → Scheduled → Paid → Reconciled ## Stage 5: Reconciliation ### Bank Reconciliation
When bank statement arrives:
1. Import bank statement (CSV)
2. System matches paid invoices to bank transactions
3. Review unmatched items
4. Reconcile account ### Variance Investigation
If amount doesn't match:
- Zelda suggests likely explanations (rounding, discounts)
- Phoenix flags unusual discrepancies
- You investigate and explain ## Best Practices 1. **Enter invoices promptly** - Don't batch week-old invoices
2. **Use POs** - Link invoices to POs for matching
3. **Consistent vendors** - Use same vendor name each time
4. **Cost centers** - Always assign to correct department
5. **Document exceptions** - Explain any variances
6. **Review approvals** - Check Guardian feedback
7. **Reconcile monthly** - Don't let invoices pile up`, duration: 12, difficulty:"intermediate", relatedTopics: ["ap-best-practices","guardian-ai-overview"], keywords: ["invoice","accounts payable","approval","matching","vendor"], lastUpdated:"2024-01-15", }, { id:"reporting-financial-statements", title:"Generating Financial Reports", category:"reporting", description:"Create trial balance, income statement, and balance sheet reports", content: `# Generating Financial Reports EchoAurum provides standard financial reports needed by management and auditors. ## Available Reports ### Trial Balance
**What it shows**: All GL accounts with debit/credit balances as of a date **Use case**: Verify your books balance before creating other reports **How to generate**:
1. Go to **Financial Reports Dashboard**
2. Select **Trial Balance**
3. Choose date
4. Select which accounts to include (optional)
5. Click **Generate** **What to look for**:
- Total debits = Total credits
- Any accounts with unexpected balances
- Zero-balance accounts (inactive) ### Income Statement (P&L)
**What it shows**: Revenues, expenses, and net income for a period **Structure**:
\`\`\`
Revenues - Total Rooms Revenue $500,000 - Food & Beverage Revenue $200,000 - Other Revenue $50,000
Total Revenues $750,000 Expenses - Cost of Goods Sold $150,000 - Labor Expense $225,000 - Utilities $30,000 - Other Expenses $95,000
Total Expenses $500,000 Net Income $250,000
\`\`\` **How to generate**:
1. Go to **Financial Reports Dashboard**
2. Select **Income Statement**
3. Choose period (Month, Quarter, Year)
4. Select comparison period (optional)
5. Click **Generate** **Use case**: Monthly, quarterly, annual reporting to management ### Balance Sheet
**What it shows**: Assets, liabilities, and equity as of a date **Structure**:
\`\`\`
ASSETS
Current Assets Cash $150,000 Accounts Receivable $75,000 Prepaid Expenses $25,000 Total Current Assets $250,000 Fixed Assets Property & Equipment $500,000 Accumulated Depreciation ($100,000) Net Fixed Assets $400,000 Total Assets $650,000 LIABILITIES & EQUITY
Current Liabilities Accounts Payable $100,000 Accrued Expenses $50,000 Total Current Liabilities $150,000 Long-term Liabilities Debt $200,000 Total Liabilities $350,000 Shareholders' Equity Common Stock $200,000 Retained Earnings $100,000 Total Equity $300,000 Total Liabilities & Equity $650,000
\`\`\` **How to generate**:
1. Go to **Financial Reports Dashboard**
2. Select **Balance Sheet**
3. Choose date
4. Select comparison period (optional)
5. Click **Generate** **Use case**: Month-end, quarter-end, year-end reporting; lending requirement ### Variance Analysis (Budget vs Actual)
**What it shows**: Budget vs actual vs forecast with variance percentages **How to generate**:
1. Go to **Financial Reports Dashboard**
2. Select **Variance Analysis**
3. Choose period and year
4. Select variance threshold (to highlight large variances)
5. Click **Generate** **Interpretation**:
- Favorable variance: Better than budget (red for expenses, green for revenue)
- Unfavorable variance: Worse than budget ## Exporting Reports ### PDF Export
1. Click **Export to PDF** button
2. Choose layout (portrait/landscape)
3. Include comparisons (optional)
4. Download to computer ### Excel Export
1. Click **Export to Excel**
2. Save file
3. Analyze in spreadsheet ### Email Distribution
1. Click **Email Report**
2. Select recipients from distribution list
3. Add message
4. Schedule delivery date/time
5. Send ## Report Customization ### Column Selection
Choose which columns to include:
- Budget
- Actual
- Forecast
- Prior Year
- Variance Amount
- Variance % ### Account Selection
Include/exclude accounts:
- Filter by account type
- Filter by cost center
- Filter by nature (revenue/expense/asset) ### Comparison Options
Compare to:
- Same period last year
- Prior month
- Budget
- Forecast
- Custom period ## Understanding Report Details ### Drill-Down
Click any account to see:
- General ledger detail
- Transactions making up balance
- Cost center breakdown
- Monthly breakdown ### Document Trail
Click any figure to see:
- Supporting journal entries
- Approval trail (via Odin)
- Source documents
- Variance explanation ## Monthly Close Process ### Week 1: Transaction Review
1. Post all month's transactions
2. Review Guardian validations
3. Follow up on exceptions ### Week 2: Adjustments
1. Record accruals (payroll, utilities)
2. Record depreciation
3. Record month-end allocations
4. Review with Guardian ### Week 3: Reports
1. Generate Trial Balance → verify it balances
2. Generate Income Statement → review for unusual items
3. Generate Balance Sheet → review for unusual items
4. Generate Variance Analysis → investigate large variances ### Week 4: Reporting
1. Email to management
2. Print for board meeting
3. File for audit
4. Archive for reference ## Tips for Accurate Reporting 1. **Post timely** - Post transactions daily, not in batches
2. **Use Guardian** - Let it validate before posting
3. **Detail accounts** - Use specific GL accounts, not catch-all
4. **Cost centers** - Always assign to correct department
5. **Document adjustments** - Keep supporting documentation
6. **Review reports** - Look for unusual items before distributing
7. **Compare periods** - Check month-to-month trends`, duration: 15, difficulty:"intermediate", relatedTopics: ["gl-journal-entries","financial-close"], keywords: ["reports","trial balance","income statement","balance sheet"], lastUpdated:"2024-01-15", },
]; // FAQ Database
export const FAQS: FAQ[] = [ { id:"faq-double-entry", question:"Why does every entry need both debits and credits?", answer:"Double-entry bookkeeping is the foundation of accurate financial reporting. Every transaction has two sides: how you got the money (credit) and what you did with it (debit). This system ensures your books always balance and provides checks and balances against errors.", category:"gl-operations", relatedArticles: ["gl-journal-entries"], upvotes: 45, helpful: true, }, { id:"faq-guardian-blocking", question:"Why is Guardian blocking my entry?", answer:"Guardian blocks entries that fail critical compliance checks (Argus). Common reasons: (1) Account doesn't exist, (2) Debits don't equal credits, (3) Required field missing, (4) Cost center required but not provided. Read Guardian's message - it tells you exactly what's wrong. Fix the issue and resubmit.", category:"guardian-ai", relatedArticles: ["guardian-ai-overview","gl-journal-entries"], upvotes: 120, helpful: true, }, { id:"faq-duplicate-detection", question:"How does Zelda detect duplicate invoices?", answer:"Zelda compares new invoices against recent entries using: (1) Vendor name, (2) Invoice amount, (3) Invoice date. If a similar invoice was entered within 7 days, Zelda alerts you. This prevents accidental double-payment, which costs an average of $2,000-5,000 per organization annually.", category:"guardian-ai", relatedArticles: ["guardian-ai-overview","ap-invoice-workflow"], upvotes: 85, helpful: true, }, { id:"faq-fraud-detection", question:"What is Phoenix and how does it detect fraud?", answer:"Phoenix is EchoAurum's AI fraud detection system. It watches for red flags like: (1) Unusually large amounts, (2) Off-hours posting, (3) New vendors, (4) High-risk accounts like cash, (5) Weekend transactions, (6) Round numbers (common in fraud). If Phoenix flags a transaction, it's worth reviewing - most catches prevent real fraud.", category:"guardian-ai", relatedArticles: ["guardian-ai-overview"], upvotes: 92, helpful: true, }, { id:"faq-approval-times", question:"How long does approval take?", answer:"Approval time depends on your workflow and approver availability. Most approvals complete within 24 hours. You can track approval status in real-time: navigate to the entry/invoice and see approver queue and time spent waiting. If urgent, you can escalate or contact the approver directly.", category:"approvals", relatedArticles: ["ap-invoice-workflow"], upvotes: 68, helpful: true, }, { id:"faq-cost-centers", question:"What's a cost center and why do I need one?", answer:"A cost center is a department, location, or project (e.g., 'Kitchen', 'Front Desk', 'Las Vegas Property'). Cost centers let you track spending by area. Your chart of accounts defines which accounts require a cost center. When Argus requires a cost center, it's because you're posting to an account that tracks multiple departments. Always use the correct cost center.", category:"gl-operations", relatedArticles: ["gl-journal-entries"], upvotes: 55, helpful: true, }, { id:"faq-period-posting", question:"Can I post transactions from prior months?", answer:"Yes, but usually within 30 days. Your finance team can reopen prior months if needed (usually for adjustments). After audit, prior periods close permanently. If you need to adjust a closed period, you'll record a reversing entry in the current period and a new correcting entry.", category:"gl-operations", relatedArticles: ["gl-journal-entries"], upvotes: 42, helpful: true, },
]; // Glossary
export const GLOSSARY_TERMS: GlossaryTerm[] = [ { term:"Accounts Payable (AP)", definition:"Money your organization owes to vendors/suppliers for goods/services received but not yet paid.", relatedTerms: ["Invoice","Vendor","Accrual"], category:"ap-management", example:"You receive a $5,000 invoice from a food supplier. Until you pay it, it's an accounts payable liability.", }, { term:"Accounts Receivable (AR)", definition:"Money customers owe your organization for goods/services provided but not yet received.", relatedTerms: ["Revenue","Customer","Invoice"], category:"reporting", example:"A guest books a future hotel stay and pays via credit card but won't arrive until next month. That's AR until check-in.", }, { term:"Accrual", definition:"Recording expenses or revenues when incurred, not when paid/received. Foundation of accrual accounting.", relatedTerms: ["Journal Entry","Debit","Credit"], category:"gl-operations", example:"Recording a $1,000 utility bill in January even though you won't pay it until February.", }, { term:"Amortization", definition:"Recording an intangible asset's cost over its useful life (similar to depreciation for fixed assets).", relatedTerms: ["Depreciation","Fixed Asset"], category:"reporting", example:"A $100,000 trademark amortized over 5 years = $20,000 annual amortization expense.", }, { term:"Argus Guardian", definition:"EchoAurum's data compliance AI system that validates every transaction follows company rules.", relatedTerms: ["Guardian AI","Validation","Compliance"], category:"guardian-ai", example:"Argus checks that your journal entry has valid accounts, balanced debits/credits, and required cost centers.", }, { term:"Asset", definition:"Something your organization owns or has a right to that has economic value (cash, property, equipment).", relatedTerms: ["Balance Sheet","Liability","Equity"], category:"reporting", example:"A hotel building, kitchen equipment, and a vehicle are all assets.", }, { term:"Audit Trail", definition:"Complete record of who did what, when, and why for every transaction (maintained by Odin Guardian).", relatedTerms: ["Odin Guardian","Immutable","Compliance"], category:"guardian-ai", example:"Entry JE-001 was created by John on Jan 15, approved by Sarah on Jan 16, and reversed by John on Jan 22.", }, { term:"Balance Sheet", definition:"Financial statement showing assets, liabilities, and equity as of a specific date.", relatedTerms: ["Assets","Liabilities","Equity","Trial Balance"], category:"reporting", example:"Balance sheet shows: $500K assets = $200K liabilities + $300K equity (equation always balanced).", }, { term:"Budget", definition:"Planned expenses and revenues for a period, used to track actual performance against plan.", relatedTerms: ["Forecast","Variance","Actual"], category:"pnl-management", example:"You budget $100,000 in labor for January. If actual is $95,000, you're $5,000 under budget (favorable).", }, { term:"Chart of Accounts (COA)", definition:"Master list of all GL accounts your organization uses for tracking finances.", relatedTerms: ["GL Account","Account Type"], category:"gl-operations", example:"Sample accounts: 1000-Cash, 1100-A/R, 5100-Labor, 4000-Revenue, 2000-Payables", }, { term:"Cost Center", definition:"Department, location, or project used to track spending (e.g., 'Kitchen', 'Front Desk', 'Vegas Property').", relatedTerms: ["Department","Location","Allocation"], category:"gl-operations", example:"Labor expense is allocated to 'Kitchen' and 'Front Desk' cost centers to track department productivity.", }, { term:"Credit", definition:"Right side of journal entry. Credits decrease assets/expenses, increase liabilities/revenue/equity.", relatedTerms: ["Debit","Double-Entry","Journal Entry"], category:"gl-operations", example:"When you pay cash, cash is credited (decreased). When you record revenue, revenue is credited (increased).", }, { term:"Debit", definition:"Left side of journal entry. Debits increase assets/expenses, decrease liabilities/revenue/equity.", relatedTerms: ["Credit","Double-Entry","Journal Entry"], category:"gl-operations", example:"When you receive cash, cash is debited (increased). When you record expense, expense is debited (increased).", }, { term:"Depreciation", definition:"Recording a fixed asset's cost over its useful life (e.g., $10K equipment over 10 years = $1K annual depreciation).", relatedTerms: ["Fixed Asset","Asset","Amortization"], category:"reporting", example:"A $50,000 refrigerator depreciated over 10 years = $5,000 annual depreciation expense.", }, { term:"Double-Entry Bookkeeping", definition:"Accounting method where every transaction has equal debits and credits, ensuring books always balance.", relatedTerms: ["Debit","Credit","Journal Entry","Trial Balance"], category:"gl-operations", example:"Payment of $1,000 expense: Debit Expense $1,000, Credit Cash $1,000 (debits = credits).", }, { term:"Driver (P&L Driver)", definition:"Key performance indicator (KPI) that drives profitability (room nights, covers, ADR, occupancy %).", relatedTerms: ["KPI","Outlet","Forecast"], category:"pnl-management", example:"A hotel's drivers are: Room Nights (occupied), ADR (price per room), Occupancy (% of available).", }, { term:"Equity", definition:"Owner's stake in the organization (assets minus liabilities); includes paid-in capital and retained earnings.", relatedTerms: ["Assets","Liabilities","Balance Sheet"], category:"reporting", example:"If you invest $100K and net income is $20K, your equity is $120K.", }, { term:"Expense", definition:"Cost of doing business (labor, supplies, utilities). Recorded as debit to reduce net income.", relatedTerms: ["Revenue","Net Income","Journal Entry"], category:"reporting", example:"Labor expense, utility expense, and supplies expense are all business expenses.", }, { term:"Fiscal Period", definition:"The period (month, quarter, year) for which financial statements are prepared.", relatedTerms: ["Closing","Period","Accounting Period"], category:"reporting", example:"January is an open fiscal period. You can post to January. February after close is closed.", }, { term:"Forecast", definition:"Updated estimate of revenues/expenses for a period, typically revised monthly (vs. budget is set once).", relatedTerms: ["Budget","Actual","Variance"], category:"pnl-management", example:"Budget for January was $100K labor. After 3 weeks, forecast is revised to $95K based on actual activity.", }, { term:"General Ledger (GL)", definition:"Master record of all financial transactions organized by account. Foundation of financial statements.", relatedTerms: ["Journal Entry","Chart of Accounts","Trial Balance"], category:"gl-operations", example:"GL shows every debit/credit posted, account balance, transaction date, and supporting documentation.", }, { term:"Guardian AI", definition:"EchoAurum's unique four-system AI oversight: Argus (compliance), Zelda (reconciliation), Phoenix (fraud), Odin (audit trail).", relatedTerms: ["Argus","Zelda","Phoenix","Odin"], category:"guardian-ai", example:"Every transaction passes through all four Guardians before posting for real-time validation.", }, { term:"Income Statement (P&L)", definition:"Financial statement showing revenues minus expenses equals net income for a period.", relatedTerms: ["Revenue","Expense","Net Income"], category:"reporting", example:"$500K revenue - $300K expenses = $200K net income for January.", }, { term:"Invoice", definition:"Bill from a vendor requesting payment for goods/services provided.", relatedTerms: ["Vendor","Accounts Payable","PO"], category:"ap-management", example:"A food supplier sends an invoice for $5,000 worth of supplies delivered to your restaurant.", }, { term:"Journal Entry", definition:"Record of a financial transaction showing accounts affected, amounts debited/credited, and supporting details.", relatedTerms: ["Debit","Credit","Double-Entry","GL"], category:"gl-operations", example:"To record payment: Debit Expense $1,000, Credit Cash $1,000, Reference: Check #101", }, { term:"Liability", definition:"Obligation to pay money or provide services (accounts payable, debt, wages owed).", relatedTerms: ["Assets","Equity","Balance Sheet"], category:"reporting", example:"A $10,000 loan you haven't repaid yet is a liability.", }, { term:"Net Income", definition:"Bottom-line profit: total revenues minus total expenses. Shows organization's profitability.", relatedTerms: ["Revenue","Expense","Income Statement"], category:"reporting", example:"$100K revenue - $60K expenses = $40K net income (profit).", }, { term:"Odin Guardian", definition:"EchoAurum's immutable audit trail AI system that records who, what, when, why for every transaction.", relatedTerms: ["Guardian AI","Audit Trail","Compliance"], category:"guardian-ai", example:"Odin records: JE-001 created by John 1/15, approved by Sarah 1/16, reversed by John 1/22 with reason.", }, { term:"Outlet", definition:"Any revenue-generating or cost-producing property (hotel, restaurant, spa, entertainment venue).", relatedTerms: ["Location","Property","Cost Center"], category:"pnl-management", example:"A large resort has multiple outlets: Main Hotel, Beach Restaurant, Spa, Entertainment Center.", }, { term:"Phoenix Guardian", definition:"EchoAurum's fraud detection AI system that flags unusual transactions needing investigation.", relatedTerms: ["Guardian AI","Fraud Detection","Anomaly"], category:"guardian-ai", example:"Phoenix detects: Large amount, off-hours posting, new vendor, cash account, weekend = ALERT", }, { term:"PO (Purchase Order)", definition:"Authorization to buy goods/services from a vendor. Used to match against receipt and invoice (3-way match).", relatedTerms: ["Vendor","Receipt","Invoice"], category:"ap-management", example:"You create PO for $1,000 from supplier. Receipt confirms goods received. Invoice matches.", }, { term:"Prior Year Comparison", definition:"Comparing current period results to the same period in prior year to identify trends.", relatedTerms: ["Variance","Trend","Year-over-Year"], category:"reporting", example:"January 2024 labor: $100K vs. January 2023 labor: $95K (5% increase YoY).", }, { term:"Reconciliation", definition:"Process of matching two records to ensure they're in agreement (e.g., bank reconciliation).", relatedTerms: ["Matching","Verification","Balance"], category:"reconciliation", example:"Bank statement shows $50,000. GL shows $50,000. Reconciliation complete - they match.", }, { term:"Reversing Entry", definition:"Entry that cancels a prior entry by debiting credits and crediting debits of original entry.", relatedTerms: ["Journal Entry","Correction","Adjustment"], category:"gl-operations", example:"If you posted JE-001 incorrectly, reverse it by posting opposite amounts, then post correct entry.", }, { term:"Revenue", definition:"Income from operating activities (room revenue, food revenue, service revenue).", relatedTerms: ["Income","Sales","Income Statement"], category:"reporting", example:"A hotel's revenue includes: room revenue, restaurant revenue, spa revenue, etc.", }, { term:"Trial Balance", definition:"List of all GL accounts with their debit/credit balances. Debits must equal credits.", relatedTerms: ["General Ledger","Balance Sheet","Double-Entry"], category:"reporting", example:"Trial Balance shows: Total Debits $1,000,000 = Total Credits $1,000,000 (balanced).", }, { term:"Variance", definition:"Difference between budget/forecast and actual results. Can be favorable (better than plan) or unfavorable.", relatedTerms: ["Budget","Actual","Forecast"], category:"pnl-management", example:"Budget $100K labor, actual $95K = $5K favorable variance (under budget = good).", }, { term:"Vendor", definition:"External party that supplies goods or services to your organization.", relatedTerms: ["Invoice","Accounts Payable","PO"], category:"ap-management", example:"Food suppliers, utility companies, and cleaning services are all vendors.", }, { term:"Zelda Guardian", definition:"EchoAurum's smart reconciliation AI system that detects duplicates and auto-reconciles differences.", relatedTerms: ["Guardian AI","Duplicate Detection","Reconciliation"], category:"guardian-ai", example:"Zelda detects: Same vendor, same amount, same date = likely duplicate invoice alert.", },
]; // Workflow Checklists
export const WORKFLOW_CHECKLISTS: WorkflowChecklist[] = [ { id:"checklist-daily-entry", title:"Daily Transaction Entry", description:"Complete checklist for posting daily transactions", category:"gl-operations", steps: [ { id:"step-1", title:"Collect Transaction Documents", description:"Gather receipts, invoices, or source documents", tips: ["Keep documents organized by date","Ensure invoices have vendor signature/approval","Check for missing information", ], relatedHelp:"gl-journal-entries", }, { id:"step-2", title:"Identify GL Accounts", description:"Determine which GL accounts the transaction affects", tips: ["Reference chart of accounts","Ask manager if uncertain","Use cost center if expense", ], relatedHelp:"chart-of-accounts", }, { id:"step-3", title:"Verify Double-Entry Balance", description:"Ensure total debits equal total credits", tips: ["Common mistake: Forgetting credit side","Check amounts match source document","Round to nearest cent", ], relatedHelp:"gl-journal-entries", }, { id:"step-4", title:"Create Journal Entry", description:"Enter transaction in EchoAurum", tips: ["Be specific in description","Include document reference","Add cost center if required", ], relatedHelp:"gl-journal-entries", }, { id:"step-5", title:"Review Guardian Feedback", description:"Address any Guardian alerts or warnings", tips: ["Read error messages carefully","Fix compliance issues before posting","Document why you approved warning items", ], relatedHelp:"guardian-ai-overview", }, { id:"step-6", title:"Post Entry", description:"Submit entry for posting or approval", tips: ["Save draft if unsure","Post during business hours for questions","Keep confirmation number", ], relatedHelp:"gl-journal-entries", }, ], estimatedTime: 30, roles: ["accountant","accountant-manager"], }, { id:"checklist-invoice-approval", title:"Invoice Approval Process", description:"Checklist for approving vendor invoices", category:"ap-management", steps: [ { id:"step-1", title:"Receive Approval Request", description:"Check invoice details when approval request arrives", tips: ["Review all line items","Verify receipt matches invoice amounts","Check PO if available", ], relatedHelp:"ap-invoice-workflow", }, { id:"step-2", title:"Check Guardian Status", description:"Review Guardian validations and alerts", tips: ["Address any Argus compliance issues","Investigate Zelda duplicate warnings","Review Phoenix anomaly alerts","Check Odin audit trail", ], relatedHelp:"guardian-ai-overview", }, { id:"step-3", title:"Verify GL Account", description:"Ensure correct expense account assigned", tips: ["Check cost center is correct","Verify account makes sense for vendor","Confirm user has access to account", ], relatedHelp:"chart-of-accounts", }, { id:"step-4", title:"Check Invoice Details", description:"Verify invoice matches PO and receipt", tips: ["PO amount matches invoice","Delivery date documented","Prices reasonable vs. quote","No unauthorized charges", ], relatedHelp:"ap-invoice-workflow", }, { id:"step-5", title:"Approve or Reject", description:"Make approval decision with brief explanation", tips: ["Be specific if rejecting","Note any questions for vendor","Escalate if authority exceeded", ], relatedHelp:"ap-invoice-workflow", }, ], estimatedTime: 15, roles: ["manager","director","controller"], }, { id:"checklist-monthly-close", title:"Month-End Close Process", description:"Complete steps for closing a fiscal month", category:"reporting", steps: [ { id:"step-1", title:"Post Accrual Entries", description:"Record payroll, utilities, and other accruals", tips: ["Accruals for unpaid expenses only","Match accrual to supporting documents","Reverse next month after payment", ], relatedHelp:"gl-journal-entries", }, { id:"step-2", title:"Post Depreciation", description:"Record monthly depreciation for fixed assets", tips: ["Use standard depreciation schedule","Check asset list for new additions","Verify useful life assumptions", ], relatedHelp:"fixed-assets", }, { id:"step-3", title:"Investigate Exception Items", description:"Follow up on unusual or suspicious transactions", tips: ["Review Phoenix alerts","Check for Zelda duplicates","Document investigation results", ], relatedHelp:"guardian-ai-overview", }, { id:"step-4", title:"Generate Trial Balance", description:"Create TB and verify debits equal credits", tips: ["No entry should have zero balance (check for errors)","Investigate unusual account balances","Compare to prior month", ], relatedHelp:"reporting-financial-statements", }, { id:"step-5", title:"Generate Financial Statements", description:"Create Income Statement and Balance Sheet", tips: ["Review all accounts for reasonableness","Compare to prior period","Investigate variances >10%", ], relatedHelp:"reporting-financial-statements", }, { id:"step-6", title:"Variance Analysis", description:"Investigate budget vs. actual differences", tips: ["Focus on >10% variances","Document explanations","Share with management", ], relatedHelp:"variance-analysis", }, { id:"step-7", title:"Bank Reconciliation", description:"Reconcile bank accounts to GL", tips: ["Identify outstanding items","Investigate old outstanding checks","Reconcile all bank accounts", ], relatedHelp:"bank-reconciliation", }, { id:"step-8", title:"Close Period", description:"Lock period to prevent new entries", tips: ["Keep copy of all reports","Archive supporting documents","Communicate close to team", ], relatedHelp:"period-close", }, ], estimatedTime: 240, roles: ["accountant","accountant-manager","controller","cfo"], },
]; // Onboarding Modules
export const ONBOARDING_MODULES: OnboardingModule[] = [ { id:"onboarding-welcome", phase:"welcome", title:"Welcome to EchoAurum", description:"Get oriented with the platform and understand its core value", estimatedTime: 15, lessons: [ { id:"lesson-1", title:"Platform Overview", content: `EchoAurum is your modern financial operations platform for hospitality enterprises. ## What EchoAurum Does You'll manage:
- **Multi-outlet P&L** - Track profitability across all properties
- **General Ledger** - Post transactions with double-entry bookkeeping
- **Accounts Payable** - Process invoices and payments
- **Financial Reporting** - Generate reports for management and auditors
- **Guardian AI** - Unique AI oversight preventing fraud and errors ## Why Guardian AI Matters Unlike traditional accounting software, EchoAurum has four AI systems watching every transaction:
- **Argus**: Validates compliance
- **Zelda**: Detects duplicates and reconciles
- **Phoenix**: Detects fraud
- **Odin**: Creates immutable audit trail Result: Less errors, prevented fraud, happier auditors, lower audit costs.`, checklist: ["Read the overview","Understand the four Guardians","Know your role in the platform", ], }, { id:"lesson-2", title:"Your Role & Permissions", content: `Different roles have different capabilities in EchoAurum. ## Common Roles ### Accountant
- Posts journal entries
- Enters invoices
- Reconciles accounts
- Cannot approve transactions above $500 ### Accountant Manager
- All accountant permissions
- Approves invoices $500-$5,000
- Manages other accountants
- Can post to all cost centers ### Controller
- All accountant manager permissions
- Approves invoices $5,000-$25,000
- Closes months
- Reports to CFO ### CFO
- All permissions
- Approves invoices over $25,000
- Reviews financial statements
- Makes policy decisions ### Auditor
- Read-only access to all GL and AP
- Can view audit trail
- Cannot post or approve ## Check Your Role In **Profile** → **Permissions**, you can see exactly what you're allowed to do. If you need more permissions, ask your manager to request in Settings → User Management.`, checklist: ["Know your role","Check your permissions","Know what you can/cannot do","Know who to ask for help", ], }, { id:"lesson-3", title:"Navigation Basics", content: `Getting around EchoAurum is intuitive once you know the key areas. ## Main Areas ### Console (Home)
Left sidebar navigation shows all modules:
- **Outlet Manager**: Create/edit properties
- **Multi-Outlet P&L**: View profitability dashboard
- **GL Journal Entry**: Post entries
- **AP Invoice Manager**: Process invoices
- **Bank Reconciliation**: Reconcile accounts
- **Approvals Queue**: Review approval requests
- **Reports**: Generate financial statements
- And more... ### Profile Page
Your personal settings:
- Account information
- Permissions & roles
- API keys (if applicable)
- Audit trail of your activity ### Settings
Administrator area for:
- User management
- Chart of accounts
- Company settings
- Approval workflows
- Integrations ## Navigation Tips - Use search (⌘K on Mac, Ctrl+K on Windows) to jump to features
- Bookmark frequently used pages
- Click module titles to drill into detail`, checklist: ["Visit each main navigation area","Find where you post journal entries","Find where you approve invoices","Find where you view reports","Use search feature", ], interactiveElement: { type:"feature-exploration", description:"Navigate to each major module and familiarize yourself", }, }, ], successCriteria: ["Understand Guardian AI value proposition","Know your role and permissions","Can navigate to major features", ], rolesApplicable: ["all"], }, { id:"onboarding-setup", phase:"setup", title:"Setting Up Your Organization", description:"Configure outlets, chart of accounts, and basic settings", estimatedTime: 45, lessons: [ { id:"lesson-1", title:"Create Your Outlets", content: `An outlet is any property you manage (hotel, restaurant, spa). ## Step-by-Step 1. Go to **Console** → **Outlet Manager**
2. Click **Add New Outlet**
3. Fill in: - **Code**: Unique ID (HTL-001) - **Name**: Full name (Pacific Grove Resort - Main Hotel) - **Type**: Hotel, Restaurant, Spa, Entertainment, Other - **Location**: City/State - **Currency**: USD, EUR, etc.
4. Click **Create** ## Organizing Multiple Outlets If you have multiple properties:
- Create parent outlet (e.g.,"Pacific Grove Resort")
- Create child outlets (e.g.,"Main Hotel","Beach Restaurant")
- System rolls up all data automatically ## Result All your outlets appear in:
- **Multi-Outlet P&L** dashboard
- **Approval workflows** (can assign by outlet)
- **Reports** (can filter by outlet)
- **Driver Configuration** (set drivers per outlet)`, checklist: ["Create at least one outlet","Verify it appears in Outlet Manager","Verify it appears in Multi-Outlet P&L", ], }, { id:"lesson-2", title:"Understand Your Chart of Accounts", content: `Your Chart of Accounts (COA) is the master list of GL accounts. ## Account Types ### Assets (Balance Sheet)
- Cash, Accounts Receivable, Prepaid Expenses
- Property, Equipment, Accumulated Depreciation ### Liabilities (Balance Sheet)
- Accounts Payable, Accrued Expenses
- Debt, Wages Payable ### Equity (Balance Sheet)
- Common Stock, Retained Earnings ### Revenue (Income Statement)
- Room Revenue, Food Revenue, Service Revenue ### Expenses (Income Statement)
- Labor, COGS, Utilities, Marketing, etc. ## Finding Your Chart 1. Go to **Settings** → **Chart of Accounts**
2. Search for accounts you use frequently
3. Note the account numbers (you'll use these when posting entries) ## Tips - Accounts are usually numbered by type (1000s = Assets, 2000s = Liabilities, 3000s = Equity, 4000s = Revenue, 5000s = Expenses)
- Ask your controller if you're unsure which account to use
- Some accounts require a cost center (your controller will specify)`, checklist: ["Review your chart of accounts","Find 3-4 accounts you use frequently","Understand account numbering system","Note which accounts require cost centers", ], }, { id:"lesson-3", title:"Set Up Cost Centers", content: `Cost centers track spending by department or location. ## Common Cost Centers - Kitchen, Front Desk, Housekeeping, Front-of-House, Back-of-House
- Las Vegas Property, Phoenix Property, Tucson Property
- Revenue Center, Administrative, Maintenance ## Why Cost Centers Matter - Track which department spent what
- Identify high-cost areas
- Budget and track by department
- Required by some GL accounts ## Setting Up Cost Centers 1. Go to **Settings** → **Cost Centers**
2. Click **Add Cost Center**
3. Enter: Name, Code, Department, Owner
4. Assign to outlets (if applicable)
5. Note which accounts require this cost center ## When Posting When you post a journal entry to an account requiring cost center:
- Guardian will alert if cost center is missing
- You must add cost center before posting
- System won't let you post without it`, checklist: ["Review available cost centers","Understand which accounts require cost centers","Know your assigned cost centers", ], }, ], successCriteria: ["Have created at least one outlet","Understand your chart of accounts","Know which cost centers are available", ], rolesApplicable: ["all"], }, { id:"onboarding-first-transaction", phase:"first-transaction", title:"Post Your First Journal Entry", description:"Post your first transaction with Guardian guidance", estimatedTime: 30, prerequisite:"onboarding-setup", lessons: [ { id:"lesson-1", title:"What is Double-Entry Bookkeeping?", content: `Every transaction has two sides: a source and a use. ## The Basic Rule **Debits = Credits** Every entry must balance. Nothing posts until they match. ## Examples ### Paying an Expense
\`\`\`
Expense: Pay $1,000 for office supplies
Debit: 5310 Office Supplies $1,000 (Where the money went)
Credit: 1000 Cash $1,000 (Where the money came from)
\`\`\` ### Recording Revenue
\`\`\`
Revenue: Guest pays $500 for room
Debit: 1000 Cash $500 (Money received)
Credit: 4100 Room Revenue $500 (Revenue earned)
\`\`\` ### Recording an Accrual
\`\`\`
Accrual: Record payroll not yet paid
Debit: 5100 Labor Expense $5,000 (Expense incurred)
Credit: 2100 Wages Payable $5,000 (Obligation created)
\`\`\` ## Key Takeaway Every transaction:
1. Identifies the accounts affected
2. Debits one or more accounts
3. Credits one or more accounts
4. Debits = Credits (always!)`, checklist: ["Understand double-entry concept","Know that debits must equal credits","Understand three basic transaction types", ], }, { id:"lesson-2", title:"Prepare Your First Entry", content: `Before posting, gather your source documents. ## What You'll Need - Receipt, invoice, or documentation of transaction
- Transaction amount and date
- GL accounts affected (from Chart of Accounts)
- Cost center (if required)
- Business reason for the entry ## Example Entry to Post Let's post:"Received $2,000 in guest room deposits" ### Step 1: Identify Accounts
- Source: Guest deposits (Cash - Account 1000)
- Use: Advance room deposits (Liability - Account 2200) ### Step 2: Determine Amounts
- Debit Cash: $2,000
- Credit Advance Deposits: $2,000 ### Step 3: Check Balance
- Total Debits: $2,000
- Total Credits: $2,000
- Balanced? YES ✓ ### Step 4: Gather Details
- Date: Today
- Reference:"Daily deposits from front desk"
- Cost center: Front Desk (if required)`, checklist: ["Find a simple transaction to record","Identify the GL accounts (ask your manager if unsure)","Calculate debit and credit amounts","Verify debits equal credits", ], }, { id:"lesson-3", title:"Post in EchoAurum", content: `Now you're ready to post your first entry. ## Step-by-Step ### Step 1: Navigate to GL Journal Entry
- Click **Console** → **GL Journal Entry System**
- Click **New Entry** ### Step 2: Fill Header
- **Date**: Transaction date
- **Reference**:"Daily deposits from front desk"
- **Description**:"Guest room advance deposits received"
- **Department**: (optional) ### Step 3: Add First Line
- Click **Add Line**
- **Account**: 1000 (Cash)
- **Amount**: $2,000
- **Side**: Debit
- (No cost center required for Cash) ### Step 4: Add Second Line
- Click **Add Line**
- **Account**: 2200 (Advance Deposits)
- **Amount**: $2,000
- **Side**: Credit
- (Note: Might not require cost center if liability) ### Step 5: Check Balance
- System shows: Debits $2,000 = Credits $2,000 ✓ ### Step 6: Review Guardian
See Guardian results:
- ✓ Argus: Accounts valid, balanced
- ✓ Zelda: No duplicates
- ✓ Phoenix: No anomalies
- ✓ Odin: Ready for audit trail ### Step 7: Post
- Click **Post** if no approval required
- Or **Submit for Approval** if manager approval needed`, checklist: ["Navigate to GL Journal Entry","Create new entry","Add both line items","Verify debits equal credits","Review Guardian feedback","Click Post", ], interactiveElement: { type:"click-walkthrough", description:"Walk through posting your first journal entry", }, }, { id:"lesson-4", title:"Understanding Guardian Response", content: `After posting, Guardian reviewed your entry. Here's what each Guardian means: ## Argus Guardian: ✓ Passed"Accounts valid, debits equal credits, cost centers correct"
- Everything checks out
- Your entry is compliant
- Safe to post ## Zelda Guardian: ✓ No Duplicates"No similar entries found in last 7 days"
- Zelda scanned recent entries
- Didn't find a duplicate
- Unlikely you're posting twice ## Phoenix Guardian: ✓ No Anomalies"Amount reasonable, time is normal, vendor valid"
- Phoenix checked for fraud indicators
- Entry looks normal
- Not flagged for investigation ## Odin Guardian: ✓ Ready"Audit trail prepared, immutable record created"
- Your entry is logged
- Timestamp recorded
- Can't be altered later
- Auditors can see full history ## If Guardian Blocked Entry If any Guardian failed:
1. Read the error message carefully
2. The error tells you exactly what's wrong
3. Fix the issue
4. Resubmit Example:
\`\`\`
Argus Failed:"Cost center required for this account"
Fix: Add cost center
Resubmit: Now passes
\`\`\``, checklist: ["Review Guardian feedback on your entry","Understand what each Guardian checks","Know how to fix Guardian failures", ], }, ], successCriteria: ["Successfully posted a journal entry","Entry passed all Guardian checks","Entry appears in GL ledger", ], rolesApplicable: ["accountant","accountant-manager","controller","cfo"], },
];
