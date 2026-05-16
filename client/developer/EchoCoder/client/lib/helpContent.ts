/**
 * Help Content Database
 * Complete documentation and guides for all features
 */

export interface HelpGuide {
  id: string;
  title: string;
  description: string;
  category:
    | "getting-started"
    | "echocoder"
    | "modules"
    | "troubleshooting"
    | "advanced";
  content: string;
  steps?: GuideStep[];
  relatedGuides?: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedTime: number; // in minutes
}

export interface GuideStep {
  id: string;
  title: string;
  description: string;
  action?: string; // URL or action to take
  screenshot?: string;
  tips?: string[];
  validation?: (state: any) => boolean;
}

export interface Walkthrough {
  id: string;
  title: string;
  description: string;
  steps: WalkthroughStep[];
  estimatedTime: number;
}

export interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  guidance: string; // Detailed explanation
  action?: string; // What the user should do
  validation?: string; // How we know they completed it
  tips?: string[];
  nextButtonText?: string;
}

const HELP_GUIDES: HelpGuide[] = [
  {
    id: "echocoder-overview",
    title: "EchoCoder: Your AI Module Builder",
    description:
      "Learn what EchoCoder is and how it can transform your workflow",
    category: "echocoder",
    difficulty: "beginner",
    estimatedTime: 5,
    content: `
# EchoCoder Overview

EchoCoder is an AI-powered system that generates complete React modules based on natural language descriptions. It's designed for:

## Who Should Use EchoCoder?

- **Sales Professionals**: Demonstrate custom features to potential clients in real-time
- **System Administrators**: Quickly build features you identify as needed
- **Developers**: Generate boilerplate code and focus on customization
- **Integration Specialists**: Create bridge modules connecting multiple systems

## What Can EchoCoder Do?

### 1. Generate Modules
Tell EchoCoder what you need, and it creates:
- Full React components with TypeScript
- Tailwind CSS styling
- React hooks for state management
- Error handling and validation

### 2. Fix Modules
Describe a problem, and EchoCoder:
- Analyzes your existing module
- Identifies and fixes bugs
- Improves code quality
- Maintains your functionality

### 3. Connect Systems
Create modules that:
- Integrate with external APIs
- Sync data between systems
- Provide unified views
- Enable seamless workflows

## Key Benefits

✅ **Speed**: Generate modules in minutes, not hours
✅ **Quality**: Production-ready code from day one
✅ **Flexibility**: Describe any feature you can think of
✅ **Control**: Review and customize generated code
✅ **Integration**: Easily connect external systems

## Get Started

1. Navigate to the EchoCoder module in your app
2. Click "Generate New Module"
3. Describe what you need
4. Click Generate and watch the magic happen!
    `,
    relatedGuides: ["echocoder-first-module", "echocoder-best-practices"],
  },
  {
    id: "echocoder-first-module",
    title: "Generate Your First Module (Step-by-Step)",
    description:
      "A detailed walkthrough of creating your first AI-generated module",
    category: "echocoder",
    difficulty: "beginner",
    estimatedTime: 10,
    content: `
# Generating Your First Module

This guide walks you through creating a complete module from scratch.

## What You'll Need

- Access to the EchoCoder interface
- A clear idea of what you want to build
- About 5-10 minutes

## The Process

### Step 1: Open EchoCoder
Navigate to the EchoCoder module from the sidebar or visit \`/echocoder\`

### Step 2: Choose Generate Module
Click the "Generate New Module" tab

### Step 3: Name Your Module
Enter a name:
- Use simple, descriptive names
- Examples: Analytics, Notifications, Inventory
- Avoid generic names like "Dashboard" or "Manager"

### Step 4: Write Your Description
This is the most important step. Be specific:

**Include:**
- Main features (what can users do?)
- Data structure (what information is stored?)
- User flow (how do users interact?)
- Visual style (cards, tables, charts?)
- Integrations (external systems to connect)

**Example Description:**
\`\`\`
"Create an Analytics Dashboard with:
- Real-time metrics cards (Total Revenue, Orders, Customers, Avg Order Value)
- Line chart showing daily revenue for last 30 days
- Date range picker to filter data
- Table showing top 10 products by sales
- Export to CSV button
- Responsive design for mobile and desktop
- Data refreshes every 5 minutes"
\`\`\`

### Step 5: Generate
Click "Generate Module" and wait (typically 5-15 seconds)

### Step 6: Refresh and Explore
- Refresh your browser or wait for auto-reload
- New module appears in the sidebar
- Click to open and explore your generated module

## What Happens Behind the Scenes

1. Your description is sent to OpenAI
2. AI generates a complete React component
3. Component is saved to your codebase
4. Module is auto-registered in the system
5. You can immediately use it

## Tips for Best Results

**Be Descriptive**
- Don't just say "user dashboard"
- Say "user dashboard showing profile, recent activity, preferences"

**Include Data Structure**
- Mention fields, types, and relationships
- Example: "Users have name, email, created_at, status"

**Specify Interactions**
- How do users interact with the module?
- What buttons/forms do they use?
- What happens after they click?

**Visual Details**
- Mention layouts (cards, grids, lists)
- Reference chart types (line, bar, pie)
- Describe color scheme preferences

## Common Mistakes to Avoid

❌ "Create a dashboard" → too vague
✅ "Create a sales dashboard showing daily revenue trends, top customers, and pipeline status"

❌ "I need a form" → missing context
✅ "Create a customer signup form with fields for name, email, phone, preferred contact time, and company"

## What Comes Next?

- Customize the generated module with your branding
- Connect it to your real data sources
- Deploy it to production
- Use the "Fix Module" feature if you need adjustments
    `,
    relatedGuides: ["echocoder-best-practices", "echocoder-fixing"],
  },
  {
    id: "echocoder-best-practices",
    title: "Best Practices for EchoCoder",
    description:
      "Pro tips and best practices for getting the most from EchoCoder",
    category: "echocoder",
    difficulty: "intermediate",
    estimatedTime: 8,
    content: `
# EchoCoder Best Practices

Master EchoCoder with these proven techniques.

## Description Quality Matters

### The Golden Rule
"The better you describe it, the better it works."

EchoCoder generates exactly what you ask for, so precision pays off.

### Structure Your Description

1. **Purpose** - What is this module for?
2. **Users** - Who will use it?
3. **Features** - What can they do?
4. **Data** - What information is stored?
5. **Interactions** - How do they interact?
6. **Integration** - What systems does it connect to?

### Example: Bad vs. Good

**Bad Description:**
\`Create a reporting module\`

**Good Description:**
\`Create a Sales Reporting module that:
- Shows sales by date, category, salesperson
- Displays key metrics (total sales, average order value, units sold)
- Provides line chart for 90-day sales trend
- Includes filter buttons for date range and category
- Has table showing top 10 products
- Allows export to Excel and PDF
- Updates data daily at 2 AM
- Mobile responsive with responsive tables\`

## Naming Conventions

### What Works
✅ Analytics
✅ CustomerFeedback
✅ InventoryManagement
✅ SalesReporting
✅ TeamSchedule

### What Doesn't
❌ Dashboard (too generic)
❌ Helper (unclear purpose)
❌ Tools (vague)
❌ Utils (not a module)
❌ test123 (unprofessional)

## Feature Specificity

### Be Specific About Features
Instead of: "Show data"
Say: "Show customer data in a sortable table with columns for name, email, join date, and lifetime value"

Instead of: "Add filters"
Say: "Add filters for date range (datepicker), status (dropdown), and region (multi-select)"

Instead of: "Chart"
Say: "Line chart showing daily revenue with date range picker to filter 30, 60, or 90 days"

## Integration Patterns

### API Integration
When EchoCoder generates a module, it creates the UI layer. You then:
1. Connect to your API endpoints
2. Add authentication tokens
3. Handle error states
4. Add loading states

Example:
\`\`\`typescript
// Generated module fetches from /api/analytics
const [data, setData] = useState([]);

useEffect(() => {
  fetch('/api/analytics').then(r => r.json()).then(setData);
}, []);
\`\`\`

### Database Integration
Generated modules use \`useState\` for state. To persist:
1. Connect Supabase, Neon, or other database
2. Replace \`useState\` with database queries
3. Add real-time updates if needed

## Iteration Strategy

### Start Simple, Build Complex

**Iteration 1:**
\`Create a basic customer list showing name, email, and status\`

**Iteration 2:**
\`Add sorting, filtering, and search to customer list\`

**Iteration 3:**
\`Add bulk actions, bulk export, and role-based visibility\`

This approach:
- Gives you a working module faster
- Allows testing before adding complexity
- Makes fixes easier (smaller scope)
- Improves AI output quality

## When to Use Fix Module

Use the "Fix Module" feature when:
- Module has a bug (incorrect calculations, broken UI)
- Performance needs improvement
- Feature doesn't work as expected
- UX can be improved

Example:
\`\`\`
Module: Analytics
Issue: "The revenue chart shows wrong calculations. 
It's summing all-time revenue instead of filtering by selected date range."
\`\`\`

## Performance Optimization

### What EchoCoder Does Well
- UI components with hooks
- Local state management
- Responsive design
- Error handling
- Accessibility basics

### What You Need to Add
- Real API integration
- Caching strategies
- Pagination for large datasets
- Lazy loading images
- Database indexing

## Security Considerations

### What's Safe
- UI components generated by EchoCoder
- Client-side form validation
- Error handling

### What You Need to Handle
- Authentication (add on backend)
- Authorization (role-based checks)
- Input validation (server-side)
- API security (tokens, CORS)
- Data encryption (for sensitive data)

## Testing Generated Modules

### What to Test
1. UI renders correctly
2. Buttons and forms work
3. Data displays properly
4. Responsive on mobile
5. Error states show correctly

### Quick Test Checklist
- [ ] Module loads without errors
- [ ] All buttons/forms functional
- [ ] Data displays in correct format
- [ ] Mobile view works
- [ ] No console errors
    `,
    relatedGuides: ["echocoder-first-module", "echocoder-fixing"],
  },
  {
    id: "echocoder-fixing",
    title: "Fixing Modules with EchoCoder",
    description:
      "How to use the AI-powered fix system to repair and improve modules",
    category: "echocoder",
    difficulty: "intermediate",
    estimatedTime: 7,
    content: `
# Fixing Modules with EchoCoder

The Fix Module feature lets you repair bugs and improve existing modules.

## When to Use Fix Module

### Use Cases

**Bug Fix:**
Module: "Analytics"
Issue: "Chart is showing blank instead of data. No error messages."

**Logic Error:**
Module: "Inventory"
Issue: "Total calculation is wrong. It's summing all entries instead of available stock."

**UI Improvement:**
Module: "Dashboard"
Issue: "Cards are too cramped on mobile. Need better responsive design."

**Feature Enhancement:**
Module: "CustomerList"
Issue: "Add ability to export selected customers to CSV with custom columns."

**Performance Issue:**
Module: "Reports"
Issue: "Page takes 30 seconds to load. Need to add pagination."

## How to Fix a Module

### Step 1: Open EchoCoder Fix Tab
Go to EchoCoder → Fix Module tab

### Step 2: Enter Module Name
Type the exact name of the module to fix

### Step 3: Describe the Issue
Be clear and specific:

**Good Issue Description:**
\`\`\`
The revenue chart is showing $0 instead of actual revenue.
The data loads in the console (checked Network tab),
but the chart component isn't rendering it.
The error might be in how the data is being passed to the chart.
\`\`\`

**Poor Issue Description:**
\`\`\`
Chart doesn't work
\`\`\`

### Step 4: Click Fix Module
EchoCoder analyzes the module and applies fixes

### Step 5: Refresh and Test
- Refresh browser
- Test the fixed module
- Verify the issue is resolved

## Writing Good Issue Descriptions

### Include Context
- What should happen?
- What actually happens?
- When does it happen?
- What errors appear?

### Provide Details

**Error Messages:**
"Error: Cannot read property 'map' of undefined"

**Browser Console:**
Share any console errors or warnings

**Steps to Reproduce:**
1. Click Generate Report
2. Select date range
3. Error appears

### Example Issue Descriptions

**Bug:**
\`\`\`
When I click the "Export CSV" button, nothing happens.
No error message, no file download. 
I checked the browser console and see no errors.
The button click seems to not be working at all.
\`\`\`

**Performance:**
\`\`\`
The customer list takes 45 seconds to load when there are 
10,000+ customers. Need to add pagination to load 50 customers 
at a time instead of all at once.
\`\`\`

**Feature Request:**
\`\`\`
Add ability to filter the product table by category.
Currently shows all products. Need a dropdown filter 
for categories (Electronics, Clothing, Food, etc).
\`\`\`

## What EchoCoder Can Fix

✅ **Logic Errors**
- Incorrect calculations
- Wrong data filtering
- Broken conditionals

✅ **UI Issues**
- Components not rendering
- Layout problems
- Responsive design issues

✅ **Feature Additions**
- Add new UI elements
- Add new functionality
- Improve interactions

✅ **Performance**
- Add pagination
- Optimize rendering
- Improve data fetching

## What EchoCoder Can't Fix

❌ Database connection issues (need to handle backend)
❌ API authentication (need backend security)
❌ Third-party library conflicts (may need manual fix)
❌ System-level issues (server errors)

For these, you might need to:
1. Check your backend configuration
2. Verify API credentials
3. Review error logs
4. Contact support if blocked

## After a Fix

### Verify the Fix
1. Does the issue still exist?
2. Are there new errors?
3. Does everything else still work?
4. Is performance acceptable?

### If Fix Didn't Work
1. Provide more specific issue description
2. Include exact error messages
3. Share reproduction steps
4. Try fixing again with more details

### Next Steps
1. Test the module thoroughly
2. Deploy to production if satisfied
3. Monitor for new issues
4. Request additional features as needed
    `,
    relatedGuides: ["echocoder-overview", "echocoder-best-practices"],
  },
  {
    id: "getting-started-overview",
    title: "Getting Started: System Overview",
    description: "Overview of your entire system and its components",
    category: "getting-started",
    difficulty: "beginner",
    estimatedTime: 5,
    content: `
# System Overview

Welcome! This is a brief overview of your system and its capabilities.

## Core Components

### 1. Golden Seed Framework
Your system is built on the Golden Seed Framework with:
- **17 Pre-Built Modules** - Ready to use immediately
- **Theme System** - 5 color schemes + light/dark modes
- **Multi-Language Support** - 5 languages built-in
- **Floating Panels** - Draggable, resizable workspace

### 2. EchoCoder AI Module Generator
- **Generate Modules** - Describe what you need, AI creates it
- **Fix Modules** - Ask AI to repair bugs
- **Module Explorer** - Browse and launch all modules

### 3. Module Library
**Core Modules:**
- Culinary - Recipe management
- Pastry - Cake design
- Schedule - Production timeline
- Inventory - Supply tracking
- CRM - Customer management
- And 10 more...

**Generated Modules:**
- Create unlimited custom modules
- Each module is production-ready
- Can integrate with external systems

## Key Features

### Theme System
Click the color buttons in the toolbar to switch:
- Cyan, Blue, Emerald, Violet, Rose
- Light or Dark mode
- 10 total combinations

### Language Support
Click the language dropdown to choose:
- English, Spanish, French, Portuguese, Italian
- Automatically saves your preference
- All UI translates instantly

### Floating Panels
- Drag panels around your workspace
- Resize by dragging corners
- Minimize to save space
- Pin important panels
- Everything persists

### Responsive Design
Works on:
- Desktop (full features)
- Tablet (optimized layout)
- Mobile (touch-friendly)

## Navigation

### Sidebar
- Shows all 17+ modules
- Click to open any module
- Expandable/collapsible
- Quick access to all features

### Toolbar
- Theme color selector
- Language selector
- Workspace controls

### Module Routes
Each module has its own URL:
- /culinary → Culinary module
- /schedule → Schedule module
- /crm → CRM module
- /echocoder → AI Module Generator
- And more...

## Common Tasks

### Generate a New Module
1. Click EchoCoder in sidebar
2. Click "Generate New Module"
3. Enter name and description
4. Click Generate
5. Refresh to see it

### Fix a Module
1. Click EchoCoder in sidebar
2. Click "Fix Module"
3. Enter module name and issue
4. Click Fix Module
5. Refresh to see changes

### Change Theme
1. Click color button in toolbar
2. Select your color preference
3. Automatic save

### Switch Language
1. Click language dropdown in toolbar
2. Select new language
3. Everything translates

## Next Steps

1. **Explore Modules** - Click through the 17 pre-built modules
2. **Try Generation** - Create your first custom module
3. **Customize** - Adjust theme and language to your preference
4. **Integrate** - Connect modules to your data sources

## Getting Help

- Click help buttons throughout the app
- Read detailed guides for each feature
- Use "Show Me How" for interactive walkthroughs
- Check troubleshooting section for common issues
    `,
    relatedGuides: ["echocoder-overview"],
  },
];

