# Archive: Legacy Panel System

This directory contains a backup of the legacy panel system for rollback purposes.

- **PanelHost.legacy.tsx** – Copy of `PanelHost.tsx` (the original monolithic panel host, ~3,600 lines) before switching to `PanelHostIntegrated`.

To roll back: Copy `PanelHost.legacy.tsx` to `../PanelHost.tsx` and update `App.tsx` to import `PanelHost` from `./PanelHost`.
