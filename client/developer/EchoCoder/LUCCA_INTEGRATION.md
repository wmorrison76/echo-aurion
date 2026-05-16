# LUCCA Integration Guide

## Overview

This document describes how the LUCCA project has been integrated with EchoCoder to create a unified development platform.

**Two versions of LUCCA:**
1. **Builder.io/EchoCoder** - The AI-powered development system
2. **Imported LUCCA** - Your complete hospitality application

**Integration Result:** Both systems work together seamlessly.

---

## Architecture

### Main Dashboard (/)
- **Primary App**: Imported LUCCA project
- **Entry Point**: `client/pages/LuccaDashboard.tsx`
- **Purpose**: Main user-facing interface for hospitality operations
- **Features**: Board, Dashboard, Calendar, Scheduler, Sommelier, Mixology, etc.

### Development Studio (/studio)
- **Backend Tools**: EchoCoder with:
  - Project Scaffolder
  - Code Analyzer
  - Performance Optimizer
  - Configuration Manager
- **Automation**: Task queuing and execution
- **UI Design**: Blueprint and Coder modes
- **Purpose**: Developer workspace for code generation and optimization

### Settings (/settings)
- **Project Import**: Upload and import new projects
- **Tool Configuration**: Enable/disable EchoCoder and other tools
- **File Protection**: Automatically protects EchoCoder system files
- **Purpose**: Administrative and configuration interface

### Alternate Dashboard (/echo-dashboard)
- **Original Board**: EchoCoder's original dashboard (for reference)
- **Purpose**: Backup/reference view of original system
- **Not Primary**: Hidden by default, accessible via direct URL

---

## Protected Files

EchoCoder automatically protects these files from being overwritten during imports:

### Core Components
- `client/components/echo/` - Orb, visualizations, effects
- `client/components/studio/` - Code editor, planning tools
- `client/components/site/` - Header, menus, launcher
- `client/core/ai3/` - AI reasoning system

### Pages & Tools
- `client/pages/Studio.tsx` - Development environment
- `client/pages/Settings.tsx` - Configuration
- `client/pages/EchoControls.tsx` - Orb controls
- `client/pages/Generated.tsx` - Automation UI
- `client/pages/AutomationPreview.tsx` - Task preview

### Server & Libraries
- `server/routes/automation.ts`, `echo.ts`, `guard.ts`, `builder.ts`
- `client/lib/automation.ts`, `guard-client.ts`, `planner-scaffold.ts`
- `automation/runner.ts` - Task execution engine
- `cognition/` - AI reasoning system
- `shared/` - Shared utilities

### Configuration
- `tsconfig.json`, `vite.config.ts`
- `package.json`, `pnpm-lock.yaml`
- `tailwind.config.ts`, `postcss.config.js`

---

## File Import Process

When importing a project:

1. **Scan**: Analyzes all files and their connections
2. **Filter**: Removes excluded files (node_modules, .git, etc.)
3. **Protect**: Excludes all EchoCoder system files
4. **Categorize**: Identifies connected vs. unused files
5. **Archive**: Creates metadata of unused files
6. **Import**: Copies safe files to the project

### User Experience

1. Open Settings (⚙️ icon)
2. Go to "Project Import" tab
3. Select project folder
4. Review connected vs. archived files
5. Adjust selection if needed
6. Click "Import Connected Files"
7. Progress bar shows status
8. Imported files are now part of your LUCCA project

---

## Routing Structure

```
/ (Main)
├── LuccaDashboard.tsx (Imported LUCCA project)
│   ├── Board.jsx (Dashboard & projects)
│   ├── Calendar (Scheduling)
│   ├── Scheduler (Staff management)
│   ├── Sommelier (Wine pairing)
│   ├── Mixology (Cocktail mixing)
│   └── ... other LUCCA modules

/studio (Development)
├── Studio.tsx (Main workspace)
├── EchoCoderPanel (Backend tools)
├── CodeExplorer (File management)
├── Planner (Project planning)
└── Design (UI editor)

/settings (Configuration)
├── Project Import (Upload projects)
├── Tools & Integrations (EchoCoder config)
├── Automation Engine
└── File Importer

/echo-dashboard (Alternate)
└── Board.tsx (Original EchoCoder board)

/zaro (Admin)
└── ZaroPanel (Guardian system)

/generated (Automation)
└── Generated.tsx (Task list)

/automation/:slug
└── AutomationPreview.tsx (Task details)

/echo-controls (Orb settings)
└── EchoControls.tsx (Orb configuration)
```

