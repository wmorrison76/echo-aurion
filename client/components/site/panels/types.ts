import { ReactNode } from "react";
import { PanelKey } from "@/lib/panel-registry";

export type PanelId =
  | PanelKey
  | "zaro"
  | "echo"
  | "settings"
  | "dashboard"
  | "network-chat"
  | "chat-settings"
  | "notes"
  | (string & {});

export interface PanelEntry {
  id: PanelId;
  title: string;
  panelKey?: string; // For i18n translation of panel titles
  element?: ReactNode;
  /** For registry panels: component and props so Panel can inject onClose at render time */
  Component?: React.ComponentType<any>;
  panelProps?: Record<string, any>;
  defaultWidth: number;
  defaultHeight: number;
  icon?: string;
  isImageIcon?: boolean;
}

export interface PanelState {
  entry: PanelEntry;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMinimized: boolean;
  isExpanded: boolean;
  expandedSize?: { width: number; height: number };
  expandedPosition?: { x: number; y: number };
  preExpandedSize?: { width: number; height: number };
  preExpandedPosition?: { x: number; y: number };
  zIndex: number;
  panelProps?: Record<string, any>;
}
