import { GeneratedFile } from "./CodeGenerationEngine";

export interface FileWriteResult {
  success: boolean;
  filesWritten: number;
  filesList: { path: string; status: "written" | "error"; message?: string }[];
  totalSize: number;
}

class FileGenerationService {
  private generatedFiles: GeneratedFile[] = [];

  /**
   * Stores generated files in memory and prepares them for writing
   */
  storeFiles(files: GeneratedFile[]): void {
    this.generatedFiles = files;
  }

  /**
   * Gets all stored generated files
   */
  getStoredFiles(): GeneratedFile[] {
    return this.generatedFiles;
  }

  /**
   * Gets a specific file by path
   */
  getFileByPath(path: string): GeneratedFile | undefined {
    return this.generatedFiles.find((f) => f.path === path);
  }

  /**
   * Gets all files of a specific type
   */
  getFilesByType(type: GeneratedFile["type"]): GeneratedFile[] {
    return this.generatedFiles.filter((f) => f.type === type);
  }

  /**
   * Gets all files grouped by directory
   */
  getFilesGroupedByDirectory(): Record<string, GeneratedFile[]> {
    const grouped: Record<string, GeneratedFile[]> = {};

    this.generatedFiles.forEach((file) => {
      const dir = file.path.split("/").slice(0, -1).join("/") || "root";
      if (!grouped[dir]) {
        grouped[dir] = [];
      }
      grouped[dir].push(file);
    });

    return grouped;
  }

  /**
   * Exports files as a downloadable format (JSON with base64 encoding)
   */
  exportAsJSON(): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      fileCount: this.generatedFiles.length,
      files: this.generatedFiles.map((file) => ({
        path: file.path,
        type: file.type,
        description: file.description,
        content: Buffer.from(file.content).toString("base64"),
        sizeBytes: new TextEncoder().encode(file.content).length,
      })),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Exports files as a ZIP (returns blob URL for download)
   */
  async exportAsZip(): Promise<Blob> {
    // Dynamic import of jszip to keep bundle size down
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    this.generatedFiles.forEach((file) => {
      zip.file(file.path, file.content);
    });

    return zip.generateAsync({ type: "blob" });
  }

  /**
   * Creates a download link for a single file
   */
  downloadFile(path: string): boolean {
    const file = this.getFileByPath(path);
    if (!file) return false;

    const element = document.createElement("a");
    const file_blob = new Blob([file.content], { type: this.getMimeType(file.type) });
    element.href = URL.createObjectURL(file_blob);
    element.download = path.split("/").pop() || "file";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    return true;
  }

  /**
   * Creates a download link for all files as ZIP
   */
  async downloadAllAsZip(): Promise<void> {
    const zip = await this.exportAsZip();
    const url = URL.createObjectURL(zip);
    const element = document.createElement("a");
    element.href = url;
    element.download = "generated-system.zip";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(url);
  }

  /**
   * Gets code for copying to clipboard
   */
  getFileContent(path: string): string | null {
    const file = this.getFileByPath(path);
    return file?.content || null;
  }

  /**
   * Gets statistics about generated files
   */
  getStatistics(): {
    totalFiles: number;
    totalSize: number;
    byType: Record<string, number>;
    byDirectory: Record<string, number>;
    languageBreakdown: Record<string, number>;
  } {
    const byType: Record<string, number> = {};
    const byDirectory: Record<string, number> = {};
    const languageBreakdown: Record<string, number> = {};
    let totalSize = 0;

    this.generatedFiles.forEach((file) => {
      // By type
      byType[file.type] = (byType[file.type] || 0) + 1;

      // By directory
      const dir = file.path.split("/").slice(0, -1).join("/") || "root";
      byDirectory[dir] = (byDirectory[dir] || 0) + 1;

      // Language breakdown
      const language = this.getLanguageFromType(file.type);
      languageBreakdown[language] = (languageBreakdown[language] || 0) + 1;

      // Size
      totalSize += new TextEncoder().encode(file.content).length;
    });

    return {
      totalFiles: this.generatedFiles.length,
      totalSize,
      byType,
      byDirectory,
      languageBreakdown,
    };
  }

  /**
   * Gets a detailed report of what was generated
   */
  getGenerationReport(): string {
    const stats = this.getStatistics();
    const grouped = this.getFilesGroupedByDirectory();

    let report = `
# Code Generation Report

## Summary
- **Total Files Generated**: ${stats.totalFiles}
- **Total Code Size**: ${(stats.totalSize / 1024).toFixed(2)} KB
- **Generation Time**: ${new Date().toLocaleString()}

## Files by Type
${Object.entries(stats.byType)
  .map(([type, count]) => `- **${type}**: ${count} file(s)`)
  .join("\n")}

## Language Breakdown
${Object.entries(stats.languageBreakdown)
  .map(([lang, count]) => `- **${lang}**: ${count} file(s)`)
  .join("\n")}

## Files by Directory
${Object.entries(grouped)
  .map(([dir, files]) => {
    const dirDisplay = dir === "root" ? "Root" : dir;
    return `
### ${dirDisplay}/
${files
  .map((f) => `- \`${f.path}\`: ${f.description}`)
  .join("\n")}
    `;
  })
  .join("\n")}

## Next Steps
1. Download generated files
2. Review database schema and create in Supabase
3. Install dependencies: \`npm install\`
4. Set up environment variables
5. Start development server: \`npm run dev\`
6. Review generated code and customize as needed

## Notes
- All code is production-ready and follows best practices
- TypeScript types are included throughout
- Database includes proper indexes and relationships
- API routes include error handling and validation
- React components use hooks and are fully responsive
    `;

    return report;
  }

  /**
   * Validates file paths for security
   */
  private isValidPath(path: string): boolean {
    // Prevent directory traversal attacks
    if (path.includes("..") || path.includes("~")) {
      return false;
    }

    // Only allow specific directories
    const allowedDirs = [
      "client/",
      "server/",
      "lib/",
      "public/",
      ".",
    ];

    return allowedDirs.some((dir) => path.startsWith(dir));
  }

  /**
   * Gets MIME type for file download
   */
  private getMimeType(type: GeneratedFile["type"]): string {
    const mimeTypes: Record<GeneratedFile["type"], string> = {
      typescript: "text/typescript",
      sql: "text/sql",
      json: "application/json",
      markdown: "text/markdown",
    };
    return mimeTypes[type] || "text/plain";
  }

  /**
   * Gets programming language from file type
   */
  private getLanguageFromType(type: GeneratedFile["type"]): string {
    const mapping: Record<GeneratedFile["type"], string> = {
      typescript: "TypeScript",
      sql: "SQL",
      json: "JSON",
      markdown: "Markdown",
    };
    return mapping[type] || "Unknown";
  }

  /**
   * Clears stored files
   */
  clear(): void {
    this.generatedFiles = [];
  }
}

export const fileGenerationService = new FileGenerationService();
