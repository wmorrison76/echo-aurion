import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/site/Header";
import {
  Breadcrumb,
  ResponsiveContainer,
  ResponsiveGrid,
  useBreakpoint,
  AccessibleTabs,
} from "@/components/layout";
import {
  Search,
  BookOpen,
  Lightbulb,
  Code2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Home,
} from "lucide-react";

// Resource content database
const RESOURCES = {
  overview: [
    {
      id: "luccca-intro",
      title: "LUCCCA Hospitality Framework Overview",
      category: "getting-started",
      description: "Understanding the LUCCCA event management and hospitality system",
      content: `# LUCCCA: Luxury Event Management Platform

LUCCCA (Hospitality Suite integrating AI into Decision Making Planning and Financial Programming) is a comprehensive React-based platform for managing high-end hospitality events.

## Core Modules
- **Culinary**: Recipe management, ingredient tracking, allergen control
- **Pastry**: Dessert and pastry design with visual planning
- **Schedule**: Production timeline and task management
- **Inventory**: Stock management and supplier tracking
- **CRM**: Guest database and relationship management
- **ChefNet**: Team communication and shift coordination
- **Support**: Issue tracking and customer support

## Key Technologies
- **Frontend**: React 18+, TypeScript, Tailwind CSS
- **Backend**: Express.js, Node.js
- **Database**: Supabase (PostgreSQL)
- **Monitoring**: Sentry for error tracking
- **AI**: OpenAI GPT-4 integration

## Architecture
LUCCCA uses a modular architecture where each feature is a self-contained React component. The system communicates with the backend via REST APIs and WebSockets for real-time updates.`,
      tags: ["architecture", "modules", "intro"],
    },
    {
      id: "echo-ai-integration",
      title: "Echo AI Integration",
      category: "getting-started",
      description: "How Echo AI and code generation work in LUCCCA",
      content: `# Echo AI Integration

Echo AI is our intelligent code generation and analysis system built on OpenAI's GPT-4.

## Components
1. **EchoCoder**: Main code generation engine
2. **AI3 Seed Generator**: Multi-turn conversation for requirements gathering
3. **Automation Analysis**: Code analysis, security sweeps, compatibility checks

## Usage
- Use EchoCoder to generate React components
- Use Seed Generator to gather detailed requirements
- Use Automation Panel for code analysis

## Best Practices
- Always review generated code
- Run security sweep before deployment
- Test with dry run simulation
- Check compatibility with LUCCCA modules`,
      tags: ["ai", "echocoder", "seed-generator"],
    },
  ],
  techstack: [
    {
      id: "react-setup",
      title: "React & TypeScript Setup",
      category: "tech-stack",
      description: "React 18 and TypeScript best practices",
      content: `# React & TypeScript Setup

## Component Structure
\`\`\`tsx
import { FC } from 'react';

interface ComponentProps {
  title: string;
  onAction: () => void;
}

const MyComponent: FC<ComponentProps> = ({ title, onAction }) => {
  return <div>{title}</div>;
};

export default MyComponent;
\`\`\`

## Hooks Guide
- Use \`useState\` for local state
- Use \`useEffect\` with cleanup
- Use custom hooks for shared logic
- Avoid unnecessary re-renders with \`useMemo\` and \`useCallback\`

## Styling
- Use Tailwind CSS classes
- Import from \`@/components/ui\` for shadcn components
- Follow the existing color/spacing conventions`,
      tags: ["react", "typescript", "frontend"],
    },
    {
      id: "tailwind-css",
      title: "Tailwind CSS & Styling",
      category: "tech-stack",
      description: "Styling with Tailwind in LUCCCA",
      content: `# Tailwind CSS Guide

## Common Classes
- \`bg-background\`: Main background color
- \`text-foreground\`: Main text color
- \`border-primary\`: Primary border color
- \`shadow-lg\`: Large shadow
- \`rounded-lg\`: Large border radius

## Responsive Design
\`\`\`tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns */}
</div>
\`\`\`

## Color Scheme
LUCCCA supports multiple color themes with CSS variables. Use the theme hook to access current colors.`,
      tags: ["css", "tailwind", "styling"],
    },
    {
      id: "api-integration",
      title: "API Integration Guide",
      category: "tech-stack",
      description: "Connecting to backend APIs from React",
      content: `# API Integration

## Making Requests
\`\`\`tsx
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

const data = await response.json();
\`\`\`

## Error Handling
Always use AbortController for fetch requests:
\`\`\`tsx
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort("Request timeout"), 30000);

try {
  const response = await fetch('/api/endpoint', {
    signal: controller.signal
  });
  clearTimeout(timeout);
} catch (e) {
  if (e instanceof Error && e.name === 'AbortError') {
    console.error('Request timeout');
  }
}
\`\`\``,
      tags: ["api", "fetch", "backend"],
    },
  ],
  onboarding: [
    {
      id: "dev-setup",
      title: "Developer Environment Setup",
      category: "onboarding",
      description: "Getting your development environment ready",
      content: `# Developer Environment Setup

## Prerequisites
- Node.js 18+
- pnpm package manager
- Git

## Installation
1. Clone the repository
2. Run \`pnpm install\`
3. Copy \`.env.example\` to \`.env.local\`
4. Set required environment variables (see below)
5. Run \`npm run dev\`

## Required Environment Variables
- \`ECHO_OPENAI_API_KEY\`: OpenAI API key for GPT-4
- \`VITE_SUPABASE_URL\`: Supabase project URL
- \`VITE_SUPABASE_ANON_KEY\`: Supabase public API key
- \`SENTRY_DSN\`: Sentry error tracking (optional)

## Verification
Visit http://localhost:8080 and verify all routes load correctly.`,
      tags: ["setup", "environment", "prerequisites"],
    },
    {
      id: "workflow",
      title: "Development Workflow",
      category: "onboarding",
      description: "Daily development process and best practices",
      content: `# Development Workflow

## Daily Checklist
1. Pull latest changes from main branch
2. Run \`pnpm install\` if dependencies changed
3. Start dev server with \`npm run dev\`
4. Test your changes locally
5. Check console for warnings/errors

## Git Workflow
\`\`\`bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "feat: description"

# Push and create PR
git push origin feature/your-feature
\`\`\`

## Code Review
- All PRs require review
- Check for TypeScript errors
- Verify tests pass
- Ensure no console errors`,
      tags: ["workflow", "git", "process"],
    },
    {
      id: "coding-standards",
      title: "Coding Standards",
      category: "onboarding",
      description: "Code style and best practices",
      content: `# Coding Standards

## File Structure
\`\`\`
client/
  components/        # Reusable React components
  pages/            # Page components (routes)
  services/         # API and business logic
  hooks/            # Custom React hooks
  lib/              # Utilities and helpers
  assets/           # Images, icons, etc.

server/
  routes/           # API endpoints
  services/         # Business logic
  middleware/       # Express middleware
\`\`\`

## Naming Conventions
- Components: PascalCase (MyComponent)
- Files: kebab-case (my-component.tsx)
- Variables: camelCase (myVariable)
- Constants: UPPER_CASE (MY_CONSTANT)
- Interfaces: PascalCase with I prefix (IMyInterface)

## Type Safety
- Always use TypeScript types
- Avoid \`any\` type
- Use interfaces over types for objects
- Ensure function signatures are typed`,
      tags: ["standards", "best-practices", "typescript"],
    },
  ],
  faq: [
    {
      id: "fetch-aborted",
      title: "How do I fix 'Fetch is aborted' errors?",
      category: "troubleshooting",
      tags: ["fetch", "network", "errors"],
      question: "I'm getting 'Fetch is aborted' errors in the console",
      answer: `Use AbortController with a timeout:

\`\`\`tsx
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort("Request timeout"), 30000);

try {
  const response = await fetch('/api/endpoint', {
    signal: controller.signal
  });
  clearTimeout(timeout);
} catch (e) {
  if (e?.name === 'AbortError') {
    console.log('Request timeout');
  }
}
\`\`\`

This prevents hanging requests and properly handles timeouts.`,
    },
    {
      id: "sentry-integration",
      title: "How does Sentry error tracking work?",
      category: "debugging",
      tags: ["sentry", "monitoring", "errors"],
      question: "Where are errors tracked and how do I view them?",
      answer: `Errors are automatically sent to Sentry when they occur. To view:

1. Go to https://sentry.io
2. Login with your team account
3. Select the LUCCCA project
4. View errors by frequency, latest, or custom filters

All unhandled errors, API errors, and console.error calls are captured automatically. You can also manually capture errors with:

\`\`\`tsx
import * as Sentry from "@sentry/react";
Sentry.captureException(error);
\`\`\``,
    },
    {
      id: "module-generation",
      title: "How do I generate a new module with EchoCoder?",
      category: "features",
      tags: ["echocoder", "modules", "generation"],
      question: "Can I create new LUCCCA modules using AI?",
      answer: `Yes! Use EchoCoder to generate React modules:

1. Go to Studio → Coder tab
2. Click the "Generate Module" button
3. Describe what you want (e.g., "Recipe management system")
4. EchoCoder generates TypeScript React code
5. Review, run security sweep, and test
6. Deploy to Netlify

The generated code includes proper typing, hooks, error handling, and LUCCCA integration patterns.`,
    },
    {
      id: "supabase-connection",
      title: "How do I connect to Supabase?",
      category: "database",
      tags: ["supabase", "database", "backend"],
      question: "How do I query the database in my component?",
      answer: `Use the Supabase client:

\`\`\`tsx
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Fetch data
const { data, error } = await supabase
  .from('recipes')
  .select('*')
  .eq('category', 'dessert');

// Insert data
await supabase.from('recipes').insert([{ name: 'Cake' }]);
\`\`\`

Check the schema in \`lib/supabase/schema.sql\` for available tables.`,
    },
  ],
};

