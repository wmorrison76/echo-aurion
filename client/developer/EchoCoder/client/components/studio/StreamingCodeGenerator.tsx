import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { codeGenerationEngine } from "@/services/CodeGenerationEngine";
import { Copy, Check, AlertCircle, Zap } from "lucide-react";

interface StreamingCodeGeneratorProps {
  prompt: string;
  systemPrompt: string;
  onComplete?: (finalCode: string) => void;
  onError?: (error: Error) => void;
  maxTokens?: number;
}

export const StreamingCodeGenerator: React.FC<StreamingCodeGeneratorProps> = ({
  prompt,
  systemPrompt,
  onComplete,
  onError,
  maxTokens = 4000,
}) => {
  const [code, setCode] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [streamStats, setStreamStats] = useState({
    chunkCount: 0,
    totalChars: 0,
    startTime: 0,
    endTime: 0,
  });
  const codeRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const generateCodeStream = useCallback(async () => {
    try {
      setError(null);
      setCode("");
      setIsLoading(true);
      setStreamStats({
        chunkCount: 0,
        totalChars: 0,
        startTime: Date.now(),
        endTime: 0,
      });

      abortControllerRef.current = new AbortController();
      const startTime = Date.now();

      let accumulatedCode = "";
      let chunkCount = 0;

      for await (const chunk of codeGenerationEngine.callOpenAIStream(
        prompt,
        systemPrompt,
      )) {
        if (abortControllerRef.current.signal.aborted) {
          break;
        }

        accumulatedCode += chunk;
        chunkCount++;

        setCode(accumulatedCode);
        setStreamStats((prev) => ({
          ...prev,
          chunkCount,
          totalChars: accumulatedCode.length,
        }));

        // Auto-scroll to bottom
        if (codeRef.current) {
          codeRef.current.scrollTop = codeRef.current.scrollHeight;
        }
      }

      setStreamStats((prev) => ({
        ...prev,
        endTime: Date.now(),
      }));

      setIsStreaming(false);
      onComplete?.(accumulatedCode);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error.message);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, systemPrompt, onComplete, onError]);

  const handleCopyCode = useCallback(() => {
    if (code) {
      navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  }, [code]);

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort("Code generation stopped by user");
    setIsStreaming(false);
  }, []);

  const elapsedTime =
    streamStats.endTime > 0
      ? ((streamStats.endTime - streamStats.startTime) / 1000).toFixed(2)
      : isStreaming
        ? ((Date.now() - streamStats.startTime) / 1000).toFixed(2)
        : "0";

  const charsPerSecond =
    streamStats.endTime > 0
      ? (
          (streamStats.totalChars * 1000) /
          (streamStats.endTime - streamStats.startTime)
        ).toFixed(0)
      : "0";

  return (
    <Card className="w-full h-full flex flex-col border-none shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg">Code Generator</CardTitle>
              {isLoading && (
                <Badge variant="secondary" className="animate-pulse">
                  <Zap className="w-3 h-3 mr-1" />
                  Streaming
                </Badge>
              )}
            </div>
            <CardDescription>
              Real-time code generation with streaming
            </CardDescription>
          </div>
          <Button
            onClick={generateCodeStream}
            disabled={isLoading}
            size="sm"
            className="ml-auto"
          >
            {isLoading ? "Stop" : "Generate"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3 min-h-0">
        {/* Status Bar */}
        {(isLoading || code) && (
          <div className="flex items-center justify-between text-xs text-muted-foreground px-2 py-1 bg-secondary/30 rounded">
            <span>
              {streamStats.totalChars} chars • {streamStats.chunkCount} chunks •{" "}
              {elapsedTime}s
              {isStreaming && streamStats.totalChars > 0 && (
                <span className="ml-2">({charsPerSecond} chars/sec)</span>
              )}
            </span>
            {code && (
              <Button
                onClick={handleCopyCode}
                variant="ghost"
                size="xs"
                className="ml-2"
              >
                {isCopied ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="text-xs">
            <AlertCircle className="h-3 w-3" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Code Display Area */}
        <div
          ref={codeRef}
          className="flex-1 overflow-auto bg-slate-950 rounded-lg p-4 border border-slate-700 font-mono text-xs text-slate-100 whitespace-pre-wrap break-words"
        >
          {code ? (
            code
          ) : (
            <div className="text-slate-500 text-center py-8">
              Click "Generate" to start streaming code generation
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && !code && (
          <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
            <div className="animate-spin mr-2">⚙️</div>
            Initializing stream...
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StreamingCodeGenerator;
