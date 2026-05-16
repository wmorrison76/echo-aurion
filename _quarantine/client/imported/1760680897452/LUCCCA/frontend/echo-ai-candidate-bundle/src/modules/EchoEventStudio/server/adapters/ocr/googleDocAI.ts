import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { ParseMenuDocumentFn } from '@shared/beo-types';
import fs from 'fs/promises';
import path from 'path';

// Google Document AI Configuration
const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'your-project-id';
const GOOGLE_LOCATION = process.env.GOOGLE_LOCATION || 'us'; // us, eu
const GOOGLE_PROCESSOR_ID = process.env.GOOGLE_PROCESSOR_ID || 'your-processor-id';

interface GoogleDocAIResult {
  entities: Array<{
    type: string;
    mentionText: string;
    confidence: number;
    boundingBox?: Array<{ x: number; y: number }>;
  }>;
  tables: Array<{
    headerRows: Array<{ cells: Array<{ text: string; confidence: number }> }>;
    bodyRows: Array<{ cells: Array<{ text: string; confidence: number }> }>;
  }>;
  text: string;
  confidence: number;
}

class GoogleDocAIService {
  private client: DocumentProcessorServiceClient;
  private processorName: string;

  constructor() {
    // Initialize Google Document AI client
    this.client = new DocumentProcessorServiceClient({
      // Authentication via service account key or application default credentials
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      projectId: GOOGLE_PROJECT_ID,
    });

    this.processorName = this.client.processorPath(
      GOOGLE_PROJECT_ID,
      GOOGLE_LOCATION,
      GOOGLE_PROCESSOR_ID
    );
  }