---

## Configuration Management

### Protected Files List
Located in: `shared/echocoder-protected-files.ts`

Add new protected paths:
```typescript
export const ECHOCODER_PROTECTED_PATHS = [
  /my\/critical\/file\.ts/,
  /another\/protected\/path\//,
];
```

### File Scanner Rules
Located in: `shared/file-scanner.ts`

Modify scoring, patterns, or thresholds:
```typescript
export function detectConnectedFiles(
  files: FileEntry[],
  fileContentMap: Map<string, string>,
  threshold: number = 30  // ← Adjust this
)
```

---

## Development Workflow

### For LUCCA Feature Development
1. Open imported LUCCA dashboard at `/`
2. Test features and functionality
3. Make changes to LUCCA components
4. Use Studio (/studio) for code generation
5. Use EchoCoder tools for optimization

### For EchoCoder Tool Development
1. Open Studio at `/studio`
2. Use available tools and features
3. Test code generation
4. View results in dashboard
5. Use Settings for configuration

### For System Administration
1. Open Settings at `/settings`
2. Manage project imports
3. Configure tools and integrations
4. Monitor automation engine
5. Review file imports and archives

---

## Troubleshooting

### Protected File Conflicts
**Problem**: Can't modify a protected file
**Solution**: Unprotect in `shared/echocoder-protected-files.ts` if needed

### Import Not Showing Files
**Problem**: Folder selected but no files appear
**Solution**: 
- Check folder size isn't too large
- Verify file types are supported
- Review exclude patterns
- Try smaller folder first

### LUCCA Dashboard Not Loading
**Problem**: Imported project doesn't display
**Solution**:
- Check import completed successfully
- Verify files were imported to correct location
- Check browser console for errors
- Review file paths in LuccaDashboard.tsx

### EchoCoder Tools Not Accessible
**Problem**: Studio or Settings missing
**Solution**:
- Ensure EchoCoder enabled in Settings
- Clear browser cache
- Check TypeScript compilation
- Review router configuration

---

## Future Enhancements

1. **Module System**: Load/unload LUCCA modules dynamically
2. **Builder.io Integration**: Import Builder.io modules and components
3. **Dual Dashboard**: Switch between LUCCA and EchoCoder easily
4. **File Sync**: Keep LUCCA and EchoCoder in sync
5. **Custom Protection Rules**: User-defined protected paths
6. **Import History**: Manage and rollback imports
7. **Conflict Resolution**: Smart handling of file conflicts
8. **Performance Monitoring**: Track system performance

---

## File Organization

```
project/
├── client/
│   ├── components/
│   │   ├── echo/           ← EchoCoder protected
│   │   ├── studio/         ← EchoCoder protected
│   │   ├── site/           ← Mixed
│   │   └── ui/             ← Shared UI
│   ├── pages/
│   │   ├── Studio.tsx      ← EchoCoder protected
│   │   ├── Settings.tsx    ← EchoCoder protected
│   │   ├── Board.tsx       ← Original dashboard
│   │   ├── LuccaDashboard.tsx ← New integrated dashboard
│   │   └── ... others
│   ├── lib/                ← EchoCoder protected
│   ├── core/               ← EchoCoder protected
│   └── App.tsx             ← EchoCoder protected
├── server/
│   ├── routes/             ← EchoCoder protected
│   └── index.ts            ← EchoCoder protected
├── shared/                 ← EchoCoder protected
├── automation/             ← EchoCoder protected
├── cognition/              ← EchoCoder protected
└── ... other directories
```

---

## Important Notes

1. **Always take snapshots** before major changes
2. **Protected files cannot be imported** to avoid breaking EchoCoder
3. **Imported projects replace non-protected files only**
4. **Archive keeps metadata of excluded files** for recovery
5. **Both systems remain functional** after integration

---

## Support & Questions

For issues or questions:
1. Check QUICKSTART_PROJECT_IMPORT.md
2. Review PROJECT_IMPORT_SUMMARY.md
3. Check Settings page documentation
4. Review protected files list
5. Inspect browser console for errors

---

**Version**: 1.0.0
**Status**: Integrated & Ready ✅
**Last Updated**: 2024

