import { ParseMenuDocumentFn } from '@shared/beo-types';
import { googleDocAIParser } from './googleDocAI';
import { awsTextractParser } from './awsTextract';
import { azureDocIntelligenceParser } from './azureDocIntelligence';

// OCR Provider Configuration
interface OCRProvider {
  name: string;
  parser: ParseMenuDocumentFn;
  priority: number;
  supportedTypes: string[];
  isAvailable: () => Promise<boolean>;
}

// Production OCR providers with intelligent fallback
export const OCR_PROVIDERS: OCRProvider[] = [
  {
    name: 'Google DocAI',
    parser: googleDocAIParser,
    priority: 1,
    supportedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'],
    isAvailable: async () => {
      try {
        return !!(process.env.GOOGLE_PROJECT_ID && process.env.GOOGLE_PROCESSOR_ID);
      } catch {
        return false;
      }
    }
  },
  {
    name: 'AWS Textract',
    parser: awsTextractParser,
    priority: 2,
    supportedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    isAvailable: async () => {
      try {
        return !!(process.env.AWS_REGION && (process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE));
      } catch {
        return false;
      }
    }
  },
  {
    name: 'Azure Document Intelligence',
    parser: azureDocIntelligenceParser,
    priority: 3,
    supportedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/bmp', 'image/tiff'],
    isAvailable: async () => {
      try {
        return !!(process.env.AZURE_DOC_INTELLIGENCE_ENDPOINT && process.env.AZURE_DOC_INTELLIGENCE_KEY);
      } catch {
        return false;
      }
    }
  }
];

// Intelligent OCR router with fallback
export class OCRService {
  private providers: OCRProvider[];

  constructor() {
    this.providers = OCR_PROVIDERS.sort((a, b) => a.priority - b.priority);
  }

  // Get the best available provider for a given document type
  async getBestProvider(mimeType: string): Promise<OCRProvider | null> {
    for (const provider of this.providers) {
      const isAvailable = await provider.isAvailable();
      const supportsType = provider.supportedTypes.includes(mimeType);
      
      if (isAvailable && supportsType) {
        console.log(`Selected OCR provider: ${provider.name} for ${mimeType}`);
        return provider;
      }
    }
    
    console.warn(`No OCR provider available for ${mimeType}`);
    return null;
  }

  // Parse document with automatic fallback
  async parseDocument(args: { venueId: string; fileUrl: string; mime: string }) {
    const { venueId, fileUrl, mime } = args;
    const errors: string[] = [];

    // Get available providers that support this mime type
    const availableProviders = [];
    for (const provider of this.providers) {
      const isAvailable = await provider.isAvailable();
      const supportsType = provider.supportedTypes.includes(mime);
      
      if (isAvailable && supportsType) {
        availableProviders.push(provider);
      }
    }

    if (availableProviders.length === 0) {
      throw new Error(`No OCR providers available for document type: ${mime}`);
    }

    // Try each provider in order of priority
    for (const provider of availableProviders) {
      try {
        console.log(`Attempting OCR with ${provider.name}...`);
        const result = await provider.parser({ venueId, fileUrl, mime });
        
        // Check if result is meaningful
        if (result.items && result.items.length > 0) {
          console.log(`Successfully processed with ${provider.name}: ${result.items.length} items found`);
          
          // Add provider info to notes
          result.notes = [
            `Processed by ${provider.name}`,
            ...(result.notes || [])
          ];
          
          return result;
        } else {
          errors.push(`${provider.name}: No items extracted`);
          console.warn(`${provider.name} returned no items, trying next provider...`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${provider.name}: ${errorMessage}`);
        console.error(`${provider.name} failed:`, error);
        console.log('Trying next provider...');
      }
    }

    // If all providers failed, return error with details
    throw new Error(`All OCR providers failed. Errors: ${errors.join('; ')}`);
  }

  // Get status of all providers
  async getProviderStatus() {
    const status = [];
    
    for (const provider of this.providers) {
      const isAvailable = await provider.isAvailable();
      status.push({
        name: provider.name,
        priority: provider.priority,
        available: isAvailable,
        supportedTypes: provider.supportedTypes,
        configurationStatus: this.getConfigurationStatus(provider.name)
      });
    }
    
    return status;
  }

  private getConfigurationStatus(providerName: string): string {
    switch (providerName) {
      case 'Google DocAI':
        if (!process.env.GOOGLE_PROJECT_ID) return 'Missing GOOGLE_PROJECT_ID';
        if (!process.env.GOOGLE_PROCESSOR_ID) return 'Missing GOOGLE_PROCESSOR_ID';
        if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) return 'Missing GOOGLE_APPLICATION_CREDENTIALS';
        return 'Configured';
        
      case 'AWS Textract':
        if (!process.env.AWS_REGION) return 'Missing AWS_REGION';
        if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_PROFILE) return 'Missing AWS credentials';
        return 'Configured';
        
      case 'Azure Document Intelligence':
        if (!process.env.AZURE_DOC_INTELLIGENCE_ENDPOINT) return 'Missing AZURE_DOC_INTELLIGENCE_ENDPOINT';
        if (!process.env.AZURE_DOC_INTELLIGENCE_KEY) return 'Missing AZURE_DOC_INTELLIGENCE_KEY';
        return 'Configured';
        
      default:
        return 'Unknown provider';
    }
  }

  // Test a specific provider
  async testProvider(providerName: string, testArgs: { venueId: string; fileUrl: string; mime: string }) {
    const provider = this.providers.find(p => p.name === providerName);
    
    if (!provider) {
      throw new Error(`Provider not found: ${providerName}`);
    }

    const isAvailable = await provider.isAvailable();
    if (!isAvailable) {
      throw new Error(`Provider not available: ${providerName}`);
    }

    const supportsType = provider.supportedTypes.includes(testArgs.mime);
    if (!supportsType) {
      throw new Error(`Provider ${providerName} does not support ${testArgs.mime}`);
    }

    return await provider.parser(testArgs);
  }
}

// Default OCR service instance
export const ocrService = new OCRService();

// Main parsing function with intelligent routing
export const intelligentOCRParser: ParseMenuDocumentFn = async (args) => {
  return await ocrService.parseDocument(args);
};

// Legacy exports for compatibility
export const OCR_PARSERS = {
  google: googleDocAIParser,
  textract: awsTextractParser,
  azure: azureDocIntelligenceParser,
  intelligent: intelligentOCRParser
};

// Provider selection utilities
export const selectProvider = async (mimeType: string, preferredProvider?: string) => {
  const service = new OCRService();
  
  if (preferredProvider) {
    const provider = OCR_PROVIDERS.find(p => p.name.toLowerCase().includes(preferredProvider.toLowerCase()));
    if (provider) {
      const isAvailable = await provider.isAvailable();
      const supportsType = provider.supportedTypes.includes(mimeType);
      
      if (isAvailable && supportsType) {
        return provider.parser;
      } else {
        console.warn(`Preferred provider ${preferredProvider} not available, falling back to best available`);
      }
    }
  }
  
  const bestProvider = await service.getBestProvider(mimeType);
  return bestProvider?.parser || null;
};

export default ocrService;
