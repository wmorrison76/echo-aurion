// SECURITY: All OpenAI calls are proxied through /api/openai endpoints
// The API key is NEVER exposed to the client
import { DialogUnderstanding } from "./RealAIConversationService";
import {
  generateCode,
  textCompletion,
  generateCodeStream,
} from "./secureOpenAIService";

export interface GeneratedFile {
  path: string;
  content: string;
  type: "typescript" | "sql" | "json" | "markdown";
  description: string;
}

export interface GenerationResult {
  success: boolean;
  files: GeneratedFile[];
  summary: string;
  architecture: string;
  dataFlow: string;
  warnings?: string[];
  estimatedComplexity: "simple" | "moderate" | "complex";
}

export class CodeGenerationEngine {
  constructor() {
    // AI features are available through /api/openai endpoints
    // No client-side API key needed
  }

  async generateCompleteSystem(
    understanding: DialogUnderstanding,
  ): Promise<GenerationResult> {
    try {
      // Step 1: Generate database schema
      const databaseSchema = await this.generateDatabaseSchema(understanding);

      // Step 2: Generate API routes
      const apiRoutes = await this.generateAPIRoutes(
        understanding,
        databaseSchema,
      );

      // Step 3: Generate React components
      const components = await this.generateComponents(understanding);

      // Step 4: Generate configuration files
      const configs = await this.generateConfigs(understanding);

      // Step 5: Generate documentation
      const documentation = await this.generateDocumentation(
        understanding,
        databaseSchema,
        apiRoutes,
        components,
      );

      // Compile all files
      const files: GeneratedFile[] = [
        databaseSchema,
        ...apiRoutes,
        ...components,
        ...configs,
        documentation,
      ];

      // Generate architecture overview
      const architecture = this.generateArchitectureOverview(
        understanding,
        files,
      );
      const dataFlow = this.generateDataFlow(understanding, apiRoutes);

      return {
        success: true,
        files,
        summary: this.generateSummary(understanding, files),
        architecture,
        dataFlow,
        estimatedComplexity: understanding.complexity,
      };
    } catch (error) {
      console.error("Code generation failed:", error);
      throw error;
    }
  }

  private async generateDatabaseSchema(
    understanding: DialogUnderstanding,
  ): Promise<GeneratedFile> {
    const prompt = this.buildDatabasePrompt(understanding);

    const schema = await this.callOpenAI(
      prompt,
      "You are a PostgreSQL database architect. Generate a production-ready schema.",
    );

    return {
      path: "lib/supabase/generated-schema.sql",
      content: schema,
      type: "sql",
      description: `PostgreSQL schema for ${understanding.coreIdea}`,
    };
  }

  private async generateAPIRoutes(
    understanding: DialogUnderstanding,
    databaseSchema: GeneratedFile,
  ): Promise<GeneratedFile[]> {
    const entities = understanding.dataEntities;
    const routes: GeneratedFile[] = [];

    for (const entity of entities) {
      const prompt = this.buildAPIRoutePrompt(
        understanding,
        entity,
        databaseSchema.content,
      );

      const routeCode = await this.callOpenAI(
        prompt,
        "You are an Express.js API expert. Generate a complete, production-ready route handler with full CRUD operations, error handling, and type safety.",
      );

      routes.push({
        path: `server/routes/generated-${entity.toLowerCase().replace(/\s+/g, "-")}.ts`,
        content: routeCode,
        type: "typescript",
        description: `REST API routes for ${entity} management`,
      });
    }

    return routes;
  }

  private async generateComponents(
    understanding: DialogUnderstanding,
  ): Promise<GeneratedFile[]> {
    const features = understanding.keyFeatures;
    const components: GeneratedFile[] = [];

    // Generate main layout component
    const mainLayout = await this.callOpenAI(
      this.buildMainLayoutPrompt(understanding),
      "You are a React expert. Generate a beautiful, responsive main layout component using Tailwind CSS and shadcn/ui. Include proper TypeScript types.",
    );

    components.push({
      path: "client/components/generated/MainLayout.tsx",
      content: mainLayout,
      type: "typescript",
      description: "Main application layout component",
    });

    // Generate feature-specific components
    for (const feature of features.slice(0, 5)) {
      // Limit to first 5 features to avoid too many files
      const componentCode = await this.callOpenAI(
        this.buildComponentPrompt(understanding, feature),
        "You are a React expert. Generate a feature-complete, production-ready React component with hooks, proper error handling, and TypeScript types. Use Tailwind CSS and shadcn/ui components.",
      );

      components.push({
        path: `client/components/generated/${this.sanitizeName(feature)}.tsx`,
        content: componentCode,
        type: "typescript",
        description: `Component for ${feature}`,
      });
    }

    return components;
  }

