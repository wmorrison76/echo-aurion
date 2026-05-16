/**
 * Multi-Modal Input Support Service
 * ----------------------------------
 * Accepts voice, images, and documents as input
 * - Vision AI for image analysis
 * - OCR for document processing
 * - Voice input processing
 */

import { logger } from "../lib/logger";

// OpenAI client - optional dependency
let openai: any = null;
try {
  const OpenAI = require("openai").default;
import { getOpenAIClient } from "../lib/env";
  openai = getOpenAIClient();
} catch (error) {
  logger.warn("OpenAI package not available for multimodal input");
}

export interface MultiModalInput {
  type: "text" | "voice" | "image" | "document";
  content: string | Buffer | File;
  metadata?: Record<string, any>;
}

export interface MultiModalResponse {
  type: string;
  extractedText?: string;
  analysis?: Record<string, any>;
  confidence: number;
  suggestions?: string[];
}

export interface VisionAnalysis {
  objects: string[];
  text?: string;
  description?: string;
  extractedData?: Record<string, any>;
}

export interface DocumentAnalysis {
  text: string;
  structuredData?: Record<string, any>;
  fields?: Array<{ name: string; value: any; confidence: number }>;
}

/**
 * Multi-Modal Input Service
 * Processes text, voice, images, and documents
 */
export class MultiModalInputService {
  /**
   * Process multi-modal input
   */
  async processInput(input: MultiModalInput): Promise<MultiModalResponse> {
    switch (input.type) {
      case "text":
        return await this.processText(input.content as string);

      case "voice":
        return await this.processVoice(input.content as Buffer | File);

      case "image":
        return await this.processImage(input.content as Buffer | File, input.metadata);

      case "document":
        return await this.processDocument(input.content as Buffer | File, input.metadata);

      default:
        throw new Error(`Unsupported input type: ${input.type}`);
    }
  }

  /**
   * Process text input
   */
  private async processText(text: string): Promise<MultiModalResponse> {
    return {
      type: "text",
      extractedText: text,
      confidence: 1.0,
    };
  }

  /**
   * Process voice input using Whisper API
   */
  private async processVoice(audio: Buffer | File): Promise<MultiModalResponse> {
    try {
      // Transcribe audio using OpenAI Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: audio as any,
        model: "whisper-1",
        language: "en",
      });

      const transcribedText = transcription.text;

      logger.info("[MultiModal] Voice transcribed", {
        textLength: transcribedText.length,
      });

