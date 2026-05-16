/// <reference types="vite/client" /> import type { GLMatch, GLRule } from "@/lib/gl-rules"; declare global { interface Window { EchoGL?: { loadRules: () => GLRule[]; installDefaultRules: (rules?: { version?: string; notes?: string; rules: GLRule[] }) => void; classify: (text: string | null | undefined) => GLMatch | null; }; }
} export {};
