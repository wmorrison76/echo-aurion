# Fly.io Deployment Troubleshooting Guide

## Problem: "Importing a module script failed" on Fly.dev

This error occurs when the production build is not being served correctly. The app tries to load lazy-loaded routes and fails with an error like:

```
Importing a module script failed.
https://your-app.fly.dev/node_modules/.vite/deps/react-router-dom.js
```

### Root Cause

The error indicates that:

1. The production build (`dist/spa`) is not being created during the Docker build
2. OR the static files are not being served correctly from the production image
3. The app is falling back to trying load modules from development paths

### Solution: Deployment Steps

#### Step 1: Verify Local Build Works

Before deploying, ensure the build works locally:

```bash
# Clean build
rm -rf dist/

# Run the full build
pnpm build

# Verify output
ls -la dist/spa/        # Should have index.html and assets/
ls -la dist/server/     # Should have node-build.mjs
```

Expected output:

```
dist/spa/
├── assets/
│   ├── index-*.js
│   ├── react-*.js
│   ├── query-*.js
│   └── index-*.css
├── index.html
├── favicon.ico
└── robots.txt

dist/server/
├── node-build.mjs
└── node-build.mjs.map
```

#### Step 2: Test Production Build Locally

```bash
# Start the production server
NODE_ENV=production node dist/server/node-build.mjs

# The server should:
# 1. Start without errors
# 2. Verify that dist/spa/index.html exists
# 3. Log "✓ Production build verified"
# 4. Log the assets directory
```

Open http://localhost:3000 in your browser. You should see the app load correctly.

#### Step 3: Deploy to Fly.io

```bash
# Update fly.toml if needed (should already be configured)
# Then deploy:
fly deploy

# Monitor the build logs
fly logs

# Check app status
fly status
```

#### Step 4: Verify Deployment

```bash
# Test the deployed app
curl https://your-app-name.fly.dev/health

# Should return: {"status":"ok"}

# Check the app in browser
# Should load without "Importing a module script failed" error
```

### Diagnostic Checklist

If the app still fails to load on Fly.io, check:

1. **Docker build succeeded**
   - Run: `fly logs`
   - Look for: "Build artifacts verified" message
   - Should NOT see build errors

2. **Static files exist in production image**
   - Check that build output includes `dist/spa/assets/`
   - Each asset should be a `.js` or `.css` file with a hash in the name

3. **Server is serving files correctly**
   - Check logs for: "✓ Production build verified"
   - If you see "CRITICAL: Production build not found!", the `dist/` folder wasn't copied

4. **Environment variables are set**
   - Required: `NODE_ENV=production` (should be in fly.toml)
   - Check: `fly secrets list`

### Common Issues and Fixes

#### Issue 1: Build fails during Docker build

**Symptoms:**

- `fly logs` shows build errors
- "Build artifacts not found" message

**Solutions:**

1. Check for TypeScript errors: `pnpm typecheck`
2. Check for missing dependencies: `pnpm install`
3. Clear cache: `pnpm store prune && rm -rf dist/`
4. Try building locally first: `pnpm build`

#### Issue 2: Build succeeds but app shows blank page

**Symptoms:**

- Browser shows blank page
- Console error: "Importing a module script failed"
- Or app loads very slowly

**Solutions:**

1. Check browser DevTools → Network tab:
   - Look for failed network requests (404 errors)
   - Check if `index.html` loads correctly
   - Check if `assets/index-*.js` returns valid JavaScript

2. Check server logs for:
   - "Static file not found" warnings
   - "Failed to serve index.html" errors

3. Verify the `dist/spa/assets/` directory has files:
   ```bash
   fly ssh console
   # Inside the container:
   ls -lah /app/dist/spa/assets/ | head -20
   ```

#### Issue 3: App works locally but fails on Fly.io

**Symptoms:**

- `pnpm build && node dist/server/node-build.mjs` works locally
- But same code fails on Fly.io

**Solutions:**

1. Check the Node.js version:
   - Dockerfile uses `node:20-alpine`
   - Make sure your local Node.js is compatible

2. Check for environment variable differences:
   - Fly.io has `NODE_ENV=production` set
   - Check if your code behaves differently in production

3. Clear Fly.io build cache:
   ```bash
   fly deploy --force-build
   ```

### File Serving Configuration

The app uses Express to serve static files:

1. **Static files are served from `dist/spa/`**
   - The server logs this: "Serving static files from /app/dist/spa"
   - Caching headers are set based on file type:
     - HTML files: `Cache-Control: public, max-age=0, must-revalidate` (no caching)
     - Assets: `Cache-Control: public, max-age=31536000, immutable` (cache forever)

2. **React Router fallback**
   - Any URL that doesn't match a static file is served `index.html`
   - This allows client-side routing to work

3. **API routes**
   - URLs starting with `/api/` return 404 (handled by Express routes before this middleware)
   - The health check (`/health`) is also handled separately

### Verifying the Fix

After applying the fixes, you should see:

1. **In Docker build logs:**

   ```
   ✓ Build artifacts verified
   ✓ Production build verified
   dist/spa/
   dist/server/
   ```

2. **In server startup logs:**

   ```
   ✓ Production build verified
   Serving static files from /app/dist/spa
   Server running on port 3000
   ```

3. **In the browser:**
   - App loads without JavaScript errors
   - No "Importing a module script failed" error
   - Pages load and navigation works

### Performance Optimization Tips

1. **Browser caching**: Assets with content hashes are cached forever, so users only download them once
2. **Lazy loading**: Page components are lazy-loaded, so only needed code is downloaded
3. **Code splitting**: React, Query, and icons are in separate chunks for better caching
4. **Minification**: Production build is minified by Vite for smaller file sizes

### Additional Resources

- [Fly.io Deployment Documentation](https://fly.io/docs/)
- [Vite Build Guide](https://vitejs.dev/guide/build.html)
- [Express Static File Serving](https://expressjs.com/en/starter/static-files.html)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
