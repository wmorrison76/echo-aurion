/**
 * Bulk Upload Template Generator
 * Creates Excel templates for employee bulk import
 * Supports 5,000+ records with encrypted upload
 */

import { BulkUploadTemplate } from './employee-types';

/**
 * Template structure for bulk upload
 * Download this template, fill it out, and upload
 */
export const BULK_UPLOAD_TEMPLATE_COLUMNS = [
  {
    header: 'Employee Number*',
    key: 'employee_number',
    description: 'Unique employee ID (required)',
    example: 'EMP00123',
    required: true,
  },
  {
    header: 'First Name*',
    key: 'first_name',
    description: 'Employee first name (required)',
    example: 'John',
    required: true,
  },
  {
    header: 'Last Name*',
    key: 'last_name',
    description: 'Employee last name (required)',
    example: 'Smith',
    required: true,
  },
  {
    header: 'Email*',
    key: 'email',
    description: 'Corporate email address (required, unique)',
    example: 'john.smith@company.com',
    required: true,
  },
  {
    header: 'Phone',
    key: 'phone',
    description: 'Contact phone number',
    example: '555-123-4567',
    required: false,
  },
  {
    header: 'Department*',
    key: 'department',
    description: 'Department name (Culinary, Finance, HR, etc)',
    example: 'Culinary',
    required: true,
  },
  {
    header: 'Outlet ID*',
    key: 'outlet_id',
    description: 'Unique outlet/location identifier',
    example: 'AVIVA',
    required: true,
  },
  {
    header: 'Outlet Name*',
    key: 'outlet_name',
    description: 'Outlet/location display name',
    example: 'Aviva Restaurant',
    required: true,
  },
  {
    header: 'Position Title*',
    key: 'position_title',
    description: 'Job title or position',
    example: 'Executive Chef',
    required: true,
  },
  {
    header: 'Hire Date*',
    key: 'hire_date',
    description: 'Employment start date (YYYY-MM-DD)',
    example: '2024-01-15',
    required: true,
  },
  {
    header: 'Employment Type*',
    key: 'employment_type',
    description: 'SALARY, HOURLY, or 1099',
    example: 'SALARY',
    required: true,
  },
  {
    header: 'Hourly Rate ($)',
    key: 'hourly_rate',
    description: 'Hourly rate (for HOURLY employees)',
    example: '25.00',
    required: false,
  },
  {
    header: 'Salary ($)',
    key: 'salary',
    description: 'Annual salary (for SALARY employees)',
    example: '65000.00',
    required: false,
  },
  {
    header: 'Commission Structure*',
    key: 'commission_structure',
    description: 'NONE, FULL_COMMISSION, or SALARY_PLUS_COMMISSION',
    example: 'NONE',
    required: true,
  },
  {
    header: 'Commission Rate (%)',
    key: 'commission_rate',
    description: 'Percentage for commission positions',
    example: '10.5',
    required: false,
  },
  {
    header: 'Tip Position?',
    key: 'is_tip_position',
    description: 'YES or NO - is this a tipped position?',
    example: 'YES',
    required: true,
  },
  {
    header: 'Work Authorization*',
    key: 'work_authorization',
    description: 'CITIZEN, GREEN_CARD, H1B, H2B, J1, L1, or OTHER',
    example: 'CITIZEN',
    required: true,
  },
  {
    header: 'Manager Employee #',
    key: 'manager_employee_number',
    description: 'Employee number of their manager (for hierarchy)',
    example: 'EMP00050',
    required: false,
  },
  {
    header: 'Shift Pattern*',
    key: 'shift_pattern',
    description: 'FIXED, ROTATING, or VARIABLE',
    example: 'FIXED',
    required: true,
  },
  {
    header: 'Primary Shift Start (HH:mm)',
    key: 'primary_shift_start',
    description: 'Regular shift start time (24-hour format)',
    example: '09:00',
    required: false,
  },
  {
    header: 'Primary Shift End (HH:mm)',
    key: 'primary_shift_end',
    description: 'Regular shift end time (24-hour format)',
    example: '17:00',
    required: false,
  },
];

