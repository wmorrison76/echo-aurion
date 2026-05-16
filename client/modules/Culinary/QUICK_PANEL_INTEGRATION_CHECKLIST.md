# Echo Recipe Pro - Quick Integration Checklist

**Use this for the other Builder.io developer to integrate Echo Recipe Pro as a panel.**

---

## ⚡ 5-Minute Setup

### 1. Copy Files
```bash
# Extract from downloaded project to new Builder.io app
cp -r client/pages client/components client/context client/lib client/hooks client/data client/i18n /path/to/new-app/src/

# Copy server backend
cp -r server /path/to/new-app/
```

### 2. Install Dependencies
```bash
cd /path/to/new-app
pnpm install
```

### 3. Create `.env`
```
VITE_ECHO_API_URL=http://localhost:3001
VITE_DATABASE_URL=postgresql://user:pass@localhost:5432/echo_recipe_pro
```

### 4. Create Sidebar Entry
Add to sidebar navigation component:
```typescript
{
  id: "echo-menu",
  label: "Echo Menu Studio",
  icon: "ChefHat",
  component: lazy(() => import("./EchoRecipeProPanel")),
}
```

### 5. Register in Main App
Wrap with providers in `App.tsx`:
```typescript
<AuthProvider>
  <QueryClientProvider>
    <PageToolbarProvider>
      {/* Your sidebar with panels */}
    </PageToolbarProvider>
  </QueryClientProvider>
</AuthProvider>
```

### 6. Run Server
```bash
# Terminal 1: Frontend dev server
pnpm run dev

# Terminal 2: API backend
cd server && pnpm run build && pnpm start
```

### 7. Database Setup
```bash
# Create schema (Postgres required)
psql -d echo_recipe_pro -f server/migrations/001_init_schema.sql
```

---

## 📋 Pre-Integration Checklist

- [ ] Node.js 18+ and pnpm installed
- [ ] PostgreSQL database accessible
- [ ] React 18.3+ project
- [ ] Tailwind CSS configured
- [ ] Radix UI primitives available
- [ ] React Router available
- [ ] React Query available

---

## 🔌 Key Dependencies Required

These MUST be in `package.json`:
```json
{
  "@tanstack/react-query": "^5.84.2",
  "@radix-ui/*": "^1.x",
  "react-router-dom": "^6.30.1",
  "framer-motion": "^12.23.12",
  "tailwindcss": "^3.4.17",
  "sonner": "^1.7.4",
  "clsx": "^2.1.1",
  "tailwind-merge": "^2.6.0",
  "react-hook-form": "^7.62.0",
  "date-fns": "^4.1.0"
}
```

---

## 🚨 Common Integration Issues & Fixes

| Error | Fix |
|-------|-----|
| `Cannot find module '@/context/AuthContext'` | Update TypeScript `paths` in `tsconfig.json` to point to correct location |
| `API returns 404` | Ensure server is running on correct port (default 3001) |
| `Database connection failed` | Check DATABASE_URL matches actual Postgres instance |
| `Styles not loading` | Verify Tailwind is configured for new component paths in `tailwind.config.ts` |
| `Auth context undefined` | Wrap app root with `<AuthProvider>` before rendering panels |
| `Lazy load fails` | Ensure `React.lazy()` and `Suspense` are properly imported |

---

## 🔑 Critical Integration Points

### 1. Authentication
```typescript
// Must be shared between main app and panel
<AuthProvider>
  <PanelComponent />
</AuthProvider>
```

### 2. API Configuration
```typescript
// Set environment variable
process.env.VITE_ECHO_API_URL = "http://localhost:3001"
```

### 3. Database Connection
```bash
# Server needs running Postgres instance
DATABASE_URL=postgresql://user:password@localhost:5432/echo_recipe_pro
```

### 4. Lazy Loading
```typescript
// Use React.lazy() for code splitting
const Panel = lazy(() => import("./EchoRecipeProPanel"));
<Suspense fallback={<Loading />}>
  <Panel />
</Suspense>
```

---

## 📁 File Structure in New App

```
new-builder-io-app/
├── src/
│   ├── pages/
│   │   ├── Index.tsx (from echo-recipe-pro)
│   │   ├── RecipeEditor.tsx
│   │   └── sections/
│   ├── components/
│   │   ├── EchoRecipeProPanel.tsx (NEW - wrapper)
│   │   ├── TopTabs.tsx (from echo-recipe-pro)
│   │   └── ui/ (from echo-recipe-pro)
│   ├── context/ (from echo-recipe-pro)
│   ├── lib/ (from echo-recipe-pro)
│   ├── hooks/ (from echo-recipe-pro)
│   └── App.tsx
├── server/ (from echo-recipe-pro)
├── .env (NEW - create with credentials)
├── package.json (add dependencies)
└── tailwind.config.ts
```

---

## 🧪 Verification Steps

1. **Frontend loads:**
   ```bash
   npm run dev
   # Should open on http://localhost:5173
   ```

2. **Sidebar shows Echo Menu Studio:**
   - Look for new menu item in navigation
   - Click to trigger lazy load

3. **Panel loads without errors:**
   - No console errors
   - Loading spinner appears briefly
   - Panel content renders

4. **API connects:**
   ```bash
   curl http://localhost:3001/api/health
   # Should return 200 OK
   ```

5. **Database responds:**
   ```bash
   curl http://localhost:3001/api/recipes
   # Should return JSON array or empty array
   ```

6. **Auth works:**
   - Login form appears (if not already authenticated)
   - Session persists after refresh
   - RBAC permissions enforced

---

## 📞 Need Help?

1. **Check logs:**
   ```bash
   # Frontend
   tail -f ~/.pm2/logs/frontend.log
   
   # Backend
   tail -f ~/.pm2/logs/backend.log
   ```

2. **Verify API endpoint:**
   ```bash
   # Test API directly
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/recipes
   ```

3. **Check database:**
   ```bash
   psql -d echo_recipe_pro -c "SELECT COUNT(*) FROM recipes;"
   ```

4. **Review full guide:**
   - See `BUILDER_IO_PANEL_INTEGRATION_GUIDE.md` for detailed setup

---

## 🎯 Success Criteria

✅ Panel appears in sidebar
✅ Clicking loads component (with spinner)
✅ No console errors
✅ Can view recipes
✅ Can create new recipes
✅ RBAC restrictions work
✅ Notifications appear
✅ API calls succeed
✅ Database queries work
✅ Authentication persists

Once all checks pass, the integration is complete!
