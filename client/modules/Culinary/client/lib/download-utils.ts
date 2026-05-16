/**
 * Centralized utility for downloading blobs and files
 * Eliminates duplicate download logic across the codebase
 */

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadText(text: string, filename: string, mimeType: string = "text/plain"): void {
  const blob = new Blob([text], { type: mimeType });
  downloadBlob(blob, filename);
}

export function downloadJSON(data: unknown, filename: string): void {
  downloadText(JSON.stringify(data, null, 2), filename, "application/json");
}

export function downloadCSV(csvText: string, filename: string): void {
  downloadText(csvText, filename, "text/csv;charset=utf-8");
}

export function downloadZip(blob: Blob, filename: string): void {
  downloadBlob(blob, filename);
}

export async function downloadFromUrl(url: string, filename: string): Promise<void> {
  const response = await fetch(url);
  const blob = await response.blob();
  downloadBlob(blob, filename);
}

export function openInNewTab(url: string): void {
  window.open(url, "_blank");
}
