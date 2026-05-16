import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useResizeObserverErrorHandler } from "@/components/ResizeObserverErrorBoundary";
import { 
  Save, 
  Wifi, 
  WifiOff, 
  CheckCircle, 
  AlertCircle,
  Eye,
  Volume2,
  Keyboard,
  Accessibility
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SystemEnhancementsProps {
  children: React.ReactNode;
}

// Auto-save hook for form data
export const useAutoSave = (data: any, saveFunction: (data: any) => Promise<void>, interval = 30000) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(async () => {
    if (!data || isSaving) return;
    
    try {
      setIsSaving(true);
      setError(null);
      await saveFunction(data);
      setLastSaved(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [data, saveFunction, isSaving]);

  useEffect(() => {
    if (!data) return;

    const timer = setInterval(save, interval);
    return () => clearInterval(timer);
  }, [save, interval, data]);

  return { isSaving, lastSaved, error, save };
};

// Network status hook
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

// Accessibility enhancement hook
export const useAccessibility = () => {
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [fontSize, setFontSize] = useState('normal');

  useEffect(() => {
    // Check for user preferences
    const preferReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const preferHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    
    setReducedMotion(preferReducedMotion);
    setHighContrast(preferHighContrast);

    // Apply accessibility classes
    if (preferReducedMotion) {
      document.documentElement.classList.add('reduce-motion');
    }
    if (preferHighContrast) {
      document.documentElement.classList.add('high-contrast');
    }
  }, []);

  const toggleHighContrast = () => {
    setHighContrast(!highContrast);
    document.documentElement.classList.toggle('high-contrast');
  };

  const adjustFontSize = (size: 'small' | 'normal' | 'large') => {
    setFontSize(size);
    document.documentElement.classList.remove('font-small', 'font-normal', 'font-large');
    document.documentElement.classList.add(`font-${size}`);
  };

  return {
    highContrast,
    reducedMotion,
    fontSize,
    toggleHighContrast,
    adjustFontSize
  };
};

// Auto-save status component
export const AutoSaveStatus = ({ isSaving, lastSaved, error }: {
  isSaving: boolean;
  lastSaved: Date | null;
  error: string | null;
}) => {
  if (error) {
    return (
      <Badge variant="destructive" className="flex items-center space-x-1">
        <AlertCircle className="h-3 w-3" />
        <span>Save failed</span>
      </Badge>
    );
  }

  if (isSaving) {
    return (
      <Badge variant="secondary" className="flex items-center space-x-1">
        <Save className="h-3 w-3 animate-pulse" />
        <span>Saving...</span>
      </Badge>
    );
  }

  if (lastSaved) {
    return (
      <Badge variant="outline" className="flex items-center space-x-1 text-green-600 border-green-600">
        <CheckCircle className="h-3 w-3" />
        <span>Saved {lastSaved.toLocaleTimeString()}</span>
      </Badge>
    );
  }

  return null;
};

// Network status indicator
export const NetworkStatus = () => {
  const isOnline = useNetworkStatus();

  return (
    <div className="flex items-center space-x-1">
      {isOnline ? (
        <Wifi className="h-4 w-4 text-green-500" title="Connected" />
      ) : (
        <WifiOff className="h-4 w-4 text-red-500" title="Offline - Changes will sync when reconnected" />
      )}
    </div>
  );
};

// Global accessibility styles component
const GlobalAccessibilityStyles = () => {
  useEffect(() => {
    const styleId = 'accessibility-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .reduce-motion * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }

      .high-contrast {
        --background: 0 0% 100%;
        --foreground: 0 0% 0%;
        --card: 0 0% 95%;
        --card-foreground: 0 0% 0%;
        --primary: 220 100% 30%;
        --primary-foreground: 0 0% 100%;
        --secondary: 0 0% 90%;
        --secondary-foreground: 0 0% 0%;
        --muted: 0 0% 85%;
        --muted-foreground: 0 0% 20%;
        --accent: 0 0% 85%;
        --accent-foreground: 0 0% 0%;
        --destructive: 0 84% 30%;
        --destructive-foreground: 0 0% 100%;
        --border: 0 0% 70%;
        --input: 0 0% 70%;
        --ring: 220 100% 30%;
      }

      .font-small {
        font-size: 14px;
      }

      .font-normal {
        font-size: 16px;
      }

      .font-large {
        font-size: 18px;
      }

      *:focus-visible {
        outline: 2px solid hsl(var(--ring));
        outline-offset: 2px;
      }

      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      .sr-only:focus {
        position: static;
        width: auto;
        height: auto;
        padding: inherit;
        margin: inherit;
        overflow: visible;
        clip: auto;
        white-space: normal;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  return null;
};

// Accessibility toolbar
export const AccessibilityToolbar = () => {
  const { highContrast, fontSize, toggleHighContrast, adjustFontSize } = useAccessibility();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={cn(
        "bg-background/90 backdrop-blur-sm border border-border rounded-lg shadow-lg transition-all duration-200",
        isOpen ? "p-4 space-y-3" : "p-2"
      )}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2"
          title="Accessibility Options"
        >
          <Accessibility className="h-4 w-4" />
          {isOpen && <span>Accessibility</span>}
        </Button>

        {isOpen && (
          <div className="space-y-2 min-w-[200px]">
            <div className="flex items-center justify-between">
              <span className="text-sm">High Contrast</span>
              <Button
                variant={highContrast ? "default" : "outline"}
                size="sm"
                onClick={toggleHighContrast}
              >
                <Eye className="h-3 w-3" />
              </Button>
            </div>

            <div className="space-y-1">
              <span className="text-sm">Font Size</span>
              <div className="flex space-x-1">
                {(['small', 'normal', 'large'] as const).map((size) => (
                  <Button
                    key={size}
                    variant={fontSize === size ? "default" : "outline"}
                    size="sm"
                    onClick={() => adjustFontSize(size)}
                    className="capitalize"
                  >
                    {size === 'small' ? 'A-' : size === 'large' ? 'A+' : 'A'}
                  </Button>
                ))}
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Use Tab to navigate</p>
              <p>• Press ? for help</p>
              <p>• Ctrl+F to search</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main system enhancements wrapper
export default function SystemEnhancements({ children }: SystemEnhancementsProps) {
  // Add ResizeObserver error protection
  useResizeObserverErrorHandler();

  const isOnline = useNetworkStatus();
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowOfflineAlert(true);
    } else {
      // Hide alert after coming back online
      const timer = setTimeout(() => setShowOfflineAlert(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  return (
    <>
      {/* Offline Alert */}
      {showOfflineAlert && !isOnline && (
        <Alert className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            You're offline. Changes will sync when connection is restored.
          </AlertDescription>
        </Alert>
      )}

      {/* Skip to main content for screen readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded z-50"
      >
        Skip to main content
      </a>

      {/* Main content with proper landmarks */}
      <div id="main-content" role="main">
        {children}
      </div>

      {/* Accessibility toolbar */}
      <AccessibilityToolbar />

      {/* Add custom CSS for accessibility using useEffect */}
      <GlobalAccessibilityStyles />
    </>
  );
}
