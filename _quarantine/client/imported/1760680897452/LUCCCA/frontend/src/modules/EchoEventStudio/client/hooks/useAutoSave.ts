import { useEffect, useRef, useCallback, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface AutoSaveOptions {
  key: string; // Unique key for localStorage
  interval?: number; // Auto-save interval in milliseconds (default: 30 seconds)
  enabled?: boolean; // Whether auto-save is enabled
  onSave?: (data: any) => Promise<void> | void; // Custom save function
  onRestore?: (data: any) => void; // Function to call when restoring data
  validation?: (data: any) => boolean; // Validation function
  storage?: 'localStorage' | 'sessionStorage' | 'custom'; // Storage type
}

interface AutoSaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  error: string | null;
}

export function useAutoSave<T>(data: T, options: AutoSaveOptions) {
  const {
    key,
    interval = 30000, // 30 seconds default
    enabled = true,
    onSave,
    onRestore,
    validation,
    storage = 'localStorage'
  } = options;

  const { toast } = useToast();
  const [state, setState] = useState<AutoSaveState>({
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    error: null
  });

  const dataRef = useRef(data);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Storage abstraction
  const storageApi = {
    localStorage: {
      get: (key: string) => localStorage.getItem(key),
      set: (key: string, value: string) => localStorage.setItem(key, value),
      remove: (key: string) => localStorage.removeItem(key)
    },
    sessionStorage: {
      get: (key: string) => sessionStorage.getItem(key),
      set: (key: string, value: string) => sessionStorage.setItem(key, value),
      remove: (key: string) => sessionStorage.removeItem(key)
    },
    custom: {
      get: () => null,
      set: () => {},
      remove: () => {}
    }
  };

  const getStorage = () => storageApi[storage];

  // Save function
  const save = useCallback(async (forceUpdate: boolean = false) => {
    if (!enabled) return;

    const currentData = JSON.stringify(dataRef.current);
    
    // Skip save if data hasn't changed
    if (!forceUpdate && currentData === lastSavedDataRef.current) {
      return;
    }

    // Validate data if validation function provided
    if (validation && !validation(dataRef.current)) {
      setState(prev => ({ 
        ...prev, 
        error: 'Data validation failed',
        hasUnsavedChanges: true 
      }));
      return;
    }

    setState(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      // Use custom save function if provided
      if (onSave) {
        await onSave(dataRef.current);
      } else {
        // Default to storage
        getStorage().set(key, currentData);
      }

      lastSavedDataRef.current = currentData;
      setState(prev => ({
        ...prev,
        isSaving: false,
        lastSaved: new Date(),
        hasUnsavedChanges: false,
        error: null
      }));

      // Show success toast for manual saves
      if (forceUpdate) {
        toast({
          title: "Saved",
          description: "Your changes have been saved successfully.",
          duration: 2000,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Save failed';
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: errorMessage,
        hasUnsavedChanges: true
      }));

      toast({
        title: "Save Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [enabled, key, onSave, validation, toast]);

  // Restore function
  const restore = useCallback(() => {
    try {
      const savedData = getStorage().get(key);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        if (onRestore) {
          onRestore(parsedData);
        }
        lastSavedDataRef.current = savedData;
        setState(prev => ({
          ...prev,
          lastSaved: new Date(),
          hasUnsavedChanges: false,
          error: null
        }));
        return parsedData;
      }
    } catch (error) {
      console.error('Failed to restore auto-saved data:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to restore saved data'
      }));
    }
    return null;
  }, [key, onRestore]);

  // Clear saved data
  const clearSaved = useCallback(() => {
    getStorage().remove(key);
    lastSavedDataRef.current = '';
    setState(prev => ({
      ...prev,
      lastSaved: null,
      hasUnsavedChanges: false,
      error: null
    }));
  }, [key]);

  // Check if there are unsaved changes
  const checkForChanges = useCallback(() => {
    const currentData = JSON.stringify(dataRef.current);
    const hasChanges = currentData !== lastSavedDataRef.current;
    
    setState(prev => ({
      ...prev,
      hasUnsavedChanges: hasChanges
    }));

    return hasChanges;
  }, []);

  // Debounced save for frequent changes
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      save();
    }, 2000); // 2 second debounce
  }, [save]);

  // Update data ref when data changes
  useEffect(() => {
    dataRef.current = data;
    checkForChanges();
    
    // Trigger debounced save on data change
    if (enabled) {
      debouncedSave();
    }
  }, [data, enabled, checkForChanges, debouncedSave]);

  // Set up periodic auto-save
  useEffect(() => {
    if (!enabled) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      save();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, save]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Save before unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.hasUnsavedChanges) {
        // Try to save immediately
        save(true);
        
        // Show warning
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.hasUnsavedChanges, save]);

  return {
    ...state,
    save: () => save(true),
    restore,
    clearSaved,
    checkForChanges
  };
}

// Hook for form-specific auto-save
export function useFormAutoSave<T extends Record<string, any>>(
  formData: T,
  formKey: string,
  options?: Partial<AutoSaveOptions>
) {
  return useAutoSave(formData, {
    key: `form_${formKey}`,
    interval: 15000, // More frequent for forms (15 seconds)
    validation: (data) => {
      // Basic validation - ensure it's an object
      return typeof data === 'object' && data !== null;
    },
    ...options
  });
}

// Hook for page state auto-save
export function usePageAutoSave<T>(
  pageState: T,
  pageKey: string,
  options?: Partial<AutoSaveOptions>
) {
  return useAutoSave(pageState, {
    key: `page_${pageKey}`,
    interval: 45000, // Less frequent for page state (45 seconds)
    storage: 'sessionStorage', // Use session storage for page state
    ...options
  });
}

// Hook for draft auto-save with conflict resolution
export function useDraftAutoSave<T>(
  draftData: T,
  draftKey: string,
  options?: Partial<AutoSaveOptions & {
    conflictResolution?: 'overwrite' | 'merge' | 'prompt';
  }>
) {
  const { conflictResolution = 'prompt', ...autoSaveOptions } = options || {};

  const autoSave = useAutoSave(draftData, {
    key: `draft_${draftKey}`,
    interval: 10000, // Frequent saves for drafts (10 seconds)
    validation: (data) => {
      // Ensure data exists and is not empty
      if (typeof data === 'string') return data.trim().length > 0;
      if (typeof data === 'object') return Object.keys(data).length > 0;
      return true;
    },
    ...autoSaveOptions
  });

  const restoreWithConflictResolution = useCallback(async () => {
    const savedData = autoSave.restore();
    
    if (savedData && conflictResolution === 'prompt') {
      const shouldRestore = window.confirm(
        'A saved draft was found. Would you like to restore it?'
      );
      
      if (!shouldRestore) {
        autoSave.clearSaved();
        return null;
      }
    }
    
    return savedData;
  }, [autoSave, conflictResolution]);

  return {
    ...autoSave,
    restoreWithConflictResolution
  };
}

export default useAutoSave;