  async processDocument(fileBuffer: Buffer, mimeType: string): Promise<GoogleDocAIResult> {
    try {
      console.log(`Processing document with Google DocAI: ${mimeType}`);

      const request = {
        name: this.processorName,
        rawDocument: {
          content: fileBuffer.toString('base64'),
          mimeType: mimeType,
        },
      };

      const [result] = await this.client.processDocument(request);
      const document = result.document;

      if (!document) {
        throw new Error('No document returned from Google DocAI');
      }

      // Extract text
      const text = document.text || '';

      // Extract entities (menu items, prices, etc.)
      const entities = (document.entities || []).map(entity => ({
        type: entity.type || 'unknown',
        mentionText: entity.mentionText || '',
        confidence: entity.confidence || 0,
        boundingBox: entity.pageAnchor?.pageRefs?.[0]?.boundingPoly?.normalizedVertices?.map(vertex => ({
          x: vertex.x || 0,
          y: vertex.y || 0
        }))
      }));

      // Extract tables
      const tables = (document.pages || []).flatMap(page =>
        (page.tables || []).map(table => ({
          headerRows: (table.headerRows || []).map(row => ({
            cells: (row.cells || []).map(cell => ({
              text: this.extractCellText(cell, text),
              confidence: cell.layout?.confidence || 0
            }))
          })),
          bodyRows: (table.bodyRows || []).map(row => ({
            cells: (row.cells || []).map(cell => ({
              text: this.extractCellText(cell, text),
              confidence: cell.layout?.confidence || 0
            }))
          }))
        }))
      );

      return {
        entities,
        tables,
        text,
        confidence: result.document?.pages?.[0]?.layout?.confidence || 0
      };

    } catch (error) {
      console.error('Google DocAI processing error:', error);
      throw new Error(`Google DocAI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractCellText(cell: any, fullText: string): string {
    if (!cell.layout?.textAnchor?.textSegments) return '';
    
    return cell.layout.textAnchor.textSegments
      .map((segment: any) => {
        const startIndex = parseInt(segment.startIndex || '0');
        const endIndex = parseInt(segment.endIndex || fullText.length.toString());
        return fullText.substring(startIndex, endIndex);
      })
      .join('');
  }

  // Classify extracted entities into menu categories
  private classifyMenuItems(entities: GoogleDocAIResult['entities'], text: string) {
    const menuItems = [];
    
    for (const entity of entities) {
      if (entity.type === 'MENU_ITEM' || entity.confidence > 0.8) {
        const item = this.parseMenuItem(entity.mentionText, text);
        if (item) {
          menuItems.push(item);
        }
      }
    }

    return menuItems;
  }

  private parseMenuItem(itemText: string, fullText: string) {
    // Extract price from item text or surrounding context
    const pricePattern = /\$?(\d+(?:\.\d{2})?)/g;
    const priceMatch = itemText.match(pricePattern);
    
    // Determine category based on keywords
    const category = this.determineCategory(itemText);
    
    // Extract dietary restrictions
    const dietary = this.extractDietary(itemText);
    
    return {
      category,
      name: this.cleanItemName(itemText),
      desc: this.extractDescription(itemText, fullText),
      price: priceMatch ? parseFloat(priceMatch[0].replace('$', '')) : 0,
      unit: this.determineUnit(itemText),
      dietary,
      minGuests: this.extractMinimumGuests(itemText)
    };
  }

  private determineCategory(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.match(/\b(salad|soup|appetizer|entree|main|chicken|beef|fish|pasta|rice)\b/)) {
      return 'food';
    }
    if (lowerText.match(/\b(wine|beer|cocktail|beverage|drinks|bar|champagne|vodka|whiskey)\b/)) {
      return 'beverage';
    }
    if (lowerText.match(/\b(microphone|speaker|projector|lighting|audio|video|av|sound)\b/)) {
      return 'av';
    }
    if (lowerText.match(/\b(flowers|centerpiece|decoration|floral|arrangement)\b/)) {
      return 'floral';
    }
    if (lowerText.match(/\b(table|chair|linen|tent|equipment|rental)\b/)) {
      return 'rental';
    }
    if (lowerText.match(/\b(staff|server|bartender|service|labor|waiter)\b/)) {
      return 'labor';
    }
    if (lowerText.match(/\b(fee|charge|service|gratuity|tax|deposit)\b/)) {
      return 'fee';
    }
    
    return 'food'; // Default category
  }

  private extractDietary(text: string): string[] {
    const dietary = [];
    const lowerText = text.toLowerCase();
    
    if (lowerText.match(/\b(vegetarian|veggie)\b/)) dietary.push('vegetarian');
    if (lowerText.match(/\b(vegan|plant.based)\b/)) dietary.push('vegan');
    if (lowerText.match(/\b(gluten.free|gf)\b/)) dietary.push('gluten-free');
    if (lowerText.match(/\b(dairy.free|lactose.free)\b/)) dietary.push('dairy-free');
    if (lowerText.match(/\b(nut.free)\b/)) dietary.push('nut-free');
    if (lowerText.match(/\b(kosher)\b/)) dietary.push('kosher');
    if (lowerText.match(/\b(halal)\b/)) dietary.push('halal');
    
    return dietary;
  }

  private determineUnit(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.match(/\b(pp|per person|per guest)\b/)) return 'per_person';
    if (lowerText.match(/\b(hour|hr|hourly)\b/)) return 'hour';
    if (lowerText.match(/\b(day|daily)\b/)) return 'day';
    if (lowerText.match(/\b(package|pkg)\b/)) return 'package';
    
    return 'each';
  }

  private cleanItemName(text: string): string {
    // Remove price information and clean up the name
    return text
      .replace(/\$?\d+(?:\.\d{2})?/g, '') // Remove prices
      .replace(/\b(pp|per person|each|hour|day)\b/gi, '') // Remove units
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private extractDescription(itemText: string, fullText: string): string {
    // Try to find description near the item in full text
    const itemIndex = fullText.indexOf(itemText);
    if (itemIndex === -1) return '';
    
    // Look for description in the next 100 characters
    const contextEnd = Math.min(itemIndex + itemText.length + 100, fullText.length);
    const context = fullText.substring(itemIndex + itemText.length, contextEnd);
    
    // Extract description (usually after a dash, colon, or parentheses)
    const descMatch = context.match(/[:\-\(]\s*([^\.:\-\n]{10,80})/);
    return descMatch ? descMatch[1].trim() : '';
  }

  private extractMinimumGuests(text: string): number | undefined {
    const minMatch = text.match(/(?:minimum|min)\s*(\d+)/i);
    return minMatch ? parseInt(minMatch[1]) : undefined;
  }
}

// Production Google DocAI parser implementation
export const googleDocAIParser: ParseMenuDocumentFn = async ({ venueId, fileUrl, mime }) => {
  try {
    console.log(`Google DocAI processing document for venue ${venueId}: ${fileUrl}`);
    
    const service = new GoogleDocAIService();
    
    // Read file from local path or download from URL
    let fileBuffer: Buffer;
    
    if (fileUrl.startsWith('http')) {
      // Download from URL
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else {
      // Read from local file system
      fileBuffer = await fs.readFile(fileUrl);
    }

    // Process with Google DocAI
    const result = await service.processDocument(fileBuffer, mime);
    
    // Convert Google DocAI result to our format
    const items = [];
    
    // Process tables first (more structured data)
    for (const table of result.tables) {
      const tableItems = service.parseTableItems(table);
      items.push(...tableItems);
    }
    
    // Process entities if we don't have enough items from tables
    if (items.length < 5) {
      const entityItems = service.classifyMenuItems(result.entities, result.text);
      items.push(...entityItems);
    }
    
    // If still not enough items, fall back to text parsing
    if (items.length < 3) {
      const textItems = service.parseTextForItems(result.text);
      items.push(...textItems);
    }

    const notes = [
      `Processed by Google Document AI`,
      `Confidence: ${Math.round(result.confidence * 100)}%`,
      `Found ${items.length} items`,
      `Document type: ${mime}`
    ];

    return {
      items: items.slice(0, 50), // Limit to 50 items
      notes
    };

  } catch (error) {
    console.error('Google DocAI parser error:', error);
    
    // Fallback to basic text parsing if DocAI fails
    return {
      items: [],
      notes: [
        `Google DocAI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'Falling back to basic text extraction would be implemented here'
      ]
    };
  }
};

