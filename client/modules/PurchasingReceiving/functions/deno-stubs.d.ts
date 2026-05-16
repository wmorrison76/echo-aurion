declare namespace Deno {
  interface EnvNamespace {
    get(key: string): string | undefined;
  }
  const env: EnvNamespace;
}
declare module "https://esm.sh/@supabase/supabase-js@2?target=deno" {
  export * from "@supabase/supabase-js";
}
declare module "https://esm.sh/@supabase/supabase-js@2" {
  export * from "@supabase/supabase-js";
}
declare module "https://deno.land/std@0.210.0/encoding/base64.ts" {
  export function encode(input: string | Uint8Array): string;
  export function decode(input: string): Uint8Array;
}
declare module "https://deno.land/x/imagescript@1.3.0/mod.ts" {
  export class Image {
    width: number;
    height: number;
    bitmap: Uint8Array;
    static decode(bytes: Uint8Array): Promise<Image>;
    encode(): Promise<Uint8Array>;
    encodePNG(): Promise<Uint8Array>;
  }
}
declare module "https://esm.sh/tesseract.js@5.0.3?target=deno" {
  export function createWorker(
    language: string,
    options?: unknown,
    config?: Record<string, unknown>,
  ): Promise<{
    recognize(
      input: Blob,
    ): Promise<{ data?: { text?: string; confidence?: number } }>;
    terminate(): Promise<void>;
  }>;
}
declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export interface ServeInit {
    port?: number;
    signal?: AbortSignal;
  }
  export function serve(
    handler: (request: Request) => Response | Promise<Response>,
    options?: ServeInit,
  ): void;
}
