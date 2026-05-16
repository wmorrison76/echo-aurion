import Tesseract from"tesseract.js"; interface OCRResult { text: string; confidence: number; blocks: Array<{ boundingBox: { x0: number; y0: number; x1: number; y1: number; }; text: string; confidence: number; }>;
} interface OCRProgress { status: string; progress: number;
} /** * Extract text from image using Tesseract OCR */
export const extractTextFromImage = async ( imageUrl: string, onProgress?: (progress: OCRProgress) => void,
): Promise<OCRResult> => { try { const { data: { text, confidence, blocks }, } = await Tesseract.recognize(imageUrl,"eng", { logger: (m) => { onProgress?.({ status: m.status, progress: m.progress, }); }, }); // Transform blocks to include bounding boxes const processedBlocks = (blocks || []).map((block: any) => ({ boundingBox: { x0: block.bbox?.x0 || 0, y0: block.bbox?.y0 || 0, x1: block.bbox?.x1 || 0, y1: block.bbox?.y1 || 0, }, text: block.text ||"", confidence: block.confidence || 0, })); return { text, confidence, blocks: processedBlocks, }; } catch (error) { console.error("OCR failed:", error); throw error; }
}; /** * Extract text from multiple images in batch */
export const extractTextFromImages = async ( imageUrls: string[], onProgress?: (completed: number, total: number) => void,
): Promise<Map<string, OCRResult>> => { const results = new Map<string, OCRResult>(); for (let i = 0; i < imageUrls.length; i++) { const url = imageUrls[i]; try { const result = await extractTextFromImage(url); results.set(url, result); onProgress?.(i + 1, imageUrls.length); } catch (error) { console.error(`Failed to extract text from ${url}:`, error); results.set(url, { text:"", confidence: 0, blocks: [], }); } } return results;
}; /** * Extract specific language text */
export const extractTextInLanguage = async ( imageUrl: string, languageCode: string ="eng",
): Promise<string> => { try { const { data: { text }, } = await Tesseract.recognize(imageUrl, languageCode); return text; } catch (error) { console.error(`Failed to extract ${languageCode} text:`, error); return""; }
}; /** * Extract handwritten text (optimized settings) */
export const extractHandwrittenText = async ( imageUrl: string, onProgress?: (progress: OCRProgress) => void,
): Promise<string> => { try { const { data: { text }, } = await Tesseract.recognize(imageUrl,"eng", { corePath:"https://cdn.jsdelivr.net/npm/tesseract.js-core@v5.2.3", logger: (m) => { onProgress?.({ status: m.status, progress: m.progress, }); }, }); return text; } catch (error) { console.error("Failed to extract handwritten text:", error); return""; }
}; /** * Detect text regions in image without extracting text */
export const detectTextRegions = async ( imageUrl: string,
): Promise<Array<{ x: number; y: number; width: number; height: number }>> => { try { const { data: { blocks }, } = await Tesseract.recognize(imageUrl,"eng"); return (blocks || []).map((block: any) => ({ x: block.bbox?.x0 || 0, y: block.bbox?.y0 || 0, width: (block.bbox?.x1 || 0) - (block.bbox?.x0 || 0), height: (block.bbox?.y1 || 0) - (block.bbox?.y0 || 0), })); } catch (error) { console.error("Failed to detect text regions:", error); return []; }
}; /** * Create searchable text index from OCR results */
export const createTextIndex = ( ocrResult: OCRResult,
): Map< string, Array<{ x: number; y: number; width: number; height: number }>
> => { const index = new Map< string, Array<{ x: number; y: number; width: number; height: number }> >(); ocrResult.blocks.forEach((block) => { const words = block.text.toLowerCase().split(/\s+/); words.forEach((word) => { if (word.length > 2) { // Skip very short words if (!index.has(word)) { index.set(word, []); } index.get(word)?.push({ x: block.boundingBox.x0, y: block.boundingBox.y0, width: block.boundingBox.x1 - block.boundingBox.x0, height: block.boundingBox.y1 - block.boundingBox.y0, }); } }); }); return index;
};
