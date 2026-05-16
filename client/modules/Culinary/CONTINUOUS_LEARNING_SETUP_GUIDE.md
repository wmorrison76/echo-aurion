# EchoAi³ Continuous Learning Mode - Setup & Configuration

## Development Knowledge Base Building with Progress Tracking

---

## 🚀 Overview

Echo now runs in **Learning Mode** by default during development, continuously crawling and building a knowledge base. When thresholds are met, it automatically switches to **On-Demand Mode** for production.

### Two Modes

| Aspect        | Learning Mode                      | On-Demand Mode                                 |
| ------------- | ---------------------------------- | ---------------------------------------------- |
| **Trigger**   | Scheduled (automatic)              | User query only                                |
| **Frequency** | Every 2 minutes                    | Only when requested                            |
| **Goal**      | Build comprehensive knowledge base | Save API costs, provide fast responses         |
| **Duration**  | Development phase                  | Production (when 10,000+ items + 75% coverage) |

---

## 📦 Components

### 1. **Background Crawler Service**

(`client/echo/services/backgroundCrawler.ts`)

- Runs knowledge crawler in background
- Configurable crawl intervals and batch sizes
- Auto-switches modes when thresholds met
- Tracks metrics continuously

### 2. **Knowledge Progress Tracker**

(`client/echo/services/knowledgeProgressTracker.ts`)

- Monitors knowledge base growth
- Tracks 5 culinary types with checkpoints
- Tracks 16 regions/cuisines
- Calculates coverage percentages
- Manages mode transitions

### 3. **Progress Dashboard Component**

(`client/components/KnowledgeProgressDashboard.tsx`)

- Beautiful UI showing progress
- Compact and full modes
- Real-time metrics and coverage
- Checkpoint visualization

### 4. **Crawler Hook**

(`client/hooks/use-background-crawler.ts`)

- React hook for crawler integration
- Status management
- Manual control (start/stop/mode switch)
- Progress updates

---

## 🔧 Setup & Initialization

### Step 1: Initialize in Your App

In your main app or root component:

```typescript
import { useBackgroundCrawler } from "@/hooks/use-background-crawler";

function App() {
  const { status } = useBackgroundCrawler();

  useEffect(() => {
    if (status.isRunning) {
      console.log("🚀 Knowledge crawler is running");
    }
  }, [status]);

  return (
    <>
      {/* Your app content */}
    </>
  );
}
```

### Step 2: Display Progress Dashboard

Already integrated in `RecipeSearch.tsx` at the bottom under "Culinary Terminology & Definitions", but you can add it anywhere:

```typescript
import { KnowledgeProgressDashboard } from "@/components/KnowledgeProgressDashboard";

export function YourPage() {
  return (
    <div>
      <h1>Recipes</h1>
      {/* ... page content ... */}

      {/* Compact mode */}
      <KnowledgeProgressDashboard compact={true} />

      {/* Full mode */}
      <KnowledgeProgressDashboard compact={false} />
    </div>
  );
}
```

---

## ⚙️ Configuration

### Default Configuration

```typescript
{
  enabled: true,                      // Enable/disable crawler
  mode: "learning",                   // "learning" or "on_demand"
  crawlIntervalMs: 120000,            // 2 minutes between batches
  batchSize: 3,                       // Topics per batch
  autoSwitchWhenReady: true,          // Auto-switch to on-demand
  topics: [
    "allergen safety",
    "flavor chemistry",
    "pastry techniques",
    "baking science",
    "banquet service",
    "catering logistics",
    "culinary terminology",
    "ingredient sourcing",
    "nutritional data",
    "regional cuisines",
    "molecular gastronomy",
    "preservation techniques",
    "food safety",
    "menu design",
    "cost optimization",
    "sustainable cooking",
  ]
}
```

### Custom Configuration

Create a custom crawler instance:

```typescript
import { BackgroundKnowledgeCrawler } from "@/echo/services/backgroundCrawler";
import { useAppData } from "@/context/AppDataContext";

function CustomCrawlerSetup() {
  const { recipes, ingredients } = useAppData();

  useEffect(() => {
    // Create custom crawler
    const crawler = new BackgroundKnowledgeCrawler({
      enabled: true,
      mode: "learning",
      crawlIntervalMs: 300000,      // 5 minutes
      batchSize: 5,                 // More topics per batch
      topics: [
        "french cuisine",
        "asian fusion",
        "molecular gastronomy",
        "sustainable sourcing",
        "allergen protocols",
      ],
      autoSwitchWhenReady: true,
    });

    // Initialize
    crawler.initialize(recipes, ingredients);

    // Start
    crawler.start();

    return () => crawler.destroy();
  }, [recipes, ingredients]);

  return <div>Crawler running...</div>;
}
```

---

## 📊 Auto-Switch Thresholds

The crawler automatically switches to **On-Demand Mode** when:

