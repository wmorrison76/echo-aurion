import { RequestHandler } from "express";
import { AutoBuildBeoFn, RulesEvaluateFn, Project, Quote, QuoteLine, UUID } from "@shared/beo-types";

// Auto-BEO Generation Implementation
const defaultAutoBuildBeo: AutoBuildBeoFn = async ({ venueId, project, items }) => {
  console.log(`Auto-building BEO for venue ${venueId}, project ${project.id}`);
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Transform parsed items into quote lines
  const quoteLines: QuoteLine[] = items.map((item, index) => ({
    id: `line_${Date.now()}_${index}`,
    category: item.category,
    name: item.name,
    description: item.desc || '',
    quantity: Math.max(item.minGuests || 1, project.guestCount || 1),
    unit: item.unit || 'per_person',
    unitPrice: item.price || 0,
    totalPrice: (item.price || 0) * Math.max(item.minGuests || 1, project.guestCount || 1),
    isOptional: false,
    departmentCode: getDepartmentCode(item.category),
    allergens: [],
    dietary: item.dietary || [],
    minimumQuantity: item.minGuests,
    specialInstructions: getSpecialInstructions(item.category, item.name)
  }));
  
  // Calculate pricing
  const subtotal = quoteLines.reduce((sum, line) => sum + line.totalPrice, 0);
  const serviceChargePercent = 20;
  const serviceCharge = subtotal * (serviceChargePercent / 100);
  const taxPercent = 8;
  const tax = (subtotal + serviceCharge) * (taxPercent / 100);
  const total = subtotal + serviceCharge + tax;
  
  const beoId = crypto.randomUUID();
  
  // Generate PDF URLs (in production, these would be actual generated PDFs)
  const views = {
    clientPdfUrl: `/api/beo/${beoId}/pdf/client`,
    kitchenPdfUrl: `/api/beo/${beoId}/pdf/kitchen`,
    opsPdfUrl: `/api/beo/${beoId}/pdf/ops`
  };
  
  return {
    beoId,
    lines: quoteLines,
    views
  };
};

// Business Rules Engine
const defaultRulesEvaluate: RulesEvaluateFn = async ({ venueId, project, draft }) => {
  console.log(`Evaluating rules for venue ${venueId}, project ${project.id}`);
  
  let updatedQuote = { ...draft };
  
  // Rule 1: Minimum spend requirements
  const minimumSpend = 5000; // $5000 minimum
  if (updatedQuote.pricing.subtotal < minimumSpend) {
    // Add minimum spend fee
    const minimumSpendFee = minimumSpend - updatedQuote.pricing.subtotal;
    const feeLineId = crypto.randomUUID();
    
    updatedQuote.lines.push({
      id: feeLineId,
      category: 'fee',
      name: 'Minimum Spend Fee',
      description: `Additional charge to meet $${minimumSpend} minimum spend requirement`,
      quantity: 1,
      unit: 'each',
      unitPrice: minimumSpendFee,
      totalPrice: minimumSpendFee,
      isOptional: false,
      departmentCode: 'ADMIN',
      allergens: [],
      dietary: []
    });
  }
  
  // Rule 2: Service charge based on guest count
  let serviceChargePercent = 20;
  if (project.guestCount > 100) {
    serviceChargePercent = 22; // Higher service charge for large events
  }
  if (project.guestCount > 200) {
    serviceChargePercent = 25; // Even higher for very large events
  }
  
  // Rule 3: Mandatory items based on event requirements
  const mandatoryItems = getMandatoryItems(project);
  mandatoryItems.forEach(item => {
    const existingItem = updatedQuote.lines.find(line => 
      line.name.toLowerCase().includes(item.name.toLowerCase())
    );
    
    if (!existingItem) {
      updatedQuote.lines.push(item);
    }
  });
  
  // Rule 4: Union labor requirements
  if (project.guestCount > 150) {
    const unionLaborRequired = calculateUnionLabor(project.guestCount);
    const existingLabor = updatedQuote.lines.filter(line => line.category === 'labor');
    
    if (existingLabor.length === 0) {
      updatedQuote.lines.push(...unionLaborRequired);
    }
  }
  
  // Rule 5: Delivery window restrictions
  const eventDate = new Date(project.eventDate);
  const dayOfWeek = eventDate.getDay();
  
  if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
    const weekendSurcharge = updatedQuote.pricing.subtotal * 0.1; // 10% weekend surcharge
    updatedQuote.lines.push({
      id: crypto.randomUUID(),
      category: 'fee',
      name: 'Weekend Service Surcharge',
      description: 'Additional charge for weekend events',
      quantity: 1,
      unit: 'each',
      unitPrice: weekendSurcharge,
      totalPrice: weekendSurcharge,
      isOptional: false,
      departmentCode: 'ADMIN',
      allergens: [],
      dietary: []
    });
  }
  
  // Recalculate pricing
  const newSubtotal = updatedQuote.lines.reduce((sum, line) => sum + line.totalPrice, 0);
  const newServiceCharge = newSubtotal * (serviceChargePercent / 100);
  const taxPercent = 8;
  const newTax = (newSubtotal + newServiceCharge) * (taxPercent / 100);
  const newTotal = newSubtotal + newServiceCharge + newTax;
  
  updatedQuote.pricing = {
    ...updatedQuote.pricing,
    subtotal: newSubtotal,
    serviceCharge: newServiceCharge,
    serviceChargePercent,
    tax: newTax,
    taxPercent,
    total: newTotal,
    deposit: newTotal * 0.2, // 20% deposit
    depositPercent: 20,
    balance: newTotal * 0.8
  };
  
  return updatedQuote;
};

