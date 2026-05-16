# LUCCCA Theme Variables Reference

Complete documentation of all CSS custom properties available across the platform. This is the single source of truth for visual design.

---

## Quick Start

### Using Colors in Components

```tsx
// In JSX with Tailwind classes
<div className="bg-card text-foreground border border-border">
  <p className="text-muted-foreground">Secondary text</p>
</div>

// Or with CSS custom properties
<div style={{
  backgroundColor: 'var(--color-card-bg)',
  color: 'var(--color-text)',
  borderColor: 'var(--color-border)'
}}>
```

### Using Colors in CSS

```css
.my-component {
  background-color: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
}
```

### Changing Theme at Runtime

All theme changes are handled by `client/lib/theme-manager.ts`:
- Click Settings → Appearance → Select Theme
- Theme manager updates CSS variables on `:root`
- All components automatically reflect the change

---

## Color Tokens

### Background Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-bg` | #f5f7fb | #0b0f14 | Page background |
| `--color-bg-alt` | #f8fafc | #0e141b | Alternative background |
| `--color-surface` | #ffffff | #121821 | Cards, panels, modals |
| `--color-surface-alt` | #f8fafc | #0d1117 | Alternative surface |

### Text Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-text` | #0b1727 | #e6edf3 | Primary text (body, headers) |
| `--color-text-secondary` | #667080 | #a8b2bb | Secondary text (labels) |
| `--color-text-muted` | #a1acb8 | #6e7580 | Muted text (hints, disabled) |

### Primary Brand Colors (Theme-Dependent)

The following adjust based on selected theme (Echo/Corporate/Vibrant/Minimal/Warm):

| Token | Light Default | Dark Default | Usage |
|-------|----------------|----------------|-------|
| `--color-primary` | #0564ff | #58a6ff | Primary buttons, links, highlights |
| `--color-primary-text` | #ffffff | #0b0f14 | Text on primary background |
| `--color-primary-bg` | #f0f6ff | #0d1117 | Primary background (subtle) |
| `--color-primary-light` | #60a5fa | #79c0ff | Lighter shade for hover |
| `--color-primary-dark` | #003d7a | #1f6feb | Darker shade for active |

### Secondary Colors

| Token | Light Default | Dark Default | Usage |
|-------|----------------|----------------|-------|
| `--color-secondary` | #6f4dff | #b392f0 | Secondary accents |
| `--color-secondary-text` | #ffffff | #0b0f14 | Text on secondary |
| `--color-secondary-bg` | #f3f0ff | #1f0e3f | Secondary background |

### Accent Colors

| Token | Light Default | Dark Default | Usage |
|-------|----------------|----------------|-------|
| `--color-accent` | #00a2ff | #79c0ff | Accents, highlights, interactive |
| `--color-accent-text` | #ffffff | #0b0f14 | Text on accent |
| `--color-accent-bg` | #e0f2ff | #0d1e30 | Accent background |

### Semantic Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-success` | #22c55e | #3fb950 | Success states, confirmations |
| `--color-success-text` | #ffffff | #ffffff | Text on success |
| `--color-success-bg` | #f0fdf4 | #051a14 | Success background |
| `--color-warning` | #f59e0b | #d29922 | Warning states |
| `--color-warning-text` | #ffffff | #ffffff | Text on warning |
| `--color-warning-bg` | #fffbeb | #1a0e00 | Warning background |
| `--color-danger` | #ef4444 | #f85149 | Error/danger states |
| `--color-danger-text` | #ffffff | #ffffff | Text on danger |
| `--color-danger-bg` | #fef2f2 | #1a0600 | Danger background |

### Border & Input Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-border` | #d1dae6 | #30363d | Standard borders |
| `--color-border-light` | #e8ecf4 | #21262d | Light borders |
| `--color-input-bg` | #ffffff | #161b22 | Input/textarea background |
| `--color-input-border` | #d1dae6 | #30363d | Input border (unfocused) |
| `--color-input-text` | #0b1727 | #e6edf3 | Input text |
| `--color-placeholder` | #a1acb8 | #6e7580 | Placeholder text |
| `--color-input-focus-border` | #0564ff | #58a6ff | Input border (focused) |
| `--color-input-focus-bg` | #f0f6ff | #0d1117 | Input background (focused) |

### Component-Specific Tokens

