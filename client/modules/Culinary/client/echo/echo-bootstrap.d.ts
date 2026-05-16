/**
 * EchoAi³ Bootstrap TypeScript Declarations
 */

export interface EchoBootstrapOptions {
  module?: string;
  pageState?: Record<string, any>;
  builderContext?: any;
  enableMemory?: boolean;
  enableGuardrails?: boolean;
  uiHooks?: boolean;
  security?: SecurityOptions;
  enableTron?: boolean;
  enableSandbox?: boolean;
}

export interface SecurityOptions {
  environment?: string;
  getAccessToken?: () => Promise<string | null>;
  currentUser?: { id: string; name: string; roles?: string[] };
  roles?: string[];
  modulePermissions?: Record<string, boolean>;
}

export interface EchoInstance {
  module: string;
  pageState: Record<string, any>;
  memory: any;
  safety: any;
  plugins: Map<string, any>;
  knowledge: Map<string, any>;
  ask(args: EchoAskArgs): Promise<string>;
  predict(task: string, options?: Record<string, any>): Promise<any>;
  inspect(subject: string, options?: Record<string, any>): Promise<any>;
  attachToModule(moduleName: string): void;
  registerKnowledge(module: string, key: string, payload: any): void;
  getKnowledge(module?: string): Record<string, any>;
}

export interface EchoAskArgs {
  prompt: string;
  module?: string;
  context?: Record<string, any>;
}

export function bootstrapEcho(options?: EchoBootstrapOptions): Promise<EchoInstance>;

export const EchoAI3: {
  instance: EchoInstance;
  attachToModule(moduleName: string): void;
  registerKnowledge(module: string, key: string, payload: any): void;
  ask(args: EchoAskArgs): Promise<string>;
  predict(task: string, options?: Record<string, any>): Promise<any>;
  inspect(subject: string, options?: Record<string, any>): Promise<any>;
};

export default {
  bootstrapEcho,
  EchoAI3,
};
