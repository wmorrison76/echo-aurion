/** * Window type extensions for Builder.io widget registration */ declare global {
  interface Window {
    LUCCCA?: { registerWidget?: (name: string, component: any) => void };
  }
}
export {};
