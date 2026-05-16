// iter209 · Electron desktop wrapper.
//
// D14: adds native multi-window detach. A panel inside the app can be
// "popped out" into its own OS window via the IPC bridge in preload.js.
// The detached window loads the same app URL with `?detach=<panelId>`
// so the React app renders only that panel.
//
// Run locally: `yarn electron:dev`
// Package:     `yarn build && yarn electron:pack:{mac,win,linux}`
const { app, BrowserWindow, Menu, ipcMain, screen, shell } = require("electron");
const path = require("path");

const DEV_URL = process.env.LUCCCA_DEV_URL || "http://localhost:3000";
const PROD_INDEX = path.join(__dirname, "..", "dist", "client", "index.html");

// Track open detached windows by panelId so re-detaching the same panel
// just focuses the existing window instead of spawning a duplicate.
const detachedWindows = new Map(); // panelId → BrowserWindow

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: "#050812",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Open external links in the default browser instead of a new Electron window
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url);
    return { action: "deny" };
  });

  if (process.env.NODE_ENV === "development") {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(PROD_INDEX);
  }
}

// ─── D14 · Detach a panel into its own native OS window ────────────────
function createDetachedWindow(panelId, opts) {
  const existing = detachedWindows.get(panelId);
  if (existing && !existing.isDestroyed()) {
    existing.focus();
    return { ok: true, panelId, reused: true };
  }

  const width  = clampInt(opts.width,  400, 4000, 800);
  const height = clampInt(opts.height, 300, 3000, 600);

  // If caller asked to position on a specific display (multi-monitor
  // affordance), translate displayId → x/y on that display.
  let x, y;
  if (opts.displayId) {
    const target = screen.getAllDisplays().find((d) => d.id === opts.displayId);
    if (target) {
      x = target.bounds.x + Math.max(0, Math.floor((target.bounds.width  - width)  / 2));
      y = target.bounds.y + Math.max(0, Math.floor((target.bounds.height - height) / 2));
    }
  }

  const win = new BrowserWindow({
    width, height, x, y,
    minWidth: 360, minHeight: 240,
    backgroundColor: "#050812",
    title: opts.title || `LUCCCA · ${panelId}`,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
      // Detached windows share the same partition as the main window so
      // they share the auth/session cookie + IndexedDB queue.
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url);
    return { action: "deny" };
  });

  if (process.env.NODE_ENV === "development") {
    const u = new URL(DEV_URL);
    u.searchParams.set("detach", panelId);
    win.loadURL(u.toString());
  } else {
    win.loadFile(PROD_INDEX, { search: `detach=${encodeURIComponent(panelId)}` });
  }

  detachedWindows.set(panelId, win);
  win.on("closed", () => {
    detachedWindows.delete(panelId);
  });

  return { ok: true, panelId, reused: false };
}

function clampInt(v, lo, hi, dflt) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(hi, Math.max(lo, n));
}

ipcMain.handle("panel:detach", (_event, panelId, opts) => {
  if (!panelId || typeof panelId !== "string") {
    return { ok: false, error: "panelId required" };
  }
  return createDetachedWindow(panelId, opts || {});
});

ipcMain.handle("display:list", () => {
  const primary = screen.getPrimaryDisplay();
  return screen.getAllDisplays().map((d) => ({
    id: d.id,
    label: d.label || `Display ${d.id}`,
    bounds: d.bounds,
    workArea: d.workArea,
    scaleFactor: d.scaleFactor,
    primary: d.id === primary.id,
  }));
});

ipcMain.handle("panel:close-detached", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.close();
    return { ok: true };
  }
  return { ok: false, error: "no window for sender" };
});

// ─── iter265 · Desktop integration P1 enhancements ──────────────────────────
const { Notification, globalShortcut, dialog } = require("electron");
const fs = require("fs");

ipcMain.handle("os:notify", (_event, opts) => {
  if (!Notification.isSupported()) return { ok: false, reason: "not supported" };
  const n = new Notification({
    title: opts?.title || "LUCCCA",
    body: opts?.body || "",
    urgency: opts?.urgency || "normal",
  });
  n.show();
  return { ok: true };
});

ipcMain.handle("os:print", async (event, payload) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { ok: false, reason: "no window" };
  if (payload?.html) {
    // Open a hidden printable window so we don't disrupt the main UI
    const printWin = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
    await printWin.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(payload.html));
    printWin.webContents.print(payload.opts || { silent: false, printBackground: true }, () => {
      printWin.destroy();
    });
    return { ok: true };
  }
  return { ok: false, reason: "no html" };
});

ipcMain.handle("os:open-file", async (_event, filePath) => {
  await shell.openPath(filePath);
  return { ok: true };
});

ipcMain.handle("os:save-dialog", async (event, opts) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const res = await dialog.showSaveDialog(win, opts || {});
  return res.canceled ? null : res.filePath;
});

// Folder watcher — fires `folder-watch:<path>` per file added
const folderWatchers = new Map();
ipcMain.handle("folder:watch", (event, folderPath) => {
  if (folderWatchers.has(folderPath)) return { ok: true, already: true };
  try {
    const watcher = fs.watch(folderPath, { persistent: false }, (eventType, filename) => {
      if (eventType === "rename" && filename) {
        const full = path.join(folderPath, filename);
        // Only emit for added files (not deleted)
        if (fs.existsSync(full)) {
          event.sender.send(`folder-watch:${folderPath}`, full);
        }
      }
    });
    folderWatchers.set(folderPath, watcher);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});
ipcMain.handle("folder:unwatch", (_event, folderPath) => {
  const w = folderWatchers.get(folderPath);
  if (w) {
    w.close();
    folderWatchers.delete(folderPath);
  }
  return { ok: true };
});

// Global hotkey
const hotkeyMap = new Map(); // accelerator -> { senderId, listener }
ipcMain.handle("hotkey:register", (event, accelerator) => {
  if (hotkeyMap.has(accelerator)) return { ok: true, already: true };
  const success = globalShortcut.register(accelerator, () => {
    event.sender.send(`hotkey:${accelerator}`);
  });
  if (success) hotkeyMap.set(accelerator, true);
  return { ok: success };
});
ipcMain.handle("hotkey:unregister", (_event, accelerator) => {
  if (hotkeyMap.has(accelerator)) {
    globalShortcut.unregister(accelerator);
    hotkeyMap.delete(accelerator);
  }
  return { ok: true };
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  for (const w of folderWatchers.values()) w.close();
  folderWatchers.clear();
});

app.whenReady().then(() => {
  createMainWindow();
  // macOS: reopen window on dock click
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });

  // Minimal menu — hide the default Edit/View clutter
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: "appMenu" },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
  ]));
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Exported for unit tests (Node-side); not used by the bundled app.
module.exports = { createDetachedWindow, clampInt };