// Helper Functions
const getDepartmentCode = (category: string): string => {
  const departmentMap: Record<string, string> = {
    food: 'KITCHEN',
    beverage: 'BAR',
    av: 'AV_TECH',
    floral: 'DECOR',
    rental: 'SETUP',
    labor: 'SERVICE',
    fee: 'ADMIN'
  };
  
  return departmentMap[category] || 'GENERAL';
};

const getSpecialInstructions = (category: string, itemName: string): string => {
  const instructions: Record<string, string[]> = {
    food: [
      'Prepare fresh day of event',
      'Check dietary restrictions',
      'Maintain proper temperatures'
    ],
    beverage: [
      'Chill before service',
      'Provide appropriate glassware',
      'Check alcohol licensing'
    ],
    av: [
      'Test equipment before event',
      'Provide backup equipment',
      'Coordinate with venue tech'
    ],
    floral: [
      'Deliver day of event',
      'Coordinate with venue setup',
      'Provide water sources'
    ],
    rental: [
      'Deliver before setup time',
      'Coordinate with venue logistics',
      'Plan pickup schedule'
    ],
    labor: [
      'Confirm staff availability',
      'Provide uniform requirements',
      'Schedule arrival times'
    ]
  };
  
  const categoryInstructions = instructions[category] || [];
  return categoryInstructions[Math.floor(Math.random() * categoryInstructions.length)] || '';
};

const getMandatoryItems = (project: Project): QuoteLine[] => {
  const mandatoryItems: QuoteLine[] = [];
  
  // Service staff is always required
  mandatoryItems.push({
    id: crypto.randomUUID(),
    category: 'labor',
    name: 'Service Staff',
    description: 'Professional wait staff for event service',
    quantity: Math.ceil(project.guestCount / 25), // 1 server per 25 guests
    unit: 'each',
    unitPrice: 150,
    totalPrice: Math.ceil(project.guestCount / 25) * 150,
    isOptional: false,
    departmentCode: 'SERVICE',
    allergens: [],
    dietary: []
  });
  
  // Event coordination is mandatory for events over 50 guests
  if (project.guestCount > 50) {
    mandatoryItems.push({
      id: crypto.randomUUID(),
      category: 'fee',
      name: 'Event Coordination',
      description: 'Day-of event coordination services',
      quantity: 1,
      unit: 'each',
      unitPrice: 500,
      totalPrice: 500,
      isOptional: false,
      departmentCode: 'ADMIN',
      allergens: [],
      dietary: []
    });
  }
  
  // Setup and breakdown for large events
  if (project.guestCount > 100) {
    mandatoryItems.push({
      id: crypto.randomUUID(),
      category: 'labor',
      name: 'Setup/Breakdown Crew',
      description: 'Professional setup and breakdown services',
      quantity: 1,
      unit: 'each',
      unitPrice: 300,
      totalPrice: 300,
      isOptional: false,
      departmentCode: 'SETUP',
      allergens: [],
      dietary: []
    });
  }
  
  return mandatoryItems;
};

const calculateUnionLabor = (guestCount: number): QuoteLine[] => {
  const laborLines: QuoteLine[] = [];
  
  // Union rules: 1 bartender per 75 guests, minimum 2
  const bartenderCount = Math.max(2, Math.ceil(guestCount / 75));
  laborLines.push({
    id: crypto.randomUUID(),
    category: 'labor',
    name: 'Union Bartender',
    description: 'Certified union bartender services',
    quantity: bartenderCount,
    unit: 'each',
    unitPrice: 200,
    totalPrice: bartenderCount * 200,
    isOptional: false,
    departmentCode: 'BAR',
    allergens: [],
    dietary: []
  });
  
  // Kitchen staff for large events
  if (guestCount > 150) {
    const kitchenStaffCount = Math.ceil(guestCount / 100);
    laborLines.push({
      id: crypto.randomUUID(),
      category: 'labor',
      name: 'Union Kitchen Staff',
      description: 'Certified union kitchen preparation staff',
      quantity: kitchenStaffCount,
      unit: 'each',
      unitPrice: 180,
      totalPrice: kitchenStaffCount * 180,
      isOptional: false,
      departmentCode: 'KITCHEN',
      allergens: [],
      dietary: []
    });
  }
  
  return laborLines;
};

