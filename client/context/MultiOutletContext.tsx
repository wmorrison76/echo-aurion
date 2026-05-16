/**
 * MultiOutletContext Re-export
 * 
 * PurchasingReceiving components import @/context/MultiOutletContext
 * This file re-exports the actual context from PurchasingReceiving module
 */

export {
  MultiOutletProvider,
  useMultiOutlet,
  type MultiOutletContextType,
  type Outlet,
  type Organization,
  type OutletLocation,
} from "@/modules/PurchasingReceiving/client/context/MultiOutletContext";
