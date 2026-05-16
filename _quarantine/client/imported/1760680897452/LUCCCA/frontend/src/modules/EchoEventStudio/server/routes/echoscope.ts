import { RequestHandler } from "express";
import { EchoScopeConnection, LeadFormConfig, PricingConfig, EchoScopeNotification, Project, Client } from "@shared/beo-types";

// EchoScope Website Integration Framework
interface EchoScopeWebsiteData {
  venueId: string;
  websiteConfig: WebsiteConfig;
  leadCapture: LeadCaptureConfig;
  pricing: PublicPricingConfig;
  branding: BrandingConfig;
  seoConfig: SEOConfig;
}

interface WebsiteConfig {
  domain: string;
  title: string;
  description: string;
  theme: 'modern' | 'classic' | 'minimal' | 'luxury';
  layout: 'single-page' | 'multi-page' | 'portfolio';
  features: string[];
  contactInfo: ContactInfo;
}

interface ContactInfo {
  phone: string;
  email: string;
  address: string;
  hours: string;
  socialMedia: Record<string, string>;
}

interface LeadCaptureConfig {
  forms: LeadForm[];
  chatbot: ChatbotConfig;
  scheduling: SchedulingConfig;
  followUp: FollowUpConfig;
}

interface LeadForm {
  id: string;
  name: string;
  type: 'contact' | 'quote' | 'booking' | 'consultation';
  fields: FormField[];
  placement: string[];
  autoQualification: boolean;
  routing: LeadRouting;
}

interface FormField {
  name: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'number' | 'select' | 'textarea';
  label: string;
  required: boolean;
  options?: string[];
  validation?: ValidationRule[];
}

interface ValidationRule {
  type: 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max';
  value: string | number;
  message: string;
}

interface LeadRouting {
  defaultAssignee: string;
  rules: RoutingRule[];
  autoNotifications: boolean;
  escalationRules: EscalationRule[];
}