// PDF Generation Functions
const generateClientPDF = (beo: any): Buffer => {
  // In production, this would use a PDF generation library like PDFKit or Puppeteer
  console.log('Generating client PDF for BEO:', beo.id);
  
  // Mock PDF content - in production this would be actual PDF generation
  const pdfContent = `
    CLIENT BEO DOCUMENT
    ===================
    
    Event: ${beo.title}
    Date: ${beo.eventDate}
    Guests: ${beo.guestCount}
    
    MENU ITEMS:
    ${beo.lines.map((line: any) => `- ${line.name}: $${line.totalPrice}`).join('\n')}
    
    TOTAL: $${beo.pricing.total}
    DEPOSIT: $${beo.pricing.deposit}
    BALANCE: $${beo.pricing.balance}
    
    Terms and Conditions apply.
  `;
  
  return Buffer.from(pdfContent, 'utf8');
};

const generateKitchenPDF = (beo: any): Buffer => {
  console.log('Generating kitchen PDF for BEO:', beo.id);
  
  const foodItems = beo.lines.filter((line: any) => line.category === 'food');
  
  const pdfContent = `
    KITCHEN BEO DOCUMENT
    ====================
    
    Event: ${beo.title}
    Date: ${beo.eventDate}
    Service Time: ${beo.timeline?.[0]?.time || 'TBD'}
    
    FOOD PREPARATION:
    ${foodItems.map((line: any) => `
    ${line.name} (${line.quantity} ${line.unit})
    - ${line.description}
    - Special Instructions: ${line.specialInstructions || 'None'}
    - Dietary: ${line.dietary.join(', ') || 'None'}
    - Allergens: ${line.allergens.join(', ') || 'None'}
    `).join('\n')}
    
    PREP NOTES:
    - Start prep 2 hours before service
    - Maintain cold chain for all perishables
    - Check final guest count 24 hours prior
  `;
  
  return Buffer.from(pdfContent, 'utf8');
};

const generateOpsPDF = (beo: any): Buffer => {
  console.log('Generating operations PDF for BEO:', beo.id);
  
  const setupItems = beo.lines.filter((line: any) => 
    ['rental', 'av', 'labor'].includes(line.category)
  );
  
  const pdfContent = `
    OPERATIONS BEO DOCUMENT
    =======================
    
    Event: ${beo.title}
    Date: ${beo.eventDate}
    Setup Time: ${beo.setupNotes?.setupStart || 'TBD'}
    
    SETUP REQUIREMENTS:
    ${setupItems.map((line: any) => `
    ${line.name} (${line.quantity} ${line.unit})
    - Department: ${line.departmentCode}
    - Special Instructions: ${line.specialInstructions || 'None'}
    `).join('\n')}
    
    TIMELINE:
    ${beo.timeline?.map((item: any) => `
    ${item.time} - ${item.activity} (${item.department})
    `).join('') || 'Timeline TBD'}
    
    EXECUTION CHECKLIST:
    ${beo.executionChecklist?.map((task: any) => `
    [ ] ${task.time} - ${task.task} (${task.assignedTo})
    `).join('') || 'Checklist TBD'}
  `;
  
  return Buffer.from(pdfContent, 'utf8');
};

