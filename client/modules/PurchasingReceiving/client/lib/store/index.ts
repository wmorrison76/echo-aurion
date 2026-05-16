import { purchasingStore, detectShortages } from "./purchasing";
import {
  inventoryStore,
  QUICK_COUNT_EVENT_NAME,
  INVENTORY_LAYOUT_EVENT_NAME,
} from "./inventory";
import {
  haccpStore,
  HACCP_TASK_EVENT_NAME,
  HACCP_TRAINING_EVENT_NAME,
  HACCP_LOG_EVENT_NAME,
} from "./haccp";
import { accountingStore, FINANCE_CONTROLS_EVENT_NAME } from "./accounting";
import { uiStore } from "./ui";
export * from "./shared";
export { purchasingStore, detectShortages };
export { inventoryStore, QUICK_COUNT_EVENT_NAME, INVENTORY_LAYOUT_EVENT_NAME };
export {
  haccpStore,
  HACCP_TASK_EVENT_NAME,
  HACCP_TRAINING_EVENT_NAME,
  HACCP_LOG_EVENT_NAME,
};
export { accountingStore, FINANCE_CONTROLS_EVENT_NAME };
export { uiStore };
export const Store = {
  ...purchasingStore,
  ...inventoryStore,
  ...haccpStore,
  ...accountingStore,
  ...uiStore,
};
export type { GLGroup, ProductGLMapping } from "./accounting";
export type { HACCPLog } from "@shared/purchasing";
export type {
  PurchaseOrder,
  Receipt,
  Vendor,
  Outlet,
} from "@shared/purchasing";
export type { InventoryItem } from "@shared/inventory"; // Provide a default export to support dynamic imports
export default Store;