interface RoutingRule {
  condition: string;
  field: string;
  operator: string;
  value: any;
  assignTo: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface EscalationRule {
  timeMinutes: number;
  escalateTo: string;
  condition: string;
}

interface ChatbotConfig {
  enabled: boolean;
  greeting: string;
  quickReplies: string[];
  businessHours: boolean;
  humanHandoff: boolean;
  knowledgeBase: string[];
}

interface SchedulingConfig {
  enabled: boolean;
  calendarIntegration: 'google' | 'outlook' | 'calendly';
  availableSlots: TimeSlot[];
  bufferTime: number;
  confirmationEmail: boolean;
}

interface TimeSlot {
  day: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

interface FollowUpConfig {
  autoResponder: boolean;
  emailTemplates: EmailTemplate[];
  smsNotifications: boolean;
  scheduledFollowUps: ScheduledFollowUp[];
}

interface EmailTemplate {
  id: string;
  trigger: string;
  subject: string;
  content: string;
  delay: number;
}

interface ScheduledFollowUp {
  delay: number;
  type: 'email' | 'sms' | 'call';
  template: string;
  condition?: string;
}

interface PublicPricingConfig {
  showPricing: boolean;
  pricingLevel: 'none' | 'starting-from' | 'packages' | 'detailed';
  packages: PricingPackage[];
  customQuoteForm: boolean;
  pricingDisclaimer: string;
}

interface PricingPackage {
  id: string;
  name: string;
  description: string;
  startingPrice: number;
  features: string[];
  popular: boolean;
  customizable: boolean;
}

interface BrandingConfig {
  logo: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  imagery: {
    hero: string;
    gallery: string[];
    testimonials: TestimonialImage[];
  };
}

interface TestimonialImage {
  image: string;
  client: string;
  event: string;
  quote: string;
}

interface SEOConfig {
  title: string;
  description: string;
  keywords: string[];
  ogImage: string;
  structuredData: boolean;
  analytics: {
    googleAnalytics?: string;
    facebookPixel?: string;
    linkedInInsight?: string;
  };
}

// Sample EchoScope Configurations
const sampleWebsiteConfigs: Record<string, EchoScopeWebsiteData> = {
  venue_1: {
    venueId: 'venue_1',
    websiteConfig: {
      domain: 'grandballroom.echoscope.com',
      title: 'Grand Ballroom - Luxury Event Venue',
      description: 'Experience unforgettable events at our premier luxury venue',
      theme: 'luxury',
      layout: 'single-page',
      features: ['virtual-tour', 'online-booking', 'real-time-pricing', 'event-gallery'],
      contactInfo: {
        phone: '(555) 123-4567',
        email: 'events@grandballroom.com',
        address: '123 Event Plaza, City, State 12345',
        hours: 'Mon-Fri 9AM-6PM, Sat-Sun 10AM-4PM',
        socialMedia: {
          instagram: '@grandballroom',
          facebook: '/grandballroom',
          linkedin: '/company/grandballroom'
        }
      }
    },
    leadCapture: {
      forms: [
        {
          id: 'contact-form',
          name: 'Contact Us',
          type: 'contact',
          fields: [
            { name: 'name', type: 'text', label: 'Full Name', required: true },
            { name: 'email', type: 'email', label: 'Email Address', required: true },
            { name: 'phone', type: 'phone', label: 'Phone Number', required: false },
            { name: 'eventType', type: 'select', label: 'Event Type', required: true, options: ['Wedding', 'Corporate', 'Social', 'Other'] },
            { name: 'eventDate', type: 'date', label: 'Preferred Date', required: false },
            { name: 'guestCount', type: 'number', label: 'Expected Guests', required: false },
            { name: 'message', type: 'textarea', label: 'Additional Details', required: false }
          ],
          placement: ['header', 'footer', 'contact-page'],
          autoQualification: true,
          routing: {
            defaultAssignee: 'sales_manager',
            rules: [
              {
                condition: 'guestCount > 200',
                field: 'guestCount',
                operator: 'greater_than',
                value: 200,
                assignTo: 'senior_sales_manager',
                priority: 'high'
              }
            ],
            autoNotifications: true,
            escalationRules: [
              {
                timeMinutes: 60,
                escalateTo: 'sales_director',
                condition: 'priority = high'
              }
            ]
          }
        }
      ],
      chatbot: {
        enabled: true,
        greeting: 'Welcome! How can I help you plan your perfect event?',
        quickReplies: ['Get a quote', 'Schedule a tour', 'View availability', 'Speak to someone'],
        businessHours: true,
        humanHandoff: true,
        knowledgeBase: ['capacity', 'pricing', 'amenities', 'catering', 'parking']
      },
      scheduling: {
        enabled: true,
        calendarIntegration: 'google',
        availableSlots: [
          { day: 'monday', startTime: '09:00', endTime: '17:00', available: true },
          { day: 'tuesday', startTime: '09:00', endTime: '17:00', available: true },
          { day: 'wednesday', startTime: '09:00', endTime: '17:00', available: true },
          { day: 'thursday', startTime: '09:00', endTime: '17:00', available: true },
          { day: 'friday', startTime: '09:00', endTime: '17:00', available: true },
          { day: 'saturday', startTime: '10:00', endTime: '16:00', available: true }
        ],
        bufferTime: 30,
        confirmationEmail: true
      },
      followUp: {
        autoResponder: true,
        emailTemplates: [
          {
            id: 'welcome',
            trigger: 'form_submit',
            subject: 'Thank you for your interest in Grand Ballroom',
            content: 'We\'ve received your inquiry and will respond within 2 hours.',
            delay: 0
          },
          {
            id: 'follow_up_24h',
            trigger: 'no_response',
            subject: 'Still planning your event?',
            content: 'We wanted to follow up on your recent inquiry...',
            delay: 1440 // 24 hours
          }
        ],
        smsNotifications: true,
        scheduledFollowUps: [
          { delay: 60, type: 'email', template: 'welcome' },
          { delay: 1440, type: 'email', template: 'follow_up_24h', condition: 'no_response' }
        ]
      }
    },
    pricing: {
      showPricing: true,
      pricingLevel: 'packages',
      packages: [
        {
          id: 'essential',
          name: 'Essential Package',
          description: 'Perfect for intimate gatherings',
          startingPrice: 2500,
          features: ['Up to 50 guests', 'Basic audio/visual', '4-hour rental', 'Setup included'],
          popular: false,
          customizable: true
        },
        {
          id: 'premium',
          name: 'Premium Package',
          description: 'Our most popular choice',
          startingPrice: 5000,
          features: ['Up to 150 guests', 'Full audio/visual', '6-hour rental', 'Dedicated coordinator', 'Uplighting'],
          popular: true,
          customizable: true
        },
        {
          id: 'luxury',
          name: 'Luxury Package',
          description: 'The ultimate event experience',
          startingPrice: 10000,
          features: ['Up to 300 guests', 'Premium audio/visual', '8-hour rental', 'Full service team', 'Custom lighting', 'Red carpet service'],
          popular: false,
          customizable: true
        }
      ],
      customQuoteForm: true,
      pricingDisclaimer: 'Prices shown are starting rates and may vary based on specific requirements, dates, and customizations.'
    },
    branding: {
      logo: '/assets/grandballroom-logo.svg',
      colors: {
        primary: '#1a365d',
        secondary: '#d4af37',
        accent: '#2d3748',
        background: '#ffffff',
        text: '#2d3748'
      },
      fonts: {
        heading: 'Playfair Display',
        body: 'Source Sans Pro'
      },
      imagery: {
        hero: '/assets/hero-ballroom.jpg',
        gallery: [
          '/assets/gallery-1.jpg',
          '/assets/gallery-2.jpg',
          '/assets/gallery-3.jpg'
        ],
        testimonials: [
          {
            image: '/assets/testimonial-1.jpg',
            client: 'Sarah & Michael',
            event: 'Wedding Reception',
            quote: 'Absolutely perfect venue for our special day!'
          }
        ]
      }
    },
    seoConfig: {
      title: 'Grand Ballroom - Premier Event Venue | Weddings & Corporate Events',
      description: 'Host your next event at Grand Ballroom, the city\'s premier luxury venue. Perfect for weddings, corporate events, and special celebrations.',
      keywords: ['event venue', 'wedding venue', 'corporate events', 'luxury ballroom', 'event space'],
      ogImage: '/assets/og-image.jpg',
      structuredData: true,
      analytics: {
        googleAnalytics: 'GA_MEASUREMENT_ID',
        facebookPixel: 'FB_PIXEL_ID'
      }
    }
  }
};

// API Routes
export const createWebsite: RequestHandler = async (req, res) => {
  try {
    const { venueId } = req.params;
    const websiteConfig = req.body;
    
    if (!venueId || !websiteConfig) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_CONFIG', message: 'venueId and websiteConfig are required' }
      });
    }
    