// API Routes
export const generateBEO: RequestHandler = async (req, res) => {
  try {
    const { venueId } = req.params;
    const { projectId, items } = req.body;
    
    if (!venueId || !projectId || !items) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'venueId, projectId, and items are required' }
      });
    }
    
    // Mock project data - in production, fetch from database
    const project: Project = {
      id: projectId,
      venueId,
      clientId: 'client_1',
      name: 'Sample Event',
      description: 'Auto-generated BEO',
      eventDate: new Date().toISOString().split('T')[0],
      eventTime: '18:00',
      endTime: '23:00',
      guestCount: 100,
      leadStatus: 'qualified',
      eventStatus: 'tentative',
      priority: 'medium',
      budget: 10000,
      estimatedRevenue: 9000,
      assignedTo: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timeline: [],
      requirements: {
        menuStyle: 'plated',
        serviceStyle: 'full-service',
        specialDietary: [],
        avNeeds: [],
        decorRequests: [],
        specialRequests: [],
        setupNotes: '',
        breakdownNotes: ''
      },
      contacts: [],
      documents: [],
      notes: [],
      tags: []
    };
    
    const result = await defaultAutoBuildBeo({ venueId, project, items });
    
    res.json({
      success: true,
      data: {
        beoId: result.beoId,
        status: 'generated',
        itemCount: result.lines.length,
        totalAmount: result.lines.reduce((sum, line) => sum + line.totalPrice, 0),
        views: result.views,
        generatedAt: new Date().toISOString(),
        processingTime: '3.2s'
      }
    });
    
  } catch (error) {
    console.error('BEO generation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GENERATION_ERROR',
        message: 'Failed to generate BEO',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
};

export const evaluateRules: RequestHandler = async (req, res) => {
  try {
    const { venueId } = req.params;
    const { projectId, draft } = req.body;
    
    // Mock project data
    const project: Project = {
      id: projectId,
      venueId,
      clientId: 'client_1',
      name: 'Sample Event',
      description: 'Rules evaluation',
      eventDate: new Date().toISOString().split('T')[0],
      eventTime: '18:00',
      endTime: '23:00',
      guestCount: draft.guestCount || 100,
      leadStatus: 'qualified',
      eventStatus: 'tentative',
      priority: 'medium',
      budget: 10000,
      estimatedRevenue: 9000,
      assignedTo: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timeline: [],
      requirements: {
        menuStyle: 'plated',
        serviceStyle: 'full-service',
        specialDietary: [],
        avNeeds: [],
        decorRequests: [],
        specialRequests: [],
        setupNotes: '',
        breakdownNotes: ''
      },
      contacts: [],
      documents: [],
      notes: [],
      tags: []
    };
    
    const evaluatedQuote = await defaultRulesEvaluate({ venueId, project, draft });
    
    res.json({
      success: true,
      data: {
        originalTotal: draft.pricing?.total || 0,
        evaluatedTotal: evaluatedQuote.pricing.total,
        rulesApplied: [
          'Minimum spend requirement',
          'Service charge calculation',
          'Mandatory items added',
          'Union labor requirements',
          'Delivery window restrictions'
        ],
        quote: evaluatedQuote
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'RULES_ERROR',
        message: 'Failed to evaluate business rules'
      }
    });
  }
};

export const generatePDF: RequestHandler = async (req, res) => {
  try {
    const { beoId, type } = req.params;
    
    if (!['client', 'kitchen', 'ops'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TYPE', message: 'PDF type must be client, kitchen, or ops' }
      });
    }
    
    // Mock BEO data - in production, fetch from database
    const beo = {
      id: beoId,
      title: 'Sample Event BEO',
      eventDate: '2024-02-15',
      guestCount: 100,
      lines: [
        {
          name: 'Caesar Salad',
          description: 'Romaine lettuce with parmesan',
          quantity: 100,
          unit: 'per_person',
          totalPrice: 1250,
          category: 'food',
          dietary: ['vegetarian'],
          allergens: ['dairy']
        }
      ],
      pricing: {
        total: 5000,
        deposit: 1000,
        balance: 4000
      },
      timeline: [],
      executionChecklist: []
    };
    
    let pdfBuffer: Buffer;
    let filename: string;
    
    switch (type) {
      case 'client':
        pdfBuffer = generateClientPDF(beo);
        filename = `BEO-${beoId}-Client.pdf`;
        break;
      case 'kitchen':
        pdfBuffer = generateKitchenPDF(beo);
        filename = `BEO-${beoId}-Kitchen.pdf`;
        break;
      case 'ops':
        pdfBuffer = generateOpsPDF(beo);
        filename = `BEO-${beoId}-Operations.pdf`;
        break;
      default:
        throw new Error('Invalid PDF type');
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.end(pdfBuffer);
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'PDF_ERROR',
        message: 'Failed to generate PDF'
      }
    });
  }
};

export const getBEOStatus: RequestHandler = async (req, res) => {
  try {
    const { beoId } = req.params;
    
    // In production, fetch actual status from database
    res.json({
      success: true,
      data: {
        beoId,
        status: 'generated',
        version: 1,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        approvalStatus: 'pending',
        pdfUrls: {
          client: `/api/beo/${beoId}/pdf/client`,
          kitchen: `/api/beo/${beoId}/pdf/kitchen`,
          ops: `/api/beo/${beoId}/pdf/ops`
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_ERROR',
        message: 'Failed to get BEO status'
      }
    });
  }
};

export const updateBEO: RequestHandler = async (req, res) => {
  try {
    const { beoId } = req.params;
    const updates = req.body;
    
    console.log(`Updating BEO ${beoId} with:`, updates);
    
    // In production, update database and regenerate PDFs if needed
    res.json({
      success: true,
      data: {
        beoId,
        updated: true,
        version: 2,
        changes: Object.keys(updates),
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update BEO'
      }
    });
  }
};

export default generateBEO;