      return {
        type: "voice",
        extractedText: transcribedText,
        confidence: 0.95, // Whisper is highly accurate
      };
    } catch (error) {
      logger.error("[MultiModal] Voice transcription error", { error });
      throw new Error(`Voice transcription failed: ${(error as Error).message}`);
    }
  }

  /**
   * Process image input using Vision API
   */
  private async processImage(
    image: Buffer | File,
    metadata?: Record<string, any>
  ): Promise<MultiModalResponse> {
    try {
      // Use OpenAI Vision API for image analysis
      const base64Image = this.bufferToBase64(image as Buffer);
      const mimeType = metadata?.mimeType || "image/jpeg";

      const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: metadata?.prompt ||
                  "Analyze this image. Identify objects, extract text (OCR), and provide a detailed description. If this is an invoice or document, extract structured data.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
      });

      const analysisText = response.choices[0].message.content || "";

      // Parse analysis into structured format
      const analysis = this.parseVisionAnalysis(analysisText, metadata);

      logger.info("[MultiModal] Image analyzed", {
        analysisType: metadata?.type || "general",
      });

      return {
        type: "image",
        extractedText: analysis.text || analysisText,
        analysis,
        confidence: 0.9,
        suggestions: this.generateImageSuggestions(analysis, metadata),
      };
    } catch (error) {
      logger.error("[MultiModal] Image analysis error", { error });
      throw new Error(`Image analysis failed: ${(error as Error).message}`);
    }
  }

  /**
   * Process document input (OCR + structured extraction)
   */
  private async processDocument(
    document: Buffer | File,
    metadata?: Record<string, any>
  ): Promise<MultiModalResponse> {
    try {
      // Use Vision API for OCR
      const base64Document = this.bufferToBase64(document as Buffer);
      const mimeType = metadata?.mimeType || "image/png";

      const documentType = metadata?.documentType || "invoice"; // invoice, recipe, receipt, etc.

      const prompt = this.getDocumentPrompt(documentType);

      const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Document}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      });

      const extractedText = response.choices[0].message.content || "";

      // Extract structured data based on document type
      const structuredData = this.extractStructuredData(extractedText, documentType);

      logger.info("[MultiModal] Document processed", {
        documentType,
        fieldsExtracted: Object.keys(structuredData).length,
      });

      return {
        type: "document",
        extractedText,
        analysis: {
          documentType,
          structuredData,
          fields: this.formatFields(structuredData),
        },
        confidence: 0.9,
        suggestions: this.generateDocumentSuggestions(documentType, structuredData),
      };
    } catch (error) {
      logger.error("[MultiModal] Document processing error", { error });
      throw new Error(`Document processing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Parse vision analysis into structured format
   */
  private parseVisionAnalysis(
    analysisText: string,
    metadata?: Record<string, any>
  ): VisionAnalysis {
    const analysis: VisionAnalysis = {
      objects: [],
      text: analysisText,
      description: analysisText,
    };

    // Extract objects (simplified - in production, use more sophisticated parsing)
    const objectKeywords = ["table", "chair", "food", "ingredient", "dish", "recipe", "invoice", "receipt"];
    objectKeywords.forEach((keyword) => {
      if (analysisText.toLowerCase().includes(keyword)) {
        analysis.objects.push(keyword);
      }
    });

    // Extract structured data if this is a specific type
    if (metadata?.type === "invoice" || metadata?.type === "receipt") {
      analysis.extractedData = this.extractInvoiceData(analysisText);
    }

    return analysis;
  }

  /**
   * Extract structured data from document text
   */
  private extractStructuredData(text: string, documentType: string): Record<string, any> {
    const structuredData: Record<string, any> = {};

    switch (documentType) {
      case "invoice":
        structuredData.vendor = this.extractField(text, "vendor", "supplier");
        structuredData.date = this.extractField(text, "date");
        structuredData.invoiceNumber = this.extractField(text, "invoice", "number");
        structuredData.total = this.extractField(text, "total", "amount");
        structuredData.items = this.extractLineItems(text);
        break;

      case "recipe":
        structuredData.name = this.extractField(text, "recipe", "name", "title");
        structuredData.ingredients = this.extractIngredients(text);
        structuredData.instructions = this.extractInstructions(text);
        structuredData.servings = this.extractField(text, "servings", "yield");
        break;

      case "receipt":
        structuredData.vendor = this.extractField(text, "vendor", "store");
        structuredData.date = this.extractField(text, "date");
        structuredData.total = this.extractField(text, "total");
        structuredData.items = this.extractLineItems(text);
        break;

      default:
        // Generic extraction
        structuredData.text = text;
    }

    return structuredData;
  }

  /**
   * Extract field from text using keywords
   */
  private extractField(
    text: string,
    ...keywords: string[]
  ): string | undefined {
    for (const keyword of keywords) {
      const regex = new RegExp(`${keyword}[\\s:]+([^\\n]+)`, "i");
      const match = text.match(regex);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return undefined;
  }

  /**
   * Extract line items from invoice/receipt text
   */
  private extractLineItems(text: string): Array<Record<string, any>> {
    // Simplified extraction - in production, use more sophisticated parsing
    const items: Array<Record<string, any>> = [];
    const lines = text.split("\n");

    for (const line of lines) {
      // Look for lines with quantities and prices
      const priceMatch = line.match(/\$?(\d+\.\d{2})/);
      const qtyMatch = line.match(/(\d+)\s*x\s*/i);

      if (priceMatch) {
        items.push({
          description: line.replace(priceMatch[0], "").trim(),
          quantity: qtyMatch ? parseInt(qtyMatch[1]) : 1,
          price: parseFloat(priceMatch[1]),
        });
      }
    }

    return items;
  }

  /**
   * Extract ingredients from recipe text
   */
  private extractIngredients(text: string): Array<Record<string, any>> {
    const ingredients: Array<Record<string, any>> = [];
    const lines = text.split("\n");

    let inIngredients = false;
    for (const line of lines) {
      if (line.toLowerCase().includes("ingredient")) {
        inIngredients = true;
        continue;
      }
      if (inIngredients && (line.toLowerCase().includes("instruction") || line.toLowerCase().includes("directions"))) {
        break;
      }
      if (inIngredients && line.trim()) {
        ingredients.push({
          text: line.trim(),
        });
      }
    }

    return ingredients;
  }

  /**
   * Extract instructions from recipe text
   */
  private extractInstructions(text: string): string[] {
    const instructions: string[] = [];
    const lines = text.split("\n");

    let inInstructions = false;
    for (const line of lines) {
      if (line.toLowerCase().includes("instruction") || line.toLowerCase().includes("directions") || line.toLowerCase().includes("method")) {
        inInstructions = true;
        continue;
      }
      if (inInstructions && line.trim()) {
        instructions.push(line.trim());
      }
    }

    return instructions;
  }

  /**
   * Get document-specific prompt
   */
  private getDocumentPrompt(documentType: string): string {
    switch (documentType) {
      case "invoice":
        return `Extract all data from this invoice. Include: vendor name, invoice number, date, line items (description, quantity, unit price, total), subtotal, tax, and total amount. Format as structured JSON.`;

      case "recipe":
        return `Extract all data from this recipe. Include: recipe name, ingredients list with quantities, step-by-step instructions, serving size, and cooking time. Format as structured JSON.`;

      case "receipt":
        return `Extract all data from this receipt. Include: vendor name, date, line items (description, price), subtotal, tax, total amount. Format as structured JSON.`;

      default:
        return `Extract all text and structured data from this document. Format as structured JSON.`;
    }
  }

  /**
   * Extract invoice data from text
   */
  private extractInvoiceData(text: string): Record<string, any> {
    return {
      vendor: this.extractField(text, "vendor", "supplier"),
      date: this.extractField(text, "date"),
      invoiceNumber: this.extractField(text, "invoice", "number"),
      total: this.extractField(text, "total", "amount"),
      items: this.extractLineItems(text),
    };
  }

  /**
   * Format structured data as fields
   */
  private formatFields(structuredData: Record<string, any>): Array<{
    name: string;
    value: any;
    confidence: number;
  }> {
    return Object.entries(structuredData).map(([name, value]) => ({
      name,
      value,
      confidence: 0.9, // Base confidence
    }));
  }

  /**
   * Generate image suggestions
   */
  private generateImageSuggestions(
    analysis: VisionAnalysis,
    metadata?: Record<string, any>
  ): string[] {
    const suggestions: string[] = [];

    if (metadata?.type === "invoice") {
      suggestions.push("Extracted invoice data can be used for 3-way matching");
      suggestions.push("Review extracted line items for accuracy");
    }

    if (analysis.objects.includes("recipe")) {
      suggestions.push("Import recipe to culinary module");
      suggestions.push("Extract ingredients and add to inventory");
    }

    if (analysis.objects.includes("ingredient")) {
      suggestions.push("Add ingredients to inventory");
      suggestions.push("Calculate recipe costs");
    }

    return suggestions;
  }

  /**
   * Generate document suggestions
   */
  private generateDocumentSuggestions(
    documentType: string,
    structuredData: Record<string, any>
  ): string[] {
    const suggestions: string[] = [];

    switch (documentType) {
      case "invoice":
        suggestions.push("Match invoice with purchase order");
        suggestions.push("Update inventory costs from invoice");
        suggestions.push("Create accounts payable entry");
        break;

      case "recipe":
        suggestions.push("Import recipe to culinary module");
        suggestions.push("Calculate recipe cost");
        suggestions.push("Add ingredients to inventory if missing");
        break;

      case "receipt":
        suggestions.push("Record expense");
        suggestions.push("Update inventory if applicable");
        break;
    }

    return suggestions;
  }

  /**
   * Convert buffer to base64
   */
  private bufferToBase64(buffer: Buffer): string {
    return buffer.toString("base64");
  }
}

// Singleton instance
let multiModalServiceInstance: MultiModalInputService | null = null;

export function getMultiModalInputService(): MultiModalInputService {
  if (!multiModalServiceInstance) {
    multiModalServiceInstance = new MultiModalInputService();
  }
  return multiModalServiceInstance;
}

export default MultiModalInputService;
