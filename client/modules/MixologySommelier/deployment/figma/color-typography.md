# LUCCCA Design System — Colors & Typography

## Color Palette

### Brand Colors

#### Primary

- **Neon Cyan:** #27D3FF
  - RGB: (39, 211, 255)
  - HSL: (192, 100%, 59%)
  - Usage: CTAs, focus states, highlights

#### Secondary

- **Wine Gold:** #E0B552
  - RGB: (224, 181, 82)
  - HSL: (42, 75%, 60%)
  - Usage: Accents, premium wine cards, hover states

### Neutrals

#### Dark

- **Near Black:** #0A0F12
  - RGB: (10, 15, 18)
  - Usage: Page backgrounds, text dark mode

#### Light

- **Pure White:** #FFFFFF
  - RGB: (255, 255, 255)
  - Usage: Text, card backgrounds

- **Light Gray:** #F5F6F7
  - RGB: (245, 246, 247)
  - Usage: Subtle backgrounds, borders

- **Medium Gray:** #B0BEC5
  - RGB: (176, 190, 197)
  - Usage: Secondary text, disabled states

### Semantic Colors

#### Success

- **Green:** #4CAF50
  - RGB: (76, 175, 80)
  - Usage: Confirmations, positive metrics

#### Warning

- **Amber:** #FFC107
  - RGB: (255, 193, 7)
  - Usage: Low inventory, marginal pairings

#### Error

- **Red:** #F44336
  - RGB: (244, 67, 54)
  - Usage: Critical alerts, temperature violations

#### Info

- **Blue:** #2196F3
  - RGB: (33, 150, 243)
  - Usage: Information, help text

## Typography

### Font Families

#### Headlines

**Font:** SF Pro Display (macOS), -apple-system fallback

- Weight: Bold (700)
- Letter Spacing: -0.02em
- Line Height: 1.2

Sizes:

- H1: 32px (mobile), 40px (tablet), 48px (desktop)
- H2: 24px (mobile), 28px (tablet), 32px (desktop)
- H3: 20px (mobile), 24px (tablet), 28px (desktop)

#### Body

**Font:** Inter

- Weight: Regular (400)
- Letter Spacing: 0em
- Line Height: 1.5

Sizes:

- Body Large: 18px
- Body Regular: 16px
- Body Small: 14px
- Caption: 12px

#### Monospace (Code)

**Font:** SF Mono or Monaco

- Usage: Code blocks, IDs, technical specs
- Size: 12px
- Line Height: 1.6

## Type Scales

### Mobile First (390px)

```
Hero: 28px, bold, leading 1.2
Title 1: 24px, semibold, leading 1.25
Title 2: 20px, semibold, leading 1.3
Title 3: 18px, semibold, leading 1.4
Body: 16px, regular, leading 1.5
Small: 14px, regular, leading 1.5
Caption: 12px, regular, leading 1.4
```

### Tablet (834px)

```
Hero: 36px
Title 1: 28px
Title 2: 24px
Title 3: 20px
Body: 16px (no change)
```

### Desktop (1280px)

```
Hero: 48px
Title 1: 32px
Title 2: 28px
Title 3: 24px
Body: 16px (no change)
```

## Component Typography

### Navigation

- Font: Inter, 14px, semibold
- Letter Spacing: 0.02em
- Color: White (#FFFFFF)
- Active: Neon Cyan (#27D3FF)

### Buttons

- Font: Inter, 14px, semibold
- Letter Spacing: 0.02em
- Text Transform: None
- Min Height: 44px (touch target)

### Cards

- Title: Inter, 18px, semibold
- Subtitle: Inter, 14px, regular
- Body: Inter, 14px, regular

### Forms

- Label: Inter, 12px, semibold
- Input: Inter, 14px, regular
- Help Text: Inter, 12px, regular, #B0BEC5

### Tables

- Header: Inter, 12px, semibold, uppercase
- Body: Inter, 14px, regular
- Monospace numbers for financial data

## Text Combinations

### Pairing Score Badge

```
Score Number: 28px SF Pro Display, bold, white
Score Label: 12px Inter, regular, medium gray
```

### Vintage Card

```
Vintage Year: 32px SF Pro Display, bold
Rating Stars: 5 × 24px SVG icons
Summary: 14px Inter, regular, light gray
```

### Wine Detail

```
Wine Name: 32px SF Pro Display, bold
Producer: 16px Inter, regular, gold accent
Region: 14px Inter, regular, secondary gray
ABV: 12px Inter, monospace, medium gray
```

## Spacing System

Based on 8px grid:

```
xs: 4px (padding in tight spaces)
sm: 8px (default)
md: 16px (component padding)
lg: 24px (section padding)
xl: 32px (major sections)
xxl: 48px (page margins)
```

## Shadows & Depth

### Level 0 (No Shadow)

Flat cards, inputs

### Level 1 (Subtle)

`box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)`
Cards in lists, light hover states

### Level 2 (Medium)

`box-shadow: 0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12)`
Modal dialogs, expanded cards

### Level 3 (Deep)

`box-shadow: 0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10)`
Floating menus, important modals

## Gradients

### Neon Glow

`linear-gradient(135deg, #27D3FF 0%, #1BA3CD 100%)`

### Wine Warmth

`linear-gradient(135deg, #E0B552 0%, #C89A3E 100%)`

### Dark to Darker

`linear-gradient(180deg, #0A0F12 0%, #050608 100%)`

## Opacity Scale

- 100%: Fully opaque (default)
- 80%: Hover states, light interactions
- 60%: Disabled states
- 40%: Subtle backgrounds
- 20%: Ghost backgrounds
- 0%: Transparent

## Accessibility Contrast Ratios

All text meets WCAG AA (4.5:1 minimum):

- White text on #0A0F12: 16.5:1 ✓
- #27D3FF on #0A0F12: 7.2:1 ✓
- #E0B552 on #0A0F12: 5.1:1 ✓
- #B0BEC5 on #0A0F12: 4.8:1 ✓

## Export Format

All design tokens exported as:

- JSON (for code)
- CSS Variables
- Tailwind config
- Figma tokens plugin compatible
