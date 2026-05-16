# White-Label Customization Framework

A comprehensive guide for implementing white-label customization across your multi-tenant restaurant management platform.

## Overview

The white-label framework allows you to customize the application's appearance, branding, and feature availability for different clients or sub-brands. This includes colors, typography, spacing, logos, and feature toggles.

## Architecture

### Core Components

1. **Configuration System** (`shared/whiteLabelConfig.ts`)
   - Defines all customizable properties
   - Provides validation and merging utilities
   - Includes default configuration

2. **Backend Service** (`server/lib/whiteLabelService.ts`)
   - Manages configuration CRUD operations
   - Implements caching for performance
   - Validates CSS and custom code

3. **API Routes** (`server/routes/whiteLabelRoutes.ts`)
   - REST endpoints for configuration management
   - Domain-based configuration retrieval
   - Admin-only endpoints with authentication placeholders

4. **React Hooks** (`client/hooks/use-white-label.ts`)
   - `useWhiteLabel()` - Fetch and apply configuration
   - `useWhiteLabelAdmin()` - Manage configurations (admin)

5. **Context Provider** (`client/context/WhiteLabelContext.tsx`)
   - Provides white-label data to entire application
   - Convenience hooks for specific data types

## Configuration Structure

### Colors

```typescript
{
  primary: '#3B82F6',        // Main brand color
  secondary: '#8B5CF6',      // Secondary brand color
  accent: '#EC4899',         // Accent color
  background: '#FFFFFF',     // Page background
  surface: '#F9FAFB',        // Component surfaces
  error: '#EF4444',          // Error states
  warning: '#F59E0B',        // Warnings
  success: '#10B981',        // Success states
  info: '#0EA5E9',           // Information
  text: '#1F2937',           // Primary text
  textSecondary: '#6B7280',  // Secondary text
  border: '#E5E7EB'          // Borders
}
```

### Typography

```typescript
{
  fontFamily: 'Inter, system-ui, sans-serif',
  headingFont: 'Inter, system-ui, sans-serif',
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem'
  },
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  }
}
```

### Branding

```typescript
{
  appName: 'Lucca',
  appDescription: 'Restaurant Management Platform',
  logoUrl: '/logo.svg',
  logoUrlDark: '/logo-dark.svg',
  faviconUrl: '/favicon.ico',
  primaryEmail: 'hello@lucca.io',
  supportEmail: 'support@lucca.io',
  supportPhone: '+1-800-LUCCA-APP',
  website: 'https://lucca.io',
  socialLinks: {
    twitter: 'https://twitter.com/lucca',
    facebook: 'https://facebook.com/lucca',
    instagram: 'https://instagram.com/lucca',
    linkedin: 'https://linkedin.com/company/lucca'
  }
}
```

### Feature Flags

```typescript
{
  enableNotifications: true,
  enablePayments: true,
  enableReporting: true,
  enableMultiOutlet: true,
  enableMobileApp: true,
  enableAnalytics: true,
  enableAuditLogs: true,
  enableAdvancedAnalytics: true,
  enableMultiCurrency: true,
  enableWebhooks: true
}
```

## Usage Guide

### For End Users (Using White-Label Features)

#### 1. Wrapping Your App with Provider

```typescript
// client/App.tsx
import { WhiteLabelProvider } from './context/WhiteLabelContext';

export default function App() {
  return (
    <WhiteLabelProvider>
      {/* Your app content */}
    </WhiteLabelProvider>
  );
}
```

#### 2. Using White-Label Data in Components

```typescript
import { useWhiteLabelBranding, useWhiteLabelColors } from '../context/WhiteLabelContext';

export function Logo() {
  const branding = useWhiteLabelBranding();

  return (
    <img
      src={branding.logoUrl}
      alt={branding.appName}
    />
  );
}

export function Header() {
  const colors = useWhiteLabelColors();

  return (
    <header style={{ backgroundColor: colors.primary }}>
      {/* Header content */}
    </header>
  );
}
```

#### 3. Conditionally Rendering Features

```typescript
import { useWhiteLabelFeatureFlags } from '../context/WhiteLabelContext';

export function AnalyticsDashboard() {
  const features = useWhiteLabelFeatureFlags();

  if (!features.enableAnalytics) {
    return null;
  }

  return (
    <div>
      {/* Analytics content */}
    </div>
  );
}
```

#### 4. Using CSS Variables

White-label colors and spacing are automatically applied as CSS variables:

```css
.button {
  background-color: var(--color-primary);
  padding: var(--spacing-md);
  font-size: var(--font-size-base);
  font-family: var(--font-family);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}
```

### For Administrators (Managing White-Label Configurations)

#### 1. Create a New White-Label Configuration

**API:**

```bash
curl -X POST http://localhost:3000/api/white-label/configs \
  -H "Content-Type: application/json" \
  -d '{
    "id": "client-123",
    "name": "Client Name",
    "domain": "client.example.com",
    "colors": {
      "primary": "#FF6B6B",
      "secondary": "#4ECDC4"
      // ... other colors
    },
    "branding": {
      "appName": "Client Brand",
      "logoUrl": "https://example.com/logo.svg"
      // ... other branding
    }
  }'
```

**Via React Hook:**

```typescript
import { useWhiteLabelAdmin } from '../hooks/use-white-label';

function AdminPanel() {
  const { createConfig } = useWhiteLabelAdmin();

  const handleCreate = async () => {
    try {
      const newConfig = await createConfig({
        name: 'New Client',
        domain: 'newclient.example.com',
        colors: { /* ... */ },
        branding: { /* ... */ }
      });
      console.log('Created:', newConfig);
    } catch (error) {
      console.error('Failed to create:', error);
    }
  };

  return <button onClick={handleCreate}>Create</button>;
}
```

