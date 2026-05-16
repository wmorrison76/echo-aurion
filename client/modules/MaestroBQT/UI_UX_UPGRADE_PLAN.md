# MaestroBQT UI/UX Upgrade Plan
## Industry Standard: Prospect → Food on Plate | Invoice → Food on Plate

**Goal:** Beat TripleSeat and become the industry standard for hospitality BEO/event management UI/UX.

---

## 🎯 Design Principles

### 1. **Clarity & Hierarchy**
- Key actions instantly scannable
- Visual hierarchy through typography, spacing, color
- Progressive disclosure (show detail on demand)

### 2. **Contextual Customization**
- Role-based views (Prospecting, Purchasing, Receiving, Kitchen, Finance)
- Drag-and-drop layout customization (like TripleSeat Internal BEO)
- Show/hide fields per role

### 3. **Speed & Friction Reduction**
- Smart defaults, pre-filled forms
- Autosave drafts
- One-click actions where possible
- Keyboard shortcuts

### 4. **Visual Consistency**
- Unified design system across all touchpoints
- Food imagery front and center ("food on plate")
- Professional document templates
- Branded guest proposals

### 5. **Accessibility & Responsiveness**
- Large tap targets
- Readable typography
- Color contrast compliance
- Mobile/tablet/desktop parity

---

## 📋 Workflow 1: Prospect → Food on Plate

### Components Needed:

#### 1. **Prospect Dashboard** ✓ (To Build)
- Card view: prospect name, event date, status, revenue potential
- Visual tags for urgency
- Quick actions: Quote, Edit Event, Convert

#### 2. **Event Builder** ✓ (In Progress - BEOBuilder.tsx)
- Multi-step form: Event Info → Guest List → Menu → Logistics → Preview
- Live cost estimates (toggled for internal vs client)
- Smart defaults from past events

#### 3. **Interactive Menu Builder** (To Build)
- Drag-and-drop dishes into event
- Visual thumbnails ("food on plate" images)
- Portion size modifiers
- Dietary restrictions handling
- Featured items highlighting

#### 4. **Proposal/Internal BEO Templates** (To Build)
- **Internal BEO**: Staff-facing, no pricing, logistics-focused (like TripleSeat)
- **Guest Proposal**: Polished, branded, food imagery, simplified pricing
- Customizable layouts (drag-and-drop sections)
- Print-ready PDF generation

#### 5. **Traceability Visualization** (To Build)
- Visual flow diagrams (arrows, timelines)
- Show production routing (commissary → kitchen → plate)
- Transfer rules visualization

---

## 📋 Workflow 2: Purchasing → Receiving → Invoice → Food on Plate

### Components Needed:

#### 1. **Purchase Requisition Form** (To Build)
- Auto-populate from contracts/vendors
- Category organization
- Inventory warnings
- SKU lookup

#### 2. **Purchase Order Dashboard** (To Build)
- Status tiles: Pending / Ordered / Received / Overdue
- Filter by supplier, category, date
- Search functionality

#### 3. **Receiving & Quality Control Screen** (To Build)
- Scanner or checklist UI
- Photo upload for received goods
- Damage/quantity mismatch highlighting
- Lot/expiration logging

#### 4. **Invoice Reconciliation** (To Build)
- Three-way match: PO vs Receipt vs Invoice
- Exception queue for mismatches
- Auto-matching suggestions

#### 5. **Cost Attribution to Menu Items** (To Build)
- Cost per portion/dish visualization
- COG (Cost of Goods) display
- Gross margin per event/dish dashboard

#### 6. **Financial Overview & Reporting** (To Build)
- Visual reports (graphs, heat maps)
- Supplier performance tracking
- Cost trending alerts

---

## 🎨 Design System Requirements

### Component Library
- Use existing shadcn/ui components (50+ available)
- Extend with MaestroBQT-specific components:
  - `MenuBuilder` - Drag-and-drop menu selection
  - `FoodImageGallery` - Dish imagery management
  - `InternalBEODocument` - Staff-facing BEO template
  - `GuestProposalDocument` - Client-facing proposal template
  - `ReceivingScanner` - Barcode/QR scanning
  - `CostAttributionView` - COG per dish visualization

### Color Palette
- Primary: Professional blue (actions, links)
- Success: Green (completed, received)
- Warning: Amber (pending, attention needed)
- Error: Red (exceptions, critical)
- Neutral: Slate (backgrounds, text)

### Typography
- Headings: Bold, clear hierarchy
- Body: Readable, sufficient line height
- Labels: Medium weight, consistent sizing

### Spacing
- Consistent padding/margins (4px base unit)
- Generous whitespace for scannability
- Card spacing: 16-24px

### Icons
- Lucide React icons (already in use)
- Consistent sizing (16px, 20px, 24px)
- Semantic colors

---

## 📱 Responsive Breakpoints

- **Desktop**: Full featured (1200px+)
- **Tablet**: Optimized layout (768px - 1199px)
- **Mobile**: Touch-friendly, simplified (320px - 767px)

---

## 🚀 Implementation Phases

### Phase 1: Core BEO Builder (Week 1) ✅ In Progress
- [x] BEOBuilder component structure
- [ ] Tab navigation (Overview, Functions, Menu, Costs, Production, Orders, Docs, Changes)
- [ ] Auto-save functionality
- [ ] Status management
- [ ] Quick actions panel

### Phase 2: Document Templates (Week 2)
- [ ] Internal BEO template (no pricing, logistics focus)
- [ ] Guest Proposal template (branded, food imagery)
- [ ] PDF generation
- [ ] Customizable layouts (drag-and-drop)

### Phase 3: Menu Builder (Week 3)
- [ ] Visual menu selection with food imagery
- [ ] Drag-and-drop interface
- [ ] Recipe linking
- [ ] Portion size modifiers

### Phase 4: Purchasing/Receiving Flow (Week 4)
- [ ] Purchase Requisition form
- [ ] PO Dashboard
- [ ] Receiving screen with scanner
- [ ] Invoice reconciliation

### Phase 5: Cost Attribution & Reporting (Week 5)
- [ ] COG per dish visualization
- [ ] Financial dashboards
- [ ] Supplier performance tracking
- [ ] Cost trending alerts

### Phase 6: Mobile/Tablet Optimization (Week 6)
- [ ] Responsive layouts
- [ ] Touch-friendly controls
- [ ] Mobile-specific workflows
- [ ] Offline capability

---

## 🎯 Success Metrics

### User Experience
- Time to create BEO: < 10 minutes (vs 20+ in TripleSeat)
- Clicks to complete task: 50% reduction
- User satisfaction: > 90%

### Visual Quality
- Professional, modern design
- Consistent across all screens
- Food imagery prominent
- Print-ready documents

### Customization
- Layout customization (like TripleSeat)
- Role-based views
- Field show/hide preferences

### Performance
- Page load: < 2 seconds
- Smooth animations (60fps)
- Responsive on all devices

---

## 📚 References

- **TripleSeat Internal BEO**: https://support.tripleseat.com/hc/en-us/articles/12215822677143
- **Design System**: Existing shadcn/ui components in `client/components/ui/`
- **Genesis Integration**: Types in `client/modules/MaestroBQT/types/genesis-integration.ts`

---

**Status:** Phase 1 in progress. BEOBuilder component created with professional layout and tab navigation.
