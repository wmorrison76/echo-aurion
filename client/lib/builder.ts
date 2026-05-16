import { builder as sdkBuilder } from "@builder.io/sdk";
import type { ComponentType } from "react";
import { register } from "@builder.io/sdk-react";
import PanelFrame from "@/components/echo/PanelFrame";
import SlotLayout from "@/components/echo/SlotLayout";

declare global {
  // eslint-disable-next-line no-var
  var __echoBuilderInitialized: boolean | undefined;
}

if (!globalThis.__echoBuilderInitialized) {
  const publicKey =
    import.meta.env.NEXT_PUBLIC_BUILDER_PUBLIC_KEY ??
    import.meta.env.VITE_BUILDER_PUBLIC_KEY ??
    "";
  if (publicKey) {
    sdkBuilder.init(publicKey);
  }

  const registerComponent = register as unknown as (
    component: ComponentType<any>,
    options: Record<string, any>,
  ) => void;

  registerComponent(PanelFrame, {
    name: "PanelFrame",
    description: "EchoCoder chrome frame for Builder blocks",
    inputs: [
      { name: "title", type: "text", defaultValue: "Echo Panel" },
      { name: "subtitle", type: "text", defaultValue: "EchoCoder Engine" },
      { name: "status", type: "text", defaultValue: "Preview" },
      { name: "chrome", type: "boolean", defaultValue: true },
      { name: "children", type: "uiBlocks", defaultValue: [] },
    ],
  });

  registerComponent(SlotLayout, {
    name: "SlotLayout",
    description: "Slot-aware application shell wiring Builder content into EchoCoder layout",
    inputs: [
      { name: "header", type: "uiBlocks", defaultValue: [] },
      { name: "sidebar", type: "uiBlocks", defaultValue: [] },
      { name: "toolbar", type: "uiBlocks", defaultValue: [] },
      { name: "main", type: "uiBlocks", defaultValue: [] },
    ],
  });

  globalThis.__echoBuilderInitialized = true;
}

export { sdkBuilder as builder };