#### Button

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-button-bg` | #0564ff | #58a6ff | Button background |
| `--color-button-text` | #ffffff | #0b0f14 | Button text |
| `--color-button-hover-bg` | #0452cc | #79c0ff | Button hover background |
| `--color-button-border` | #d1dae6 | #30363d | Button border |

#### Card & Panel

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-card-bg` | #ffffff | #161b22 | Card background |
| `--color-card-border` | #d1dae6 | #30363d | Card border |
| `--color-card-shadow` | 0 1px 3px rgba(0,0,0,0.1) | 0 1px 3px rgba(0,0,0,0.3) | Card shadow |
| `--color-panel-bg` | #ffffff | #121821 | Panel background |
| `--color-panel-border` | #d1dae6 | #30363d | Panel border |
| `--color-panel-header-bg` | #f8fafc | #0d1117 | Panel header background |
| `--color-panel-header-text` | #0b1727 | #e6edf3 | Panel header text |
| `--color-panel-header-border` | #d1dae6 | #21262d | Panel header border |

#### Badge & Chip

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-badge-bg` | #f0f6ff | #1f6feb | Badge background |
| `--color-badge-text` | #0564ff | #79c0ff | Badge text |

#### Sidebar

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--sidebar-bg` | color-mix(#ffffff 85%, #c9d4e6 15%) | color-mix(#0b0f14 88%, black 12%) | Sidebar background |
| `--sidebar-text` | #263957 | #e6edf3 (92% opacity) | Sidebar text |
| `--sidebar-border` | #c9d4e6 | #30363d (85% opacity) | Sidebar border |
| `--sidebar-hover-bg` | #f0f4fc | #161b22 (70% opacity) | Sidebar hover background |
| `--sidebar-active-bg` | #e8eef7 | #0d1117 | Sidebar active background |
| `--sidebar-active-text` | #0564ff | #58a6ff | Sidebar active text |

---

## Typography Tokens

### Font Scale

The `--font-scale` variable controls ALL text sizing proportionally. Default is 1.0.

| Scale | Size | Use Case |
|-------|------|----------|
| 0.8 | 80% | For users who prefer smaller text |
| 1.0 | 100% | Default (recommended) |
| 1.125 | 112.5% | For users who prefer larger text |
| 1.5 | 150% | Maximum accessibility |

All text sizes are calculated using: `calc(base-size * var(--font-scale))`

```css
--font-xs: calc(0.75rem * var(--font-scale));    /* 12px @ 1.0 */
--font-sm: calc(0.875rem * var(--font-scale));   /* 14px @ 1.0 */
--font-base: calc(1rem * var(--font-scale));     /* 16px @ 1.0 */
--font-md: calc(1.125rem * var(--font-scale));   /* 18px @ 1.0 */
--font-lg: calc(1.25rem * var(--font-scale));    /* 20px @ 1.0 */
--font-xl: calc(1.5rem * var(--font-scale));     /* 24px @ 1.0 */
--font-2xl: calc(1.875rem * var(--font-scale));  /* 30px @ 1.0 */
--font-3xl: calc(2.25rem * var(--font-scale));   /* 36px @ 1.0 */
```

### Font Families

| Token | Value | Use Case |
|-------|-------|----------|
| `--font-family-default` | Inter | Default (modern, clean) |
| `--font-family-poppins` | Poppins | Rounded, friendly feel |
| `--font-family-playfair` | Playfair Display | Elegant, serif |
| `--font-family-montserrat` | Montserrat | Bold, strong |
| `--font-family-lato` | Lato | Warm, readable |
| `--font-family` | *var(--font-family-default)* | **Currently active family** |

### Font Weights

| Token | Value | CSS Class |
|-------|-------|-----------|
| `--font-weight-normal` | 400 | font-normal |
| `--font-weight-medium` | 500 | font-medium |
| `--font-weight-semibold` | 600 | font-semibold |
| `--font-weight-bold` | 700 | font-bold |
| `--font-weight-extrabold` | 800 | font-extrabold |

### Line Heights

| Token | Value | Use Case |
|-------|-------|----------|
| `--line-height-tight` | 1.2 | Headings, compact text |
| `--line-height-snug` | 1.375 | Labels, short blocks |
| `--line-height-normal` | 1.5 | Body text (default) |
| `--line-height-relaxed` | 1.625 | Long-form content |
| `--line-height-loose` | 2.0 | Accessibility, large text |

---

## Spacing Scale

All spacing values scale with `--font-scale`:

```css
--spacing-0: 0;
--spacing-xs: calc(4px * var(--font-scale));    /* 4px @ 1.0 */
--spacing-sm: calc(8px * var(--font-scale));    /* 8px @ 1.0 */
--spacing-md: calc(16px * var(--font-scale));   /* 16px @ 1.0 */
--spacing-lg: calc(24px * var(--font-scale));   /* 24px @ 1.0 */
--spacing-xl: calc(32px * var(--font-scale));   /* 32px @ 1.0 */
--spacing-2xl: calc(48px * var(--font-scale));  /* 48px @ 1.0 */
--spacing-3xl: calc(64px * var(--font-scale));  /* 64px @ 1.0 */
```

---

## Border Radius

| Token | Value | Use Case |
|-------|-------|----------|
| `--radius-sm` | 4px | Small buttons, badges |
| `--radius-md` | 8px | Inputs, small components |
| `--radius-lg` | 12px | Cards, panels, modals |
| `--radius-xl` | 16px | Large containers |
| `--radius-2xl` | 20px | Prominent modals |
| `--radius-full` | 9999px | Fully rounded (pills, circles) |

---

## Shadows

| Token | Value | Use Case |
|-------|-------|----------|
| `--shadow-xs` | 0 1px 2px 0 rgba(0,0,0,0.05) | Subtle, barely visible |
| `--shadow-sm` | 0 1px 3px 0 rgba(0,0,0,0.1) | Light cards, buttons |
| `--shadow-md` | 0 4px 6px -1px rgba(0,0,0,0.1) | Standard cards, dropdowns |
| `--shadow-lg` | 0 10px 15px -3px rgba(0,0,0,0.1) | Modals, elevated panels |
| `--shadow-xl` | 0 20px 25px -5px rgba(0,0,0,0.1) | Heavy emphasis |
| `--shadow-2xl` | 0 25px 50px -12px rgba(0,0,0,0.25) | Maximum depth |

---

## Transitions

| Token | Value | Use Case |
|-------|-------|----------|
| `--transition-fast` | 100ms ease-out | Hover effects, quick feedback |
| `--transition-base` | 200ms ease-out | Standard transitions |
| `--transition-slow` | 300ms ease-out | Deliberate animations |

---

## Layout Tokens

| Token | Default Value | Usage |
|-------|---------------|-------|
| `--sidebar-width` | 256px | Open sidebar width |
| `--sidebar-width-collapsed` | 64px | Collapsed sidebar width |
| `--panel-header-height` | 44px (scales with font-scale) | Panel header height |

---

## Themes Available

### 1. Echo Recipe Pro (Default - Cyan)
- **Description**: LUCCCA's distinctive cyan look with purple accents
- **Primary**: #0564ff (light), #58a6ff (dark)
- **Secondary**: #6f4dff (light), #b392f0 (dark)
- **Accent**: #00a2ff (light), #79c0ff (dark)
- **Best for**: Culinary, Recipe management, food service

### 2. Corporate Professional (Blue)
- **Description**: Classic blue & gray for business environments
- **Primary**: #003d7a (light), #60a5fa (dark)
- **Secondary**: #4b5563 (light), #cbd5e1 (dark)
- **Accent**: #0284c7 (light), #06b6d4 (dark)
- **Best for**: HR, Payroll, Administration

### 3. Vibrant Energy (Red/Orange)
- **Description**: Bold colors with modern high-contrast flair
- **Primary**: #dc2626 (light), #fca5a5 (dark)
- **Secondary**: #ea580c (light), #fdba74 (dark)
- **Accent**: #ea580c (light), #fb923c (dark)
- **Best for**: Urgent alerts, high-priority workflows

### 4. Minimal Clean (Grayscale)
- **Description**: Simple, professional grayscale
- **Primary**: #1f2937 (light), #e5e7eb (dark)
- **Secondary**: #6b7280 (light), #9ca3af (dark)
- **Accent**: #374151 (light), #f3f4f6 (dark)
- **Best for**: Minimal, distraction-free interface

### 5. Warm Hospitality (Golden)
- **Description**: Warm golden/amber tones for service industry
- **Primary**: #d97706 (light), #fbbf24 (dark)
- **Secondary**: #b45309 (light), #f59e0b (dark)
- **Accent**: #f59e0b (light), #fcd34d (dark)
- **Best for**: Hospitality, service, warm industry feel

---

## How to Use in Components

### Tailwind CSS

Use Tailwind utility classes (powered by theme variables):

```tsx
<div className="bg-background text-foreground">
  <h1 className="text-2xl font-bold text-primary">Title</h1>
  <p className="text-sm text-muted-foreground">Subtitle</p>
  <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90">
    Click Me
  </button>
</div>
```

### CSS Variables Directly

For custom styling:

```css
.my-custom-component {
  background-color: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-md);
  font-family: var(--font-family);
  font-size: var(--font-base);
  transition: background-color var(--transition-base);
}

.my-custom-component:hover {
  background-color: var(--color-bg-alt);
}
```

### Inline Styles

When you must use inline styles:

```tsx
<div style={{
  backgroundColor: 'var(--color-card-bg)',
  color: 'var(--color-text)',
  borderColor: 'var(--color-border)',
  padding: 'var(--spacing-md)',
  borderRadius: 'var(--radius-lg)',
}}>
  Content
</div>
```

---

## How Themes Work

1. User clicks Settings → Appearance
2. Selects a theme (Echo, Corporate, Vibrant, Minimal, Warm)
3. Selects Light or Dark mode
4. `theme-manager.ts` updates CSS variables on `document.documentElement`
5. All components automatically reflect the change via CSS cascade

**Example**: When user selects "Corporate" theme in dark mode:
- `document.documentElement` gets classes: `dark theme-corporate`
- CSS rules `.dark.theme-corporate { ... }` apply
- `--color-primary` becomes `#60a5fa`
- All buttons, links, highlights instantly become blue

---

## How Font Scale Works

1. User opens Settings → Appearance
2. Adjusts Font Scale slider (0.8x to 1.5x)
3. `theme-manager.ts` updates `--font-scale` on `document.documentElement`
4. All text sizes update proportionally:
   - Headings: larger
   - Body: medium
   - Labels: smaller
   - But ALL maintain proportion

---

## Migration Guide: Old to New

### If you see this (OLD):

```tsx
<div style={{color: '#0b1727'}}>Text</div>
<button style={{backgroundColor: '#0564ff'}}>Button</button>
```

### Update to (NEW):

```tsx
<div className="text-foreground">Text</div>
<button className="bg-primary text-primary-foreground">Button</button>
```

### If you see (OLD CSS):

```css
.my-component {
  color: #0b1727;
  background: #ffffff;
  border: 1px solid #d1dae6;
}
```

### Update to (NEW CSS):

```css
.my-component {
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}
```

---

## Best Practices

✅ **DO**:
- Use Tailwind utility classes (bg-primary, text-foreground, border-border)
- Use CSS custom properties for custom styling (var(--color-primary))
- Rely on theme manager to propagate changes
- Test component in both light and dark modes

❌ **DON'T**:
- Hard-code colors (#0564ff, #ffffff, etc.)
- Use platform-specific colors (bg-blue-500, text-red-600)
- Duplicate color definitions in module global.css
- Bypass theme manager with inline style={{color: 'blue'}}

---

## Troubleshooting

**Text is unreadable in dark mode?**
- Ensure you're using `text-foreground` or `color: var(--color-text)`
- Check that parent has correct `color-bg` or `--color-bg`

**Theme change isn't applying to my component?**
- Verify component uses CSS variables or Tailwind classes
- Check browser console: `getComputedStyle(document.documentElement).getPropertyValue('--color-primary')`

**Colors look different on mobile?**
- Font scale and spacing adjust responsively via CSS variables
- Use responsive Tailwind classes if needed: `sm:text-lg md:text-xl`

**New module looks different from others?**
- Check if module has duplicate global.css
- Ensure module tailwind.config.ts extends main config
- Import theme-variables.css at top of module styles

---

## Questions?

Refer to:
- `client/lib/theme-manager.ts` - Theme application logic
- `client/components/site/SystemSettings.tsx` - Appearance controls
- `client/components/site/EnhancedAppearanceSettings.tsx` - Theme UI