export default function Resources() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const allResources = useMemo(() => {
    const items = [
      ...RESOURCES.overview,
      ...RESOURCES.techstack,
      ...RESOURCES.onboarding,
      ...RESOURCES.faq,
    ];

    return items.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some((tag) => tag.includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === null || item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const categories = [
    { id: "getting-started", label: "Getting Started", icon: BookOpen },
    { id: "tech-stack", label: "Tech Stack", icon: Code2 },
    { id: "onboarding", label: "Onboarding", icon: Lightbulb },
    { id: "troubleshooting", label: "Troubleshooting", icon: AlertCircle },
    { id: "debugging", label: "Debugging", icon: AlertCircle },
    { id: "features", label: "Features", icon: Code2 },
    { id: "database", label: "Database", icon: Code2 },
  ];

  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "xs" || breakpoint === "sm";
  const numVisibleTabs = isMobile ? 2 : breakpoint === "md" ? 4 : 8;

  const breadcrumbItems = [
    { label: "Home", icon: Home, href: "/" },
    { label: "Resources", current: true },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <style>{`[data-menubar], footer { display: none !important; }`}</style>

      <ResponsiveContainer className="flex-1 py-6 sm:py-8">
        {/* Breadcrumbs */}
        <nav className="mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm">
            {breadcrumbItems.map((item, idx) => (
              <li key={idx} className="flex items-center gap-2">
                {item.icon && <item.icon className="h-4 w-4" />}
                {item.current ? (
                  <span className="text-foreground font-medium">{item.label}</span>
                ) : (
                  <>
                    <a href={item.href} className="text-muted-foreground hover:text-foreground">
                      {item.label}
                    </a>
                    <span className="text-muted-foreground">/</span>
                  </>
                )}
              </li>
            ))}
          </ol>
        </nav>

        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Developer Resources</h1>
          <p className="text-base sm:text-lg text-muted-foreground">
            Complete documentation and knowledge base for LUCCCA development
          </p>
        </div>

        {/* Sticky Search Bar */}
        <div className="sticky top-0 z-10 bg-background py-4 -mx-4 sm:-mx-6 px-4 sm:px-6 mb-6 border-b">
          <div className="relative max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by title, tag, or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 w-full"
              aria-label="Search resources"
            />
          </div>
        </div>

        {/* Category Filter Tabs - Responsive */}
        <div className="mb-6 sm:mb-8 overflow-x-auto">
          <Tabs
            value={selectedCategory || "all"}
            onValueChange={(val) => setSelectedCategory(val === "all" ? null : val)}
            className="w-full"
          >
            <TabsList className="grid w-full gap-1 auto-cols-max" style={{
              gridAutoFlow: 'column',
              gridAutoColumns: isMobile ? 'minmax(80px, 1fr)' : 'auto',
            }}>
              <TabsTrigger value="all" className="whitespace-nowrap">All</TabsTrigger>
              {categories.slice(0, numVisibleTabs - 1).map((cat) => (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id}
                  className="whitespace-nowrap text-xs sm:text-sm"
                  title={cat.label}
                >
                  {isMobile ? cat.label.split(' ')[0] : cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Resources Grid - Responsive */}
        <ResponsiveGrid
          cols={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 3 }}
          gap="lg"
          className="mb-8"
        >
          {allResources.length > 0 ? (
            allResources.map((resource) => (
              <Card
                key={resource.id}
                className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary/50"
                role="article"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base sm:text-lg line-clamp-2">
                      {resource.title}
                    </CardTitle>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                    {resource.description}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    {resource.tags.slice(0, 3).map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-xs"
                      >
                        {tag}
                      </Badge>
                    ))}
                    {resource.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{resource.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs sm:text-sm"
                    onClick={() => {
                      console.log(resource.content);
                    }}
                    aria-label={`Read full article: ${resource.title}`}
                  >
                    Read Article <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No resources found</p>
              <p className="text-xs text-muted-foreground mt-2">
                Try adjusting your search or category filter
              </p>
            </div>
          )}
        </ResponsiveGrid>

        {/* Info Section */}
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error Tracking & Support
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 dark:text-blue-200 space-y-3">
            <p className="text-sm">
              All errors are automatically tracked in Sentry. Monitor system health, debug issues, and access error logs.
            </p>
            <Button variant="outline" size="sm" asChild className="text-xs sm:text-sm">
              <a href="https://sentry.io" target="_blank" rel="noopener noreferrer">
                Open Sentry Dashboard <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 ml-2" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </ResponsiveContainer>
    </div>
  );
}
