import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

let workerConfigured = false;

async function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function configureWorker() {
  if (workerConfigured) return;
  try {
    GlobalWorkerOptions.workerSrc =
      "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.149/build/pdf.worker.min.mjs";
    workerConfigured = true;
  } catch {
    try {
      GlobalWorkerOptions.workerSrc =
        "/node_modules/pdfjs-dist/build/pdf.worker.min.mjs";
      workerConfigured = true;
    } catch {
      workerConfigured = false;
    }
  }
}

async function convertPDFPageToImageBlob(
  pdfPage: any,
  scale = 2,
): Promise<Blob> {
  const viewport = pdfPage.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Failed to get canvas 2D context");

  const renderTask = pdfPage.render({ canvasContext: context, viewport });
  await renderTask.promise;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("Failed to convert canvas to blob")),
      "image/png",
      0.95,
    );
  });
}

export interface PageText {
  page: number;
  text: string;
}

export async function extractTextFromImage(file: File): Promise<PageText[]> {
  try {
    // Try API-based OCR first
    try {
      const base64 = await toBase64(file);
      const cleanBase64 = base64.split(",")[1] || base64;
      const apiResponse = await fetch("/api/invoices/ocr/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Image: cleanBase64,
          mimeType: file.type || "image/jpeg",
          filename: file.name,
        }),
      });
      if (apiResponse.ok) {
        const data = await apiResponse.json();
        if (data?.success && data?.text?.trim()) {
          return [{ page: 1, text: String(data.text) }];
        }
      }
    } catch {
      // Fall back to client-side OCR
    }

    // Fall back to client-side OCR with tesseract.js if available
    try {
      // Dynamic import to avoid module resolution issues at build time
      const Tesseract = await import("tesseract.js");
      const recognize =
        Tesseract.recognize ||
        (Tesseract as any).default?.recognize ||
        (Tesseract as any);

      if (!recognize) {
        console.warn("Tesseract.js recognize function not found");
        return [{ page: 1, text: "" }];
      }

      const { data } = await recognize(file, "eng");
      const text = String(data?.text || "").trim();
      if (!text) throw new Error("OCR returned no text content");
      return [{ page: 1, text }];
    } catch (tesseractError) {
      // Tesseract.js is optional - if it fails, just return empty text
      const message =
        tesseractError instanceof Error
          ? tesseractError.message
          : String(tesseractError);
      console.warn("Client-side OCR unavailable:", message);
      return [{ page: 1, text: "" }];
    }
  } catch (error) {
    throw new Error(
      `Image OCR failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function ocrImageBlob(blob: Blob, pageNumber: number): Promise<string> {
  try {
    // Dynamic import to avoid module resolution issues
    const Tesseract = await import("tesseract.js");
    const recognize =
      Tesseract.recognize ||
      (Tesseract as any).default?.recognize ||
      (Tesseract as any);

    if (!recognize) {
      console.warn(`OCR not available for page ${pageNumber}`);
      return "";
    }

    const { data } = await recognize(blob, "eng");
    return String(data?.text || "").trim();
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.warn(`OCR unavailable for page ${pageNumber}: ${errMsg}`);
    return "";
  }
}

export async function extractTextFromPDF(file: File): Promise<PageText[]> {
  try {
    configureWorker();
    const data = await file.arrayBuffer();
    if (!data || data.byteLength === 0) throw new Error("PDF file is empty");

    const pdf = await getDocument({ data }).promise;
    if (!pdf || pdf.numPages < 1)
      throw new Error("PDF has no pages or failed to load");

    const pages: PageText[] = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      try {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        const items = (content.items as any[]) || [];
        const strings = items.map((it) => String(it.str ?? ""));
        pages.push({ page: p, text: strings.join("\n").trim() });
      } catch {
        pages.push({ page: p, text: "" });
      }
    }
    return pages;
  } catch (error) {
    throw new Error(
      `PDF extraction failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function extractTextFromPDFViaOCR(file: File): Promise<PageText[]> {
  configureWorker();
  const data = await file.arrayBuffer();
  if (!data || data.byteLength === 0) throw new Error("PDF file is empty");

  const pdf = await getDocument({ data }).promise;
  if (!pdf || pdf.numPages < 1)
    throw new Error("PDF has no pages or failed to load");

  const pages: PageText[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    try {
      const pdfPage = await pdf.getPage(p);
      const imageBlob = await convertPDFPageToImageBlob(pdfPage);
      const text = await ocrImageBlob(imageBlob, p);
      pages.push({ page: p, text });
    } catch {
      pages.push({ page: p, text: "" });
    }
  }

  const hasContent = pages.some((p) => p.text && p.text.trim().length > 10);
  if (!hasContent) throw new Error("No readable text found in any PDF pages");
  return pages;
}

export async function extractInvoiceText(
  file: File,
): Promise<{ meta: { pages: number }; pages: PageText[] }> {
  const mime = file.type || "";
  const name = typeof file.name === "string" ? file.name : "";
  const isPdf = mime.includes("pdf") || /\.pdf$/i.test(name);

  if (isPdf) {
    try {
      const pages = await extractTextFromPDF(file);
      const hasContent = pages.some((p) => p.text && p.text.trim().length > 10);
      if (hasContent) return { meta: { pages: pages.length }, pages };
    } catch {
      /* fall back */
    }

    const pages = await extractTextFromPDFViaOCR(file);
    return { meta: { pages: pages.length }, pages };
  }

  const pages = await extractTextFromImage(file);
  return { meta: { pages: pages.length }, pages };
}
