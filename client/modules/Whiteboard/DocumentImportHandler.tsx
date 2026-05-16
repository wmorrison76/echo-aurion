import { v4 as uuidv4 } from"uuid";
import { PDFElement, ImageElement, DocumentElement } from"./types"; /** * Convert file to blob URL for processing */
export const fileToUrl = (file: File): Promise<string> => { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = (e) => { const arrayBuffer = e.target?.result; if (arrayBuffer instanceof ArrayBuffer) { const blob = new Blob([arrayBuffer], { type: file.type }); const url = URL.createObjectURL(blob); resolve(url); } else { reject(new Error("Failed to read file")); } }; reader.onerror = () => reject(new Error("Failed to read file")); reader.readAsArrayBuffer(file); });
}; /** * Extract dimensions from image file */
export const getImageDimensions = ( url: string,
): Promise<{ width: number; height: number }> => { return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); }; img.onerror = () => reject(new Error("Failed to load image")); img.src = url; });
}; /** * Check if file is a PDF */
export const isPDF = (file: File): boolean => { return ( file.type ==="application/pdf" || file.name.toLowerCase().endsWith(".pdf") );
}; /** * Check if file is an image */
export const isImage = (file: File): boolean => { return file.type.startsWith("image/");
}; /** * Check if file is an SVG */
export const isSVG = (file: File): boolean => { return ( file.type ==="image/svg+xml" || file.name.toLowerCase().endsWith(".svg") );
}; /** * Create PDF element from file */
export const createPDFElement = async ( file: File, x: number, y: number, userId: string,
): Promise<PDFElement> => { const url = await fileToUrl(file); return { id: uuidv4(), fileUrl: url, fileName: file.name, pageNumber: 1, totalPages: 1, x, y, width: 600, height: 800, scale: 1, opacity: 1, timestamp: Date.now(), userId, };
}; /** * Create image element from file */
export const createImageElement = async ( file: File, x: number, y: number, userId: string,
): Promise<ImageElement> => { const url = await fileToUrl(file); const { width, height } = await getImageDimensions(url); // Scale down if too large let displayWidth = Math.min(width, 800); let displayHeight = (displayWidth / width) * height; if (displayHeight > 600) { displayHeight = 600; displayWidth = (displayHeight / height) * width; } return { id: uuidv4(), fileUrl: url, fileName: file.name, x, y, width: displayWidth, height: displayHeight, opacity: 1, timestamp: Date.now(), userId, };
}; /** * Create document element from file */
export const createDocumentElement = async ( file: File, x: number, y: number, userId: string,
): Promise<DocumentElement> => { let fileType:"pdf" |"image" |"svg" ="image"; if (isPDF(file)) fileType ="pdf"; else if (isSVG(file)) fileType ="svg"; const url = await fileToUrl(file); let width = 600; let height = 800; if (fileType !=="pdf") { const dims = await getImageDimensions(url); width = Math.min(dims.width, 800); height = (width / dims.width) * dims.height; } return { id: uuidv4(), fileUrl: url, fileName: file.name, fileType, x, y, width, height, opacity: 1, scale: 1, annotations: [], timestamp: Date.now(), userId, };
}; /** * Handle document drop event */
export const handleDocumentDrop = async ( e: DragEvent, canvasRef: React.RefObject<HTMLDivElement>, onPDFAdded?: (pdf: PDFElement) => void, onImageAdded?: (image: ImageElement) => void, userId: string ="current-user",
): Promise<{ pdfs: PDFElement[]; images: ImageElement[] }> => { e.preventDefault(); const pdfs: PDFElement[] = []; const images: ImageElement[] = []; if (!e.dataTransfer?.files) return { pdfs, images }; const files = Array.from(e.dataTransfer.files); const canvas = canvasRef.current; if (!canvas) return { pdfs, images }; const rect = canvas.getBoundingClientRect(); let startX = e.clientX - rect.left; let startY = e.clientY - rect.top; // Clamp to canvas bounds startX = Math.max(0, Math.min(startX, rect.width)); startY = Math.max(0, Math.min(startY, rect.height)); for (const file of files) { try { if (isPDF(file)) { const pdf = await createPDFElement(file, startX, startY, userId); pdfs.push(pdf); onPDFAdded?.(pdf); startY += 50; // Offset next PDF slightly } else if (isImage(file)) { const image = await createImageElement(file, startX, startY, userId); images.push(image); onImageAdded?.(image); startY += 50; // Offset next image slightly } } catch (error) { console.error("Failed to import document:", error); } } return { pdfs, images };
}; /** * Handle file input change */
export const handleFileInput = async ( files: FileList | null, x: number, y: number, userId: string ="current-user",
): Promise<{ pdfs: PDFElement[]; images: ImageElement[] }> => { const pdfs: PDFElement[] = []; const images: ImageElement[] = []; if (!files) return { pdfs, images }; let offsetY = 0; for (let i = 0; i < files.length; i++) { const file = files[i]; try { if (isPDF(file)) { const pdf = await createPDFElement(file, x, y + offsetY, userId); pdfs.push(pdf); offsetY += 50; } else if (isImage(file)) { const image = await createImageElement(file, x, y + offsetY, userId); images.push(image); offsetY += 50; } } catch (error) { console.error("Failed to import file:", error); } } return { pdfs, images };
}; /** * Export document with annotations as image */
export const exportDocumentAsImage = async ( documentId: string, canvasElement: HTMLCanvasElement,
): Promise<Blob> => { return new Promise((resolve) => { canvasElement.toBlob((blob) => { resolve(blob || new Blob()); },"image/png"); });
}; /** * Export all documents to a zip file */
export const exportDocumentsAsZip = async ( documents: DocumentElement[],
): Promise<Blob> => { // This would require a zip library like jszip // For now, return a placeholder const blob = new Blob([JSON.stringify(documents, null, 2)], { type:"application/json", }); return blob;
}; /** * Extract text from image using Tesseract OCR */
export const extractTextFromImage = async ( imageUrl: string,
): Promise<string> => { try { // Dynamically import Tesseract to avoid loading it unnecessarily const Tesseract = await import("tesseract.js"); const result = await Tesseract.recognize(imageUrl,"eng"); return result.data.text; } catch (error) { console.error("OCR failed:", error); return""; }
}; /** * Generate thumbnail for document */
export const generateThumbnail = async ( documentUrl: string, fileType:"pdf" |"image" |"svg",
): Promise<string> => { if (fileType ==="image" || fileType ==="svg") { return documentUrl; // Use image directly as thumbnail } // For PDF, would need to extract first page return documentUrl;
};
