import { useState, useCallback, useEffect, useRef } from "react";
import {
  VectorFontEngine,
  type FontVariation,
  type FontOutlineProperties,
  type CanvasFontState,
  type VectorFont,
  type FontLibrary,
} from "@/echo/vectorFonts";

export interface FontPreviewState {
  fontState: CanvasFontState | null;
  currentFont: VectorFont | null;
  isLoading: boolean;
  error: string | null;
}

export function useFontPreview(initialFontId?: string) {
  const [fontState, setFontState] = useState<CanvasFontState | null>(null);
  const [currentFont, setCurrentFont] = useState<VectorFont | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewElementRef = useRef<HTMLElement | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Initialize font preview
  const initializeFont = useCallback(
    (fontId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const library = VectorFontEngine.library();
        const font = library.fonts.find((f) => f.id === fontId);

        if (!font) {
          throw new Error(`Font with ID ${fontId} not found`);
        }

        const initialState: CanvasFontState = {
          fontId,
          fontFamily: font.name,
          fontSize: 24,
          fontWeight: 400,
          variations: {
            weight: 400,
            width: 100,
            italic: 0,
            slant: 0,
          },
          outline: {
            strokeWidth: 0,
            strokeColor: "#000000",
            shadowBlur: 0,
            shadowColor: "#000000",
            shadowOffsetX: 0,
            shadowOffsetY: 0,
          },
        };

        setCurrentFont(font);
        setFontState(initialState);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to initialize font";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Apply font state to preview element
  const applyFontState = useCallback(
    (state: CanvasFontState, element?: HTMLElement) => {
      const targetElement = element || previewElementRef.current;
      if (!targetElement) return;

      try {
        VectorFontEngine.applyToElement(targetElement, state);
        setFontState(state);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to apply font";
        setError(message);
      }
    },
    []
  );

  // Update variations with debounce
  const updateVariations = useCallback(
    (variations: Partial<FontVariation>) => {
      if (!fontState) return;

      // Clear previous debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Optimistically update state
      const updatedState: CanvasFontState = {
        ...fontState,
        variations: {
          ...fontState.variations,
          ...variations,
        },
      };
      setFontState(updatedState);

      // Debounce actual application to element
      debounceTimerRef.current = setTimeout(() => {
        if (previewElementRef.current) {
          VectorFontEngine.applyToElement(previewElementRef.current, updatedState);
        }
      }, 100);
    },
    [fontState]
  );

  // Update outline properties
  const updateOutline = useCallback(
    (outline: Partial<FontOutlineProperties>) => {
      if (!fontState) return;

      const updatedState: CanvasFontState = {
        ...fontState,
        outline: {
          ...fontState.outline,
          ...outline,
        },
      };
      setFontState(updatedState);

      if (previewElementRef.current) {
        VectorFontEngine.applyToElement(previewElementRef.current, updatedState);
      }
    },
    [fontState]
  );

  // Update font size
  const updateFontSize = useCallback(
    (fontSize: number) => {
      if (!fontState) return;

      const updatedState: CanvasFontState = {
        ...fontState,
        fontSize: Math.max(8, Math.min(200, fontSize)),
      };
      setFontState(updatedState);

      if (previewElementRef.current) {
        VectorFontEngine.applyToElement(previewElementRef.current, updatedState);
      }
    },
    [fontState]
  );

  // Update font weight
  const updateFontWeight = useCallback(
    (weight: number) => {
      if (!fontState) return;

      const updatedState: CanvasFontState = {
        ...fontState,
        fontWeight: weight,
        variations: {
          ...fontState.variations,
          weight,
        },
      };
      setFontState(updatedState);

      if (previewElementRef.current) {
        VectorFontEngine.applyToElement(previewElementRef.current, updatedState);
      }
    },
    [fontState]
  );

  // Swap font
  const swapFont = useCallback(
    (newFontId: string) => {
      initializeFont(newFontId);
    },
    [initializeFont]
  );

  // Reset to default
  const resetToDefaults = useCallback(() => {
    if (!currentFont) return;

    const defaultState: CanvasFontState = {
      fontId: currentFont.id,
      fontFamily: currentFont.name,
      fontSize: 24,
      fontWeight: 400,
      variations: {
        weight: 400,
        width: 100,
        italic: 0,
        slant: 0,
      },
      outline: {
        strokeWidth: 0,
        strokeColor: "#000000",
        shadowBlur: 0,
        shadowColor: "#000000",
        shadowOffsetX: 0,
        shadowOffsetY: 0,
      },
    };

    setFontState(defaultState);
    if (previewElementRef.current) {
      VectorFontEngine.applyToElement(previewElementRef.current, defaultState);
    }
  }, [currentFont]);

  // Apply preset
  const applyPreset = useCallback(
    (preset: any) => {
      if (!fontState) return;

      const presetState: CanvasFontState = {
        ...fontState,
        variations: preset.variations || fontState.variations,
        outline: preset.outline || fontState.outline,
      };

      setFontState(presetState);
      if (previewElementRef.current) {
        VectorFontEngine.applyToElement(previewElementRef.current, presetState);
      }
    },
    [fontState]
  );

  // Initialize on mount if initialFontId provided
  useEffect(() => {
    if (initialFontId) {
      initializeFont(initialFontId);
    }
  }, [initialFontId, initializeFont]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    fontState,
    currentFont,
    isLoading,
    error,
    previewElementRef,
    initializeFont,
    applyFontState,
    updateVariations,
    updateOutline,
    updateFontSize,
    updateFontWeight,
    swapFont,
    resetToDefaults,
    applyPreset,
  };
}
