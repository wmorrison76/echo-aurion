import { RequestHandler } from "express";
import { ParseMenuDocumentFn, AutoBuildBeoFn, ItemCategory, Unit } from "@shared/beo-types";
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'documents');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/tiff',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'), false);
    }
  }
});

// Default implementation of ParseMenuDocument (stub for now, can be replaced with actual OCR)
const defaultParseMenuDocument: ParseMenuDocumentFn = async ({ venueId, fileUrl, mime }) => {
  console.log(`Processing document for venue ${venueId}: ${fileUrl} (${mime})`);
  
  // Simulate OCR processing time
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Return sample parsed data - in production this would use Google DocAI, Textract, or Azure
  const sampleItems = [
    {
      category: 'food' as ItemCategory,
      name: 'Caesar Salad',
      desc: 'Romaine lettuce, parmesan cheese, croutons, caesar dressing',
      price: 12.50,
      unit: 'per_person' as Unit,
      dietary: ['vegetarian'],
      minGuests: 10
    },
    {
      category: 'food' as ItemCategory,
      name: 'Grilled Chicken Breast',
      desc: 'Herb-marinated chicken with seasonal vegetables',
      price: 28.00,
      unit: 'per_person' as Unit,
      dietary: ['gluten-free'],
      minGuests: 15
    },
    {
      category: 'beverage' as ItemCategory,
      name: 'House Wine Selection',
      desc: 'Choice of Cabernet Sauvignon or Chardonnay',
      price: 35.00,
      unit: 'each' as Unit,
      minGuests: 1
    },
    {
      category: 'av' as ItemCategory,
      name: 'Basic Audio Package',
      desc: 'Wireless microphones, speakers, basic lighting',
      price: 450.00,
      unit: 'package' as Unit,
      minGuests: 1
    },
    {
      category: 'rental' as ItemCategory,
      name: 'Round Tables (60")',
      desc: '60-inch round tables, seats 8-10 guests',
      price: 15.00,
      unit: 'each' as Unit,
      minGuests: 1
    },
    {
      category: 'labor' as ItemCategory,
      name: 'Service Staff',
      desc: 'Professional wait staff for event service',
      price: 25.00,
      unit: 'hour' as Unit,
      minGuests: 1
    },
    {
      category: 'fee' as ItemCategory,
      name: 'Event Coordination',
      desc: 'Day-of event coordination services',
      price: 350.00,
      unit: 'each' as Unit,
      minGuests: 1
    }
  ];

  const notes = [
    'All food prices are per person unless otherwise noted',
    'Service charge of 20% will be added to final bill',
    'Final guest count required 72 hours before event',
    'Setup and breakdown included in venue rental'
  ];

  return { items: sampleItems, notes };
};

// Advanced OCR processing with multiple providers
const processWithOCR = async (filePath: string, mimeType: string) => {
  try {
    // This would integrate with actual OCR services
    // Priority order: Google DocAI -> AWS Textract -> Azure Document Intelligence
    
    if (mimeType === 'application/pdf') {
      return await processWithDocumentAI(filePath);
    } else if (mimeType.startsWith('image/')) {
      return await processWithTextract(filePath);
    } else if (mimeType.includes('word')) {
      return await processWordDocument(filePath);
    }
    
    throw new Error(`Unsupported document type: ${mimeType}`);
  } catch (error) {
    console.error('OCR processing failed:', error);
    throw error;
  }
};

// Stub implementations for OCR providers
const processWithDocumentAI = async (filePath: string) => {
  // Google Document AI implementation would go here
  console.log('Processing with Google Document AI:', filePath);
  return { text: 'Sample extracted text', tables: [], confidence: 0.95 };
};

const processWithTextract = async (filePath: string) => {
  // AWS Textract implementation would go here
  console.log('Processing with AWS Textract:', filePath);
  return { text: 'Sample extracted text', tables: [], confidence: 0.90 };
};

const processWithAzureDocumentIntelligence = async (filePath: string) => {
  // Azure Document Intelligence implementation would go here
  console.log('Processing with Azure Document Intelligence:', filePath);
  return { text: 'Sample extracted text', tables: [], confidence: 0.88 };
};

const processWordDocument = async (filePath: string) => {
  // Word document processing (could use mammoth.js or similar)
  console.log('Processing Word document:', filePath);
  return { text: 'Sample extracted text', tables: [], confidence: 0.92 };
};

