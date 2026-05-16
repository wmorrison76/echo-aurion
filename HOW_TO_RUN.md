# 🚀 How to Run LUCCCA Framework

## Architecture Overview

LUCCCA Framework is a **modular Operating System** built by assembling multiple standalone modules into one collective OS. Each module was built independently and integrated into the unified framework.

## Entry Point Hierarchy

The application follows this initialization sequence:

1. **HTML Entry Point** (`index.html`)
   - Defines DOM root element (`<div id="root"></div>`)
   - Loads React app via script

2. **React Bootstrap** (`client/index.tsx`)
   - Initializes Sentry error tracking
   - Creates React root and renders main App component
   - Enables Vite HMR (hot module replacement)

3. **Main Application Component** (`client/App.tsx`)
   - Wraps app with providers:
     - Query Client (React Query)
     - Auth Provider
     - Theme Provider (next-themes)
     - I18n Provider
     - Tooltip Provider
     - Error Boundary

4. **Core Initialization Steps** (in AppContent)
   - `initializeAuth()` → Auto-login setup
   - `initializeTheme()` → Theme system initialization
   - `preloadCriticalModules()` → Panel registry preload
   - `EchoV5.tick()` → AI core cognitive loop
   - `echoAIFinancialObserver` → Financial tracking
   - `glAutoPostingService` → General Ledger processor

5. **Main UI Structure**
   - `EchoAiDockController`: Background command processing
   - `UnifiedToolbar`: Top toolbar with all controls
   - `AvatarDisplay`: Avatar + AI chat interface (top-left)
   - `Sidebar`: Left navigation
   - `SystemSettings`: Settings panel
   - `PanelHost`: Dynamic panel system
   - `BackboardPage`: Main canvas/dashboard area

## Quick Start

### Option 1: Start Both Servers Together (Recommended)

```bash
cd /Users/cami/Documents/GitHub/LUCCCA_Framework
npm run dev:all
```

**OR using pnpm:**
```bash
pnpm run dev:all
```

**OR using the startup script:**
```bash
./START_LUCCCA.sh
```

This starts **both**:
- **Vite dev server** on port **8080** (frontend)
- **Backend server** on port **3001** (API)

### Option 2: Start Frontend Only (with API proxy)

```bash
npm run dev
# or
pnpm run dev
```

**Note:** This starts the frontend, but you'll need the backend running separately for full functionality. The frontend will proxy `/api` requests to `localhost:3001`.

### 2. **Access the Application**

Once the server starts (usually 10-30 seconds), open your browser:

**🌐 Main Application:** http://localhost:8080

**🔧 Backend API:** http://localhost:3001 (proxied through Vite)

---

## What Each Component Does

- **Vite Dev Server (Port 8080)**: 
  - Serves the React frontend
  - Handles hot module replacement
  - Proxies `/api` requests to backend on port 3001
  - Module import resolver for legacy standalone modules

- **Backend Server (Port 3001)**: 
  - Express API server
  - Handles data, authentication, and business logic
  - WebSocket connections for real-time features

---

## Alternative Ways to Run

### Run in Separate Terminals (For Better Debugging)

**Terminal 1 - Frontend:**
```bash
npm run dev
# Frontend runs on http://localhost:8080
```

**Terminal 2 - Backend:**
```bash
npm run dev:backend
# Backend runs on http://localhost:3001
```

This approach gives you:
- Separate logs for frontend and backend
- Easier to see which server has errors
- Can restart one without affecting the other

### Run in Safe Mode (if you encounter file watcher issues)
```bash
npm run dev:safe
# or
pnpm run dev:safe
```
Prevents ENOSPC errors in constrained environments. Validates modules at startup.

---

## Environment Variables

### Required for Backend

A `.env` file has been created with development defaults. The backend **requires** `JWT_SECRET` to start.

**Already configured:** The project includes a `.env` file with development defaults.

### Optional (for full functionality):

```bash
# Add to .env file for full features:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Note:** 
- The app will show warnings if Supabase isn't configured, but it will still run for basic testing
- Database features will use in-memory fallback mode
- Calendar features will work with local storage

---

## What to Expect When Starting

1. **First 10-30 seconds**: Servers are compiling and starting
2. **You'll see**: Terminal output showing Vite (frontend) and Node.js (backend) starting
3. **When ready**: Open http://localhost:8080 in your browser
4. **If you see errors**: Check the terminal output for specific error messages

---

## Troubleshooting

### Port Already in Use
If port 8080 or 3001 is already in use:
```bash
# Kill processes on those ports
lsof -ti:8080 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

### Dependencies Not Installed
```bash
pnpm install
```

### Module Import Errors
The app uses a complex module system. If you see import errors:
1. Check the terminal for specific error messages
2. Try running `pnpm run validate:modules` to check module health

### Slow Startup
- First startup can take 30-60 seconds (normal)
- Subsequent startups are faster (5-10 seconds)

---

## Development Workflow

1. **Start the app**: `pnpm run dev:all`
2. **Make changes**: Edit files in `client/` for frontend, `server/` for backend
3. **See changes**: Most changes hot-reload automatically
4. **Check console**: Browser DevTools (F12) for frontend errors
5. **Check terminal**: For backend errors

---

## Project Structure

- `index.html` - HTML entry point with root DOM element
- `client/` - React frontend application
  - `index.tsx` - React bootstrap and root initialization
  - `App.tsx` - Main application component with all providers
  - `pages/` - Page components (BackboardPage, AuthPage, etc.)
  - `components/` - Reusable UI components
  - `modules/` - **Standalone modules assembled into the OS:**
    - Culinary Engine
    - Pastry Module
    - Schedule Module
    - EchoAurum (Financial)
    - EchoEventStudio
    - EchoLayout
    - MaestroBQT
    - PurchasingReceiving
    - And many more...
- `server/` - Express backend API
- `shared/` - Shared TypeScript types and utilities
- `vite.config.ts` - Vite configuration with module import resolver

---

## Next Steps

Once the app is running:
1. Open http://localhost:8080 in your browser
2. Explore the different modules in the sidebar
3. Check out the various features (Dashboard, Culinary, Pastry, Schedule, etc.)
4. Start developing!

---

## Need Help?

- Check the terminal output for error messages
- Look at browser console (F12 → Console tab)
- Review module-specific README files in `client/modules/[ModuleName]/README.md`

**Happy coding! 🎉**
