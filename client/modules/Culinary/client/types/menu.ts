/**
 * Menu System Type Definitions
 * Complete type system for menu storage, versioning, and management
 */

import type { CanvasFontState } from "@/echo/vectorFonts";

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export enum MenuVisibility {
  PRIVATE = "private",
  TEAM = "team",
  PROPERTY = "property",
  ALL = "all",
}

export enum MenuType {
  SINGLE_PAGE = "single-page",
  MULTI_PAGE = "multi-page",
  DIGITAL = "digital",
  QR_CODE = "qr-code",
  SEASONAL = "seasonal",
}

export enum BusinessSeason {
  SPRING = "spring",
  SUMMER = "summer",
  FALL = "fall",
  WINTER = "winter",
  SPECIAL_EVENT = "special-event",
}

export enum OperationsDocType {
  MENU_GUIDE = "menu-guide",
  PREP_NOTES = "prep-notes",
  SERVER_TRAINING = "server-training",
  PLATING_INSTRUCTIONS = "plating-instructions",
  OTHER = "other",
}

export enum ExportFormat {
  PDF = "pdf",
  PNG = "png",
  PSD = "psd",
  SVG = "svg",
  AI = "ai",
  JSON = "json",
}

// ============================================================================
// MENU INTERFACES
// ============================================================================

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  orderIndex: number;
  items: string[]; // Dish IDs
}

export interface MenuDish {
  id: string;
  dishAssemblyId?: string; // Link to dish_assembly
  name: string;
  description: string;
  price: number;
  currency: string;
  image?: string;
  tags?: string[];
  orderIndex: number;
}

export interface MenuDraft {
  id: string;
  userId: string;
  propertyId: string;
  
  title: string;
  subtitle?: string;
  description?: string;
  
  categories: MenuCategory[];
  dishes: MenuDish[];
  
  canvasState: Record<string, any>;
  designMetadata?: Record<string, any>;
  fontSettings?: Record<string, CanvasFontState>;
  
  cuisineType?: string;
  menuType?: MenuType;
  targetAudience?: string;
  
  currency: string;
  businessSeason?: BusinessSeason;
  
  versionNumber: number;
  isActive: boolean;
  
  visibility: MenuVisibility;
  sharedWith: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface Menu extends MenuDraft {
  dishAssemblyIds: string[];
  
  isPublished: boolean;
  publishedAt?: Date;
  publishedBy?: string;
  
  draftId?: string;
  
  activeFrom?: Date;
  activeTo?: Date;
}

export interface MenuVersion {
  id: string;
  menuId: string;
  userId: string;
  
  versionNumber: number;
  changeLog?: string;
  
  menuState: Menu;
  performanceMetrics?: Record<string, any>;
  
  createdAt: Date;
}

export interface MenuPerformance {
  id: string;
  menuId: string;
  propertyId: string;
  
  totalItemsSold: number;
  totalRevenue: number;
  averageOrderValue: number;
  
  itemPerformance: Record<string, {
    sold: number;
    revenue: number;
    popularityScore: number;
  }>;
  
  categoryPerformance: Record<string, {
    sold: number;
    revenue: number;
    items: string[];
  }>;
  
  dataFrom: Date;
  dataTo: Date;
  
  lastUpdated: Date;
}

export interface OperationsDoc {
  id: string;
  userId: string;
  propertyId: string;
  
  title: string;
  docType: OperationsDocType;
  
  content: string;
  htmlContent?: string;
  
  menuId?: string;
  relatedMenuIds?: string[];
  
  visibility: MenuVisibility;
  sharedWith: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportLog {
  id: string;
  userId: string;
  menuId: string;
  
  exportFormat: ExportFormat;
  fileSize?: number;
  filePath?: string;
  
  includeBleeds: boolean;
  includeMarks: boolean;
  colorSpace: "RGB" | "CMYK";
  resolutionDpi: number;
  
  printerCompany?: string;
  notes?: string;
  
  createdAt: Date;
}

export interface MenuTemplate {
  id: string;
  userId?: string;
  
  name: string;
  description?: string;
  category: string;
  
  templateDesign: Record<string, any>;
  fontPresets: Record<string, CanvasFontState>;
  colorPalette?: Record<string, string>;
  