    // Validate configuration
    const validation = validateWebsiteConfig(websiteConfig);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CONFIG',
          message: 'Invalid website configuration',
          details: validation.errors
        }
      });
    }
    
    // Generate website
    const websiteData = await generateEchoScopeWebsite(venueId, websiteConfig);
    
    // Store configuration (in production, save to database)
    console.log(`Creating EchoScope website for venue ${venueId}`);
    
    res.json({
      success: true,
      data: {
        venueId,
        websiteUrl: websiteData.url,
        adminUrl: websiteData.adminUrl,
        status: 'created',
        features: websiteData.features,
        estimatedLaunchTime: '24-48 hours',
        createdAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Website creation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATION_ERROR',
        message: 'Failed to create website',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
};

export const updateWebsite: RequestHandler = async (req, res) => {
  try {
    const { venueId } = req.params;
    const updates = req.body;
    
    console.log(`Updating EchoScope website for venue ${venueId}`);
    
    // Apply updates (in production, update database and regenerate site)
    const updatedConfig = { ...sampleWebsiteConfigs[venueId], ...updates };
    
    res.json({
      success: true,
      data: {
        venueId,
        status: 'updated',
        changes: Object.keys(updates),
        deploymentStatus: 'pending',
        estimatedDeployTime: '5-10 minutes',
        updatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update website'
      }
    });
  }
};

export const getWebsiteConfig: RequestHandler = async (req, res) => {
  try {
    const { venueId } = req.params;
    
    // In production, fetch from database
    const config = sampleWebsiteConfigs[venueId];
    
    if (!config) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Website configuration not found' }
      });
    }
    
    res.json({
      success: true,
      data: config
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch website configuration'
      }
    });
  }
};

export const handleWebsiteLead: RequestHandler = async (req, res) => {
  try {
    const { venueId } = req.params;
    const leadData = req.body;
    
    if (!leadData.email || !leadData.name) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_DATA', message: 'Name and email are required' }
      });
    }
    
    // Process lead according to routing rules
    const config = sampleWebsiteConfigs[venueId];
    if (!config) {
      return res.status(404).json({
        success: false,
        error: { code: 'VENUE_NOT_FOUND', message: 'Venue configuration not found' }
      });
    }
    
    // Create lead in CRM system
    const lead = await createLeadFromWebsite(venueId, leadData, config);
    
    // Send auto-responder email
    if (config.leadCapture.followUp.autoResponder) {
      await sendAutoResponder(leadData.email, config);
    }
    
    // Route to appropriate team member
    const assignee = determineAssignee(leadData, config.leadCapture.forms[0].routing);
    
    // Send notification to assigned team member
    await notifyTeamMember(assignee, lead);
    
    res.json({
      success: true,
      data: {
        leadId: lead.id,
        status: 'captured',
        assignedTo: assignee,
        responseTime: 'within 2 hours',
        nextSteps: [
          'Auto-responder email sent',
          'Assigned to team member',
          'Follow-up scheduled'
        ]
      }
    });
    
  } catch (error) {
    console.error('Lead processing error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LEAD_ERROR',
        message: 'Failed to process website lead'
      }
    });
  }
};