// Text normalization and structuring
const normalizeExtractedText = (extractedData: any) => {
  const { text, tables } = extractedData;
  
  // Regex patterns for common menu formats
  const itemPatterns = [
    /^(.+?)\s*\$?(\d+\.?\d*)\s*(pp|per person|each|hour|day)?/gm,
    /^(.+?)[\s\.]+\$?(\d+\.?\d*)$/gm,
    /^(.+?)\s*-\s*(.+?)\s*\$?(\d+\.?\d*)/gm
  ];
  
  const items: any[] = [];
  
  // Process tables first (more structured data)
  tables.forEach((table: any) => {
    table.rows?.forEach((row: any) => {
      if (row.cells?.length >= 2) {
        const name = row.cells[0]?.text?.trim();
        const priceText = row.cells[row.cells.length - 1]?.text?.trim();
        const price = extractPrice(priceText);
        
        if (name && price > 0) {
          items.push({
            name,
            price,
            description: row.cells[1]?.text?.trim() || '',
            confidence: 0.9
          });
        }
      }
    });
  });
  
  // Process free text if tables didn't yield enough results
  if (items.length < 3) {
    itemPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const name = match[1]?.trim();
        const price = parseFloat(match[2]);
        const unit = match[3]?.toLowerCase();
        
        if (name && price > 0) {
          items.push({
            name,
            price,
            unit: normalizeUnit(unit),
            confidence: 0.7
          });
        }
      }
    });
  }
  
  return items.slice(0, 50); // Limit to 50 items
};

const extractPrice = (text: string): number => {
  const cleanText = text.replace(/[^\d.]/g, '');
  const price = parseFloat(cleanText);
  return isNaN(price) ? 0 : price;
};

const normalizeUnit = (unit?: string): Unit => {
  if (!unit) return 'each';
  
  const unitMap: Record<string, Unit> = {
    'pp': 'per_person',
    'per person': 'per_person',
    'perperson': 'per_person',
    'each': 'each',
    'hour': 'hour',
    'hr': 'hour',
    'day': 'day',
    'package': 'package',
    'pkg': 'package'
  };
  
  return unitMap[unit.toLowerCase()] || 'each';
};

// Item classification using taxonomy and embeddings
const classifyItems = async (items: any[]) => {
  return items.map(item => {
    const category = inferCategory(item.name, item.description);
    const dietary = inferDietary(item.name, item.description);
    
    return {
      ...item,
      category,
      dietary
    };
  });
};

const inferCategory = (name: string, description: string = ''): ItemCategory => {
  const text = `${name} ${description}`.toLowerCase();
  
  // Food keywords
  if (text.match(/\b(salad|chicken|beef|fish|pasta|soup|appetizer|entree|dessert|bread|cheese)\b/)) {
    return 'food';
  }
  
  // Beverage keywords
  if (text.match(/\b(wine|beer|cocktail|coffee|tea|juice|water|soda|bar|beverage)\b/)) {
    return 'beverage';
  }
  
  // AV keywords
  if (text.match(/\b(audio|video|microphone|speaker|projector|screen|lighting|sound)\b/)) {
    return 'av';
  }
  
  // Floral keywords
  if (text.match(/\b(flower|floral|arrangement|centerpiece|bouquet|decoration)\b/)) {
    return 'floral';
  }
  
  // Rental keywords
  if (text.match(/\b(table|chair|tent|linen|plate|glass|utensil|rental|equipment)\b/)) {
    return 'rental';
  }
  
  // Labor keywords
  if (text.match(/\b(staff|server|bartender|chef|coordinator|service|labor|waiter)\b/)) {
    return 'labor';
  }
  
  // Fee keywords
  if (text.match(/\b(fee|charge|gratuity|service|coordination|setup|delivery)\b/)) {
    return 'fee';
  }
  
  // Default to food if unclear
  return 'food';
};

const inferDietary = (name: string, description: string = ''): string[] => {
  const text = `${name} ${description}`.toLowerCase();
  const dietary: string[] = [];
  
  if (text.match(/\b(vegetarian|veggie|no meat)\b/)) {
    dietary.push('vegetarian');
  }
  
  if (text.match(/\b(vegan|plant-based|no dairy|no animal)\b/)) {
    dietary.push('vegan');
  }
  
  if (text.match(/\b(gluten.?free|gf|no gluten|celiac)\b/)) {
    dietary.push('gluten-free');
  }
  
  if (text.match(/\b(dairy.?free|lactose.?free|no dairy)\b/)) {
    dietary.push('dairy-free');
  }
  
  if (text.match(/\b(nut.?free|no nuts|allergy)\b/)) {
    dietary.push('nut-free');
  }
  
  if (text.match(/\b(kosher|halal)\b/)) {
    dietary.push(text.includes('kosher') ? 'kosher' : 'halal');
  }
  
  return dietary;
};

// API Routes
export const uploadDocument: RequestHandler = upload.single('document');

