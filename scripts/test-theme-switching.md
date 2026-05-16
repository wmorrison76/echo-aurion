# Theme Switching Test Guide

## How to Test Theme Compliance

### Manual Testing Steps

1. **Open Module**
   - Navigate to the module in the application
   - Note current appearance

2. **Toggle Light/Dark Mode**
   - Go to Settings → Appearance
   - Toggle between Light and Dark
   - **Expected:** All colors change instantly
   - **Check:** Text is readable in both modes
   - **Check:** Borders are visible in both modes
   - **Check:** Buttons are clickable in both modes

3. **Change Theme**
   - Go to Settings → Appearance
   - Change theme (Cyan → Blue → Red → etc.)
   - **Expected:** Primary accent colors change
   - **Check:** No hardcoded colors remain unchanged

4. **Change Font Scale**
   - Go to Settings → Appearance
   - Adjust font scale
   - **Expected:** All text scales uniformly

### Automated Testing

```bash
# Run theme compliance check
tsx scripts/fix-theme-colors.ts --check-only

# This will report:
# - Files with hardcoded colors
# - Number of instances per file
# - Suggested replacements
```

### Test Checklist Per Module

- [ ] Module loads without errors
- [ ] All text is readable in light mode
- [ ] All text is readable in dark mode
- [ ] All borders are visible in both modes
- [ ] All buttons are visible and clickable
- [ ] Forms are usable in both modes
- [ ] Primary colors change with theme
- [ ] No hardcoded colors remain
- [ ] Font scaling works correctly
- [ ] No console errors when switching themes

### Common Issues to Check

1. **Text Not Visible**
   - Check if using `text-foreground` or `text-muted-foreground`
   - Verify contrast ratios meet WCAG AA (4.5:1)

2. **Borders Not Visible**
   - Check if using `border-border`
   - Verify border opacity is appropriate

3. **Buttons Not Clickable**
   - Check if using `bg-primary` with `text-primary-foreground`
   - Verify hover states work

4. **Forms Not Usable**
   - Check if inputs use `bg-background` and `text-foreground`
   - Verify focus states are visible

5. **Theme Not Changing**
   - Check for hardcoded colors (hex codes, rgb values)
   - Verify all `dark:` overrides are removed
   - Check if using theme tokens from `GLOBAL-STYLE.CSS`

### Reporting Issues

When reporting theme issues, include:
1. Module name
2. Specific component/page
3. Light or dark mode
4. Screenshot if possible
5. Browser console errors (if any)
