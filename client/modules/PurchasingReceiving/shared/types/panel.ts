/** * Floating Panel Integration Types * * This module defines the standard interfaces for integrating modules into a * floating panel ecosystem. All modules (Waste, IoT, Purchasing) should * adhere to these contracts for consistent behavior and inter-module communication. */ /** * Configuration for a floating panel module */
export interface PanelConfig {
  /** Unique identifier for the panel instance */ panelId: string;
  /** Organization ID for multi-tenancy */ organizationId: string;
  /** Selected outlet ID for context */ outletId: string;
  /** Custom panel title (optional, uses module default if not provided) */ title?: string;
  /** Whether the panel can be minimized */ canMinimize?: boolean;
  /** Whether the panel can be closed */ canClose?: boolean;
  /** Custom CSS class names */ className?: string;
} /** * Events emitted by panels for inter-module communication */
export interface PanelEvent {
  /** Type of event */ type: string;
  /** Source module that emitted the event */ source: ModuleType;
  /** Panel instance ID */ panelId: string;
  /** Event payload (module-specific data) */ payload: Record<string, any>;
  /** Timestamp when event occurred */ timestamp: Date;
} /** * Data change event for when module state changes */
export interface DataChangeEvent extends PanelEvent {
  type: "dataChange";
  payload: {
    /** What data changed (e.g., 'waste-log-created', 'device-status-updated') */ changeType: string;
    /** The changed data */ data: Record<string, any>;
    /** Operation that caused the change (create, update, delete) */ operation:
      | "create"
      | "update"
      | "delete";
  };
} /** * Selection event for when user selects items from a module */
export interface SelectionEvent extends PanelEvent {
  type: "selection";
  payload: {
    /** IDs of selected items */ selectedIds: string[];
    /** Type of items selected */ itemType: string;
    /** Full item objects if available */ items?: Record<string, any>[];
  };
} /** * Action request event for requesting action from another module */
export interface ActionRequestEvent extends PanelEvent {
  type: "actionRequest";
  payload: {
    /** Action name to perform */ action: string;
    /** Action parameters */ params: Record<string, any>;
    /** Unique request ID for tracking responses */ requestId: string;
  };
} /** * Error event when module encounters an error */
export interface ErrorEvent extends PanelEvent {
  type: "error";
  payload: {
    /** Error code */ code: string;
    /** Human-readable error message */ message: string;
    /** Error details */ details?: Record<string, any>;
    /** Severity level */ severity: "warning" | "error" | "critical";
  };
} /** Union type of all panel events */
export type AnyPanelEvent =
  | DataChangeEvent
  | SelectionEvent
  | ActionRequestEvent
  | ErrorEvent; /** * Callback function for handling panel events */
export type PanelEventHandler = (
  event: AnyPanelEvent,
) => void | Promise<void>; /** * Callback function for when panel is closed */
export type PanelCloseHandler = (
  panelId: string,
) => void; /** * Callback function for when panel is minimized */
export type PanelMinimizeHandler = (
  panelId: string,
) => void; /** * Module types available in the ecosystem */
export type ModuleType =
  | "waste"
  | "iot"
  | "purchasing"
  | "receiving"
  | "inventory"
  | "ledger"; /** * Module metadata for registration and discovery */
export interface ModuleMetadata {
  /** Unique module identifier */ id: ModuleType;
  /** Human-readable module name */ name: string;
  /** Module description */ description: string;
  /** Module version */ version: string;
  /** Events this module can emit */ emitEvents: Array<
    "dataChange" | "selection" | "actionRequest" | "error"
  >;
  /** Events this module can listen for */ listenEvents: Array<
    "dataChange" | "selection" | "actionRequest" | "error"
  >;
  /** Supported actions this module can perform */ supportedActions: string[];
  /** Roles that can use this module */ requiredRoles?: string[];
  /** Dependencies on other modules */ dependencies?: ModuleType[];
} /** * Callback handlers for panel lifecycle and events */
export interface PanelCallbacks {
  /** Fired when panel data changes */ onDataChange?: PanelEventHandler;
  /** Fired when user selects items in panel */ onSelection?: PanelEventHandler;
  /** Fired when panel receives action request */ onActionRequest?: PanelEventHandler;
  /** Fired when panel encounters an error */ onError?: PanelEventHandler;
  /** Fired when panel is closed */ onClose?: PanelCloseHandler;
  /** Fired when panel is minimized */ onMinimize?: PanelMinimizeHandler;
  /** Generic event handler for all events */ onEvent?: PanelEventHandler;
} /** * Combined configuration for initializing a panel */
export interface PanelInitConfig extends PanelConfig, PanelCallbacks {
  /** Event emitter function for sending events to other modules */ emit?: (
    event: AnyPanelEvent,
  ) => void;
} /** * Panel state management hook interface */
export interface UsePanelState {
  /** Panel configuration */ config: PanelConfig;
  /** Loading state */ isLoading: boolean;
  /** Error state */ error: Error | null;
  /** Whether panel is minimized */ isMinimized: boolean;
  /** Update configuration */ updateConfig: (
    config: Partial<PanelConfig>,
  ) => void;
  /** Set loading state */ setLoading: (loading: boolean) => void;
  /** Set error */ setError: (error: Error | null) => void;
  /** Emit event */ emit: (event: AnyPanelEvent) => void;
  /** Close panel */ close: () => void;
  /** Minimize panel */ minimize: () => void;
}