// Extend the service class with additional parsing methods
declare module './googleDocAI' {
  namespace GoogleDocAIService {
    interface GoogleDocAIService {
      parseTableItems(table: any): any[];
      parseTextForItems(text: string): any[];
    }
  }
}

// Add methods to the service class
Object.assign(GoogleDocAIService.prototype, {
  parseTableItems(table: any) {
    const items = [];
    
    // Process each row in the table
    for (const row of table.bodyRows) {
      if (row.cells.length >= 2) {
        const nameCell = row.cells[0];
        const priceCell = row.cells[row.cells.length - 1];
        
        const name = nameCell.text.trim();
        const priceText = priceCell.text.trim();
        const price = this.extractPrice(priceText);
        
        if (name && price > 0) {
          items.push({
            category: this.determineCategory(name),
            name: this.cleanItemName(name),
            desc: row.cells[1]?.text?.trim() || '',
            price,
            unit: this.determineUnit(priceText),
            dietary: this.extractDietary(name),
            minGuests: this.extractMinimumGuests(name)
          });
        }
      }
    }
    
    return items;
  },

  parseTextForItems(text: string) {
    const items = [];
    const lines = text.split('\n');
    
    // Pattern to match menu items with prices
    const itemPattern = /^(.+?)\s*[\.\s]*\$?(\d+(?:\.\d{2})?)\s*(pp|per person|each|hour|day)?/i;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.length < 5) continue;
      
      const match = trimmedLine.match(itemPattern);
      if (match) {
        const [, name, priceStr, unit] = match;
        const price = parseFloat(priceStr);
        
        if (price > 0) {
          items.push({
            category: this.determineCategory(name),
            name: this.cleanItemName(name),
            desc: '',
            price,
            unit: this.determineUnit(unit || 'each'),
            dietary: this.extractDietary(name)
          });
        }
      }
    }
    
    return items;
  },

  extractPrice(text: string): number {
    const cleanText = text.replace(/[^\d.]/g, '');
    const price = parseFloat(cleanText);
    return isNaN(price) ? 0 : price;
  }
});

export { GoogleDocAIService };
