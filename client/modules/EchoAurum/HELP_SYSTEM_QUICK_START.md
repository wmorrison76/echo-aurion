# Help System Quick Start (5 minutes)

## TL;DR - Get Running in 5 Minutes

### Step 1: Copy Files (1 minute)

```bash
# Copy help module
cp -r client/modules/help <your-project>/client/modules/

# Copy knowledge base
cp shared/help.ts <your-project>/shared/

# Copy documentation
cp GETTING_STARTED_GUIDE.md <your-project>/
cp HELP_SYSTEM_INTEGRATION.md <your-project>/
```

### Step 2: Add Route (1 minute)

In your router file:

```tsx
import { HelpCenterPage } from "@/modules/help";

export const routes = [
  // ... existing routes
  {
    path: "/help",
    element: <HelpCenterPage />,
  },
];
```

### Step 3: Add to Console (2 minutes)

In `client/pages/Console.tsx`:

```tsx
import { useHelp } from "@/modules/help";
import { HelpModal, OnboardingTutorial } from "@/modules/help";

export default function Console() {
  const help = useHelp();

  return (
    <PageLayout>
      {/* ... existing content ... */}

      {/* Add Help Modals at the end */}
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

      {/* Add Help Button to your navigation */}
      <button onClick={() => help.openHelp()}>Help</button>
    </PageLayout>
  );
}
```

### Step 4: Test (1 minute)

```bash
npm run dev
# Navigate to http://localhost:5173
# Click Help button
# Should see modal with articles, FAQs, glossary
```

**Done! 🎉**

---

## What You Now Have

✅ Help Modal with 50+ articles
✅ Interactive onboarding training
✅ 100+ FAQs
✅ Financial glossary
✅ Help Center landing page
✅ Contextual help components

---

## Next Steps (Optional)

### Add Help Button to Navigation

```tsx
import { HelpButton } from "@/modules/help";

<HelpButton onClick={() => help.openHelp()} />;
```

### Add Contextual Help

```tsx
import { ContextualHelpBox } from "@/modules/help";

<ContextualHelpBox
  title="Double-Entry Bookkeeping"
  description="Every entry must have debits = credits"
  tips={["Debits = Where money went", "Credits = Where it came from"]}
/>;
```

### Add Training Link

```tsx
<button onClick={() => help.openOnboarding()}>Start Training</button>
```

---

## File Locations

```
your-project/
├── client/modules/help/          # Help module
│   ├── components/
│   ├── hooks/
│   ├── pages/
│   └── index.ts
├── shared/help.ts                # Knowledge base
├── GETTING_STARTED_GUIDE.md
├── HELP_SYSTEM_INTEGRATION.md
└── HELP_SYSTEM_QUICK_START.md    # This file
```

---

## Troubleshooting

**Help button doesn't appear?**

- Check that HelpButton is rendered
- Verify useHelp() hook is called
- Check no console errors

**Modal doesn't open?**

- Verify HelpModal is in render
- Check help.openHelp() is triggered
- Look for console errors

**Articles not showing?**

- Verify shared/help.ts is imported
- Check HELP_ARTICLES array exists
- Look for TypeScript errors

---

## Keyboard Shortcuts (Optional)

Add to your App.tsx:

```tsx
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === "?") help.openHelp();
    if (e.ctrlKey && e.altKey && e.key === "t") help.openOnboarding();
  };
  window.addEventListener("keydown", handleKeyPress);
  return () => window.removeEventListener("keydown", handleKeyPress);
}, [help]);
```

---

## Customizing Content

Want to add more articles?

Edit `shared/help.ts`:

```ts
export const HELP_ARTICLES = [
  // Existing articles...
  {
    id: "my-custom-article",
    title: "My Custom Topic",
    category: "getting-started",
    description: "About my topic",
    content: `# My Article\n\nContent here`,
    duration: 5,
    difficulty: "beginner",
    relatedTopics: [],
    keywords: ["keyword1"],
    lastUpdated: "2024-01-15",
  },
];
```

---

## Full Documentation

For detailed information:

- **HELP_SYSTEM_INTEGRATION.md** - Complete integration guide
- **HELP_TRAINING_SYSTEM_SUMMARY.md** - Feature overview
- **GETTING_STARTED_GUIDE.md** - User onboarding

---

## Questions?

Check the integration guide or review component prop interfaces in the code.

**You're all set! 🚀**
