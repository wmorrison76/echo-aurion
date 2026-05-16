import { DocumentAnalysisClient, AzureKeyCredential } from '@azure/ai-form-recognizer';
import { ParseMenuDocumentFn } from '@shared/beo-types';
import fs from 'fs/promises';

// Azure Document Intelligence Configuration
const AZURE_ENDPOINT = process.env.AZURE_DOC_INTELLIGENCE_ENDPOINT || 'https://your-resource.cognitiveservices.azure.com/';
const AZURE_API_KEY = process.env.AZURE_DOC_INTELLIGENCE_KEY || 'your-api-key';

interface AzureDocResult {
  content: string;
  tables: Array<{
    rowCount: number;
    columnCount: number;
    cells: Array<{
      text: string;
      rowIndex: number;
      columnIndex: number;
      confidence: number;
    }>;
  }>;
  keyValuePairs: Array<{
    key: string;
    value: string;
    confidence: number;
  }>;
  entities: Array<{
    category: string;
    text: string;
    confidence: number;
    offset: number;
    length: number;
  }>;
}

class AzureDocIntelligenceService {
  private client: DocumentAnalysisClient;

  constructor() {
    if (!AZURE_API_KEY || AZURE_API_KEY === 'your-api-key') {
      throw new Error('Azure Document Intelligence API key not configured');
    }

    this.client = new DocumentAnalysisClient(
      AZURE_ENDPOINT,
      new AzureKeyCredential(AZURE_API_KEY)
    );
  }

