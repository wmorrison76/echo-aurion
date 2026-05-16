# EchoAurum Help System Integration Guide

This document explains how to integrate the comprehensive Help & Training System into your EchoAurum application.

## Overview

The Help System consists of:

1. **HelpModal** - Full knowledge base with articles, FAQs, and glossary
2. **OnboardingTutorial** - Progressive training modules for new users
3. **ContextualHelp Components** - Help hints, tips, and contextual information
4. **HelpCenterPage** - Landing page for help resources
5. **useHelp Hook** - State management for help system

## File Structure

```
client/modules/help/
├── components/
│   ├── HelpModal.tsx           # Main help modal
│   ├── OnboardingTutorial.tsx  # Onboarding trainer
│   ├── ContextualHelp.tsx      # Contextual help components
│   ├── HelpButton.tsx          # Help trigger button
│   └── index.ts                # Exports
├── hooks/
│   └── useHelp.ts              # Help state management
├── pages/
│   └── HelpCenterPage.tsx      # Help center landing page
└── index.ts                    # Module exports

shared/
└── help.ts                     # Knowledge base data
```

## Integration Steps

### Step 1: Add Help Center Page Route

In your router/routing configuration, add:

```tsx
import { HelpCenterPage } from "@/modules/help";

// Add to your routes
{
  path: "/help",
  element: <HelpCenterPage />,
}
```

### Step 2: Add Help Button to Console Navigation

Update `client/pages/Console.tsx`:

```tsx
import { useHelp } from "@/modules/help/hooks/useHelp";
import { HelpButton } from "@/modules/help/components/HelpButton";
import { HelpModal } from "@/modules/help/components/HelpModal";
import { OnboardingTutorial } from "@/modules/help/components/OnboardingTutorial";

export default function Console() {
  const help = useHelp();

  return (
    <PageLayout>
      {/* ... existing console content ... */}

      {/* Add Help Button to header or navigation */}
      <div className="flex items-center gap-2">
        <HelpButton
          onClick={() => help.openHelp()}
          tooltip="Open Help Center"
        />
        <Button variant="outline" onClick={() => help.openOnboarding()}>
          Start Training
        </Button>
      </div>

      {/* Add Help Modals */}
      <HelpModal
        isOpen={help.helpOpen}
        onClose={help.closeHelp}
        initialCategory={help.helpCategory}
        initialArticleId={help.helpArticleId}
      />
      <OnboardingTutorial
        isOpen={help.onboardingOpen}
        onClose={help.closeOnboarding}
        moduleId={help.onboardingModuleId}
      />
    </PageLayout>
  );
}
```

### Step 3: Add Contextual Help to Components

Use contextual help components throughout your app:

```tsx
import {
  ContextualHelpBox,
  HelpIcon,
  HelpHeader,
  StepGuide,
} from "@/modules/help/components";

// In your GL Journal Entry component
export function GLJournalEntrySystem() {
  const help = useHelp();

  return (
    <div>
      <HelpHeader
        title="General Ledger Journal Entry"
        description="Post double-entry bookkeeping entries"
        articleId="gl-journal-entries"
        onOpenHelp={() => help.openHelpArticle("gl-journal-entries")}
      />

      <ContextualHelpBox
        title="Double-Entry Bookkeeping"
        description="Every entry must have debits equal to credits"
        tips={[
          "Debit: Where the money went",
          "Credit: Where the money came from",
          "Debits must equal credits",
        ]}
      />

      <form>{/* ... form fields ... */}</form>
    </div>
  );
}
```

### Step 4: Add Help Icons to Specific Fields

For important fields, add help icons:

```tsx
import { HelpIcon } from "@/modules/help/components";

export function InvoiceForm() {
  const help = useHelp();

  return (
    <div>
      <label className="flex items-center gap-2">
        <span>GL Account</span>
        <HelpIcon
          articleId="chart-of-accounts"
          onOpenHelp={() => help.openHelpArticle("chart-of-accounts")}
          compact
        />
      </label>
      <select>{/* options */}</select>
    </div>
  );
}
```

### Step 5: Add Help to Modals and Panels

