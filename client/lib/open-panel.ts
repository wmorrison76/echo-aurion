/**
 * Open a panel by dispatching a custom event
 * Can be used from any component to open floating panels
 */
export function openPanel(panelId: string, tab?: string, panelProps?: Record<string, any>) {
  const event = new CustomEvent("open-panel", {
    detail: {
      id: panelId,
      ...(tab && { tab }),
      ...(panelProps && Object.keys(panelProps).length > 0 ? { panelProps } : {}),
    },
  });
  window.dispatchEvent(event);
}
