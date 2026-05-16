/**
 * PERFORMANCE: Lazy-load Builder SDK only when needed
 * Reduces initial bundle by ~150KB by dynamically importing
 */

let builderInitialized = false;

export async function initializeBuilder() {
  if (builderInitialized) {
    return;
  }

  try {
    const { builder } = await import("@builder.io/sdk");
    const { register } = await import("@builder.io/sdk-react");

    const publicKey =
      import.meta.env.VITE_BUILDER_PUBLIC_KEY ||
      import.meta.env.NEXT_PUBLIC_BUILDER_PUBLIC_KEY ||
      "";

    if (publicKey) {
      builder.init(publicKey);
      
      // Register custom components only when Builder is initialized
      const { PanelFrame } = await import("@/components/echo/PanelFrame");
      const { SlotLayout } = await import("@/components/echo/SlotLayout");

      register(PanelFrame, {
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

      register(SlotLayout, {
        name: "SlotLayout",
        description: "Slot-aware application shell",
        inputs: [
          { name: "header", type: "uiBlocks", defaultValue: [] },
          { name: "sidebar", type: "uiBlocks", defaultValue: [] },
          { name: "toolbar", type: "uiBlocks", defaultValue: [] },
          { name: "main", type: "uiBlocks", defaultValue: [] },
        ],
      });

      builderInitialized = true;
    }
  } catch (error) {
    console.warn("Builder initialization failed:", error);
  }
}

export async function getBuilder() {
  await initializeBuilder();
  const { builder } = await import("@builder.io/sdk");
  return builder;
}

export async function isBuilderAvailable(): Promise<boolean> {
  try {
    const publicKey =
      import.meta.env.VITE_BUILDER_PUBLIC_KEY ||
      import.meta.env.NEXT_PUBLIC_BUILDER_PUBLIC_KEY;
    return !!publicKey;
  } catch {
    return false;
  }
}
