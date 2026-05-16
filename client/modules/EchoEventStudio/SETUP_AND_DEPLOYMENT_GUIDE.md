# Setup & Deployment Guide

## Quick Setup (5 minutes)

### 1. Install Dependencies
```bash
# Using npm
npm install

# Or using pnpm
pnpm install

# Or using yarn
yarn install
```

### 2. Start Development Server
```bash
npm run dev
# App available at http://localhost:5173
```

### 3. Verify Installation
- [ ] App loads without errors
- [ ] 3D canvas renders
- [ ] Keyboard shortcuts work (G, Shift+?)
- [ ] Help menu opens
- [ ] Panels drag smoothly

---

## Integration Steps (10 minutes)

### Step 1: Copy Components
```bash
# Copy all new components
mkdir -p client/components
cp -r new-components/* client/components/
```

### Step 2: Copy Utilities
```bash
# Copy all new utilities
mkdir -p client/hooks
mkdir -p client/lib
cp -r new-hooks/* client/hooks/
cp -r new-lib/* client/lib/
```

### Step 3: Update Global Styles
```bash
# Backup existing styles
cp client/global.css client/global.css.backup

# Merge new styles into global.css
# (See IMPLEMENTATION_IMPROVEMENTS_GUIDE.md for CSS additions)
```

### Step 4: Update Asset Registry
```bash
# Replace asset registry
cp public/data/AssetRegistry.json public/data/AssetRegistry.json.backup
cp new-assets/AssetRegistry.json public/data/
```

### Step 5: Update 3D Models
```bash
# Update models.ts with enhanced versions
# (All functions are already exported)
# (No file copy needed - already in existing structure)
```

### Step 6: Import in Your App
```tsx
// In your main app or studio page
import LayoutStudioPage from '@/components/LayoutStudioPage';

export default function App() {
  return <LayoutStudioPage />;
}
```

### Step 7: Test Integration
```bash
npm run dev
# Verify all features work
```

---

## Build for Production

### Local Build Test
```bash
# Build locally
npm run build

# Run production build
npm start

# Test at http://localhost:3000
```

### Deployment to Netlify

#### Option A: Deploy from CLI
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

#### Option B: Connect Repository
1. Go to https://app.netlify.com
2. Click "New site from Git"
3. Select your repository
4. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Click "Deploy site"

### Deployment to Vercel

#### Option A: CLI Deployment
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### Option B: Git Integration
1. Go to https://vercel.com/new
2. Import your repository
3. Vercel auto-configures React + Vite
4. Click "Deploy"

### Deployment to Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

# Install serve
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Start
CMD ["serve", "-s", "dist", "-l", "3000"]
```

Build and run:
```bash
docker build -t event-studio .
docker run -p 3000:3000 event-studio
```

---

## Environment Configuration

### Development
```bash
# .env.local
VITE_API_URL=http://localhost:3000
VITE_ENV=development
```

### Production
```bash
# .env.production
VITE_API_URL=https://api.yourdomain.com
VITE_ENV=production
```

---

## Troubleshooting Setup Issues

### Issue: Dependencies Not Installing
**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: Port Already in Use
**Solution:**
```bash
# Use different port
npm run dev -- --port 5174

# Or kill process
lsof -ti:5173 | xargs kill -9
```

### Issue: TypeScript Errors
**Solution:**
```bash
# Rebuild TypeScript
npm run typecheck

# Clear cache
rm -rf dist .next

npm run build
```

### Issue: Module Not Found
**Solution:**
1. Verify file paths match import statements
2. Check tsconfig.json path aliases
3. Ensure all files are in correct directories
4. Rebuild: `npm run build`

### Issue: CSS Not Loading
**Solution:**
1. Verify global.css is imported in main component
2. Check Tailwind configuration
3. Rebuild CSS: `npm run build`
4. Clear browser cache (Ctrl+Shift+Delete)

---

## Performance Optimization

### For Development
```bash
# Enable source maps for debugging
npm run dev

# Monitor performance
# Chrome DevTools > Performance tab
```

### For Production
```bash
# Build with optimizations
npm run build

# Analyze bundle
npm install -g vite-plugin-visualizer
# Check dist/stats.html
```

### Image Optimization
- All textures are procedurally generated (no files to optimize)
- Canvas-based texture generation is performant

### Code Splitting
- Vite handles automatic code splitting
- Components are lazy-loadable
- No additional configuration needed

---

## Database Setup (If Using Backend)

### Using Supabase
```bash
# Install client
npm install @supabase/supabase-js