  isSystem: boolean;
  tags?: string[];
  
  timesUsed: number;
  lastUsed?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface MenuResponse {
  success: boolean;
  data?: Menu;
  error?: string;
}

export interface MenuListResponse {
  success: boolean;
  data?: Menu[];
  total?: number;
  error?: string;
}

export interface MenuDraftResponse {
  success: boolean;
  data?: MenuDraft;
  error?: string;
}

export interface MenuExportResponse {
  success: boolean;
  fileUrl?: string;
  filePath?: string;
  fileSize?: number;
  error?: string;
}

// ============================================================================
// QUERY/FILTER TYPES
// ============================================================================

export interface MenuQueryOptions {
  propertyId?: string;
  season?: BusinessSeason;
  menuType?: MenuType;
  visibility?: MenuVisibility;
  isPublished?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface MenuComparisonQuery {
  menuId1: string;
  menuId2: string;
  compareMetrics?: boolean;
  comparePerformance?: boolean;
}

export interface MenuPerformanceQuery {
  menuId: string;
  dateFrom: Date;
  dateTo: Date;
  groupBy?: "daily" | "weekly" | "monthly";
}

// ============================================================================
// EXPORT OPTIONS
// ============================================================================

export interface ExportOptions {
  format: ExportFormat;
  includeBleeds: boolean;
  includeMarks: boolean;
  colorSpace: "RGB" | "CMYK";
  resolutionDpi: number;
  preserveLayers: boolean;
  printerCompany?: string;
}

export interface BleedMarks {
  bleedSize: number; // in points, typically 0.125" = 9 points
  markType: "corner" | "center" | "both";
  markLength: number;
  markWidth: number;
}

export interface ColorMarks {
  includeColorBars: boolean;
  includeRegistrationMarks: boolean;
  includeDensitySteps: boolean;
}

// ============================================================================
// POS INTEGRATION TYPES
// ============================================================================

export interface POSIntegrationConfig {
  systemType: "square" | "toast" | "lightspeed" | "other";
  apiKey: string;
  apiSecret?: string;
  locationId?: string;
  endpoint?: string;
}

export interface POSSalesData {
  itemId: string;
  itemName: string;
  unitsSold: number;
  revenue: number;
  timestamp: Date;
  categoryId?: string;
}

// ============================================================================
// AI PERFORMANCE TRACKING
// ============================================================================

export interface MenuPerformancePrediction {
  menuId: string;
  predictedPopularity: number; // 0-100
  expectedRevenue: number;
  riskFactors: string[];
  recommendations: string[];
  confidence: number; // 0-1
}

export interface SimilarMenuAnalysis {
  sourceMenuId: string;
  similarMenus: Array<{
    menuId: string;
    similarity: number; // 0-1
    sharedDishes: string[];
    performanceDifference: number; // percentage
  }>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function createEmptyMenuDraft(userId: string, propertyId: string): MenuDraft {
  return {
    id: "", // Will be generated by DB
    userId,
    propertyId,
    title: "New Menu",
    subtitle: undefined,
    description: undefined,
    categories: [],
    dishes: [],
    canvasState: {},
    designMetadata: {},
    fontSettings: {},
    cuisineType: undefined,
    menuType: MenuType.SINGLE_PAGE,
    targetAudience: undefined,
    currency: "USD",
    businessSeason: BusinessSeason.SPRING,
    versionNumber: 1,
    isActive: false,
    visibility: MenuVisibility.PRIVATE,
    sharedWith: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function createEmptyOperationsDoc(userId: string, propertyId: string): OperationsDoc {
  return {
    id: "",
    userId,
    propertyId,
    title: "New Document",
    docType: OperationsDocType.MENU_GUIDE,
    content: "",
    htmlContent: "",
    menuId: undefined,
    relatedMenuIds: [],
    visibility: MenuVisibility.PROPERTY,
    sharedWith: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function formatMenuDate(date: Date | string | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getSeasonFromDate(date: Date): BusinessSeason {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return BusinessSeason.SPRING;
  if (month >= 5 && month <= 7) return BusinessSeason.SUMMER;
  if (month >= 8 && month <= 10) return BusinessSeason.FALL;
  return BusinessSeason.WINTER;
}