  private async generateConfigs(
    understanding: DialogUnderstanding,
  ): Promise<GeneratedFile[]> {
    const configs: GeneratedFile[] = [];

    // Generate environment template
    const envTemplate = this.generateEnvTemplate(understanding);
    configs.push({
      path: ".env.example",
      content: envTemplate,
      type: "json",
      description: "Environment variables template",
    });

    // Generate package.json extensions
    const packageDeps = await this.callOpenAI(
      this.buildPackageDepsPrompt(understanding),
      'You are a Node.js expert. Generate a JSON object with required npm dependencies for this system. Include versions. Format: { "dependencies": {...}, "devDependencies": {...} }',
    );

    configs.push({
      path: "package-additions.json",
      content: packageDeps,
      type: "json",
      description: "Additional npm dependencies required",
    });

    // Generate TypeScript configuration hints
    const tsConfig = this.generateTSConfig(understanding);
    configs.push({
      path: "tsconfig-additions.json",
      content: tsConfig,
      type: "json",
      description: "TypeScript configuration suggestions",
    });

    return configs;
  }

  private async generateDocumentation(
    understanding: DialogUnderstanding,
    schema: GeneratedFile,
    routes: GeneratedFile[],
    components: GeneratedFile[],
  ): Promise<GeneratedFile> {
    const prompt = `
Generate comprehensive README.md documentation for this system:

Core Idea: ${understanding.coreIdea}
Target Users: ${understanding.targetUsers}
Main Problem: ${understanding.mainProblem}
Key Features: ${understanding.keyFeatures.join(", ")}
Data Entities: ${understanding.dataEntities.join(", ")}
Integrations: ${understanding.integrations.join(", ")}
Complexity: ${understanding.complexity}

Documentation should include:
1. Project Overview
2. Architecture Diagram (ASCII)
3. Database Schema Overview
4. API Endpoints List
5. Component Structure
6. Setup Instructions
7. Development Workflow
8. Deployment Guide
9. Contributing Guidelines
10. Troubleshooting

Be comprehensive but concise. Use proper markdown formatting.
    `;

    const documentation = await this.callOpenAI(
      prompt,
      "You are a technical documentation expert. Generate professional, comprehensive README.md documentation.",
    );

    return {
      path: "README.md",
      content: documentation,
      type: "markdown",
      description: "Comprehensive system documentation",
    };
  }

  private buildDatabasePrompt(understanding: DialogUnderstanding): string {
    return `
Create a PostgreSQL database schema for this system:

Core Idea: ${understanding.coreIdea}
Target Users: ${understanding.targetUsers}
Main Problem: ${understanding.mainProblem}
Key Features: ${understanding.keyFeatures.join(", ")}
Data Entities: ${understanding.dataEntities.join(", ")}
Constraints: ${understanding.constraints.join(", ")}

Requirements:
1. Create tables for all data entities
2. Include appropriate indexes for performance
3. Add triggers for audit logging
4. Implement RLS policies for multi-tenant support if needed
5. Include timestamps for all records
6. Add foreign keys with proper relationships
7. Include comments explaining each table and column
8. Use proper naming conventions (snake_case)
9. Optimize for the described complexity level (${understanding.complexity})
10. Support the following integrations: ${understanding.integrations.join(", ")}

Generate production-ready SQL that can be executed immediately.
    `;
  }

  private buildAPIRoutePrompt(
    understanding: DialogUnderstanding,
    entity: string,
    schemaContent: string,
  ): string {
    return `
Create an Express.js route handler for the "${entity}" entity.

System Context:
- Core Idea: ${understanding.coreIdea}
- Data Entities: ${understanding.dataEntities.join(", ")}
- Key Features: ${understanding.keyFeatures.join(", ")}

Generate TypeScript Express routes with:
1. Full CRUD operations (GET, POST, PUT, DELETE)
2. Proper error handling with HTTP status codes
3. Input validation using zod or similar
4. TypeScript interfaces for all data types
5. Supabase client integration
6. Pagination support for list endpoints
7. Filtering and sorting capabilities
8. Proper logging and monitoring
9. Rate limiting considerations
10. Security best practices (sanitization, CORS, etc.)

Database Schema Context:
${schemaContent}

Generate complete, production-ready code with no stubs or TODOs.
    `;
  }

