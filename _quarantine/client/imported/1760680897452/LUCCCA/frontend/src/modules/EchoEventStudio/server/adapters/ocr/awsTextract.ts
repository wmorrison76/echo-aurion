import { TextractClient, AnalyzeDocumentCommand, DetectDocumentTextCommand } from '@aws-sdk/client-textract';
import { ParseMenuDocumentFn } from '@shared/beo-types';
import fs from 'fs/promises';

// AWS Textract Configuration
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

interface TextractResult {
  blocks: Array<{
    blockType: string;
    text?: string;
    confidence: number;
    geometry?: {
      boundingBox: {
        width: number;
        height: number;
        left: number;
        top: number;
      };
    };
    relationships?: Array<{
      type: string;
      ids: string[];
    }>;
  }>;
  tables: Array<{
    rows: Array<{
      cells: Array<{
        text: string;
        confidence: number;
        rowIndex: number;
        columnIndex: number;
      }>;
    }>;
  }>;
  forms: Array<{
    key: string;
    value: string;
    confidence: number;
  }>;
}

class AWSTextractService {
  private client: TextractClient;

  constructor() {
    this.client = new TextractClient({
      region: AWS_REGION,
      credentials: AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY ? {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      } : undefined, // Use default credentials if not provided
    });
  }