  async processDocument(fileBuffer: Buffer, mimeType: string): Promise<AzureDocResult> {
    try {
      console.log(`Processing document with Azure Document Intelligence: ${mimeType}`);

      // Use the prebuilt-layout model for general document analysis
      const poller = await this.client.beginAnalyzeDocument(
        'prebuilt-layout',
        fileBuffer,
        {
          contentType: mimeType as any,
        }
      );

      const result = await poller.pollUntilDone();

      if (!result) {
        throw new Error('No result returned from Azure Document Intelligence');
      }

      return this.processAzureResponse(result);

    } catch (error) {
      console.error('Azure Document Intelligence processing error:', error);
      throw new Error(`Azure Document Intelligence processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private processAzureResponse(result: any): AzureDocResult {
    const azureResult: AzureDocResult = {
      content: result.content || '',
      tables: [],
      keyValuePairs: [],
      entities: []
    };

    // Process tables
    if (result.tables) {
      for (const table of result.tables) {
        const processedTable = {
          rowCount: table.rowCount,
          columnCount: table.columnCount,
          cells: table.cells.map((cell: any) => ({
            text: cell.content || '',
            rowIndex: cell.rowIndex,
            columnIndex: cell.columnIndex,
            confidence: cell.confidence || 0
          }))
        };
        azureResult.tables.push(processedTable);
      }
    }

    // Process key-value pairs
    if (result.keyValuePairs) {
      for (const kvp of result.keyValuePairs) {
        if (kvp.key && kvp.value) {
          azureResult.keyValuePairs.push({
            key: kvp.key.content || '',
            value: kvp.value.content || '',
            confidence: Math.min(kvp.key.confidence || 0, kvp.value.confidence || 0)
          });
        }
      }
    }

    // Process entities (if available)
    if (result.entities) {
      for (const entity of result.entities) {
        azureResult.entities.push({
          category: entity.category || 'unknown',
          text: entity.content || '',
          confidence: entity.confidence || 0,
          offset: entity.spans?.[0]?.offset || 0,
          length: entity.spans?.[0]?.length || 0
        });
      }
    }

    return azureResult;
  }

  // Convert Azure results to menu items
  processMenuItems(result: AzureDocResult): any[] {
    const items = [];

    // First, try to extract items from tables
    for (const table of result.tables) {
      const tableItems = this.parseTableForMenuItems(table);
      items.push(...tableItems);
    }

    // If no table items, try content-based extraction
    if (items.length === 0) {
      const contentItems = this.parseContentForMenuItems(result.content);
      items.push(...contentItems);
    }

    // Enhance with key-value pairs
    this.enhanceItemsWithKeyValuePairs(items, result.keyValuePairs);

    // Process entities for additional information
    this.enhanceItemsWithEntities(items, result.entities);

    return items;
  }

  private parseTableForMenuItems(table: any): any[] {
    const items = [];
    
    // Group cells by row
    const rows = new Map();
    for (const cell of table.cells) {
      if (!rows.has(cell.rowIndex)) {
        rows.set(cell.rowIndex, []);
      }
      rows.get(cell.rowIndex)[cell.columnIndex] = cell;
    }

    // Convert to array and skip potential header row
    const rowArray = Array.from(rows.entries()).sort((a, b) => a[0] - b[0]);
    const dataRows = rowArray.length > 1 && this.isHeaderRow(rowArray[0][1]) 
      ? rowArray.slice(1) 
      : rowArray;

    for (const [rowIndex, cells] of dataRows) {
      if (cells.length >= 2) {
        const item = this.parseRowAsMenuItem(cells);
        if (item) {
          items.push(item);
        }
      }
    }

    return items;
  }

  private isHeaderRow(cells: any[]): boolean {
    if (!cells || cells.length === 0) return false;
    
    const headerKeywords = ['item', 'name', 'price', 'cost', 'description', 'category', 'menu'];
    const cellTexts = cells.map(cell => (cell?.text || '').toLowerCase());
    
    return headerKeywords.some(keyword => 
      cellTexts.some(text => text.includes(keyword))
    );
  }

  private parseRowAsMenuItem(cells: any[]): any | null {
    if (!cells || cells.length < 2) return null;

    // Find name and price cells
    let nameCell = null;
    let priceCell = null;
    let descCell = null;

    // Look for price cell (contains $ or number)
    for (let i = cells.length - 1; i >= 0; i--) {
      const cell = cells[i];
      if (cell && this.containsPrice(cell.text)) {
        priceCell = cell;
        break;
      }
    }

    // Name is typically first non-empty cell
    for (const cell of cells) {
      if (cell && cell.text && cell.text.trim().length > 1 && cell !== priceCell) {
        if (!nameCell) {
          nameCell = cell;
        } else if (!descCell && cell !== nameCell) {
          descCell = cell;
        }
      }
    }

    if (!nameCell || !priceCell) return null;

    const name = nameCell.text.trim();
    const priceText = priceCell.text.trim();
    const description = descCell ? descCell.text.trim() : '';

    const price = this.extractPrice(priceText);
    if (price === 0 || name.length < 2) return null;

    return {
      category: this.determineCategory(name + ' ' + description),
      name: this.cleanItemName(name),
      desc: description,
      price,
      unit: this.determineUnit(priceText),
      dietary: this.extractDietary(name + ' ' + description),
      minGuests: this.extractMinimumGuests(name + ' ' + description)
    };
  }

  private containsPrice(text: string): boolean {
    if (!text) return false;
    return /\$\d+|\d+\.\d{2}|\d+\s*(pp|per person|each|hour|day)/i.test(text);
  }

  private parseContentForMenuItems(content: string): any[] {
    const items = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.length < 5) continue;

      // Multiple patterns to match menu items
      const patterns = [
        /^(.+?)\s*[\.\s]*\$(\d+(?:\.\d{2})?)\s*(pp|per person|each|hour|day)?/i,
        /^(.+?)\s*-\s*\$(\d+(?:\.\d{2})?)/i,
        /^(.+?)\s+(\d+(?:\.\d{2})?)\s*(pp|per person|each|hour|day)?$/i,
        /^(.+?)\s*\.\.\.\s*\$?(\d+(?:\.\d{2})?)/i
      ];

      for (const pattern of patterns) {
        const match = trimmedLine.match(pattern);
        if (match) {
          const [, name, priceStr, unit] = match;
          const price = parseFloat(priceStr);
          
          if (price > 0 && name.length > 2 && !this.isHeaderText(name)) {
            items.push({
              category: this.determineCategory(name),
              name: this.cleanItemName(name),
              desc: '',
              price,
              unit: this.determineUnit(unit || 'each'),
              dietary: this.extractDietary(name)
            });
            break;
          }
        }
      }
    }

    return items;
  }

  private isHeaderText(text: string): boolean {
    const headerPatterns = [
      /^(menu|appetizers|entrees|desserts|beverages|drinks|catering|event|package)$/i,
      /^(breakfast|lunch|dinner|brunch)$/i,
      /^(bar|wine|beer|cocktails)$/i
    ];

    return headerPatterns.some(pattern => pattern.test(text.trim()));
  }

  private enhanceItemsWithKeyValuePairs(items: any[], keyValuePairs: any[]): void {
    for (const kvp of keyValuePairs) {
      if (this.isPriceRelated(kvp.key)) {
        const price = this.extractPrice(kvp.value);
        if (price > 0) {
          // Try to match to an existing item without price
          const itemWithoutPrice = items.find(item => !item.price || item.price === 0);
          if (itemWithoutPrice) {
            itemWithoutPrice.price = price;
          }
        }
      }
    }
  }

  private enhanceItemsWithEntities(items: any[], entities: any[]): void {
    for (const entity of entities) {
      if (entity.category === 'Money' || entity.category === 'Currency') {
        const price = this.extractPrice(entity.text);
        if (price > 0) {
          // Find the closest item by position
          const nearestItem = items.find(item => 
            Math.abs(item.position - entity.offset) < 100 && (!item.price || item.price === 0)
          );
          if (nearestItem) {
            nearestItem.price = price;
          }
        }
      }
    }
  }

  private isPriceRelated(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return lowerKey.includes('price') || 
           lowerKey.includes('cost') || 
           lowerKey.includes('rate') ||
           lowerKey.includes('fee') ||
           lowerKey.includes('charge');
  }

  private extractPrice(text: string): number {
    if (!text) return 0;
    
    // Remove currency symbols and extract number
    const cleanText = text.replace(/[^\d.]/g, '');
    const price = parseFloat(cleanText);
    return isNaN(price) ? 0 : price;
  }

  private determineCategory(text: string): string {
    const lowerText = text.toLowerCase();
    
    // Food categories
    if (lowerText.match(/\b(salad|soup|appetizer|entree|main|chicken|beef|fish|pasta|rice|bread|cheese|sandwich)\b/)) {
      return 'food';
    }
    
    // Beverage categories
    if (lowerText.match(/\b(wine|beer|cocktail|beverage|drinks|bar|champagne|vodka|whiskey|soda|coffee|tea|juice)\b/)) {
      return 'beverage';
    }
    
    // AV/Technical categories
    if (lowerText.match(/\b(microphone|speaker|projector|lighting|audio|video|av|sound|technical|equipment)\b/)) {
      return 'av';
    }
    
    // Floral/Decoration categories
    if (lowerText.match(/\b(flowers|centerpiece|decoration|floral|arrangement|bouquet|plants)\b/)) {
      return 'floral';
    }
    
    // Rental categories
    if (lowerText.match(/\b(table|chair|linen|tent|equipment|rental|furniture|dishes|glassware)\b/)) {
      return 'rental';
    }
    
    // Labor/Service categories
    if (lowerText.match(/\b(staff|server|bartender|service|labor|waiter|chef|coordinator|personnel)\b/)) {
      return 'labor';
    }
    
    // Fee categories
    if (lowerText.match(/\b(fee|charge|service|gratuity|tax|deposit|delivery|setup|cleaning)\b/)) {
      return 'fee';
    }
    
    return 'food'; // Default category
  }

  private extractDietary(text: string): string[] {
    const dietary = [];
    const lowerText = text.toLowerCase();
    
    if (lowerText.match(/\b(vegetarian|veggie|no meat)\b/)) dietary.push('vegetarian');
    if (lowerText.match(/\b(vegan|plant.based|no animal)\b/)) dietary.push('vegan');
    if (lowerText.match(/\b(gluten.free|gf|no gluten)\b/)) dietary.push('gluten-free');
    if (lowerText.match(/\b(dairy.free|lactose.free|no dairy)\b/)) dietary.push('dairy-free');
    if (lowerText.match(/\b(nut.free|no nuts)\b/)) dietary.push('nut-free');
    if (lowerText.match(/\b(kosher)\b/)) dietary.push('kosher');
    if (lowerText.match(/\b(halal)\b/)) dietary.push('halal');
    if (lowerText.match(/\b(keto|ketogenic|low.carb)\b/)) dietary.push('keto');
    if (lowerText.match(/\b(paleo|paleolithic)\b/)) dietary.push('paleo');
    
    return dietary;
  }

  private determineUnit(text: string): string {
    if (!text) return 'each';
    
    const lowerText = text.toLowerCase();
    
    if (lowerText.match(/\b(pp|per person|per guest|\/person)\b/)) return 'per_person';
    if (lowerText.match(/\b(hour|hr|hourly|\/hour)\b/)) return 'hour';
    if (lowerText.match(/\b(day|daily|\/day)\b/)) return 'day';
    if (lowerText.match(/\b(package|pkg|set)\b/)) return 'package';
    if (lowerText.match(/\b(dozen|dz)\b/)) return 'dozen';
    
    return 'each';
  }

  private cleanItemName(text: string): string {
    return text
      .replace(/\$?\d+(?:\.\d{2})?/g, '') // Remove prices
      .replace(/\b(pp|per person|each|hour|day|package)\b/gi, '') // Remove units
      .replace(/\s*[\.\-]+\s*/g, ' ') // Remove dots and dashes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private extractMinimumGuests(text: string): number | undefined {
    const minMatch = text.match(/(?:minimum|min|at least)\s*(\d+)/i);
    return minMatch ? parseInt(minMatch[1]) : undefined;
  }
}

// Production Azure Document Intelligence parser implementation
export const azureDocIntelligenceParser: ParseMenuDocumentFn = async ({ venueId, fileUrl, mime }) => {
  try {
    console.log(`Azure Document Intelligence processing document for venue ${venueId}: ${fileUrl}`);
    
    const service = new AzureDocIntelligenceService();
    
    // Read file from local path or download from URL
    let fileBuffer: Buffer;
    
    if (fileUrl.startsWith('http')) {
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else {
      fileBuffer = await fs.readFile(fileUrl);
    }

    // Process with Azure Document Intelligence
    const result = await service.processDocument(fileBuffer, mime);
    
    // Convert to menu items
    const items = service.processMenuItems(result);

    const notes = [
      `Processed by Azure Document Intelligence`,
      `Found ${result.tables.length} tables`,
      `Found ${result.keyValuePairs.length} key-value pairs`,
      `Found ${result.entities.length} entities`,
      `Extracted ${items.length} menu items`,
      `Document type: ${mime}`
    ];

    return {
      items: items.slice(0, 50), // Limit to 50 items
      notes
    };

  } catch (error) {
    console.error('Azure Document Intelligence parser error:', error);
    
    return {
      items: [],
      notes: [
        `Azure Document Intelligence processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'Check Azure credentials and endpoint configuration'
      ]
    };
  }
};

export { AzureDocIntelligenceService };