✅ **Coverage**: 75% across all domains
✅ **AND Approved Items**: 10,000+ knowledge items

Example progression:

```
Day 1:   0% coverage,     0 items     → Learning Mode
Day 3:   25% coverage,  2,000 items   → Learning Mode
Day 7:   50% coverage,  5,000 items   → Learning Mode
Day 14:  75% coverage, 10,000 items   → ✨ Auto-switch to On-Demand Mode
```

---

## 🎯 Culinary Types Tracked

Each type has **5 checkpoints** that must be completed:

### 1. General Culinary

- ✅ Allergens documented
- ✅ Nutrition data complete
- ✅ Techniques explained
- ✅ Flavor balance analyzed
- ✅ Substitutions available

### 2. Pastry & Desserts

- Temperature management
- Precise measurements
- Decoration techniques
- Flavor profiles
- Dietary adaptations

### 3. Baking & Bread

- Fermentation science
- Hydration ratios
- Gluten development
- Temperature control
- Shelf stability

### 4. Banquet & Plated

- Presentation standards
- Portion control
- Hold time specs
- Plating geometry
- Service flow

### 5. Catering & Service

- Batch scaling
- Transport logistics
- Holding equipment
- Service timing
- Quality standards

---

## 🌍 Regions Tracked

16 regional cuisines with their represented sub-cuisines:

```
����🇳 Chinese    (Cantonese, Sichuan, Hunan)
🇯🇵 Japanese   (Sushi, Ramen, Tempura)
🇹🇭 Thai       (Pad Thai, Tom Yum)
🇰🇷 Korean     (Korean BBQ, Kimchi)
🇮🇳 Indian     (Curry, Tandoori, Naan)
🇻🇳 Vietnamese (Pho, Banh Mi)
🇫🇷 French     (Haute Cuisine, Provence)
🇮🇹 Italian    (Pasta, Risotto, Gelato)
🇪🇸 Spanish    (Tapas, Paella)
🇩🇪 German     (Sausage, Pretzel)
🇲🇽 Mexican    (Tacos, Mole, Enchiladas)
🇧🇷 Brazilian  (Churrasco, Feijoada)
🇺🇸 American   (BBQ, Burgers, Southern)
🌍 Middle East  (Lebanese, Israeli, Persian)
🌍 African     (Ethiopian, Moroccan)
🌏 Oceanic     (Australian, Polynesian, Hawaiian)
```

---

## 📈 Progress Dashboard Features

### Compact View

Shows:

- Mode indicator (Learning/On-Demand)
- Overall coverage %
- Progress bar
- Next threshold (if in Learning mode)

### Full View

Shows:

- Header with mode badge
- Overall coverage card
- Culinary types progress (5 items with checkpoints)
- Regional/cuisine coverage (16 items)
- Stats cards (approved items, coverage, types, regions)

---

## 🎮 Manual Controls

### Using the Hook

```typescript
import { useBackgroundCrawler } from "@/hooks/use-background-crawler";

function CrawlerControl() {
  const { status, start, stop, setMode, crawlTopic } = useBackgroundCrawler();

  return (
    <div>
      <button onClick={start}>Start Crawler</button>
      <button onClick={stop}>Stop Crawler</button>
      <button onClick={() => setMode("on_demand")}>Switch to On-Demand</button>
      <button onClick={() => crawlTopic("french cuisine")}>
        Crawl French Cuisine
      </button>

      {status.summary && (
        <p>{status.summary.progress}</p>
      )}
    </div>
  );
}
```

### Using the Global Instance

```typescript
import { getBackgroundCrawler } from "@/echo/services/backgroundCrawler";

const crawler = getBackgroundCrawler();

// Start/stop
crawler.start();
crawler.stop();

// Manual crawl
await crawler.crawlTopic("baking science");

// Check status
const progress = crawler.getProgress();
const summary = crawler.getProgressSummary();
const status = crawler.getStatus();

// Switch mode
crawler.setMode("on_demand");
```

---

## 📋 Crawler Workflow

```
App Initializes
    ↓
Load Recipes & Ingredients
    ↓
Initialize BackgroundCrawler
    ↓
Start Learning Mode
    ↓
Every 2 minutes:
  ├─ Select 3 topics from queue
  ├─ Crawl 6 sources (recipes, academic, menus, videos, blogs, suppliers)
  ├─ Vet all knowledge (7-phase validation)
  ├─ Update KnowledgeProgressTracker
  ├─ Store approved knowledge
  └─ Check auto-switch threshold
    ↓
If threshold reached:
  └─ Auto-switch to On-Demand Mode ✨
    ↓
Dashboard updates with:
  ├─ Coverage percentages
  ├─ Item counts
  ├─ Culinary type progress
  ├─ Regional coverage
  └─ Mode indicator
```

---

## 🚨 What Gets Crawled

### Initial Topics (Auto-cycling)