  private buildMainLayoutPrompt(understanding: DialogUnderstanding): string {
    return `
Create a main React layout component for this system:

System: ${understanding.coreIdea}
Target Users: ${understanding.targetUsers}
Key Features: ${understanding.keyFeatures.join(", ")}

Requirements:
1. Create a responsive main layout using React hooks
2. Use Tailwind CSS for styling
3. Use shadcn/ui components
4. Include a responsive sidebar for navigation
5. Include a top header with branding and user menu
6. Include a main content area
7. Support dark/light theme switching
8. Include proper TypeScript types
9. Use React Router for page navigation
10. Include loading states and error boundaries

Generate production-ready, beautiful React component.
    `;
  }

  private buildComponentPrompt(
    understanding: DialogUnderstanding,
    feature: string,
  ): string {
    return `
Create a React component for the "${feature}" feature:

System: ${understanding.coreIdea}
Data Entities: ${understanding.dataEntities.join(", ")}

Feature Requirements:
- Feature Name: ${feature}
- Related Entities: Determine from context
- Complexity: ${understanding.complexity}

Generate:
1. Functional React component with hooks
2. Proper TypeScript interfaces for props and state
3. Form handling if needed
4. Data fetching with error handling
5. Loading states
6. User feedback (toast/alerts)
7. Tailwind CSS styling
8. shadcn/ui components usage
9. Accessibility best practices
10. Responsive design

Production-ready code with no placeholders.
    `;
  }

  private buildPackageDepsPrompt(understanding: DialogUnderstanding): string {
    return `
Determine npm dependencies needed for:
- Core Idea: ${understanding.coreIdea}
- Key Features: ${understanding.keyFeatures.join(", ")}
- Integrations: ${understanding.integrations.join(", ")}
- Complexity: ${understanding.complexity}

Standard already included: React, Express, TypeScript, Tailwind, shadcn/ui, Supabase

Return ONLY valid JSON with this exact structure:
{
  "dependencies": { "package-name": "^version", ... },
  "devDependencies": { "package-name": "^version", ... }
}

Include: Testing libraries, state management (if needed), UI libraries, API clients, utilities
    `;
  }

  private generateEnvTemplate(understanding: DialogUnderstanding): string {
    return `# Environment Configuration
# Copy to .env.local and fill in values

# Database
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key

# API
ECHO_OPENAI_API_KEY=sk-...

# Application
VITE_APP_NAME="${understanding.coreIdea}"
VITE_APP_ENV=development
VITE_API_BASE_URL=http://localhost:3000

# Integrations
${understanding.integrations
  .map((integration) => `${integration.toUpperCase()}_API_KEY=your_key`)
  .join("\n")}

# Feature Flags
VITE_DEBUG_MODE=false
VITE_FEATURE_ANALYTICS=true

# Optional: Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=15
    `;
  }

  private generateTSConfig(understanding: DialogUnderstanding): string {
    return JSON.stringify(
      {
        compilerOptions: {
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          resolveJsonModule: true,
          moduleResolution: "node",
          allowSyntheticDefaultImports: true,
          lib: ["ES2020", "DOM", "DOM.Iterable"],
          target: "ES2020",
          paths: {
            "@/*": ["./client/*"],
            "@/server/*": ["./server/*"],
          },
        },
        include: ["client/**/*", "server/**/*"],
        exclude: ["node_modules", "dist"],
      },
      null,
      2,
    );
  }

