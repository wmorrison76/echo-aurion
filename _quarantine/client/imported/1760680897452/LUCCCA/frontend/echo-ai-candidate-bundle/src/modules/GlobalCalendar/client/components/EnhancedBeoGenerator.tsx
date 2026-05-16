import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Upload,
  FileText,
  Bot,
  Wand2,
  Download,
  Eye,
  DollarSign,
  Users,
  Clock,
  ChefHat,
  Utensils,
  Wine,
  Coffee,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Zap,
  Target,
  Calendar,
  MapPin,
  Building2,
  Settings,
  Sparkles,
  Brain,
  TrendingUp,
  Save,
  Send,
  Plus,
  Minus,
  Edit,
  Trash2,
  RefreshCw,
  Shield,
  Gavel,
  ClipboardCheck,
  Signature
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

// Enhanced BEO Types with Legal Requirements
interface LegalBeoDocument {
  // Legal Contract Information
  contractNumber: string;
  executionDate: Date;
  effectiveDate: Date;
  expirationDate?: Date;
  
  // Party Information
  venue: VenueParty;
  client: ClientParty;
  
  // Event Details
  eventDetails: EventDetails;
  
  // Financial Terms
  financialTerms: FinancialTerms;
  
  // Legal Terms & Conditions
  termsAndConditions: TermsAndConditions;
  
  // Service Specifications
  serviceSpecifications: ServiceSpecification[];
  
  // Timeline and Logistics
  eventTimeline: TimelineItem[];
  
  // Legal Signatures
  signatures: SignatureRecord[];
  
  // Amendments and Changes
  amendments: Amendment[];
  
  // Insurance and Liability
  insurance: InsuranceRequirement[];
  
  // Cancellation Policy
  cancellationPolicy: CancellationTerms;
  
  // Force Majeure
  forceMajeure: ForceMajeureClause;
  
  // Governing Law
  governingLaw: string;
  jurisdiction: string;
  
  // Document Status
  status: 'draft' | 'pending_approval' | 'approved' | 'executed' | 'completed' | 'cancelled';
  version: string;
  lastModified: Date;
  createdBy: string;
  approvedBy?: string;
  executedBy?: string[];
}

interface VenueParty {
  legalName: string;
  dbaName?: string;
  address: Address;
  taxId: string;
  licenseNumbers: string[];
  contactPerson: ContactInfo;
  authorizedSignatory: ContactInfo;
}

interface ClientParty {
  type: 'individual' | 'corporation' | 'organization' | 'government';
  legalName: string;
  dbaName?: string;
  address: Address;
  taxId?: string;
  contactPerson: ContactInfo;
  authorizedSignatory: ContactInfo;
  billingContact?: ContactInfo;
}

interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface ContactInfo {
  name: string;
  title: string;
  phone: string;
  email: string;
  emergencyContact?: string;
}

interface EventDetails {
  eventName: string;
  eventType: 'corporate' | 'wedding' | 'social' | 'conference' | 'fundraiser' | 'other';
  eventDate: Date;
  startTime: string;
  endTime: string;
  setupStartTime: string;
  breakdownEndTime: string;
  guestCount: number;
  guaranteedMinimum: number;
  maximumCapacity: number;
  ageGroup: 'all_ages' | 'adults_only' | 'minors_present';
  alcoholService: boolean;
  smokingPolicy: 'no_smoking' | 'designated_areas' | 'permitted';
  venue: string;
  rooms: string[];
  specialRequirements: string[];
  accessibilityNeeds: string[];
  securityRequirements: string[];
}

interface FinancialTerms {
  subtotal: number;
  serviceCharge: number;
  serviceChargePercentage: number;
  tax: number;
  taxPercentage: number;
  total: number;
  currency: string;
  paymentSchedule: PaymentSchedule[];
  depositAmount: number;
  depositDueDate: Date;
  finalPaymentDate: Date;
  lateFees: LateFeeStructure;
  gratuityPolicy: string;
  additionalCharges: AdditionalCharge[];
}

interface PaymentSchedule {
  description: string;
  amount: number;
  percentage?: number;
  dueDate: Date;
  method: string[];
  paid: boolean;
}

interface LateFeeStructure {
  gracePeriodicDays: number;
  lateFeePercentage: number;
  maximumLateFee: number;
}

interface AdditionalCharge {
  type: 'service' | 'equipment' | 'labor' | 'administrative';
  description: string;
  amount: number;
  taxable: boolean;
}

interface TermsAndConditions {
  alcoholPolicy: AlcoholPolicy;
  cateringPolicy: CateringPolicy;
  decorationPolicy: DecorationPolicy;
  musicPolicy: MusicPolicy;
  cleanupPolicy: CleanupPolicy;
  securityPolicy: SecurityPolicy;
  liabilityTerms: LiabilityTerms;
  indemnificationClause: string;
  confidentialityClause: string;
  intellectualPropertyTerms: string;
  forceMapjeureClause: string;
  disputeResolution: DisputeResolution;
}