```tsx
import { StepGuide, ContextualHelpBox } from "@/modules/help/components";

export function ApprovalQueuePanel() {
  const help = useHelp();

  return (
    <div>
      <h2>Approval Queue</h2>

      <StepGuide
        steps={[
          {
            title: "Review Details",
            description: "Check the transaction details carefully",
            tips: ["Look for Guardian alerts", "Check GL account is correct"],
          },
          {
            title: "Verify Amount",
            description: "Ensure the amount matches supporting documents",
            tips: ["Check PO if applicable", "Review variance if present"],
          },
          {
            title: "Make Decision",
            description: "Click Approve or Reject",
            tips: ["Add comment for context", "Escalate if needed"],
          },
        ]}
      />

      <ContextualHelpBox
        title="What to Check"
        description="Before approving, verify these items"
        tips={[
          "Guardian validation passed",
          "GL account is appropriate",
          "Cost center is correct",
          "Amount matches source document",
          "No duplicate alert from Zelda",
        ]}
      />
    </div>
  );
}
```

## Using the useHelp Hook

The `useHelp` hook provides all help functionality:

```tsx
import { useHelp } from "@/modules/help/hooks/useHelp";

export function MyComponent() {
  const {
    helpOpen, // Is help modal open?
    onboardingOpen, // Is onboarding modal open?
    helpCategory, // Current help category
    helpArticleId, // Current article ID
    onboardingModuleId, // Current training module
    openHelp, // (category?, articleId?) => open help
    closeHelp, // () => close help
    openOnboarding, // (moduleId?) => start training
    closeOnboarding, // () => close training
    openHelpArticle, // (articleId) => open specific article
  } = useHelp();

  return (
    <>
      <Button onClick={() => openHelp("gl-operations")}>GL Help</Button>
      <Button onClick={() => openHelpArticle("gl-journal-entries")}>
        Journal Entries
      </Button>
      <Button onClick={() => openOnboarding()}>Start Training</Button>
    </>
  );
}
```

## Keyboard Shortcuts to Implement

Add these shortcuts for better UX:

```tsx
// In your App.tsx or a keyboard handler
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    // Press ? to open help
    if (e.key === "?") {
      help.openHelp();
    }
    // Press Ctrl+Alt+T to start training
    if (e.ctrlKey && e.altKey && e.key === "t") {
      help.openOnboarding();
    }
  };

  window.addEventListener("keydown", handleKeyPress);
  return () => window.removeEventListener("keydown", handleKeyPress);
}, [help]);
```

## Adding Custom Help Articles

To add more help articles, edit `shared/help.ts`:

```ts
export const HELP_ARTICLES: HelpArticle[] = [
  // ... existing articles ...
  {
    id: "custom-topic",
    title: "Your Custom Topic",
    category: "best-practices",
    description: "Brief description",
    content: `# Your Article
    
## Section
Content here...`,
    duration: 10,
    difficulty: "beginner",
    relatedTopics: ["topic1", "topic2"],
    keywords: ["keyword1", "keyword2"],
    lastUpdated: "2024-01-15",
  },
];
```

## Customizing Help Content

### Update Knowledge Base Data

Edit `shared/help.ts` to:

- Add new articles to `HELP_ARTICLES`
- Add FAQs to `FAQS`
- Add terms to `GLOSSARY_TERMS`
- Add checklists to `WORKFLOW_CHECKLISTS`
- Add training modules to `ONBOARDING_MODULES`

### Update Help Center Page

Edit `client/modules/help/pages/HelpCenterPage.tsx` to customize:

- Featured guides
- Learning paths
- Pro tips
- Quick stats

## Styling & Theming

The help system uses your existing design system:

- **Colors**: Uses `aurum-*`, `sky-*`, `emerald-*` theme colors
- **Components**: Uses your UI component library (Button, Input, Progress, etc.)
- **Typography**: Uses existing tailwind classes (foreground, muted-foreground, etc.)
- **Spacing**: Uses standard tailwind spacing scale

To customize colors, update the color classes in the components.

## Best Practices

### 1. Link Related Content

Always link related articles:

```ts
{
  relatedTopics: ["guardian-ai-overview", "gl-journal-entries"],
  keywords: ["guardian", "ai", "fraud"],
}
```

### 2. Use Clear Examples

Include real-world examples in articles:

