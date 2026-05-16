import React from "react";
import AdvancedAnalyticsDashboard from "@/components/analytics/AdvancedAnalyticsDashboard";
import AccessibleEchoVoice from "@/components/echo/AccessibleEchoVoice";

const LaborReportsDashboard = React.lazy(() =>
  import("@/components/reports/LaborReportsDashboard"),
);
const EmployeeOnboarding = React.lazy(() =>
  import("@/components/onboarding/EmployeeOnboarding"),
);
const InteractiveHelpGuide = React.lazy(() =>
  import("@/components/help/InteractiveHelpGuide"),
);

export const COMPONENT_REGISTRY = {
  AdvancedAnalyticsDashboard: {
    component: AdvancedAnalyticsDashboard,
    category: "Analytics",
    description: "Advanced real-time analytics with anomaly detection",
    icon: "📊",
  },
  AccessibleEchoVoice: {
    component: AccessibleEchoVoice,
    category: "AI Assistant",
    description: "WCAG-compliant voice interface with multi-language support",
    icon: "🎙️",
  },
  LaborReportsDashboard: {
    component: LaborReportsDashboard,
    category: "Reports",
    description: "Comprehensive labor analysis and reporting",
    icon: "📑",
    lazy: true,
  },
  EmployeeOnboarding: {
    component: EmployeeOnboarding,
    category: "HR",
    description: "Complete employee onboarding with resume parsing",
    icon: "👤",
    lazy: true,
  },
  InteractiveHelpGuide: {
    component: InteractiveHelpGuide,
    category: "Help",
    description: "Interactive step-by-step help system with guided tours",
    icon: "❓",
    lazy: true,
  },
} as const;

export type ComponentKey = keyof typeof COMPONENT_REGISTRY;

export function getComponent(key: ComponentKey) {
  const registry = COMPONENT_REGISTRY[key];
  if (!registry) {
    throw new Error(`Component not found: ${key}`);
  }
  return registry.component;
}

export function getComponentsByCategory(category: string) {
  return Object.entries(COMPONENT_REGISTRY)
    .filter(([, config]) => config.category === category)
    .map(([key, config]) => ({ key, ...config }));
}

export function getCategories() {
  const categories = new Set(
    Object.values(COMPONENT_REGISTRY).map((c) => c.category),
  );
  return Array.from(categories).sort();
}

export function renderComponent(
  key: ComponentKey,
  props: Record<string, any> = {},
) {
  const registry = COMPONENT_REGISTRY[key];
  if (!registry) {
    return React.createElement("div", null, `Component not found: ${key}`);
  }

  const Component = registry.component;
  if (registry.lazy) {
    return React.createElement(
      React.Suspense,
      {
        fallback: React.createElement("div", { className: "p-4 text-center" }, "Loading..."),
      },
      React.createElement(Component as any, props),
    );
  }

  return React.createElement(Component as any, props);
}

export function registerComponentsWithBuilder() {
  const components = Object.entries(COMPONENT_REGISTRY);
  components.forEach(([key, config]) => {
    if (typeof window !== "undefined" && (window as any).BuilderIO) {
      (window as any).BuilderIO.registerComponent(config.component, {
        name: key,
        description: config.description,
        inputs: [
          {
            name: "title",
            type: "string",
            defaultValue: key,
          },
        ],
      });
    }
  });
}