  private generateArchitectureOverview(
    understanding: DialogUnderstanding,
    files: GeneratedFile[],
  ): string {
    const layers = {
      presentation: files.filter((f) => f.path.includes("components")).length,
      business: files.filter((f) => f.path.includes("services")).length,
      data: files.filter((f) => f.path.includes("routes")).length,
      persistence: files.filter((f) => f.type === "sql").length,
    };

    return `
# System Architecture Overview

## Technology Stack
- Frontend: React + TypeScript + Tailwind CSS
- Backend: Express.js + Node.js
- Database: PostgreSQL (Supabase)
- State Management: React Hooks + Context API
- UI Components: shadcn/ui

## Layered Architecture

### Presentation Layer (${layers.presentation} components)
- React components for user interface
- Page layouts and feature-specific UIs
- Form handling and validation

### Business Logic Layer (${layers.business} services)
- Core business logic and workflows
- Data validation and transformation
- External API integrations

### API Layer (${layers.data} routes)
- Express.js API endpoints
- Request validation and routing
- Response formatting and error handling

### Data Persistence Layer (${layers.persistence} schemas)
- PostgreSQL database schema
- Data relationships and constraints
- Indexes and query optimization

## Data Flow
User → Components → Services → API Routes → Database

## Scalability Considerations
- Complexity Level: ${understanding.complexity}
- Estimated Users: Based on target (${understanding.targetUsers})
- Features: ${understanding.keyFeatures.length} core features
- Integrations: ${understanding.integrations.length} external services
    `;
  }

  private generateDataFlow(
    understanding: DialogUnderstanding,
    routes: GeneratedFile[],
  ): string {
    return `
# Data Flow Diagram

## Core Workflows

### User Interaction Flow
User Input → Component Handler → Service Function → API Endpoint → Database Query → Response Processing → UI Update

### Data Entities: ${understanding.dataEntities.length}
${understanding.dataEntities.map((entity) => `- ${entity}: Core data model for system`).join("\n")}

### API Endpoints
${routes.map((route) => `- ${route.path}: CRUD operations for entity management`).join("\n")}

### Feature Flows
${understanding.keyFeatures.map((feature) => `- ${feature}: Supported by multiple components and services`).join("\n")}

### Integration Points
${understanding.integrations.map((integration) => `- ${integration}: External service integration`).join("\n")}
    `;
  }

  private generateSummary(
    understanding: DialogUnderstanding,
    files: GeneratedFile[],
  ): string {
    return `
Generated a complete ${understanding.complexity} ${understanding.coreIdea} system.

Files Generated: ${files.length}
- Database Schemas: ${files.filter((f) => f.type === "sql").length}
- API Routes: ${files.filter((f) => f.path.includes("routes")).length}
- React Components: ${files.filter((f) => f.path.includes("components")).length}
- Configuration Files: ${files.filter((f) => f.type === "json").length}
- Documentation: ${files.filter((f) => f.type === "markdown").length}

Data Entities: ${understanding.dataEntities.length} (${understanding.dataEntities.join(", ")})
Key Features: ${understanding.keyFeatures.length} (${understanding.keyFeatures.slice(0, 3).join(", ")}${understanding.keyFeatures.length > 3 ? "..." : ""})
Integrations: ${understanding.integrations.length} (${understanding.integrations.join(", ")})

The system is ready for immediate use. Review the generated files, deploy the database schema,
install dependencies, and start the development server.
    `;
  }

  private sanitizeName(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("");
  }

  private async callOpenAI(
    prompt: string,
    systemPrompt: string,
  ): Promise<string> {
    // SECURITY: All calls proxied through secure /api/openai endpoint
    // The API key is stored server-side and never exposed to client
    try {
      const result = await generateCode({
        prompt: `${systemPrompt}\n\n${prompt}`,
        model: "gpt-4",
        temperature: 0.7,
        maxTokens: 4000,
      });
      return result;
    } catch (error) {
      console.error("Code generation failed:", error);
      throw error;
    }
  }

  /**
   * Generate code with streaming support
   * Chunks are delivered via callback as they arrive
   * Useful for real-time UI updates showing code generation progress
   */
  async *callOpenAIStream(
    prompt: string,
    systemPrompt: string,
  ): AsyncGenerator<string, void, unknown> {
    // SECURITY: Streaming also goes through secure endpoint
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    try {
      for await (const chunk of generateCodeStream({
        prompt: fullPrompt,
        model: "gpt-4",
        temperature: 0.7,
        maxTokens: 4000,
      })) {
        yield chunk;
      }
    } catch (error) {
      console.error("Streaming code generation failed:", error);
      throw error;
    }
  }
}

export const codeGenerationEngine = new CodeGenerationEngine();