  async processDocument(fileBuffer: Buffer, mimeType: string): Promise<TextractResult> {
    try {
      console.log(`Processing document with AWS Textract: ${mimeType}`);

      // Determine which Textract API to use based on requirements
      const useAnalyze = mimeType === 'application/pdf' || this.isComplexDocument(fileBuffer);
      
      let command;
      if (useAnalyze) {
        // Use AnalyzeDocument for tables and forms
        command = new AnalyzeDocumentCommand({
          Document: {
            Bytes: fileBuffer,
          },
          FeatureTypes: ['TABLES', 'FORMS'],
        });
      } else {
        // Use DetectDocumentText for simple text extraction
        command = new DetectDocumentTextCommand({
          Document: {
            Bytes: fileBuffer,
          },
        });
      }

      const response = await this.client.send(command);
      
      if (!response.Blocks) {
        throw new Error('No blocks returned from AWS Textract');
      }

      return this.processTextractResponse(response.Blocks);

    } catch (error) {
      console.error('AWS Textract processing error:', error);
      throw new Error(`AWS Textract processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private isComplexDocument(fileBuffer: Buffer): boolean {
    // Simple heuristic to determine if document likely contains tables
    const content = fileBuffer.toString('ascii', 0, Math.min(1000, fileBuffer.length));
    return content.includes('$') && (content.includes('\t') || content.split('\n').length > 10);
  }

  private processTextractResponse(blocks: any[]): TextractResult {
    const result: TextractResult = {
      blocks: [],
      tables: [],
      forms: []
    };

    // Process blocks
    const blockMap = new Map();
    const tableBlocks = [];
    const cellBlocks = [];

    for (const block of blocks) {
      blockMap.set(block.Id, block);
      
      result.blocks.push({
        blockType: block.BlockType,
        text: block.Text,
        confidence: block.Confidence || 0,
        geometry: block.Geometry ? {
          boundingBox: {
            width: block.Geometry.BoundingBox.Width,
            height: block.Geometry.BoundingBox.Height,
            left: block.Geometry.BoundingBox.Left,
            top: block.Geometry.BoundingBox.Top,
          }
        } : undefined,
        relationships: block.Relationships?.map((rel: any) => ({
          type: rel.Type,
          ids: rel.Ids
        }))
      });

      if (block.BlockType === 'TABLE') {
        tableBlocks.push(block);
      } else if (block.BlockType === 'CELL') {
        cellBlocks.push(block);
      }
    }

    // Process tables
    for (const tableBlock of tableBlocks) {
      const table = this.extractTable(tableBlock, blockMap);
      if (table.rows.length > 0) {
        result.tables.push(table);
      }
    }

    // Process forms (key-value pairs)
    const keyValueBlocks = blocks.filter(block => 
      block.BlockType === 'KEY_VALUE_SET' && block.EntityTypes?.includes('KEY')
    );

    for (const keyBlock of keyValueBlocks) {
      const form = this.extractKeyValue(keyBlock, blockMap);
      if (form) {
        result.forms.push(form);
      }
    }

    return result;
  }

  private extractTable(tableBlock: any, blockMap: Map<string, any>) {
    const table = { rows: [] as any[] };
    
    if (!tableBlock.Relationships) return table;

    const cellRelationship = tableBlock.Relationships.find((rel: any) => rel.Type === 'CHILD');
    if (!cellRelationship) return table;

    // Group cells by row
    const rowMap = new Map();
    
    for (const cellId of cellRelationship.Ids) {
      const cellBlock = blockMap.get(cellId);
      if (cellBlock && cellBlock.BlockType === 'CELL') {
        const rowIndex = cellBlock.RowIndex;
        const columnIndex = cellBlock.ColumnIndex;
        
        if (!rowMap.has(rowIndex)) {
          rowMap.set(rowIndex, []);
        }
        
        const cellText = this.extractCellText(cellBlock, blockMap);
        rowMap.get(rowIndex)[columnIndex] = {
          text: cellText,
          confidence: cellBlock.Confidence || 0,
          rowIndex,
          columnIndex
        };
      }
    }

    // Convert to rows array
    for (const [rowIndex, cells] of rowMap.entries()) {
      table.rows[rowIndex] = { cells: cells.filter(cell => cell) };
    }

    return table;
  }

  private extractCellText(cellBlock: any, blockMap: Map<string, any>): string {
    if (!cellBlock.Relationships) return '';

    const childRelationship = cellBlock.Relationships.find((rel: any) => rel.Type === 'CHILD');
    if (!childRelationship) return '';

    let text = '';
    for (const childId of childRelationship.Ids) {
      const childBlock = blockMap.get(childId);
      if (childBlock && childBlock.Text) {
        text += childBlock.Text + ' ';
      }
    }

    return text.trim();
  }

  private extractKeyValue(keyBlock: any, blockMap: Map<string, any>) {
    if (!keyBlock.Relationships) return null;

    const valueRelationship = keyBlock.Relationships.find((rel: any) => rel.Type === 'VALUE');
    if (!valueRelationship || valueRelationship.Ids.length === 0) return null;

    const valueBlock = blockMap.get(valueRelationship.Ids[0]);
    if (!valueBlock) return null;

    const keyText = this.extractCellText(keyBlock, blockMap);
    const valueText = this.extractCellText(valueBlock, blockMap);

    return {
      key: keyText,
      value: valueText,
      confidence: Math.min(keyBlock.Confidence || 0, valueBlock.Confidence || 0)
    };
  }

  // Convert Textract results to menu items
  processMenuItems(result: TextractResult): any[] {
    const items = [];

    // First, try to extract items from tables
    for (const table of result.tables) {
      const tableItems = this.parseTableForMenuItems(table);
      items.push(...tableItems);
    }

    // If no table items, try text-based extraction
    if (items.length === 0) {
      const textItems = this.parseTextForMenuItems(result.blocks);
      items.push(...textItems);
    }

    // Check forms for additional pricing information
    for (const form of result.forms) {
      if (this.isPriceRelated(form.key)) {
        this.enhanceItemsWithFormData(items, form);
      }
    }

    return items;
  }

  private parseTableForMenuItems(table: any): any[] {
    const items = [];
    
    // Skip header row if it exists
    const dataRows = table.rows.length > 1 && this.isHeaderRow(table.rows[0]) 
      ? table.rows.slice(1) 
      : table.rows;

    for (const row of dataRows) {
      if (row.cells.length >= 2) {
        const item = this.parseRowAsMenuItem(row);
        if (item) {
          items.push(item);
        }
      }
    }

    return items;
  }

  private isHeaderRow(row: any): boolean {
    if (!row.cells || row.cells.length === 0) return false;
    
    const headerKeywords = ['item', 'name', 'price', 'cost', 'description', 'category'];
    const cellTexts = row.cells.map((cell: any) => cell.text.toLowerCase());
    
    return headerKeywords.some(keyword => 
      cellTexts.some((text: string) => text.includes(keyword))
    );
  }

  private parseRowAsMenuItem(row: any): any | null {
    const cells = row.cells;
    if (cells.length < 2) return null;

    // Assume first cell is name, last cell is price
    const nameCell = cells[0];
    const priceCell = cells[cells.length - 1];
    const descCell = cells.length > 2 ? cells[1] : null;

    const name = nameCell.text.trim();
    const priceText = priceCell.text.trim();
    const description = descCell ? descCell.text.trim() : '';

    if (!name || name.length < 2) return null;

    const price = this.extractPrice(priceText);
    if (price === 0) return null; // Skip items without valid prices

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

  private parseTextForMenuItems(blocks: any[]): any[] {
    const items = [];
    const textBlocks = blocks.filter(block => 
      block.blockType === 'LINE' && block.text && block.text.trim().length > 0
    );

    for (const block of textBlocks) {
      const text = block.text.trim();
      
      // Look for menu item patterns
      const patterns = [
        /^(.+?)\s*[\.\s]*\$(\d+(?:\.\d{2})?)\s*(pp|per person|each|hour|day)?/i,
        /^(.+?)\s*-\s*\$(\d+(?:\.\d{2})?)/i,
        /^(.+?)\s+(\d+(?:\.\d{2})?)\s*(pp|per person|each|hour|day)?/i
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          const [, name, priceStr, unit] = match;
          const price = parseFloat(priceStr);
          
          if (price > 0 && name.length > 2) {
            items.push({
              category: this.determineCategory(name),
              name: this.cleanItemName(name),
              desc: '',
              price,
              unit: this.determineUnit(unit || 'each'),
              dietary: this.extractDietary(name)
            });
            break; // Only match first pattern
          }
        }
      }
    }

    return items;
  }

  private isPriceRelated(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return lowerKey.includes('price') || 
           lowerKey.includes('cost') || 
           lowerKey.includes('rate') ||
           lowerKey.includes('fee');
  }

  private enhanceItemsWithFormData(items: any[], form: any): void {
    // Try to match form data to existing items
    const formValue = parseFloat(form.value.replace(/[^\d.]/g, ''));
    if (formValue > 0) {
      // Simple heuristic: apply to items without prices
      const itemsWithoutPrices = items.filter(item => !item.price || item.price === 0);
      if (itemsWithoutPrices.length === 1) {
        itemsWithoutPrices[0].price = formValue;
      }
    }
  }

  private extractPrice(text: string): number {
    const cleanText = text.replace(/[^\d.]/g, '');
    const price = parseFloat(cleanText);
    return isNaN(price) ? 0 : price;
  }

  private determineCategory(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.match(/\b(salad|soup|appetizer|entree|main|chicken|beef|fish|pasta|rice|food)\b/)) {
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
    
    return 'food';
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
    if (!text) return 'each';
    
    const lowerText = text.toLowerCase();
    
    if (lowerText.match(/\b(pp|per person|per guest)\b/)) return 'per_person';
    if (lowerText.match(/\b(hour|hr|hourly)\b/)) return 'hour';
    if (lowerText.match(/\b(day|daily)\b/)) return 'day';
    if (lowerText.match(/\b(package|pkg)\b/)) return 'package';
    
    return 'each';
  }

  private cleanItemName(text: string): string {
    return text
      .replace(/\$?\d+(?:\.\d{2})?/g, '') // Remove prices
      .replace(/\b(pp|per person|each|hour|day)\b/gi, '') // Remove units
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private extractMinimumGuests(text: string): number | undefined {
    const minMatch = text.match(/(?:minimum|min)\s*(\d+)/i);
    return minMatch ? parseInt(minMatch[1]) : undefined;
  }
}

// Production AWS Textract parser implementation
export const awsTextractParser: ParseMenuDocumentFn = async ({ venueId, fileUrl, mime }) => {
  try {
    console.log(`AWS Textract processing document for venue ${venueId}: ${fileUrl}`);
    
    const service = new AWSTextractService();
    
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

    // Process with AWS Textract
    const result = await service.processDocument(fileBuffer, mime);
    
    // Convert to menu items
    const items = service.processMenuItems(result);

    const notes = [
      `Processed by AWS Textract`,
      `Found ${result.blocks.length} text blocks`,
      `Found ${result.tables.length} tables`,
      `Extracted ${items.length} menu items`,
      `Document type: ${mime}`
    ];

    return {
      items: items.slice(0, 50), // Limit to 50 items
      notes
    };

  } catch (error) {
    console.error('AWS Textract parser error:', error);
    
    return {
      items: [],
      notes: [
        `AWS Textract processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'Check AWS credentials and region configuration'
      ]
    };
  }
};

export { AWSTextractService };

export default awsTextractParser;
