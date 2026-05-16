# Setup Instructions

## ⚠️ Important: Install Dependencies First

Before running the development server, you must install the required dependencies. This is a one-time setup step.

### Step 1: Install Dependencies

Run one of the following commands in your terminal:

```bash
# Using npm
npm install

# OR using pnpm
pnpm install

# OR using yarn
yarn install
```

**Why this is needed**: The following packages were added to support the new features:
- `openai` - OpenAI API client for Echo Voice and Predictive Operations
- `jsonwebtoken` - JWT authentication
- `helmet` - Security headers middleware
- `compression` - Response compression
- `axios` - HTTP client for POS integrations

### Step 2: Configure Environment Variables

Ensure these environment variables are set in your `.env` file:

```bash
OPENAI_API_KEY=sk-proj-your-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 3: Start the Development Server

After dependencies are installed, start the dev server:

```bash
npm run dev
```

The application will be available at `http://localhost:8080`

### Step 4: Verify Installation

Test that both features are working:

**Echo Voice:**
1. Open the app in Chrome, Safari, or Edge
2. Look for the Echo Voice widget (bottom-left corner if added to a page)
3. Click "Start Talking" and speak a command
4. Listen for the AI response

**Predictive Operations:**
1. Navigate to a page with the PredictiveOpsDashboard component
2. You should see operational insights loading
3. Check for any alerts or recommendations

## 🔧 Troubleshooting

### Error: "Cannot find module 'openai'"
**Solution**: Run `npm install` to install all dependencies

### Error: "Dev server won't start"
**Solution**: 
1. Run `npm install` 
2. Restart the dev server with `npm run dev`
3. Check that `OPENAI_API_KEY` is set in `.env`

### Echo Voice Component Not Found
**Solution**: The component is registered automatically. If not appearing:
1. Check browser console for errors
2. Verify `OPENAI_API_KEY` is configured
3. Clear browser cache and reload

### Predictive Operations Shows No Data
**Solution**: 
1. Ensure `property_summary` table has data for your organization
2. Check the `org_id` is correct
3. Verify authentication is working

## 📋 Checklist

- [ ] Ran `npm install`
- [ ] Set `OPENAI_API_KEY` in `.env`
- [ ] Set `SUPABASE_URL` in `.env`
- [ ] Set `SUPABASE_ANON_KEY` in `.env`
- [ ] Started dev server with `npm run dev`
- [ ] Can see Echo Voice widget on a page
- [ ] Can see Predictive Operations dashboard
- [ ] Speech recognition works (Chrome/Safari/Edge)
- [ ] AI responses are received
- [ ] Operational insights are displayed

## 🚀 Production Deployment

When deploying to production:

```bash
# Build the application
npm run build

# This creates optimized builds in:
# - dist/spa/ (frontend)
# - dist/server/ (backend)

# Start the production server
npm start
```

### Verifying Build Success

```bash
npm run typecheck  # TypeScript type checking
npm run build      # Full build
npm start          # Start server
```

All commands should complete without errors.

## 📚 Documentation

- [Echo Voice & Predictive Operations Summary](./ECHO_VOICE_PREDICTIVE_OPS_SUMMARY.md)
- [Integration Guide](./ECHO_VOICE_INTEGRATION_GUIDE.md)
- [API Documentation](./docs/MANIFEST.md)

## 💬 Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review error messages in browser console
3. Check `.env` file configuration
4. Verify all dependencies are installed: `npm ls openai jsonwebtoken helmet compression axios`
5. Try clearing node_modules and reinstalling: `rm -rf node_modules && npm install`

---

**Status**: Ready to deploy after following these steps ✅
