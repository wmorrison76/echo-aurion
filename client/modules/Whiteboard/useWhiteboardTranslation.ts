/** * Whiteboard Translation Hook * Handles translation of whiteboard text elements */ import {
  useEffect,
  useRef,
} from "react";
import { CanvasState, TextElement, StickyNote } from "./types";
import { TranslationManager } from "./TranslationManager";
interface TranslatedContent {
  textElements: Map<string, string>;
  stickyNotes: Map<string, string>;
  originalTexts: Map<string, string>;
}
export function useWhiteboardTranslation(
  canvasState: CanvasState,
  currentLanguage: string,
) {
  const translationManager = TranslationManager.getInstance();
  const translatedContentRef = useRef<TranslatedContent>({
    textElements: new Map(),
    stickyNotes: new Map(),
    originalTexts: new Map(),
  }); // Translate text elements when language changes useEffect(() => { if (currentLanguage ==="en") { // English is the default, no translation needed translatedContentRef.current = { textElements: new Map(), stickyNotes: new Map(), originalTexts: new Map(), }; return; } const translateElements = async () => { const content = translatedContentRef.current; // Collect all text that needs translation const textsToTranslate: string[] = []; const elementMap: Map<string, { type:"text" |"sticky"; id: string }> = new Map(); // Text elements canvasState.texts.forEach((text) => { if (text.text && !content.originalTexts.has(text.id)) { textsToTranslate.push(text.text); content.originalTexts.set(text.id, text.text); elementMap.set(text.text, { type:"text", id: text.id }); } }); // Sticky notes canvasState.stickyNotes.forEach((note) => { if (note.text && !content.originalTexts.has(note.id)) { textsToTranslate.push(note.text); content.originalTexts.set(note.id, note.text); elementMap.set(note.text, { type:"sticky", id: note.id }); } }); if (textsToTranslate.length === 0) { return; } // Translate in batch try { const translatedMap = await translationManager.translateBatch( textsToTranslate, currentLanguage,"en", ); // Store translations translatedMap.forEach((translatedText, originalText) => { const element = elementMap.get(originalText); if (element) { if (element.type ==="text") { content.textElements.set(element.id, translatedText); } else if (element.type ==="sticky") { content.stickyNotes.set(element.id, translatedText); } } }); } catch (error) { console.error("Failed to translate text elements:", error); } }; translateElements(); }, [currentLanguage, canvasState.texts, canvasState.stickyNotes]); /** * Get translated text for an element */ const getTranslatedText = ( elementId: string, type:"text" |"sticky", ): string | null => { const content = translatedContentRef.current; if (type ==="text") { return content.textElements.get(elementId) || null; } else if (type ==="sticky") { return content.stickyNotes.get(elementId) || null; } return null; }; /** * Translate a single string (for UI text, participant names, etc.) */ const translateString = async (text: string): Promise<string> => { if (currentLanguage ==="en" || !text) { return text; } const result = await translationManager.translateText( text, currentLanguage,"en", ); return result.translatedText; }; return { getTranslatedText, translateString, translatedContent: translatedContentRef.current, isTranslating: currentLanguage !=="en", };
}