interface AlcoholPolicy {
  permitted: boolean;
  licenseRequired: boolean;
  hoursOfService: { start: string; end: string };
  restrictions: string[];
  liabilityTerms: string;
}

interface CateringPolicy {
  exclusiveProvider: boolean;
  outsideCateringAllowed: boolean;
  kitchenAccess: boolean;
  minimumRequirements: string[];
  restrictions: string[];
}

interface DecorationPolicy {
  permitted: boolean;
  restrictions: string[];
  damagePolicy: string;
  removalRequirements: string;
}

interface MusicPolicy {
  liveMusic: boolean;
  recordedMusic: boolean;
  volumeRestrictions: string;
  cutoffTime: string;
  licenseRequirements: string[];
}

interface CleanupPolicy {
  clientResponsibility: string[];
  venueResponsibility: string[];
  additionalCleaningFees: number;
  damageAssessment: string;
}

interface SecurityPolicy {
  required: boolean;
  providedByVenue: boolean;
  clientProvided: boolean;
  minimumRequirements: string[];
  cost: number;
}

interface LiabilityTerms {
  venueLiabilityLimit: number;
  clientLiabilityRequirements: string[];
  propertyDamagePolicy: string;
  personalInjuryPolicy: string;
}

interface DisputeResolution {
  method: 'arbitration' | 'mediation' | 'litigation';
  location: string;
  governingLaw: string;
  costs: string;
}

interface ServiceSpecification {
  category: 'food' | 'beverage' | 'service' | 'equipment' | 'labor' | 'venue';
  item: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  serviceTime: string;
  specialInstructions: string[];
  qualityStandards: string[];
  substitutionPolicy: string;
}

interface TimelineItem {
  time: string;
  description: string;
  responsibility: 'venue' | 'client' | 'vendor';
  criticalPath: boolean;
  dependencies: string[];
}

interface SignatureRecord {
  party: 'venue' | 'client';
  signatory: string;
  title: string;
  date: Date;
  method: 'physical' | 'electronic' | 'witnessed';
  witness?: string;
  location: string;
}

interface Amendment {
  number: number;
  date: Date;
  description: string;
  changes: string[];
  authorizedBy: string[];
  effectiveDate: Date;
}

interface InsuranceRequirement {
  type: 'general_liability' | 'liquor_liability' | 'event_insurance' | 'workers_comp';
  minimumCoverage: number;
  provider: string;
  policyNumber: string;
  expirationDate: Date;
  certificateRequired: boolean;
  additionalInsured: boolean;
}

interface CancellationTerms {
  noticePeriods: NoticePeriod[];
  refundPolicy: RefundPolicy;
  forceMajeureExceptions: string[];
  weatherPolicy: string;
}

interface NoticePeriod {
  daysBeforeEvent: number;
  cancellationFeePercentage: number;
  refundPercentage: number;
}

interface RefundPolicy {
  refundableItems: string[];
  nonRefundableItems: string[];
  processingTime: string;
  method: string;
}

interface ForceMajeureClause {
  definition: string;
  applicableEvents: string[];
  notificationRequirements: string;
  mitigation: string;
  termination: string;
}