```markdown
## Example: Paying an Expense

\`\`\`
Invoice: ABC Supplies - $500
Debit: 5300 Supplies Expense - $500
Credit: 1000 Cash - $500
\`\`\`
```

### 3. Add Progressive Difficulty

Structure content from beginner → intermediate → advanced

### 4. Provide Multiple Access Points

Help should be accessible from:

- Help Center page
- Help button in navigation
- Contextual help in components
- Onboarding training
- Right-click context menu (if implementing)

### 5. Monitor Usage

Track which articles are viewed:

```tsx
const handleArticleView = (articleId: string) => {
  // Log to analytics
  track("help_article_viewed", { articleId });
};
```

## Testing the Help System

### Test Scenarios

1. **First-time user journey**
   - New user opens app
   - Clicks Help button
   - Completes onboarding training
   - Posts first journal entry with contextual help

2. **Context-sensitive help**
   - User navigates to GL Journal Entry
   - Sees relevant article recommendations
   - Clicks help icon for specific field
   - Gets focused help

3. **Search functionality**
   - User searches "duplicate invoice"
   - Sees relevant articles and FAQs
   - Clicks article and reads solution

### Example Test Cases

```gherkin
Scenario: New user accesses help
  Given user is logged in
  When user clicks Help button
  Then HelpModal opens with Articles tab
  And featured guides are visible

Scenario: User searches for topic
  Given HelpModal is open
  When user types "journal entry" in search
  Then articles matching query appear
  And results include "Posting Journal Entries" article

Scenario: User starts onboarding
  Given user clicks Start Training button
  When user completes Module 1: Welcome
  Then Module 2 becomes available
  And progress bar updates
```

## Performance Optimization

The help system is designed to be lightweight:

- **Articles**: Static data in `shared/help.ts`
- **Modals**: Only rendered when open
- **Lazy loading**: Components load on demand
- **No API calls**: All data is local
- **Search**: Client-side filtering (fast)

If you have 100+ articles, consider:

```tsx
// Implement pagination in HelpModal
const [page, setPage] = useState(0);
const itemsPerPage = 10;
const paginatedArticles = filteredArticles.slice(
  page * itemsPerPage,
  (page + 1) * itemsPerPage,
);
```

## Accessibility

The help system is accessible:

- ✓ Keyboard navigation (Tab, Enter, Escape)
- ✓ Screen reader support (semantic HTML)
- ✓ ARIA labels on interactive elements
- ✓ Sufficient color contrast
- ✓ Focus indicators on buttons

## Troubleshooting

### Help Modal doesn't open

Check that:

1. `useHelp()` hook is called
2. `HelpModal` component is rendered
3. `help.openHelp()` is triggered
4. No console errors

### Articles not showing

Check that:

1. Articles are added to `HELP_ARTICLES` in `shared/help.ts`
2. Article `id` matches when opening
3. Search filters aren't excluding results

### Onboarding not progressing

Check that:

1. `OnboardingTutorial` component is rendered
2. Modules exist in `ONBOARDING_MODULES`
3. `handleNextLesson` is advancing index
4. Lesson content is not empty

## Future Enhancements

Potential improvements:

1. **Video integration** - Embed actual videos in articles
2. **Live chat** - Connect to support team
3. **Context awareness** - Show relevant help based on current page
4. **Analytics** - Track which help topics are most used
5. **Feedback** - Let users rate article helpfulness
6. **Translations** - Support multiple languages
7. **Dark mode** - Adapt to user's theme preference
8. **Offline mode** - Cache help content for offline access
9. **AI assistant** - Chatbot for instant answers
10. **Role-specific help** - Different content for different roles

## Support & Updates

To maintain the help system:

1. **Monthly review** - Check that articles are accurate
2. **User feedback** - Monitor which articles get clicked
3. **Add new topics** - As you add features, add help content
4. **Keep examples current** - Update examples if UI changes
5. **Version control** - Track changes to help content

---

## Quick Start Checklist

- [ ] Add HelpCenterPage route
- [ ] Add Help button to Console navigation
- [ ] Add HelpModal and OnboardingTutorial to Console
- [ ] Test help system is working
- [ ] Add contextual help to key components
- [ ] Test onboarding training flow
- [ ] Get user feedback on help quality
- [ ] Update knowledge base based on feedback

---

For questions about integrating the help system, refer to the code comments in each component.
