/**
 * Module Fallback Component
 * 
 * Displays a user-friendly message when a module fails to load or is not available.
 * Provides better UX than showing raw error messages.
 */

import React from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ModuleFallbackProps {
  moduleName: string;
  error?: Error | string;
  onRetry?: () => void;
  onGoHome?: () => void;
}

export function ModuleFallback({
  moduleName,
  error,
  onRetry,
  onGoHome,
}: ModuleFallbackProps) {
  const errorMessage = error instanceof Error ? error.message : error || "Module not available";

  return (
    <div className="flex h-full w-full items-center justify-center p-8 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <CardTitle>Module Not Available</CardTitle>
          </div>
          <CardDescription>
            The "{moduleName}" module could not be loaded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm font-mono text-foreground/80 break-all">
                {errorMessage}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {onRetry && (
              <Button onClick={onRetry} variant="default" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Loading Module
              </Button>
            )}
            {onGoHome && (
              <Button onClick={onGoHome} variant="outline" className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>💡 Troubleshooting tips:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Check browser console for detailed error messages</li>
              <li>Try refreshing the page</li>
              <li>Clear browser cache if the issue persists</li>
              <li>Contact support if the problem continues</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ModuleFallback;