const WALKTHROUGHS: Walkthrough[] = [
  {
    id: "generate-first-module",
    title: "Generate Your First Module",
    description:
      "Interactive step-by-step guide to creating your first AI-generated module",
    estimatedTime: 10,
    steps: [
      {
        id: "step-1",
        title: "Open EchoCoder",
        description:
          "Navigate to the EchoCoder module to begin generating your first custom module.",
        guidance:
          "EchoCoder is your AI-powered module generator. It's located in the sidebar with a code icon. Click it now.",
        action: "/echocoder",
        tips: [
          "Look for the computer code icon in the sidebar",
          "EchoCoder is at the bottom of the module list",
          "The full route is /echocoder if you want to go directly",
        ],
        validation: "window.location.pathname.includes('echocoder')",
        nextButtonText: "I'm in EchoCoder",
      },
      {
        id: "step-2",
        title: "Click Generate Module Tab",
        description:
          "The Generate Module tab is where you create new modules from scratch.",
        guidance:
          'You should see tabs at the top: "Generate", "Fix", "Tools", and "Docs". Click the "Generate" tab if it\'s not already selected.',
        tips: [
          "The Generate tab should be the first tab",
          "It has a " + " icon next to it",
          "If you see a form with Module Name and Description fields, you\'re in the right place",
        ],
        nextButtonText: "I see the Generate form",
      },
      {
        id: "step-3",
        title: "Enter Module Name",
        description: "Give your module a clear, descriptive name.",
        guidance:
          'In the "Module Name" field, enter something specific. Example: "Analytics", "Notifications", "CustomerFeedback". Avoid generic names like "Dashboard" or "Manager".',
        tips: [
          "Use simple, one-word or two-word names",
          "CamelCase works best (AnalyticsBoard, NotificationCenter)",
          "Think about what the module does",
          "Examples: Analytics, Reports, Tracking, Monitoring",
        ],
        nextButtonText: "Module name entered",
      },
      {
        id: "step-4",
        title: "Write Detailed Description",
        description: "The description is crucial - be as specific as possible.",
        guidance:
          "In the Description field, write a detailed explanation of what this module should do. Include features, data structure, and user interactions. The more detail you provide, the better the AI can generate exactly what you need.",
        tips: [
          "List specific features the module should have",
          "Mention what data it works with",
          "Describe how users interact with it",
          "Include UI preferences (cards, tables, charts)",
          'Be specific: "Revenue chart" not just "data display"',
        ],
        nextButtonText: "Description complete",
      },
      {
        id: "step-5",
        title: "Click Generate Module",
        description: "Start the AI generation process.",
        guidance:
          "Click the green 'Generate Module' button. This will send your description to the AI, which typically takes 5-15 seconds. You'll see a loading spinner while it works.",
        tips: [
          "The button is green and at the bottom of the form",
          "A spinner will show while generating",
          "Be patient - this is normal and expected",
          "Don't close the page during generation",
        ],
        nextButtonText: "Module is generating",
      },
      {
        id: "step-6",
        title: "Success! Refresh Your Page",
        description:
          "After generation completes, refresh to see your new module.",
        guidance:
          "You'll see a green success message saying 'Module generated!'. Now refresh your browser (press F5 or Cmd+R). Your new module will appear in the sidebar and be fully functional.",
        tips: [
          "The success message confirms generation worked",
          "Refresh brings in the new module",
          "The module will appear in the sidebar with the name you chose",
          "Click it to open and explore your generated module",
        ],
        nextButtonText: "All done! I'm exploring my new module",
      },
    ],
  },
  {
    id: "fix-module-walkthrough",
    title: "Fix a Module with AI",
    description: "Interactive guide to fixing a broken or imperfect module",
    estimatedTime: 8,
    steps: [
      {
        id: "step-1",
        title: "Go to EchoCoder Fix Tab",
        description: "Open the Fix Module feature in EchoCoder.",
        guidance:
          'Navigate to EchoCoder, then click the "Fix" tab at the top. This is where you can repair bugs or improve existing modules.',
        action: "/echocoder",
        tips: [
          'The "Fix" tab is the second tab',
          "It has a refresh/circular arrow icon",
          "You should see fields for Module Name and Issue Description",
        ],
        nextButtonText: "I see the Fix form",
      },
      {
        id: "step-2",
        title: "Enter Module Name",
        description: "Type the name of the module you want to fix.",
        guidance:
          "Enter the exact name of the module that needs fixing. For example: 'Analytics', 'Dashboard', or 'CustomerList'. This tells the AI which module to work on.",
        tips: [
          "Use the exact module name",
          "Check spelling carefully",
          "If unsure, look at the sidebar for the module name",
        ],
        nextButtonText: "Module name entered",
      },
      {
        id: "step-3",
        title: "Describe the Issue",
        description: "Explain what's wrong or what needs improvement.",
        guidance:
          "In the Issue Description field, be as specific as possible. Describe: What should happen? What actually happens? Any error messages? When does it happen? The more detail, the better the fix.",
        tips: [
          "Include error messages if you see any",
          "Describe steps to reproduce the issue",
          "Mention what you expected vs. what happened",
          "Be clear and specific, not vague",
        ],
        nextButtonText: "Issue described",
      },
      {
        id: "step-4",
        title: "Click Fix Module",
        description: "Start the AI repair process.",
        guidance:
          "Click the orange 'Fix Module' button. The AI will analyze the issue and apply fixes. This typically takes 5-15 seconds.",
        tips: [
          "The button is orange",
          "A spinner shows while fixing",
          "This is normal - be patient",
          "Don't close the page during the process",
        ],
        nextButtonText: "Module is being fixed",
      },
      {
        id: "step-5",
        title: "Refresh and Test",
        description: "See the fixed module in action.",
        guidance:
          "When the fix completes, you'll see a success message. Refresh your browser (F5 or Cmd+R) and open the module to test if the issue is resolved.",
        tips: [
          "Success message confirms the fix was applied",
          "Refresh loads the updated module",
          "Test the specific feature that was broken",
          "Check for any new errors in console",
        ],
        nextButtonText: "Module is fixed!",
      },
    ],
  },
];

export function getHelpGuide(id: string): HelpGuide | undefined {
  return HELP_GUIDES.find((g) => g.id === id);
}

export function getAllHelpGuides(): HelpGuide[] {
  return HELP_GUIDES;
}

export function getHelpGuidesByCategory(
  category: HelpGuide["category"],
): HelpGuide[] {
  return HELP_GUIDES.filter((g) => g.category === category);
}

export function getWalkthrough(id: string): Walkthrough | undefined {
  return WALKTHROUGHS.find((w) => w.id === id);
}

export function getAllWalkthroughs(): Walkthrough[] {
  return WALKTHROUGHS;
}
