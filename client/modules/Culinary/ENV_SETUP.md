# Environment Configuration Guide

This guide explains how to set up the required environment variables for Echo Recipe Pro.

## Required Environment Variables

### Supabase (Cloud Backend & Authentication)

To enable cloud features, you must connect Supabase first. Use the [Supabase MCP integration](#open-mcp-popover) to connect your database.

Once connected, add these variables to your environment:

```env
# Supabase Project URL - Get from https://app.supabase.com/project/[project-id]/settings/api
VITE_SUPABASE_URL=https://[project-id].supabase.co

# Supabase Anon Key - Get from https://app.supabase.com/project/[project-id]/settings/api
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

**How to get these values:**
1. Open [Supabase Console](https://app.supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy the "Project URL" and "anon public" key
5. Use the DevServerControl tool to set these variables (don't commit secrets!)

## Optional Environment Variables

### Toast POS Integration

```env
VITE_TOAST_CLIENT_ID=your-toast-client-id
VITE_TOAST_CLIENT_SECRET=your-toast-client-secret
```

### USDA Nutrition Database

```env
VITE_USDA_API_KEY=your-usda-api-key
```

Get your free API key from: https://fdc.nal.usda.gov/api/swagger-ui/

### Supplier API Credentials

#### Sysco
```env
VITE_SYSCO_API_KEY=your-sysco-api-key
VITE_SYSCO_API_SECRET=your-sysco-api-secret
VITE_SYSCO_CUSTOMER_ID=your-sysco-customer-id
```

#### US Foods
```env
VITE_USFOODS_API_KEY=your-usfoods-api-key
VITE_USFOODS_CUSTOMER_ID=your-usfoods-customer-id
```

#### GFS (Gordon Food Service)
```env
VITE_GFS_API_KEY=your-gfs-api-key
VITE_GFS_CUSTOMER_ID=your-gfs-customer-id
```

### Firebase (Optional Alternative to Supabase)

```env
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### Analytics

```env
VITE_ANALYTICS_ENABLED=true
VITE_GOOGLE_ANALYTICS_ID=GA-XXXXXXXXXXXX-X
VITE_SENTRY_DSN=https://examplePublicKey@exampleDomain.ingest.sentry.io/exampleProjectId
```

### App Configuration

```env
VITE_API_BASE_URL=http://localhost:3000
```

## Feature Availability

The application automatically enables features based on the environment variables you configure:

| Feature | Requirement |
|---------|-------------|
| Cloud Sync & Real-time Collaboration | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` |
| User Authentication | Supabase Configuration |
| POS Integration | `VITE_TOAST_CLIENT_ID` + `VITE_TOAST_CLIENT_SECRET` |
| USDA Nutrition Database | `VITE_USDA_API_KEY` |
| Supplier APIs (Sysco/USFoods/GFS) | Individual supplier API keys |
| Advanced Reporting | Always enabled (uses local data) |
| Command Palette | Always enabled |
| Keyboard Shortcuts | Always enabled |

## Setting Environment Variables

### Development (Using DevServerControl)

Use the DevServerControl tool to set environment variables safely:

```
set_env_variable: ['VITE_SUPABASE_URL', 'https://your-project.supabase.co']
set_env_variable: ['VITE_SUPABASE_ANON_KEY', 'your-anon-key']
```

### Production Deployment

When deploying to Netlify or Vercel, add these variables through their respective dashboards:

- **Netlify**: Go to Site settings → Build & deploy → Environment
- **Vercel**: Go to Project Settings → Environment Variables

## Validating Configuration

The app includes a configuration validator. Open the browser console to see:
- ✓ Configured services
- ✗ Missing required services
- ⚠ Unconfigured optional services

## Getting Help

For specific MCP integrations:
- **Supabase**: [Connect Supabase](#open-mcp-popover) - Database, Auth, Real-time
- **Netlify**: [Connect Netlify](#open-mcp-popover) - Deployment & Hosting
- **Builder CMS**: [Connect Builder.io](#open-mcp-popover) - Content Management

For API credentials:
- Sysco Partner Portal: https://marketplace.syscomarketplace.com
- US Foods Connect: https://connect.usfoods.com
- GFS Account Manager: Contact your GFS representative
- USDA FoodData: https://fdc.nal.usda.gov

## Troubleshooting

### "Supabase configuration is missing"
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Check values in Supabase Console → Settings → API

### "Toast POS integration is not configured"
- This is optional. Add if you want POS integration
- Get credentials from Toast Tab support

### API calls are failing
- Verify all required environment variables are set
- Check that API keys have correct permissions
- Ensure CORS is enabled on supplier APIs

## Security Notes

- **Never commit `.env` files** to version control
- Use the DevServerControl tool to set sensitive variables
- Rotate API keys regularly
- Use separate keys for development and production
- Supabase anon keys are public-safe but limit RLS (Row Level Security) in your database
