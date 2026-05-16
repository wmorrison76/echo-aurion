# LUCCCA Sommelier Suite — Component Library

## Core Components

### 1. WineCatalogGrid

- **Purpose:** Display wines in grid layout
- **States:** Loading, Empty, Error
- **Responsive:** Desktop (1280), Tablet (834), Mobile (390)
- **Data Bindings:** name, producer, region, vintage, price, image, rating
- **Actions:** openWineDetail, addToFavorites, viewPairing

### 2. WineDetailModal

- **Purpose:** Full wine information in modal/drawer
- **States:** Loading, Loaded, Error
- **Content:** Name, producer, region, vintage, variety, ABV, body, acidity, tannin, sweetness, notes, image
- **Actions:** addToInventory, suggestPairings, viewVintageHistory, closeModal

### 3. PairingPanel

- **Purpose:** Show wine pairing recommendations
- **Data:** Dish name, wine name, pairing score (0-100), rationale
- **Color Coding:** Green (80+), Yellow (60-79), Red (<60)
- **Actions:** approvePairing, savePairing, requestAlternatives

### 4. InventoryList

- **Purpose:** Wine bottle lot tracking
- **Columns:** Wine name, Region, Vintage, Bin location, Qty, Par level, Status
- **Status Colors:** Green (in stock), Yellow (low), Red (critical)
- **Actions:** updateQuantity, transferBin, orderMore, deleteLot

### 5. MonthEndReport

- **Purpose:** COGS summary and metrics
- **Metrics:** Opening, Purchases, Closing, COGS, Cost %, Revenue
- **Chart:** COGS trend line (7 days)
- **Actions:** downloadReport, emailStakeholders, viewDetails

### 6. VintageTimeline

- **Purpose:** Chronological vintage overview
- **Data:** Year, rating (stars), summary, rainfall, temperature
- **Interaction:** Click year → expand detail
- **Actions:** compareVintages, viewProducers, downloadAnalysis

### 7. VintageDecadeSummary

- **Purpose:** 10-year evolution narrative
- **Content:** Decade range, stylistic trends, climate overview, investment notes
- **Actions:** viewAllVintages, readMore

### 8. ProducerCard

- **Purpose:** Winery lineage and history
- **Content:** Name, founding year, ownership history, region focus, notable wines
- **Actions:** viewWines, viewVintages, visitWebsite

### 9. TrainingDeck

- **Purpose:** Flashcard Q&A interface
- **Layout:** Card with question/answer flip animation
- **Progress:** Index (e.g., "5/20"), progress bar
- **Actions:** nextCard, prevCard, markCorrect, saveProgress

### 10. BlindTastingExam

- **Purpose:** Simulated tasting scenario
- **Sections:** Appearance → Aroma → Palate → Structure → Analysis
- **Difficulty Badges:** Beginner (1), Advanced (2), Master (3)
- **Actions:** nextSection, submitAnswer, revealAnswer

### 11. AlertsPanel

- **Purpose:** Real-time IoT sensor alerts
- **Data:** Sensor ID, message, severity (critical/warning), timestamp
- **Styling:** Red for critical, yellow for warning
- **Refresh:** Auto-refresh every 5 minutes
- **Actions:** resolveAlert, viewHistory, viewSensorData

### 12. SalesAnalyticsDashboard

- **Purpose:** Revenue and pairing performance
- **Charts:** Wine vs Food % (pie), Top items (bar), Trend (line)
- **Metrics:** Total revenue, wine %, food %
- **Actions:** viewTopPairings, downloadReport, filterByDate

### 13. VenueDashboard

- **Purpose:** Venue-level KPI overview
- **Metrics:** Total wines, Cost %, Top region, Active alerts, Month-end summary
- **Cards:** Cellar health, COGS trend, Alert count
- **Actions:** viewCellar, viewReports, viewAlerts

### 14. NavigationBar

- **Items:** Dashboard, Cellar, Pairings, Reports, Training, Archive, Alerts, Admin
- **Responsive:** Hamburger menu on mobile
- **Active State:** Highlight current route

### 15. UserProfileMenu

- **User Info:** Avatar, name, role (sommelier/manager/admin)
- **Actions:** My Profile, Settings, Logout

## Navigation Flows

### Standard User (Sommelier)

```
Dashboard
  → Cellar (inventory search)
    → Wine Detail (view notes, pairing)
  → Pairings (dish → wines)
  → Training (flashcards, exams)
  → Archive (vintage research)
```

### Manager/Admin

```
Dashboard
  → Cellar (full management)
  → Reports (month-end, variance)
  → Alerts (IoT monitoring)
  → Analytics (sales mix, top pairings)
  → Admin (user management, settings)
```

## Device Frames & Breakpoints

| Device      | Width  | Height | Notes                 |
| ----------- | ------ | ------ | --------------------- |
| iPhone 13   | 390px  | 844px  | Single-column layout  |
| iPad Air    | 834px  | 1112px | Two-column, expanded  |
| MacBook Air | 1280px | 800px  | Full dashboard layout |
| 4K Monitor  | 2560px | 1440px | Ultra-wide responsive |

## Brand Aesthetic

### Colors

- **Primary Background:** #0A0F12 (near-black)
- **Accent Neon:** #27D3FF (bright cyan)
- **Highlight Gold:** #E0B552 (wine-friendly warm)
- **Success Green:** #4CAF50
- **Warning Yellow:** #FFC107
- **Error Red:** #F44336
- **Text Primary:** #FFFFFF (white)
- **Text Secondary:** #B0BEC5 (light gray)

### Typography

- **Headlines:** SF Pro Display, 28-32px, bold
- **Subheadings:** Inter, 18-20px, semibold
- **Body:** Inter, 14-16px, regular
- **Captions:** Inter, 12px, regular

### Icons

- **Set:** Heroicons v2 or custom wine-specific
- **Size:** 24px (default), 32px (large), 16px (small)
- **Color:** Matches text color in most contexts

### Motion & Transitions

- **Default Duration:** 250ms
- **Easing:** cubic-bezier(0.4, 0, 0.2, 1) (ease-in-out)
- **Animations:**
  - Card hover: subtle scale (1.02x)
  - Route transition: fade + slide (left to right)
  - Modal open: fade-in + scale-up
  - Flip card: 3D perspective rotation

## Component States

### Loading

- Skeleton loader (shimmer effect)
- Placeholder height matching final content
- No CTA buttons until loaded

### Empty

- Centered illustration
- Descriptive message
- Primary CTA for action

### Error

- Red error banner
- Retry button
- Support link

## Accessibility (WCAG 2.1 AA)

- **Color Contrast:** 4.5:1 for text
- **Focus Indicators:** Visible keyboard navigation
- **Alt Text:** All images have descriptive alt
- **ARIA Labels:** Interactive components labeled
- **Keyboard Navigation:** All features accessible via keyboard

## Export & Usage

All components are built in Figma with:

- Responsive constraints
- Component variants for different states
- Design tokens linked to Builder.io
- CSS-in-JS export ready
- Storybook-compatible documentation