export const getWebsiteAnalytics: RequestHandler = async (req, res) => {
  try {
    const { venueId } = req.params;
    const { timeframe = '30d' } = req.query;
    
    // In production, fetch real analytics data
    const analyticsData = {
      venueId,
      timeframe,
      traffic: {
        visitors: 2540,
        pageViews: 8920,
        bounceRate: 35.2,
        averageSession: '3:24',
        topPages: [
          { page: '/', views: 3200, conversions: 45 },
          { page: '/pricing', views: 1800, conversions: 32 },
          { page: '/gallery', views: 1500, conversions: 18 },
          { page: '/contact', views: 2420, conversions: 156 }
        ]
      },
      leads: {
        total: 89,
        qualified: 67,
        conversion: 75.3,
        sources: [
          { source: 'Organic Search', leads: 34, percentage: 38.2 },
          { source: 'Direct', leads: 28, percentage: 31.5 },
          { source: 'Social Media', leads: 15, percentage: 16.9 },
          { source: 'Referral', leads: 12, percentage: 13.5 }
        ]
      },
      performance: {
        loadTime: 1.8,
        mobileOptimized: true,
        seoScore: 92,
        accessibilityScore: 88
      },
      conversions: {
        formSubmissions: 89,
        phoneCallsGenerated: 23,
        emailsSent: 156,
        quotesRequested: 67,
        toursScheduled: 34
      }
    };
    
    res.json({
      success: true,
      data: analyticsData
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Failed to fetch website analytics'
      }
    });
  }
};

export const generatePricingEstimate: RequestHandler = async (req, res) => {
  try {
    const { venueId } = req.params;
    const { eventType, guestCount, eventDate, requirements } = req.body;
    
    if (!eventType || !guestCount) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'eventType and guestCount are required' }
      });
    }
    
    // Generate pricing estimate based on requirements
    const estimate = calculatePricingEstimate(venueId, {
      eventType,
      guestCount,
      eventDate,
      requirements
    });
    
    res.json({
      success: true,
      data: {
        estimate,
        disclaimer: 'This is an estimated price. Final pricing may vary based on specific requirements and availability.',
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        nextSteps: [
          'Contact us for a detailed quote',
          'Schedule a venue tour',
          'Discuss customization options'
        ]
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ESTIMATE_ERROR',
        message: 'Failed to generate pricing estimate'
      }
    });
  }
};