/**
 * Validate a row from bulk upload
 */
export function validateBulkUploadRow(
  row: Record<string, any>,
  rowNumber: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  const requiredColumns = BULK_UPLOAD_TEMPLATE_COLUMNS.filter((col) => col.required);

  for (const column of requiredColumns) {
    const value = row[column.key];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      errors.push(`Row ${rowNumber}: ${column.header} is required`);
    }
  }

  // Validate email format
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    errors.push(`Row ${rowNumber}: Invalid email format: ${row.email}`);
  }

  // Validate employment type
  if (
    row.employment_type &&
    !['SALARY', 'HOURLY', '1099'].includes(row.employment_type)
  ) {
    errors.push(
      `Row ${rowNumber}: Employment type must be SALARY, HOURLY, or 1099`
    );
  }

  // Validate dates
  if (row.hire_date && !/^\d{4}-\d{2}-\d{2}$/.test(row.hire_date)) {
    errors.push(`Row ${rowNumber}: hire_date must be YYYY-MM-DD format`);
  }

  // Validate time format
  if (
    row.primary_shift_start &&
    !/^\d{2}:\d{2}$/.test(row.primary_shift_start)
  ) {
    errors.push(`Row ${rowNumber}: primary_shift_start must be HH:mm format`);
  }

  if (row.primary_shift_end && !/^\d{2}:\d{2}$/.test(row.primary_shift_end)) {
    errors.push(`Row ${rowNumber}: primary_shift_end must be HH:mm format`);
  }

  // Validate numeric fields
  if (row.hourly_rate && isNaN(parseFloat(row.hourly_rate))) {
    errors.push(`Row ${rowNumber}: hourly_rate must be a valid number`);
  }

  if (row.salary && isNaN(parseFloat(row.salary))) {
    errors.push(`Row ${rowNumber}: salary must be a valid number`);
  }

  // Validate commission structure
  if (
    row.commission_structure &&
    !['NONE', 'FULL_COMMISSION', 'SALARY_PLUS_COMMISSION'].includes(
      row.commission_structure
    )
  ) {
    errors.push(
      `Row ${rowNumber}: commission_structure must be NONE, FULL_COMMISSION, or SALARY_PLUS_COMMISSION`
    );
  }

  // Validate boolean fields (YES/NO)
  if (row.is_tip_position && !['YES', 'NO'].includes(row.is_tip_position)) {
    errors.push(`Row ${rowNumber}: is_tip_position must be YES or NO`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create CSV template data
 * User can download and fill out
 */
export function generateCSVTemplate(): string {
  const headers = BULK_UPLOAD_TEMPLATE_COLUMNS.map((col) => col.header).join(
    ','
  );
  const descriptions = BULK_UPLOAD_TEMPLATE_COLUMNS.map(
    (col) => col.description
  ).join(',');
  const examples = BULK_UPLOAD_TEMPLATE_COLUMNS.map((col) => col.example).join(
    ','
  );

  return `${headers}\n${descriptions}\n${examples}`;
}

/**
 * Download template as CSV file
 */
export function downloadCSVTemplate(): void {
  const csv = generateCSVTemplate();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', 'employee-bulk-upload-template.csv');
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Download template as Excel file
 * Requires xlsx library
 */
export async function downloadExcelTemplate(): Promise<void> {
  try {
    const XLSX = await import('xlsx');

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Create instructions sheet
    const instructionsData = [
      ['LUCCCA Employee Bulk Upload Template'],
      [''],
      ['Instructions:'],
      [
        '1. Download this template and fill in employee information',
      ],
      [
        '2. Save as .xlsx (Excel) or .csv (Comma-Separated Values)',
      ],
      [
        '3. Upload via Ecosystem Control Panel > Bulk Upload',
      ],
      [
        '4. Maximum 5,000 employees per upload',
      ],
      [''],
      ['Required Fields (marked with *)'],
      [
        '- Employee Number, First Name, Last Name, Email, Department',
      ],
      [
        '- Outlet ID, Outlet Name, Position Title, Hire Date',
      ],
      [
        '- Employment Type (SALARY/HOURLY/1099)',
      ],
      [
        '- Commission Structure (NONE/FULL_COMMISSION/SALARY_PLUS_COMMISSION)',
      ],
      [
        '- Tip Position (YES/NO)',
      ],
      [
        '- Work Authorization',
      ],
      [
        '- Shift Pattern (FIXED/ROTATING/VARIABLE)',
      ],
    ];

    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    XLSX.utils.book_append_sheet(wb, instructionsSheet, 'Instructions');

    // Create template sheet with headers
    const templateData: any[][] = [
      BULK_UPLOAD_TEMPLATE_COLUMNS.map((col) => col.header),
      BULK_UPLOAD_TEMPLATE_COLUMNS.map((col) => col.description),
      BULK_UPLOAD_TEMPLATE_COLUMNS.map((col) => col.example),
    ];

    const templateSheet = XLSX.utils.aoa_to_sheet(templateData);

    // Set column widths
    templateSheet['!cols'] = [
      { wch: 18 }, // Employee Number
      { wch: 15 }, // First Name
      { wch: 15 }, // Last Name
      { wch: 25 }, // Email
      { wch: 15 }, // Phone
      { wch: 15 }, // Department
      { wch: 12 }, // Outlet ID
      { wch: 20 }, // Outlet Name
      { wch: 18 }, // Position Title
      { wch: 12 }, // Hire Date
      { wch: 15 }, // Employment Type
      { wch: 12 }, // Hourly Rate
      { wch: 12 }, // Salary
      { wch: 20 }, // Commission Structure
      { wch: 15 }, // Commission Rate
      { wch: 15 }, // Tip Position
      { wch: 18 }, // Work Authorization
      { wch: 18 }, // Manager #
      { wch: 15 }, // Shift Pattern
      { wch: 18 }, // Shift Start
      { wch: 16 }, // Shift End
    ];

    XLSX.utils.book_append_sheet(wb, templateSheet, 'Template');

    // Download
    XLSX.writeFile(wb, 'employee-bulk-upload-template.xlsx');
  } catch (error) {
    console.error('[Template] Failed to generate Excel:', error);
    // Fallback to CSV
    downloadCSVTemplate();
  }
}

/**
 * Parse uploaded file (CSV or Excel)
 */
export async function parseUploadedFile(
  file: File
): Promise<{ data: Record<string, any>[]; errors: string[] }> {
  const errors: string[] = [];
  let data: Record<string, any>[] = [];

  try {
    if (file.name.endsWith('.csv')) {
      // Parse CSV
      const text = await file.text();
      const lines = text.split('\n').filter((line) => line.trim());

      if (lines.length < 2) {
        errors.push('CSV file is empty');
        return { data: [], errors };
      }

      // Parse headers
      const headers = lines[0].split(',').map((h) => h.trim());

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim());
        const row: Record<string, any> = {};

        headers.forEach((header, idx) => {
          row[header.toLowerCase().replace(/[^a-z0-9_]/g, '_')] = values[idx];
        });

        if (Object.values(row).some((v) => v)) {
          // Non-empty row
          data.push(row);
        }
      }
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      // Parse Excel
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      const sheetName = workbook.SheetNames[1] || workbook.SheetNames[0]; // Use Template sheet if available
      const sheet = workbook.Sheets[sheetName];

      data = XLSX.utils.sheet_to_json(sheet, { blankrows: false });
    } else {
      errors.push('File must be CSV or Excel (.xlsx, .xls)');
    }
  } catch (error) {
    errors.push(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return { data, errors };
}

/**
 * Batch data into chunks for processing
 */
export function batchData<T>(data: T[], batchSize: number = 5000): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < data.length; i += batchSize) {
    batches.push(data.slice(i, i + batchSize));
  }
  return batches;
}
