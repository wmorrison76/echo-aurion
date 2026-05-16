// iter229 · Electron preload — safely exposes brand info, version, and the
// native multi-window IPC bridge (D14) to the renderer.
//
// Used by:
//   - the in-app "About" dialog (so we can re-brand without re-building)
//   - FloatingPanel "Pop Out" button (D14): detach a panel into its own
//     OS window, drag to a second monitor, get a true native window
const { contextBridge, ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");

let brand = {
  brand: "LUCCCA",
  productName: "LUCCCA ECW",
  primaryColor: "#c8a97e",
};
try {
  const brandPath = process.resourcesPath
    ? path.join(process.resourcesPath, "brand.json")
    : path.join(__dirname, "brand.json");
  if (fs.existsSync(brandPath)) {
    brand = { ...brand, ...JSON.parse(fs.readFileSync(brandPath, "utf8")) };
  }
} catch (_e) {
  /* brand.json missing — use defaults */
}

contextBridge.exposeInMainWorld("__LUCCCA_NATIVE__", {
  brand,
  isElectron: true,
  platform: process.platform,

  // D14 · Pop a panel out into its own native OS window. The renderer
  // calls this from FloatingPanel's pop-out button. The detached window
  // loads the same app URL with `?detach=<panelId>` so the React app
  // can render only that panel in single-panel mode.
  detachPanel: (panelId, opts) =>
    ipcRenderer.invoke("panel:detach", panelId, opts || {}),

  // Multi-monitor info — useful for "send this panel to second monitor"
  // affordances. Returns an array of {id, bounds, primary, scaleFactor}.
  getDisplays: () => ipcRenderer.invoke("display:list"),

  // Close a detached panel window from inside that window (the React
  // single-panel view binds this to a "back to main" / X button).
  closeDetached: () => ipcRenderer.invoke("panel:close-detached"),

  // iter265 · Desktop integration P1 enhancements
  notify: (opts) => ipcRenderer.invoke("os:notify", opts),
  print: (html, opts) => ipcRenderer.invoke("os:print", { html, opts }),
  openFile: (path) => ipcRenderer.invoke("os:open-file", path),
  showSaveDialog: (opts) => ipcRenderer.invoke("os:save-dialog", opts),

  // Folder watcher — fires callback per file path added to `path`.
  // Returns an unsubscribe function.
  watchFolder: (path, callback) => {
    const channel = `folder-watch:${path}`;
    const listener = (_event, filePath) => callback(filePath);
    ipcRenderer.on(channel, listener);
    ipcRenderer.invoke("folder:watch", path);
    return () => {
      ipcRenderer.removeListener(channel, listener);
      ipcRenderer.invoke("folder:unwatch", path);
    };
  },

  // OS-level global hotkey — returns unsubscribe function.
  registerHotkey: (accelerator, callback) => {
    const channel = `hotkey:${accelerator}`;
    const listener = () => callback();
    ipcRenderer.on(channel, listener);
    ipcRenderer.invoke("hotkey:register", accelerator);
    return () => {
      ipcRenderer.removeListener(channel, listener);
      ipcRenderer.invoke("hotkey:unregister", accelerator);
    };
  },
});