# Configure .env
VITE_SUPABASE_URL=your-url
VITE_SUPABASE_ANON_KEY=your-key
```

### Using Firebase
```bash
# Install client
npm install firebase

# Configure .env
VITE_FIREBASE_CONFIG=your-config
```

---

## Security Checklist

- [ ] Environment variables in `.env` (not in code)
- [ ] API keys rotated before deployment
- [ ] HTTPS enabled on production
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] XSS protection enabled
- [ ] CSRF tokens configured

---

## Monitoring & Analytics

### Application Performance
```tsx
// Add to main component
import { useEffect } from 'react';

export function App() {
  useEffect(() => {
    // Log performance metrics
    const metrics = performance.getEntriesByType('navigation')[0];
    console.log('Page load time:', metrics.loadEventEnd - metrics.loadEventStart);
  }, []);

  return (/* ... */);
}
```

### Error Tracking (Sentry Example)
```bash
npm install @sentry/react @sentry/tracing

# Initialize in main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-dsn",
  environment: import.meta.env.MODE,
});
```

### User Analytics
```tsx
// Track user actions
function trackEvent(name: string, data?: any) {
  if (window.gtag) {
    window.gtag('event', name, data);
  }
}

// Use in components
trackEvent('layout_saved', { numObjects: layout.length });
```

---

## Continuous Deployment

### GitHub Actions Example
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      - uses: netlify/actions/cli@master
        with:
          args: deploy --prod
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

---

## Maintenance Tasks

### Daily
- [ ] Monitor error logs
- [ ] Check performance metrics
- [ ] Respond to user feedback

### Weekly
- [ ] Review analytics
- [ ] Update dependencies (non-breaking)
- [ ] Test critical features

### Monthly
- [ ] Security updates
- [ ] Performance review
- [ ] Feature planning

### Quarterly
- [ ] Major version updates
- [ ] Architecture review
- [ ] Capacity planning

---

## Backup & Recovery

### Backup Strategy
```bash
# Backup database
pg_dump -h localhost -U user -d dbname > backup.sql

# Backup user data
tar czf user_data_backup.tar.gz data/

# Store in cloud
aws s3 cp user_data_backup.tar.gz s3://backups/
```

### Recovery Procedure
```bash
# Restore database
psql -h localhost -U user -d dbname < backup.sql

# Restore user data
tar xzf user_data_backup.tar.gz
```

---

## Support & Help

### For Setup Issues
1. Check this guide
2. Review INTEGRATION_CHECKLIST.md
3. Check browser console for errors
4. Verify file paths and imports

### For Feature Questions
1. Read QUICK_FEATURE_REFERENCE.md
2. Check inline code comments
3. Review component prop types
4. Test with simple examples

### For Performance Issues
1. Profile with DevTools
2. Check bundle size
3. Review browser console
4. Test on different devices

---

## Next Steps

1. ✅ Install dependencies
2. ✅ Start dev server
3. ✅ Verify basic functionality
4. ✅ Review component documentation
5. ✅ Customize for your needs
6. ✅ Test thoroughly
7. ✅ Deploy to staging
8. ✅ Deploy to production

---

## Frequently Asked Questions

### Q: Can I customize the theme?
**A:** Yes! Update `global.css` CSS variables to change colors.

### Q: How do I add new keyboard shortcuts?
**A:** Use `useKeyboardShortcuts()` hook and `registerShortcut()`.

### Q: Can I add custom 3D models?
**A:** Yes, create model functions in `models.ts` and export them.

### Q: How do I add more assets?
**A:** Update `AssetRegistry.json` and `assetPickerConfig.ts`.

### Q: Is mobile supported?
**A:** Keyboard shortcuts work. Touch gestures can be added.

### Q: Can I use a different backend?
**A:** Yes, update API endpoints in utility functions.

### Q: How do I enable SSL?
**A:** Use a reverse proxy (nginx) or let your host handle it.

### Q: Can I self-host?
**A:** Yes, use Docker or traditional hosting.

---

## Resources

- [React Documentation](https://react.dev)
- [Three.js Documentation](https://threejs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vite Documentation](https://vitejs.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

---

## Support Contacts

- **Documentation:** See README files in project
- **Technical Issues:** Check browser console for errors
- **Feature Requests:** Review roadmap
- **Community:** Refer to GitHub discussions

---

## Conclusion

Your Event Studio application is now ready for deployment! Follow this guide for smooth setup and operation.

**Good luck! 🚀**
