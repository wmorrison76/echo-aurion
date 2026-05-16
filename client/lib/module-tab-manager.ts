/**
 * Module Tab Manager
 * Manages which tab should be active when a module opens
 */

type ModuleTabStore = {
  [moduleName: string]: string | undefined;
};

const tabStore: ModuleTabStore = {};

/**
 * Set the active tab for a module
 */
export function setModuleTab(moduleName: string, tab: string) {
  tabStore[moduleName] = tab;
  // iter266 · Notify already-mounted modules so they can switch tabs without remount.
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("module-tab:set", { detail: { moduleName, tab } }),
    );
  }
}

/**
 * Get and clear the active tab for a module
 * Clears the tab after retrieving it so it's only used once
 */
export function getAndClearModuleTab(moduleName: string): string | undefined {
  const tab = tabStore[moduleName];
  delete tabStore[moduleName];
  return tab;
}

/**
 * Clear a module's tab
 */
export function clearModuleTab(moduleName: string) {
  delete tabStore[moduleName];
}

/**
 * Clear all stored tabs
 */
export function clearAllModuleTabs() {
  Object.keys(tabStore).forEach((key) => {
    delete tabStore[key];
  });
}
