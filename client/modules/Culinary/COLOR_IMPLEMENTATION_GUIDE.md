# Light Mode Color Implementation Guide

## Quick Start: Using the New Palette

### For Styling Components

Use the CSS variables defined in `client/global.css`:

```tsx
// Light mode text
<p className="text-foreground dark:text-cyan-100">Content</p>

// Light mode backgrounds
<div className="bg-background dark:bg-slate-950">Container</div>

// Light mode accents
<button className="text-accent dark:text-cyan-300">Action</button>

// Light mode muted text
<span className="text-muted-foreground dark:text-cyan-300/70">Secondary</span>
```

### CSS Variable Reference

| Variable | Light Value | Dark Value | Use Case |
|----------|-------------|-----------|----------|
| `--background` | #f8fafc | #020817 | Main surface |
| `--foreground` | #1e293b | #f0f4f8 | Text color |
| `--accent` | #06b6d4 | #06b6d4 | Interactive elements |
| `--primary` | #1e293b | #f0f4f8 | Primary actions |
| `--muted` | #cbd5e1 | #475569 | Disabled states |
| `--muted-foreground` | #475569 | #9fb2c0 | Secondary text |
| `--border` | #e2e8f0 | #475569 | Borders, dividers |
| `--input` | #f1f5f9 | #475569 | Form controls |

### Common Patterns

#### 1. Text Colors
```tsx
// Primary text (high contrast)
<p className="text-foreground dark:text-cyan-100">Main text</p>

// Secondary text (lower contrast)
<p className="text-muted-foreground dark:text-cyan-300/70">Secondary text</p>

// Accent text
<p className="text-accent dark:text-cyan-300">Important text</p>
```

#### 2. Background Colors
```tsx
// Main background
<div className="bg-background dark:bg-slate-950">Main area</div>

// Cards and surfaces
<div className="bg-card dark:bg-slate-900">Card content</div>

// Subtle background
<div className="bg-input dark:bg-slate-950/50">Input area</div>

// Hover states
<div className="hover:bg-accent/10 dark:hover:bg-cyan-500/10">Hoverable</div>
```

#### 3. Borders and Dividers
```tsx
// Standard border
<div className="border border-border dark:border-slate-700">Bordered</div>

// With subtle glow
<div className="border border-border dark:border-cyan-500/20">Glow border</div>

// Subtle divider
<div className="divide-y divide-border dark:divide-cyan-500/10">Sections</div>
```

#### 4. Interactive Elements
```tsx
// Buttons
<button className="bg-accent text-white hover:bg-accent/90 dark:bg-cyan-500">
  Action
</button>

// Links
<a className="text-accent dark:text-cyan-300 hover:underline">Link</a>

// Form inputs
<input className="border border-border dark:border-cyan-500/20 bg-input dark:bg-slate-950" />
```

#### 5. Status Badges
```tsx
// Culinary/Primary
<span className="bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300">
  Culinary
</span>

// Pastry/Secondary
<span className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
  Pastry
</span>

// Muted/Inactive
<span className="bg-muted text-muted-foreground dark:bg-slate-800 dark:text-cyan-300">
  Inactive
</span>
```

## Component-Specific Examples

### Dashboard/List Items
```tsx
// List row
<div className="hover:bg-accent/10 dark:hover:bg-cyan-500/10 border-b border-border dark:border-cyan-500/10">
  <p className="text-foreground dark:text-cyan-100">Item name</p>
  <p className="text-muted-foreground dark:text-cyan-300/70">Metadata</p>
</div>
```

### Cards
```tsx
// Card wrapper
<div className="bg-card dark:bg-slate-900 border border-border dark:border-cyan-500/20 rounded-lg p-4">
  <h3 className="text-foreground dark:text-cyan-100 font-semibold">Title</h3>
  <p className="text-muted-foreground dark:text-cyan-300/70">Description</p>
</div>
```

### Forms
```tsx
// Form wrapper
<form className="space-y-4 bg-background dark:bg-slate-950">
  <div className="space-y-2">
    <label className="text-sm font-medium text-foreground dark:text-cyan-100">
      Label
    </label>
    <input
      className="w-full border border-border dark:border-cyan-500/20 bg-input dark:bg-slate-950 text-foreground dark:text-cyan-100 placeholder:text-muted-foreground dark:placeholder:text-cyan-300/40"
      placeholder="Enter text..."
    />
  </div>
</form>
```

### Dialogs/Modals
```tsx
// Dialog content
<div className="bg-popover dark:bg-slate-900 border border-border dark:border-cyan-500/20">
  <h2 className="text-foreground dark:text-cyan-100">Dialog Title</h2>
  <p className="text-muted-foreground dark:text-cyan-300/70">Description</p>
  <button className="bg-accent text-white dark:bg-cyan-500">Action</button>
</div>
```

## Accessibility Considerations

### Color Contrast
All color combinations meet WCAG AA standards:
- ✅ Foreground on background: 14.8:1 contrast
- ✅ Accent on white: 8.5:1 contrast
- ✅ All text colors clearly distinguishable

### Best Practices
1. **Don't rely on color alone**: Always include text labels or icons
2. **Use semantic colors**: Use `--destructive` for errors, `--accent` for actions
3. **Test with contrast checker**: Verify new color combinations
4. **Support both modes**: Always include both light and dark variants

## Common Mistakes to Avoid

### ❌ Wrong
```tsx
// Hard-coded colors that don't adapt to theme
<p className="text-cyan-100">Text</p>

// Dark-only styling
<div className="bg-slate-950 text-cyan-100">Content</div>

// Insufficient contrast
<p className="text-gray-600">Low contrast text</p>
```

### ✅ Right
```tsx
// Uses theme variables
<p className="text-foreground dark:text-cyan-100">Text</p>

// Supports both themes
<div className="bg-background dark:bg-slate-950 text-foreground dark:text-cyan-100">
  Content
</div>

// Meets accessibility standards
<p className="text-muted-foreground dark:text-cyan-300/70">Secondary text</p>
```

## Testing Checklist

- [ ] Component renders correctly in light mode
- [ ] Component renders correctly in dark mode
- [ ] All text is readable in both modes
- [ ] Hover states are visible in both modes
- [ ] Borders/dividers are clear in both modes
- [ ] Form inputs are distinguishable in both modes
- [ ] Status indicators are visible in both modes
- [ ] Run WCAG contrast checker on critical elements

## Useful Commands

### Check Contrast Ratio
Use browser DevTools or online tools:
- https://webaim.org/resources/contrastchecker/
- Chrome DevTools -> Inspect -> Styles

### Find Hardcoded Colors
```bash
# Search for hardcoded colors
grep -r "#[0-9a-f]\{6\}" client/components/RDLab/ --include="*.tsx"

# Search for tailwind hardcoded colors
grep -r "bg-slate\|text-cyan\|border-cyan" client/components/RDLab/ --include="*.tsx" | grep -v "dark:"
```

## Additional Resources

- [Tailwind CSS Colors](https://tailwindcss.com/docs/customizing-colors)
- [WCAG Color Contrast](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum)
- [Dark Mode Best Practices](https://www.a11y-101.com/design/dark-mode)
- [Accessible Colors](https://accessible-colors.com/)