export default function EnhancedBeoGenerator({ 
  selectedMenu, 
  selectedItems = [], 
  onBeoGenerated 
}: {
  selectedMenu?: any;
  selectedItems?: string[];
  onBeoGenerated?: (beo: LegalBeoDocument) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<'event' | 'client' | 'financial' | 'legal' | 'review'>('event');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBeo, setGeneratedBeo] = useState<LegalBeoDocument | null>(null);
  const { toast } = useToast();

  // Form State
  const [eventDetails, setEventDetails] = useState<Partial<EventDetails>>({
    guestCount: 0,
    guaranteedMinimum: 0,
    maximumCapacity: 0,
    alcoholService: false,
    smokingPolicy: 'no_smoking',
    ageGroup: 'all_ages'
  });

  const [clientInfo, setClientInfo] = useState<Partial<ClientParty>>({
    type: 'corporation'
  });

  const [venueInfo, setVenueInfo] = useState<Partial<VenueParty>>({
    legalName: "Grand Hospitality Venues LLC",
    address: {
      street: "123 Event Plaza",
      city: "Metropolitan City",
      state: "State",
      zipCode: "12345",
      country: "USA"
    }
  });

  const [financialTerms, setFinancialTerms] = useState<Partial<FinancialTerms>>({
    serviceChargePercentage: 22,
    taxPercentage: 8.5,
    currency: "USD",
    depositAmount: 0,
    gratuityPolicy: "Gratuity is not included and is at the discretion of the client"
  });

  const generateLegalBeo = async () => {
    setIsGenerating(true);
    
    try {
      // Simulate BEO generation with legal compliance
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const contractNumber = `BEO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const executionDate = new Date();
      const effectiveDate = new Date(eventDetails.eventDate || new Date());
      
      // Calculate financial totals
      const baseTotal = selectedItems.length * 25; // Simplified calculation
      const subtotal = baseTotal * (eventDetails.guestCount || 1);
      const serviceCharge = subtotal * ((financialTerms.serviceChargePercentage || 22) / 100);
      const tax = (subtotal + serviceCharge) * ((financialTerms.taxPercentage || 8.5) / 100);
      const total = subtotal + serviceCharge + tax;
      
      const legalBeo: LegalBeoDocument = {
        contractNumber,
        executionDate,
        effectiveDate,
        expirationDate: new Date(effectiveDate.getTime() + (365 * 24 * 60 * 60 * 1000)), // 1 year
        
        venue: {
          legalName: venueInfo.legalName || "Grand Hospitality Venues LLC",
          address: venueInfo.address || {
            street: "123 Event Plaza",
            city: "Metropolitan City", 
            state: "State",
            zipCode: "12345",
            country: "USA"
          },
          taxId: "XX-XXXXXXX",
          licenseNumbers: ["FOOD-2024-001", "LIQUOR-2024-001"],
          contactPerson: {
            name: "William Morrison",
            title: "Event Director",
            phone: "+1 (555) 123-4567",
            email: "william@venue.com"
          },
          authorizedSignatory: {
            name: "William Morrison",
            title: "Event Director", 
            phone: "+1 (555) 123-4567",
            email: "william@venue.com"
          }
        },
        
        client: {
          type: clientInfo.type || 'corporation',
          legalName: clientInfo.legalName || "Client Corporation",
          address: clientInfo.address || {
            street: "456 Business Ave",
            city: "Corporate City",
            state: "State", 
            zipCode: "54321",
            country: "USA"
          },
          contactPerson: clientInfo.contactPerson || {
            name: "Client Contact",
            title: "Event Coordinator",
            phone: "+1 (555) 987-6543",
            email: "contact@client.com"
          },
          authorizedSignatory: clientInfo.authorizedSignatory || {
            name: "Client Signatory",
            title: "Authorized Representative",
            phone: "+1 (555) 987-6543", 
            email: "signatory@client.com"
          }
        },
        
        eventDetails: {
          eventName: eventDetails.eventName || "Corporate Event",
          eventType: eventDetails.eventType || 'corporate',
          eventDate: new Date(eventDetails.eventDate || new Date()),
          startTime: eventDetails.startTime || "18:00",
          endTime: eventDetails.endTime || "22:00",
          setupStartTime: eventDetails.setupStartTime || "16:00",
          breakdownEndTime: eventDetails.breakdownEndTime || "24:00",
          guestCount: eventDetails.guestCount || 100,
          guaranteedMinimum: eventDetails.guaranteedMinimum || eventDetails.guestCount || 100,
          maximumCapacity: eventDetails.maximumCapacity || 150,
          ageGroup: eventDetails.ageGroup || 'all_ages',
          alcoholService: eventDetails.alcoholService || false,
          smokingPolicy: eventDetails.smokingPolicy || 'no_smoking',
          venue: eventDetails.venue || "Grand Ballroom A",
          rooms: eventDetails.rooms || ["Grand Ballroom A"],
          specialRequirements: eventDetails.specialRequirements || [],
          accessibilityNeeds: eventDetails.accessibilityNeeds || [],
          securityRequirements: eventDetails.securityRequirements || []
        },
        
        financialTerms: {
          subtotal,
          serviceCharge,
          serviceChargePercentage: financialTerms.serviceChargePercentage || 22,
          tax,
          taxPercentage: financialTerms.taxPercentage || 8.5,
          total,
          currency: financialTerms.currency || "USD",
          paymentSchedule: [
            {
              description: "Deposit (50%)",
              amount: total * 0.5,
              percentage: 50,
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              method: ["check", "wire_transfer", "credit_card"],
              paid: false
            },
            {
              description: "Final Payment (50%)",
              amount: total * 0.5,
              percentage: 50,
              dueDate: new Date(effectiveDate.getTime() - 7 * 24 * 60 * 60 * 1000),
              method: ["check", "wire_transfer"],
              paid: false
            }
          ],
          depositAmount: total * 0.5,
          depositDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          finalPaymentDate: new Date(effectiveDate.getTime() - 7 * 24 * 60 * 60 * 1000),
          lateFees: {
            gracePeriodicDays: 5,
            lateFeePercentage: 1.5,
            maximumLateFee: 500
          },
          gratuityPolicy: financialTerms.gratuityPolicy || "Gratuity is not included and is at the discretion of the client",
          additionalCharges: []
        },
        
        termsAndConditions: {
          alcoholPolicy: {
            permitted: eventDetails.alcoholService || false,
            licenseRequired: true,
            hoursOfService: { start: "17:00", end: "23:00" },
            restrictions: ["No service to intoxicated individuals", "Valid ID required"],
            liabilityTerms: "Client assumes full liability for alcohol service"
          },
          cateringPolicy: {
            exclusiveProvider: true,
            outsideCateringAllowed: false,
            kitchenAccess: false,
            minimumRequirements: ["Licensed catering staff", "Food safety compliance"],
            restrictions: ["No outside food or beverage"]
          },
          decorationPolicy: {
            permitted: true,
            restrictions: ["No nails or screws in walls", "Fire-safe materials only"],
            damagePolicy: "Client liable for any damage beyond normal wear",
            removalRequirements: "All decorations must be removed within 2 hours of event end"
          },
          musicPolicy: {
            liveMusic: true,
            recordedMusic: true,
            volumeRestrictions: "Music must not exceed 85 dB at property line",
            cutoffTime: "23:00",
            licenseRequirements: ["ASCAP", "BMI licenses required for live music"]
          },
          cleanupPolicy: {
            clientResponsibility: ["Remove all personal items", "Basic cleanup of event space"],
            venueResponsibility: ["Deep cleaning", "Equipment breakdown", "Waste disposal"],
            additionalCleaningFees: 500,
            damageAssessment: "Venue has 48 hours to assess and report damage"
          },
          securityPolicy: {
            required: eventDetails.guestCount > 100,
            providedByVenue: true,
            clientProvided: false,
            minimumRequirements: ["Licensed security personnel", "Crowd control certification"],
            cost: eventDetails.guestCount > 100 ? 200 : 0
          },
          liabilityTerms: {
            venueLiabilityLimit: 1000000,
            clientLiabilityRequirements: ["General liability insurance minimum $1M"],
            propertyDamagePolicy: "Client liable for damage to venue property",
            personalInjuryPolicy: "Each party maintains own insurance for injuries"
          },
          indemnificationClause: "Client agrees to indemnify and hold harmless the Venue from any claims arising from the event",
          confidentialityClause: "Both parties agree to maintain confidentiality of proprietary information",
          intellectualPropertyTerms: "Client retains rights to event content; Venue may use for marketing with permission",
          forceMapjeureClause: "Neither party liable for delays due to acts of God, war, terrorism, or government action",
          disputeResolution: {
            method: 'arbitration',
            location: "Metropolitan City, State",
            governingLaw: "State law",
            costs: "Each party bears own costs unless otherwise awarded"
          }
        },
        
        serviceSpecifications: selectedItems.map((itemId, index) => ({
          category: 'food',
          item: `Menu Item ${index + 1}`,
          description: `Selected menu item with ID: ${itemId}`,
          quantity: eventDetails.guestCount || 100,
          unit: 'per person',
          unitPrice: 25,
          totalPrice: (eventDetails.guestCount || 100) * 25,
          serviceTime: eventDetails.startTime || "18:00",
          specialInstructions: [],
          qualityStandards: ["Fresh ingredients", "Professional presentation"],
          substitutionPolicy: "Substitutions require 48-hour notice and mutual agreement"
        })),
        
        eventTimeline: [
          {
            time: eventDetails.setupStartTime || "16:00",
            description: "Setup begins - venue preparation and decoration installation",
            responsibility: 'venue',
            criticalPath: true,
            dependencies: []
          },
          {
            time: eventDetails.startTime || "18:00", 
            description: "Event begins - guest arrival and service commences",
            responsibility: 'venue',
            criticalPath: true,
            dependencies: ["Setup completion"]
          },
          {
            time: eventDetails.endTime || "22:00",
            description: "Event ends - last call for service",
            responsibility: 'venue', 
            criticalPath: true,
            dependencies: ["Event service"]
          },
          {
            time: eventDetails.breakdownEndTime || "24:00",
            description: "Breakdown complete - venue returned to original state",
            responsibility: 'venue',
            criticalPath: false,
            dependencies: ["Event end", "Guest departure"]
          }
        ],
        
        signatures: [],
        amendments: [],
        
        insurance: [
          {
            type: 'general_liability',
            minimumCoverage: 1000000,
            provider: "To be provided by client",
            policyNumber: "TBD",
            expirationDate: new Date(effectiveDate.getTime() + 365 * 24 * 60 * 60 * 1000),
            certificateRequired: true,
            additionalInsured: true
          }
        ],
        
        cancellationPolicy: {
          noticePeriods: [
            { daysBeforeEvent: 60, cancellationFeePercentage: 25, refundPercentage: 75 },
            { daysBeforeEvent: 30, cancellationFeePercentage: 50, refundPercentage: 50 },
            { daysBeforeEvent: 14, cancellationFeePercentage: 75, refundPercentage: 25 },
            { daysBeforeEvent: 7, cancellationFeePercentage: 100, refundPercentage: 0 }
          ],
          refundPolicy: {
            refundableItems: ["Room rental", "Unused services"],
            nonRefundableItems: ["Deposit", "Custom preparations", "Third-party vendors"],
            processingTime: "30 business days",
            method: "Original payment method"
          },
          forceMajeureExceptions: ["Natural disasters", "Government restrictions", "Public health emergencies"],
          weatherPolicy: "Outdoor events subject to weather conditions; indoor alternatives provided when possible"
        },
        
        forceMajeure: {
          definition: "Unforeseeable circumstances that prevent a party from fulfilling a contract",
          applicableEvents: ["Acts of God", "Natural disasters", "War", "Terrorism", "Government action", "Pandemic"],
          notificationRequirements: "Written notice within 48 hours of knowledge of force majeure event",
          mitigation: "Parties will work together to minimize impact and find alternative solutions",
          termination: "Either party may terminate without penalty if force majeure continues for more than 60 days"
        },
        
        governingLaw: "State Law",
        jurisdiction: "State Courts, Metropolitan County",
        
        status: 'draft',
        version: "1.0",
        lastModified: new Date(),
        createdBy: "William Morrison",
      };
      
      setGeneratedBeo(legalBeo);
      setCurrentStep('review');
      
      if (onBeoGenerated) {
        onBeoGenerated(legalBeo);
      }
      
      toast({
        title: "BEO Generated Successfully",
        description: `Legal BEO contract ${contractNumber} has been generated with all required fields.`,
      });
      
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "There was an error generating the BEO. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const renderEventDetails = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="event-name">Event Name *</Label>
            <Input
              id="event-name"
              value={eventDetails.eventName || ''}
              onChange={(e) => setEventDetails(prev => ({ ...prev, eventName: e.target.value }))}
              placeholder="Annual Corporate Meeting"
            />
          </div>

          <div>
            <Label htmlFor="event-type">Event Type *</Label>
            <Select 
              value={eventDetails.eventType || ''} 
              onValueChange={(value) => setEventDetails(prev => ({ ...prev, eventType: value as any }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="corporate">Corporate</SelectItem>
                <SelectItem value="wedding">Wedding</SelectItem>
                <SelectItem value="social">Social</SelectItem>
                <SelectItem value="conference">Conference</SelectItem>
                <SelectItem value="fundraiser">Fundraiser</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="event-date">Event Date *</Label>
            <Input
              id="event-date"
              type="date"
              value={eventDetails.eventDate || ''}
              onChange={(e) => setEventDetails(prev => ({ ...prev, eventDate: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="start-time">Start Time *</Label>
              <Input
                id="start-time"
                type="time"
                value={eventDetails.startTime || ''}
                onChange={(e) => setEventDetails(prev => ({ ...prev, startTime: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="end-time">End Time *</Label>
              <Input
                id="end-time"
                type="time"
                value={eventDetails.endTime || ''}
                onChange={(e) => setEventDetails(prev => ({ ...prev, endTime: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="guest-count">Guest Count *</Label>
            <Input
              id="guest-count"
              type="number"
              value={eventDetails.guestCount || ''}
              onChange={(e) => setEventDetails(prev => ({ ...prev, guestCount: parseInt(e.target.value) }))}
              placeholder="100"
            />
          </div>

          <div>
            <Label htmlFor="guaranteed-minimum">Guaranteed Minimum *</Label>
            <Input
              id="guaranteed-minimum"
              type="number"
              value={eventDetails.guaranteedMinimum || ''}
              onChange={(e) => setEventDetails(prev => ({ ...prev, guaranteedMinimum: parseInt(e.target.value) }))}
              placeholder="Same as guest count"
            />
          </div>

          <div>
            <Label htmlFor="venue">Venue/Room *</Label>
            <Select 
              value={eventDetails.venue || ''} 
              onValueChange={(value) => setEventDetails(prev => ({ ...prev, venue: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select venue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Grand Ballroom A">Grand Ballroom A</SelectItem>
                <SelectItem value="Grand Ballroom B">Grand Ballroom B</SelectItem>
                <SelectItem value="Conference Hall A">Conference Hall A</SelectItem>
                <SelectItem value="Rose Garden Pavilion">Rose Garden Pavilion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="alcohol-service"
              checked={eventDetails.alcoholService || false}
              onCheckedChange={(checked) => setEventDetails(prev => ({ ...prev, alcoholService: checked as boolean }))}
            />
            <Label htmlFor="alcohol-service">Alcohol Service Required</Label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderClientInfo = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="client-type">Client Type *</Label>
            <Select 
              value={clientInfo.type || ''} 
              onValueChange={(value) => setClientInfo(prev => ({ ...prev, type: value as any }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select client type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="corporation">Corporation</SelectItem>
                <SelectItem value="organization">Organization</SelectItem>
                <SelectItem value="government">Government</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="legal-name">Legal Name *</Label>
            <Input
              id="legal-name"
              value={clientInfo.legalName || ''}
              onChange={(e) => setClientInfo(prev => ({ ...prev, legalName: e.target.value }))}
              placeholder="ABC Corporation"
            />
          </div>

          <div>
            <Label htmlFor="dba-name">DBA Name (if applicable)</Label>
            <Input
              id="dba-name"
              value={clientInfo.dbaName || ''}
              onChange={(e) => setClientInfo(prev => ({ ...prev, dbaName: e.target.value }))}
              placeholder="ABC Events"
            />
          </div>

          <div>
            <Label htmlFor="tax-id">Tax ID/EIN</Label>
            <Input
              id="tax-id"
              value={clientInfo.taxId || ''}
              onChange={(e) => setClientInfo(prev => ({ ...prev, taxId: e.target.value }))}
              placeholder="XX-XXXXXXX"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium">Contact Information</h4>
          
          <div>
            <Label htmlFor="contact-name">Contact Name *</Label>
            <Input
              id="contact-name"
              value={clientInfo.contactPerson?.name || ''}
              onChange={(e) => setClientInfo(prev => ({ 
                ...prev, 
                contactPerson: { ...prev.contactPerson, name: e.target.value } as ContactInfo
              }))}
              placeholder="John Smith"
            />
          </div>

          <div>
            <Label htmlFor="contact-title">Contact Title</Label>
            <Input
              id="contact-title"
              value={clientInfo.contactPerson?.title || ''}
              onChange={(e) => setClientInfo(prev => ({ 
                ...prev, 
                contactPerson: { ...prev.contactPerson, title: e.target.value } as ContactInfo
              }))}
              placeholder="Event Coordinator"
            />
          </div>

          <div>
            <Label htmlFor="contact-email">Email *</Label>
            <Input
              id="contact-email"
              type="email"
              value={clientInfo.contactPerson?.email || ''}
              onChange={(e) => setClientInfo(prev => ({ 
                ...prev, 
                contactPerson: { ...prev.contactPerson, email: e.target.value } as ContactInfo
              }))}
              placeholder="john@company.com"
            />
          </div>

          <div>
            <Label htmlFor="contact-phone">Phone *</Label>
            <Input
              id="contact-phone"
              value={clientInfo.contactPerson?.phone || ''}
              onChange={(e) => setClientInfo(prev => ({ 
                ...prev, 
                contactPerson: { ...prev.contactPerson, phone: e.target.value } as ContactInfo
              }))}
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderFinancialTerms = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="service-charge">Service Charge %</Label>
            <Input
              id="service-charge"
              type="number"
              value={financialTerms.serviceChargePercentage || ''}
              onChange={(e) => setFinancialTerms(prev => ({ ...prev, serviceChargePercentage: parseFloat(e.target.value) }))}
              placeholder="22"
            />
          </div>

          <div>
            <Label htmlFor="tax-rate">Tax Rate %</Label>
            <Input
              id="tax-rate"
              type="number"
              step="0.1"
              value={financialTerms.taxPercentage || ''}
              onChange={(e) => setFinancialTerms(prev => ({ ...prev, taxPercentage: parseFloat(e.target.value) }))}
              placeholder="8.5"
            />
          </div>

          <div>
            <Label htmlFor="deposit-percentage">Deposit %</Label>
            <Input
              id="deposit-percentage"
              type="number"
              value="50"
              readOnly
            />
            <p className="text-xs text-muted-foreground mt-1">
              Standard 50% deposit required
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="gratuity-policy">Gratuity Policy</Label>
            <Textarea
              id="gratuity-policy"
              value={financialTerms.gratuityPolicy || ''}
              onChange={(e) => setFinancialTerms(prev => ({ ...prev, gratuityPolicy: e.target.value }))}
              placeholder="Gratuity is not included and is at the discretion of the client"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="payment-terms">Payment Terms</Label>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• 50% deposit due within 7 days of contract execution</p>
              <p>• Final payment due 7 days before event</p>
              <p>• Late payments subject to 1.5% monthly fee</p>
              <p>• Payment methods: Check, Wire Transfer, Credit Card</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLegalTerms = () => (
    <div className="space-y-6">
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Legal Contract Terms</AlertTitle>
        <AlertDescription>
          These terms will be incorporated into the BEO contract. Review carefully as they are legally binding.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Liability & Insurance</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>• General liability insurance minimum $1,000,000 required</p>
            <p>• Venue liability limited to $1,000,000</p>
            <p>• Client responsible for guest behavior and damages</p>
            <p>• Each party maintains insurance for personal injuries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cancellation Policy</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>• 60+ days: 25% cancellation fee</p>
            <p>• 30-59 days: 50% cancellation fee</p>
            <p>• 14-29 days: 75% cancellation fee</p>
            <p>• Under 14 days: 100% cancellation fee</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Force Majeure</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>• Acts of God, natural disasters, war, terrorism</p>
            <p>• Government restrictions, pandemic conditions</p>
            <p>• 48-hour notification requirement</p>
            <p>• Termination allowed after 60 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dispute Resolution</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>• Binding arbitration in Metropolitan City</p>
            <p>• Governed by State law</p>
            <p>• Each party bears own costs</p>
            <p>• Confidentiality maintained</p>
          </CardContent>
        </Card>
      </div>

      {eventDetails.alcoholService && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alcohol Service Policy</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>• Valid liquor license required</p>
            <p>• Service hours: 5:00 PM - 11:00 PM</p>
            <p>• No service to intoxicated individuals</p>
            <p>• Client assumes full liability for alcohol service</p>
            <p>• Licensed bartenders required</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      {generatedBeo && (
        <>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Legal BEO Contract Generated</AlertTitle>
            <AlertDescription>
              Contract {generatedBeo.contractNumber} has been generated with all legal requirements. 
              Review all sections before finalizing.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="financials">Financials</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="legal">Legal Terms</TabsTrigger>
              <TabsTrigger value="signatures">Signatures</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Contract Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Contract Number:</span>
                      <span className="font-mono">{generatedBeo.contractNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Execution Date:</span>
                      <span>{generatedBeo.executionDate.toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Event Date:</span>
                      <span>{generatedBeo.eventDetails.eventDate.toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <Badge className="capitalize">{generatedBeo.status}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Event Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Event:</span>
                      <span>{generatedBeo.eventDetails.eventName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span className="capitalize">{generatedBeo.eventDetails.eventType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Guest Count:</span>
                      <span>{generatedBeo.eventDetails.guestCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Venue:</span>
                      <span>{generatedBeo.eventDetails.venue}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="financials" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Financial Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Subtotal</TableCell>
                        <TableCell className="text-right">${generatedBeo.financialTerms.subtotal.toFixed(2)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Service Charge ({generatedBeo.financialTerms.serviceChargePercentage}%)</TableCell>
                        <TableCell className="text-right">${generatedBeo.financialTerms.serviceCharge.toFixed(2)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Tax ({generatedBeo.financialTerms.taxPercentage}%)</TableCell>
                        <TableCell className="text-right">${generatedBeo.financialTerms.tax.toFixed(2)}</TableCell>
                      </TableRow>
                      <TableRow className="font-bold">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">${generatedBeo.financialTerms.total.toFixed(2)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Payment Schedule</h4>
                    <div className="space-y-2">
                      {generatedBeo.financialTerms.paymentSchedule.map((payment, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{payment.description}</span>
                          <span>${payment.amount.toFixed(2)} due {payment.dueDate.toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <div className="space-y-3">
                {generatedBeo.eventTimeline.map((item, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="font-mono text-sm font-medium bg-muted px-2 py-1 rounded">
                          {item.time}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{item.description}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs capitalize">
                              {item.responsibility}
                            </Badge>
                            {item.criticalPath && (
                              <Badge variant="destructive" className="text-xs">
                                Critical
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="legal" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Governing Law</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p><strong>Law:</strong> {generatedBeo.governingLaw}</p>
                    <p><strong>Jurisdiction:</strong> {generatedBeo.jurisdiction}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Force Majeure</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p>{generatedBeo.forceMajeure.definition}</p>
                    <div className="mt-2">
                      <strong>Applicable Events:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {generatedBeo.forceMajeure.applicableEvents.map((event, index) => (
                          <li key={index}>{event}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Insurance Requirements</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    {generatedBeo.insurance.map((ins, index) => (
                      <div key={index} className="mb-2">
                        <p><strong>{ins.type.replace('_', ' ')}:</strong> ${ins.minimumCoverage.toLocaleString()}</p>
                        <p>Certificate Required: {ins.certificateRequired ? 'Yes' : 'No'}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Cancellation Terms</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    {generatedBeo.cancellationPolicy.noticePeriods.map((period, index) => (
                      <p key={index}>
                        {period.daysBeforeEvent}+ days: {period.cancellationFeePercentage}% fee
                      </p>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="signatures" className="space-y-4">
              <Alert>
                <Signature className="h-4 w-4" />
                <AlertTitle>Electronic Signatures Required</AlertTitle>
                <AlertDescription>
                  Both parties must sign this contract electronically for it to become legally binding.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Venue Signature</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm">
                      <p><strong>Signatory:</strong> {generatedBeo.venue.authorizedSignatory.name}</p>
                      <p><strong>Title:</strong> {generatedBeo.venue.authorizedSignatory.title}</p>
                      <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                    </div>
                    <Button className="w-full" variant="outline">
                      <Signature className="h-4 w-4 mr-2" />
                      Sign as Venue
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Client Signature</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm">
                      <p><strong>Signatory:</strong> {generatedBeo.client.authorizedSignatory.name}</p>
                      <p><strong>Title:</strong> {generatedBeo.client.authorizedSignatory.title}</p>
                      <p><strong>Date:</strong> Pending</p>
                    </div>
                    <Button className="w-full" disabled>
                      <Signature className="h-4 w-4 mr-2" />
                      Awaiting Client Signature
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );

  const getStepContent = () => {
    switch (currentStep) {
      case 'event': return renderEventDetails();
      case 'client': return renderClientInfo();
      case 'financial': return renderFinancialTerms();
      case 'legal': return renderLegalTerms();
      case 'review': return renderReview();
      default: return renderEventDetails();
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'event': 
        return eventDetails.eventName && eventDetails.eventType && eventDetails.eventDate && 
               eventDetails.guestCount && eventDetails.venue;
      case 'client': 
        return clientInfo.legalName && clientInfo.contactPerson?.name && 
               clientInfo.contactPerson?.email && clientInfo.contactPerson?.phone;
      case 'financial': 
        return financialTerms.serviceChargePercentage && financialTerms.taxPercentage;
      case 'legal': 
        return true;
      case 'review': 
        return true;
      default: 
        return false;
    }
  };

  const getNextStep = () => {
    switch (currentStep) {
      case 'event': return 'client';
      case 'client': return 'financial';
      case 'financial': return 'legal';
      case 'legal': return 'review';
      default: return 'event';
    }
  };

  const handleNext = () => {
    if (currentStep === 'legal') {
      generateLegalBeo();
    } else {
      setCurrentStep(getNextStep());
    }
  };

  const handleBack = () => {
    const steps = ['event', 'client', 'financial', 'legal', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1] as any);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Gavel className="h-4 w-4" />
          Generate Legal BEO Contract
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
              <Gavel className="h-5 w-5 text-white" />
            </div>
            Legal BEO Contract Generator
            <Badge className="bg-purple-100 text-purple-700">
              <Shield className="h-3 w-3 mr-1" />
              Legally Compliant
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Generate a comprehensive, legally binding Banquet Event Order with all required contract terms,
            liability clauses, and industry-standard legal protections.
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicators */}
        <div className="flex items-center justify-between mb-6">
          {['event', 'client', 'financial', 'legal', 'review'].map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                currentStep === step ? "bg-primary text-primary-foreground" :
                ['event', 'client', 'financial', 'legal', 'review'].indexOf(currentStep) > index ? "bg-green-500 text-white" :
                "bg-muted text-muted-foreground"
              )}>
                {['event', 'client', 'financial', 'legal', 'review'].indexOf(currentStep) > index ? 
                  <CheckCircle className="h-4 w-4" /> : 
                  index + 1
                }
              </div>
              {index < 4 && (
                <div className={cn(
                  "w-12 h-0.5 mx-2",
                  ['event', 'client', 'financial', 'legal', 'review'].indexOf(currentStep) > index ? "bg-green-500" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        <div className="min-h-[600px]">
          {isGenerating ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <div>
                  <h3 className="font-medium">Generating Legal BEO Contract</h3>
                  <p className="text-sm text-muted-foreground">
                    Incorporating legal terms, calculating financials, and ensuring compliance...
                  </p>
                </div>
                <Progress value={66} className="w-64" />
              </div>
            </div>
          ) : (
            getStepContent()
          )}
        </div>

        <DialogFooter className="mt-6">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {selectedMenu && (
                <span>Menu: {selectedMenu.name} ({selectedItems.length} items)</span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              
              {currentStep !== 'event' && currentStep !== 'review' && (
                <Button 
                  variant="outline"
                  onClick={handleBack}
                  disabled={isGenerating}
                >
                  Back
                </Button>
              )}
              
              {currentStep === 'review' ? (
                <div className="flex gap-2">
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Contract
                  </Button>
                  <Button>
                    <Save className="h-4 w-4 mr-2" />
                    Save & Send for Signature
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={handleNext}
                  disabled={!canProceed() || isGenerating}
                >
                  {currentStep === 'legal' ? (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate Legal BEO
                    </>
                  ) : (
                    'Next'
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
