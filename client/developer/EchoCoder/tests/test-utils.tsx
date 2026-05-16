import { ReactElement, ReactNode } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

/**
 * Custom render function that wraps components with necessary providers
 */
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  initialRoute?: string;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    initialRoute = "/",
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  // Create a fresh QueryClient for each test
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

/**
 * Mock data generators for testing
 */
export const mockData = {
  createMockFile: (overrides = {}) => ({
    path: "/src/example.tsx",
    content: "export const Example = () => null;",
    type: "typescript" as const,
    description: "Example component",
    ...overrides,
  }),

  createMockConversationMessage: (overrides = {}) => ({
    role: "user" as const,
    content: "Create a todo app",
    ...overrides,
  }),

  createMockDialogUnderstanding: (overrides = {}) => ({
    coreIdea: "A task management application",
    targetUsers: "Busy professionals",
    mainProblem: "Organizing tasks efficiently",
    keyFeatures: ["Add tasks", "Mark complete", "Delete tasks"],
    dataEntities: ["Task", "User"],
    integrations: [],
    constraints: [],
    complexity: "simple" as const,
    completenessScore: 85,
    ...overrides,
  }),

  createMockGenerationResult: (overrides = {}) => ({
    success: true,
    files: [mockData.createMockFile()],
    summary: "Generated a complete task management system",
    architecture: "React + TypeScript + Supabase",
    dataFlow: "User -> UI -> Service -> API -> Database",
    warnings: [],
    estimatedComplexity: "moderate" as const,
    ...overrides,
  }),
};

/**
 * Mock API responses
 */
export const mockApis = {
  successResponse: <T,>(data: T) => Promise.resolve(
    new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  ),

  errorResponse: (message: string, status = 400) =>
    Promise.resolve(
      new Response(JSON.stringify({ success: false, error: message }), {
        status,
        headers: { "Content-Type": "application/json" },
      })
    ),
};

// Re-export testing library utilities
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