export const processDocument: RequestHandler = async (req, res) => {
  try {
    const { venueId } = req.params;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No file uploaded' }
      });
    }
    
    if (!venueId) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_VENUE', message: 'Venue ID required' }
      });
    }
    
    // Process the document
    const result = await defaultParseMenuDocument({
      venueId,
      fileUrl: file.path,
      mime: file.mimetype
    });
    
    // In production, you would:
    // 1. Store the file in S3/cloud storage
    // 2. Queue OCR processing job
    // 3. Store results in database
    // 4. Send webhooks/notifications
    
    res.json({
      success: true,
      data: {
        documentId: `doc_${Date.now()}`,
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        processedItems: result.items.length,
        items: result.items,
        notes: result.notes,
        processingTime: '2.3s',
        confidence: 0.89
      }
    });
    
    // Clean up uploaded file
    setTimeout(async () => {
      try {
        await fs.unlink(file.path);
      } catch (error) {
        console.error('Failed to cleanup uploaded file:', error);
      }
    }, 5000);
    
  } catch (error) {
    console.error('Document processing error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROCESSING_ERROR',
        message: 'Failed to process document',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
};

export const reprocessDocument: RequestHandler = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { provider } = req.body; // 'docai', 'textract', 'azure'
    
    // In production, retrieve document from storage and reprocess with specified provider
    console.log(`Reprocessing document ${documentId} with provider ${provider}`);
    
    res.json({
      success: true,
      data: {
        documentId,
        status: 'reprocessing',
        estimatedTime: '30 seconds'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'REPROCESS_ERROR',
        message: 'Failed to reprocess document'
      }
    });
  }
};

export const getProcessingStatus: RequestHandler = async (req, res) => {
  try {
    const { documentId } = req.params;
    
    // In production, check processing status from queue/database
    res.json({
      success: true,
      data: {
        documentId,
        status: 'completed',
        progress: 100,
        processingTime: '2.3s',
        itemsFound: 15,
        confidence: 0.89,
        errors: []
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_ERROR',
        message: 'Failed to get processing status'
      }
    });
  }
};

export const validateParsedItems: RequestHandler = async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ITEMS', message: 'Items must be an array' }
      });
    }
    
    const validatedItems = items.map((item, index) => {
      const errors: string[] = [];
      
      if (!item.name?.trim()) {
        errors.push('Name is required');
      }
      
      if (!item.category || !['food', 'beverage', 'av', 'floral', 'rental', 'labor', 'fee'].includes(item.category)) {
        errors.push('Valid category is required');
      }
      
      if (typeof item.price !== 'number' || item.price < 0) {
        errors.push('Valid price is required');
      }
      
      return {
        index,
        item,
        isValid: errors.length === 0,
        errors
      };
    });
    
    const totalItems = validatedItems.length;
    const validItems = validatedItems.filter(v => v.isValid).length;
    const invalidItems = totalItems - validItems;
    
    res.json({
      success: true,
      data: {
        totalItems,
        validItems,
        invalidItems,
        validationRate: totalItems > 0 ? (validItems / totalItems) * 100 : 0,
        items: validatedItems
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Failed to validate items'
      }
    });
  }
};

// Catalog resolution - match parsed items to existing inventory
export const resolveCatalogItems: RequestHandler = async (req, res) => {
  try {
    const { venueId } = req.params;
    const { items } = req.body;
    
    // In production, this would use fuzzy matching against venue's catalog
    const resolvedItems = items.map((item: any) => {
      // Simulate catalog matching
      const catalogMatch = {
        catalogId: `cat_${Math.random().toString(36).substr(2, 9)}`,
        matchConfidence: Math.random() * 0.3 + 0.7, // 70-100%
        suggestedSku: `SKU-${item.category.toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
        costPrice: item.price * 0.6, // 40% margin
        inStock: Math.random() > 0.2, // 80% in stock
        alternativeOptions: []
      };
      
      return {
        ...item,
        catalogMatch,
        needsApproval: catalogMatch.matchConfidence < 0.8,
        recommendedAction: catalogMatch.matchConfidence > 0.9 ? 'auto-approve' : 'manual-review'
      };
    });
    
    res.json({
      success: true,
      data: {
        venueId,
        resolvedItems,
        autoApproved: resolvedItems.filter((i: any) => i.recommendedAction === 'auto-approve').length,
        needsReview: resolvedItems.filter((i: any) => i.recommendedAction === 'manual-review').length,
        newItemsToCreate: resolvedItems.filter((i: any) => i.catalogMatch.matchConfidence < 0.5).length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CATALOG_ERROR',
        message: 'Failed to resolve catalog items'
      }
    });
  }
};

export default uploadDocument;