1. Allergen safety
2. Flavor chemistry
3. Pastry techniques
4. Baking science
5. Banquet service
6. Catering logistics
7. Culinary terminology
8. Ingredient sourcing
9. Nutritional data
10. Regional cuisines
11. Molecular gastronomy
12. Preservation techniques
13. Food safety
14. Menu design
15. Cost optimization
16. Sustainable cooking

### Each Crawl Searches:

- ✅ Recipe databases
- ✅ Academic papers
- ✅ Restaurant menus
- ✅ YouTube videos
- ✅ Food blogs
- ✅ Ingredient suppliers

### Vetting Process:

- ✅ Source credibility
- ✅ Content quality
- ✅ Ingredient verification
- ✅ **Allergen validation (CRITICAL)**
- ✅ Flavor chemistry
- ✅ Technique verification
- ✅ Culinary brain approval

---

## 📊 Dashboard Location

**In RecipeSearch.tsx**: Bottom of page, under "Culinary Terminology & Definitions"

```
RecipeSearch Page
├── Search Interface
├── Recipe Grid/List
├── Culinary Terminology & Definitions
└── ✨ Knowledge Progress Dashboard (NEW)
    ├── Mode Indicator
    ├── Overall Coverage
    ├── Culinary Types Progress
    ├── Regional Coverage
    └── Statistics Cards
```

---

## 🔍 Monitoring Progress

### Console Logs

The crawler logs all activity to console:

```
🚀 Starting Background Knowledge Crawler (Learning Mode)
📚 Crawling batch 1: allergen safety, flavor chemistry, pastry techniques
✅ allergen safety: 15 approved, 2 failures
✅ flavor chemistry: 23 approved, 1 failure
✅ pastry techniques: 18 approved, 0 failures
📊 Progress: 45% coverage, 5,600 items approved
   Next threshold: 30% coverage or 4,400 items to auto-switch
```

### Dashboard Display

Real-time updates showing:

- Coverage percentage per culinary type
- Checkpoint completion (colored dots)
- Regional recipe counts
- Overall statistics

### API Access

```typescript
const tracker = new KnowledgeProgressTracker();
const progress = tracker.getProgressState();
console.log(progress.overallCoverage); // 45%
console.log(progress.totalApprovedItems); // 5600
console.log(progress.mode); // "learning"
```

---

## 🎯 Development Workflow

### Phase 1: Learning (Days 1-14)

- Crawler runs continuously
- Dashboard shows progress
- Users can see knowledge expanding
- Monitor coverage growth

### Phase 2: Transition (Day 14+)

- Auto-switch triggers
- Mode changes to On-Demand
- Crawler stops
- Dashboard updates

### Phase 3: Production (On-Demand)

- Crawler only runs on user queries
- Lower API costs
- Faster response times
- Maintenance crawls weekly/monthly

---

## 💡 Tips for Best Results

1. **Let it run**: Leave crawler enabled during development
2. **Monitor dashboard**: Watch knowledge base grow
3. **Check logs**: Console shows crawl progress
4. **Customize topics**: Add domain-specific topics if needed
5. **Test threshold**: Verify auto-switch works as expected
6. **Plan maintenance**: Schedule slower crawls for production

---

## 🔧 Troubleshooting

### Crawler not running?

```typescript
const crawler = getBackgroundCrawler();
const status = crawler.getStatus();
console.log(status); // Check if isRunning, mode, etc.
```

### Dashboard not showing?

- Check if `KnowledgeProgressDashboard` is imported
- Ensure it's placed in the right location
- Check browser console for errors

### Progress not updating?

- Wait for next crawl cycle (2 minutes default)
- Or call `updateStatus()` manually
- Check if crawler is initialized with recipes/ingredients

### Not auto-switching?

- Check if `autoSwitchWhenReady: true` in config
- Monitor thresholds: need 75% AND 10,000 items
- Check console for auto-switch logs

---

## 📚 Related Documentation

- [Knowledge Crawler Guide](ECHOAI3_KNOWLEDGE_CRAWLER_GUIDE.md)
- [R&D Labs Integration](RDLABS_KNOWLEDGE_INTEGRATION_GUIDE.md)
- [Implementation Summary](KNOWLEDGE_CRAWLER_IMPLEMENTATION_SUMMARY.md)

---

## ✅ Checklist

- [ ] Background crawler initialized in app
- [ ] Knowledge dashboard integrated in RecipeSearch
- [ ] Initial crawl running
- [ ] Progress tracking active
- [ ] Auto-switch configured (75% + 10,000 items)
- [ ] Dashboard visible at bottom of Recipes page
- [ ] Console logs showing crawler activity
- [ ] Mode switching works (manual if testing)

---

**Status**: ✅ Ready to use
**Default Mode**: 🚀 Learning
**Auto-Switch**: Enabled
**Update Frequency**: Every 2 minutes (configurable)