// Helper Functions
const validateWebsiteConfig = (config: any) => {
  const errors: string[] = [];
  
  if (!config.websiteConfig?.title) {
    errors.push('Website title is required');
  }
  
  if (!config.websiteConfig?.description) {
    errors.push('Website description is required');
  }
  
  if (!config.branding?.colors?.primary) {
    errors.push('Primary brand color is required');
  }
  
  if (!config.contactInfo?.email) {
    errors.push('Contact email is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

const generateEchoScopeWebsite = async (venueId: string, config: any) => {
  // In production, this would trigger website generation
  const subdomain = config.websiteConfig.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  return {
    url: `https://${subdomain}.echoscope.com`,
    adminUrl: `https://${subdomain}.echoscope.com/admin`,
    features: [
      'Responsive design',
      'Lead capture forms',
      'Real-time pricing',
      'Virtual tour integration',
      'SEO optimization',
      'Analytics tracking'
    ]
  };
};

const createLeadFromWebsite = async (venueId: string, leadData: any, config: EchoScopeWebsiteData) => {
  // Create lead in CRM
  const lead = {
    id: crypto.randomUUID(),
    venueId,
    source: 'website',
    name: leadData.name,
    email: leadData.email,
    phone: leadData.phone,
    eventType: leadData.eventType,
    eventDate: leadData.eventDate,
    guestCount: leadData.guestCount,
    message: leadData.message,
    status: 'new',
    createdAt: new Date().toISOString(),
    qualification: autoQualifyLead(leadData)
  };
  
  // In production, save to database and sync with CRM
  console.log('Created website lead:', lead.id);
  
  return lead;
};

const autoQualifyLead = (leadData: any) => {
  let score = 0;
  
  // Scoring criteria
  if (leadData.guestCount > 100) score += 20;
  if (leadData.eventDate) score += 15;
  if (leadData.phone) score += 10;
  if (leadData.eventType === 'Wedding' || leadData.eventType === 'Corporate') score += 15;
  if (leadData.message && leadData.message.length > 50) score += 10;
  
  return {
    score,
    level: score >= 50 ? 'hot' : score >= 30 ? 'warm' : 'cold',
    reasons: [
      score >= 50 ? 'High-value lead with complete information' : 'Basic information provided'
    ]
  };
};

const determineAssignee = (leadData: any, routing: LeadRouting) => {
  // Apply routing rules
  for (const rule of routing.rules) {
    if (evaluateCondition(leadData, rule)) {
      return rule.assignTo;
    }
  }
  
  return routing.defaultAssignee;
};

const evaluateCondition = (leadData: any, rule: RoutingRule) => {
  const fieldValue = leadData[rule.field];
  
  switch (rule.operator) {
    case 'greater_than':
      return fieldValue > rule.value;
    case 'less_than':
      return fieldValue < rule.value;
    case 'equals':
      return fieldValue === rule.value;
    case 'contains':
      return fieldValue?.toString().toLowerCase().includes(rule.value.toLowerCase());
    default:
      return false;
  }
};

const sendAutoResponder = async (email: string, config: EchoScopeWebsiteData) => {
  const template = config.leadCapture.followUp.emailTemplates.find(t => t.trigger === 'form_submit');
  
  if (template) {
    console.log(`Sending auto-responder to ${email}: ${template.subject}`);
    // In production, integrate with email service (SendGrid, Mailgun, etc.)
  }
};

const notifyTeamMember = async (assignee: string, lead: any) => {
  console.log(`Notifying ${assignee} about new lead: ${lead.id}`);
  // In production, send notification via email, SMS, or push notification
};

const calculatePricingEstimate = (venueId: string, params: any) => {
  const config = sampleWebsiteConfigs[venueId];
  if (!config) return null;
  
  // Base pricing calculation
  let basePrice = 2000;
  
  // Guest count multiplier
  if (params.guestCount <= 50) {
    basePrice = 2500;
  } else if (params.guestCount <= 150) {
    basePrice = 5000;
  } else {
    basePrice = 10000;
  }
  
  // Event type multiplier
  const eventMultipliers: Record<string, number> = {
    'Wedding': 1.2,
    'Corporate': 1.1,
    'Social': 1.0,
    'Other': 1.0
  };
  
  basePrice *= eventMultipliers[params.eventType] || 1.0;
  
  // Weekend surcharge
  if (params.eventDate) {
    const eventDate = new Date(params.eventDate);
    const dayOfWeek = eventDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
      basePrice *= 1.15; // 15% surcharge
    }
  }
  
  return {
    basePrice: Math.round(basePrice),
    priceRange: {
      min: Math.round(basePrice * 0.85),
      max: Math.round(basePrice * 1.25)
    },
    breakdown: [
      { item: 'Venue rental', price: Math.round(basePrice * 0.6) },
      { item: 'Service & coordination', price: Math.round(basePrice * 0.25) },
      { item: 'Equipment & setup', price: Math.round(basePrice * 0.15) }
    ],
    additionalOptions: [
      { item: 'Catering', priceRange: { min: 45, max: 125 }, unit: 'per person' },
      { item: 'Bar service', priceRange: { min: 25, max: 65 }, unit: 'per person' },
      { item: 'Photography', priceRange: { min: 1500, max: 5000 }, unit: 'package' },
      { item: 'Floral arrangements', priceRange: { min: 800, max: 3500 }, unit: 'package' }
    ]
  };
};

export const getWebsiteTemplates: RequestHandler = async (req, res) => {
  try {
    const templates = [
      {
        id: 'luxury-ballroom',
        name: 'Luxury Ballroom',
        description: 'Elegant design for upscale venues',
        theme: 'luxury',
        features: ['Virtual tour', 'Premium gallery', 'Advanced booking'],
        preview: '/templates/luxury-ballroom-preview.jpg',
        price: 'Premium'
      },
      {
        id: 'modern-venue',
        name: 'Modern Venue',
        description: 'Clean, contemporary design',
        theme: 'modern',
        features: ['Interactive forms', 'Social integration', 'Mobile-first'],
        preview: '/templates/modern-venue-preview.jpg',
        price: 'Standard'
      },
      {
        id: 'classic-events',
        name: 'Classic Events',
        description: 'Timeless design for traditional venues',
        theme: 'classic',
        features: ['Traditional layout', 'Elegant typography', 'Photo galleries'],
        preview: '/templates/classic-events-preview.jpg',
        price: 'Standard'
      }
    ];
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'TEMPLATES_ERROR',
        message: 'Failed to fetch website templates'
      }
    });
  }
};

export default createWebsite;
