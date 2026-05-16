/**
 * Labor & Scheduling domain types
 * Employees, shifts, time tracking, payroll integration
 */
import {
  StandardEntity,
  Nameable,
  UUID,
  Money,
  ISODate,
  Email,
  PhoneNumber,
  Schedulable,
  URL
} from './base';

/**
 * Employee/staff member
 */
export interface Employee extends StandardEntity, Nameable {
  // Personal
  firstName: string;
  lastName: string;
  email: Email;
  phone: PhoneNumber;
  dateOfBirth?: ISODate;

  // Employment
  employeeNumber: string;
  hireDate: ISODate;
  terminationDate?: ISODate;
  status: 'active' | 'terminated' | 'on_leave' | 'suspended';

  // Position
  positionId: UUID;
  department: string;
  locationId?: UUID;

  // Pay
  payRate: Money;
  payType: 'hourly' | 'salary';
  payFrequency?: 'weekly' | 'biweekly' | 'monthly';

  // Tax info
  taxId?: string;
  w4OnFile: boolean;
  i9OnFile: boolean;

  // Certifications
  certifications?: string[];
  certificationExpiryDates?: Record<string, ISODate>;

  // Emergency contact
  emergencyContactName?: string;
  emergencyContactPhone?: PhoneNumber;

  // Documents
  resumeUrl?: URL;
  photoUrl?: URL;
}

/**
 * Job position/role
 */
export interface Position extends StandardEntity, Nameable {
  department: string;

  // Pay
  minPayRate: Money;
  maxPayRate: Money;
  defaultPayRate: Money;

  // Requirements
  requiredCertifications?: string[];
  experienceRequired?: string;

  // Responsibilities
  responsibilities?: string;

  isActive: boolean;
}

/**
 * Work shift
 */
export interface Shift extends StandardEntity, Schedulable {
  employeeId: UUID;
  positionId: UUID;
  locationId?: UUID;

  // Timing
  shiftDate: ISODate;
  startTime: string; // "09:00"
  endTime: string; // "17:00"
  breakMinutes: number;

  // Status
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'no_show' | 'cancelled';

  // Actual times (for payroll)
  actualStartTime?: string;
  actualEndTime?: string;
  actualBreakMinutes?: number;

  // Hours
  scheduledHours: number;
  actualHours?: number;
  overtimeHours?: number;

  // Pay
  regularPay: Money;
  overtimePay: Money;
  totalPay: Money;

  // Notes
  notes?: string;
}

/**
 * Time clock entry
 */
export interface TimeClockEntry extends StandardEntity {
  employeeId: UUID;
  shiftId?: UUID;

  // Clock in/out
  clockInTime: ISODate;
  clockOutTime?: ISODate;

  // Location (if using geo-fencing)
  clockInLatitude?: number;
  clockInLongitude?: number;
  clockOutLatitude?: number;
  clockOutLongitude?: number;

  // Method
  clockInMethod: 'manual' | 'biometric' | 'mobile' | 'web';
  clockOutMethod?: 'manual' | 'biometric' | 'mobile' | 'web';

  // Breaks
  breakStartTime?: ISODate;
  breakEndTime?: ISODate;
  totalBreakMinutes: number;

  // Hours
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  doubleTimeHours: number;

  // Approval
  approvedBy?: UUID;
  approvedAt?: ISODate;

  // Edits
  editedBy?: UUID;
  editedAt?: ISODate;
  editReason?: string;
}

/**
 * Time off request
 */
export interface TimeOffRequest extends StandardEntity {
  employeeId: UUID;

  // Request details
  requestType: 'vacation' | 'sick' | 'personal' | 'unpaid' | 'bereavement' | 'jury_duty';
  startDate: ISODate;
  endDate: ISODate;
  totalDays: number;

  // Status
  status: 'pending' | 'approved' | 'denied' | 'cancelled';

  // Approval
  reviewedBy?: UUID;
  reviewedAt?: ISODate;
  denialReason?: string;

  // Notes
  employeeNotes?: string;
  managerNotes?: string;
}

/**
 * Employee availability
 */
export interface EmployeeAvailability extends StandardEntity {
  employeeId: UUID;

  // Recurring availability
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday
  startTime: string;
  endTime: string;
  isAvailable: boolean;

  // Effective period
  effectiveDate: ISODate;
  expirationDate?: ISODate;
}

/**
 * Shift swap request
 */
export interface ShiftSwapRequest extends StandardEntity {
  originalShiftId: UUID;
  requestingEmployeeId: UUID;
  coveringEmployeeId?: UUID;

  // Status
  status: 'pending' | 'covered' | 'approved' | 'denied' | 'cancelled';

  // Approval
  approvedBy?: UUID;
  approvedAt?: ISODate;

  // Reason
  reason?: string;
}

/**
 * Payroll period
 */
export interface PayrollPeriod extends StandardEntity {
  periodStart: ISODate;
  periodEnd: ISODate;
  payDate: ISODate;

  // Status
  status: 'open' | 'processing' | 'approved' | 'paid' | 'closed';

  // Totals
  totalHours: number;
  totalRegularPay: Money;
  totalOvertimePay: Money;
  totalGrossPay: Money;
  totalDeductions: Money;
  totalNetPay: Money;

  // Processing
  processedBy?: UUID;
  processedAt?: ISODate;
  approvedBy?: UUID;
  approvedAt?: ISODate;
}

/**
 * Payroll entry for an employee
 */
export interface PayrollEntry extends StandardEntity {
  payrollPeriodId: UUID;
  employeeId: UUID;

  // Hours
  regularHours: number;
  overtimeHours: number;
  doubleTimeHours: number;
  ptoHours: number;

  // Earnings
  regularPay: Money;
  overtimePay: Money;
  doubleTimePay: Money;
  ptoPay: Money;
  bonuses: Money;
  tips: Money;
  grossPay: Money;

  // Deductions
  federalTax: Money;
  stateTax: Money;
  socialSecurity: Money;
  medicare: Money;
  otherDeductions: Money;
  totalDeductions: Money;

  // Net
  netPay: Money;

  // Status
  status: 'draft' | 'approved' | 'paid';
}

/**
 * Labor cost analysis
 */
export interface LaborCostAnalysis extends StandardEntity {
  periodStart: ISODate;
  periodEnd: ISODate;
  locationId?: UUID;
  department?: string;

  // Labor costs
  totalLaborCost: Money;
  totalRevenue: Money;
  laborCostPercentage: number;

  // Hours
  totalHours: number;
  regularHours: number;
  overtimeHours: number;

  // Productivity
  revenuePerLaborHour: Money;
  coversPerLaborHour: number;
}
