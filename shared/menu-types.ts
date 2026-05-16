export type MenuItem = {
  id: string;
  name: string;
  description?: string;
  price?: number;
  category?: string;
  allergens?: string[];
  dietaryInfo?: string[];
  preparationTime?: number;
  servingSize?: string;
};

export type MenuSection = {
  id: string;
  name: string;
  description?: string;
  displayOrder?: number;
  items: MenuItem[];
};

export type Menu = {
  id: string;
  name: string;
  type: string;
  outlet?: string;
  effectiveDate?: string;
  sections: MenuSection[];
};

export type MenuUpload = {
  id: string;
  originalFilename: string;
  contentType: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  status: "uploading" | "processing" | "completed" | "failed" | "error";
  processingStage: "ocr" | "parsing" | "validation" | "complete";
  progress: number;
};

export type OutletContactInfo = {
  manager: string;
  phone: string;
  email: string;
};

export type OutletCapabilities = {
  maxCapacity: number;
  simultaneousEvents: number;
  cuisineTypes: string[];
  serviceStyles: string[];
  equipment: string[];
};

export type OutletPricing = {
  laborChargePerHour: number;
  serviceChargePercentage: number;
  equipmentRental: Record<string, number>;
};

export type Outlet = {
  id: string;
  name: string;
  type: string;
  location: string;
  contactInfo: OutletContactInfo;
  capabilities: OutletCapabilities;
  operatingHours: Record<string, { open: string; close: string }>;
  menus: Menu[];
  pricing: OutletPricing;
};

export type EventSpaceCapacity = {
  seated: number;
  standing: number;
  classroom: number;
  theater: number;
  cocktail: number;
};

export type EventSpaceDimensions = {
  length: number;
  width: number;
  height: number;
  squareFeet: number;
};

export type EventSpacePricing = {
  baseRentalFee: number;
  setupFee: number;
  cleanupFee: number;
  securityDeposit: number;
  cancellationPolicy: string;
};

export type EventSpaceAvailability = {
  bookingWindow: number;
  minimumRentalHours: number;
  setupTime: number;
  breakdownTime: number;
};

export type EventSpace = {
  id: string;
  name: string;
  type: string;
  location: string;
  capacity: EventSpaceCapacity;
  dimensions: EventSpaceDimensions;
  features: string[];
  amenities: string[];
  pricing: EventSpacePricing;
  availability: EventSpaceAvailability;
  compatibleOutlets: string[];
  restrictions?: string[];
};