#### 2. Update Configuration

**API:**

```bash
curl -X PATCH http://localhost:3000/api/white-label/configs/client-123 \
  -H "Content-Type: application/json" \
  -d '{
    "colors": {
      "primary": "#00FF00"
    }
  }'
```

**Via React Hook:**

```typescript
const { updateConfig } = useWhiteLabelAdmin();

await updateConfig("client-123", {
  colors: { primary: "#00FF00" },
});
```

#### 3. List All Configurations

**API:**

```bash
curl http://localhost:3000/api/white-label/configs
```

**Via React Hook:**

```typescript
const { configs } = useWhiteLabelAdmin();

configs.forEach((config) => {
  console.log(`${config.name}: ${config.domain}`);
});
```

#### 4. Activate Configuration

**API:**

```bash
curl -X POST http://localhost:3000/api/white-label/configs/client-123/activate
```

**Via React Hook:**

```typescript
const { activateConfig } = useWhiteLabelAdmin();

await activateConfig("client-123");
```

#### 5. Add Custom CSS

```typescript
const { updateConfig } = useWhiteLabelAdmin();

const customCSS = `
  .header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
  
  .button {
    border-radius: 8px;
    transition: all 0.3s ease;
  }
  
  .button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

await updateConfig("client-123", {
  customCSS,
});
```

## Advanced Features

### CSS Validation

The system validates custom CSS to prevent XSS attacks:

```typescript
const { validateCustomCSS } = whiteLabelService;

const result = await validateCustomCSS(cssString);
if (!result.valid) {
  console.error("CSS errors:", result.errors);
}
```

**Blocked patterns:**

- `javascript:` URLs
- Event handlers (`onload`, `onclick`, etc.)
- Import statements

### Caching Strategy

The white-label service implements intelligent caching:

- **Cache TTL:** 5 minutes
- **Auto-invalidation** on configuration changes
- **Domain-based caching** for multi-tenant efficiency

```typescript
const config =
  await whiteLabelService.getWhiteLabelConfig("client.example.com");
// Subsequent calls within 5 minutes use cache

// Clear cache on demand
whiteLabelService.clearCache("client.example.com");
```

### Domain Routing

Multiple domains can be mapped to a single configuration:

```typescript
// In white_label_domains table
// domain: client1.example.com → config_id: abc123
// domain: client1.co.uk → config_id: abc123
```

### Feature Toggle Management

Enable/disable features on a per-configuration basis:

```typescript
// In white_label_feature_toggles table
INSERT INTO white_label_feature_toggles (config_id, feature_name, rollout_percentage)
VALUES (
  'config-id',
  'advanced_analytics',
  50  -- Enable for 50% of users (gradual rollout)
);
```

## Database Schema

### white_label_configs

Main configuration storage with all customization data.

### white_label_audit_log

Tracks all changes to configurations for compliance.

### white_label_feature_toggles

Dynamic feature control with gradual rollout support.

### white_label_domains

Domain-to-configuration mapping for multi-domain support.

## Best Practices

### Design System

- Use CSS variables for consistency
- Create component variants based on feature flags
- Test all color combinations for accessibility
- Ensure sufficient contrast ratios (WCAG AA minimum)

### Performance

- Leverage caching to reduce database queries
- Load white-label config early in app initialization
- Use lazy loading for domain-specific assets
- Minimize custom CSS file size

### Security

- Always validate custom CSS for XSS prevention
- Use environment variables for sensitive branding data
- Implement rate limiting on configuration endpoints
- Audit all white-label changes

### Multi-Tenant

- Isolate tenant data using domain-based routing
- Never expose one tenant's configuration to another
- Implement proper Row Level Security (RLS) policies
- Use service role keys only for admin operations

## Troubleshooting

### Configuration Not Applied

1. Verify domain matches configuration domain
2. Check that configuration is marked as `is_active: true`
3. Clear browser cache and refresh
4. Check browser console for CSS variable errors

### Custom CSS Not Working

1. Validate CSS syntax using the validation endpoint
2. Check browser DevTools for CSS errors
3. Ensure CSS specificity doesn't conflict with base styles
4. Verify custom CSS doesn't contain blocked patterns

### Performance Issues

1. Monitor cache hit rates
2. Check database query performance
3. Reduce custom CSS file size
4. Consider using CSS-in-JS for dynamic styles

## Examples

### Complete White-Label Component

```typescript
import React from 'react';
import {
  useWhiteLabelBranding,
  useWhiteLabelColors,
  useWhiteLabelTypography,
} from '../context/WhiteLabelContext';

export function CustomHeader() {
  const branding = useWhiteLabelBranding();
  const colors = useWhiteLabelColors();
  const typography = useWhiteLabelTypography();

  return (
    <header
      style={{
        backgroundColor: colors.primary,
        padding: '1rem',
        fontFamily: typography.fontFamily,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <img
          src={branding.logoUrl}
          alt={branding.appName}
          style={{ height: '40px' }}
        />
        <h1 style={{ color: 'white', margin: 0 }}>
          {branding.appName}
        </h1>
      </div>
      <p style={{ color: colors.textSecondary, margin: '0.5rem 0 0' }}>
        {branding.appDescription}
      </p>
    </header>
  );
}
```

## API Reference

See `server/routes/whiteLabelRoutes.ts` for complete API documentation.

## Support

For issues or feature requests, refer to the main project documentation or contact your development team.
