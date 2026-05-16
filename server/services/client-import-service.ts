/**
 * Client Import Service
 * 
 * Comprehensive client data import with:
 * - CSV/Excel parsing
 * - Field mapping
 * - Validation
 * - Duplicate detection
 * - Batch import
 * - Error handling
 * - Progress tracking
 * - All text is i18n-ready with translation keys
 */

import { logger } from '../utils/logger.js';
import { getSupabaseServiceClient } from '../lib/supabase-service-client.js';
import ExcelJS from 'exceljs';

export interface ImportField {
  csvColumn: string;
  systemField: string;
  mapped: boolean;
  sampleValue?: string;
  required?: boolean;
}

export interface ImportRow {
  id: string;
  rowNumber: number;
  data: Record<string, any>;
  mappedData: Record<string, any>;
  status: 'pending' | 'valid' | 'error' | 'duplicate' | 'imported';
  errors?: string[];
  errorKeys?: string[]; // i18n keys
  duplicateOf?: string;
  duplicateId?: string;
}

export interface ImportResult {
  id: string;
  orgId: string;
  uploadedBy: string;
  fileName: string;
  fileType: 'csv' | 'excel';
  totalRows: number;
  successful: number;
  failed: number;
  duplicates: number;
  skipped: number;
  importedAt: string;
  errors: Array<{
    row: number;
    errors: string[];
    errorKeys?: string[]; // i18n keys
  }>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface ImportSession {
  id: string;
  orgId: string;
  userId: string;
  fileName: string;
  fileType: 'csv' | 'excel';
  fieldMapping: Record<string, string>;
  sourceHeaders?: string[];
  sourceRowCount?: number;
  sourceRows?: Record<string, any>[];
  validationResults: ImportRow[];
  result?: ImportResult;
  createdAt: string;
  updatedAt: string;
}

class ClientImportService {
  private readonly SYSTEM_FIELDS = [
    { id: 'name', label: 'Client Name', labelKey: 'client.import.field.name', required: true, type: 'string' },
    { id: 'email', label: 'Email', labelKey: 'client.import.field.email', required: true, type: 'email' },
    { id: 'phone', label: 'Phone', labelKey: 'client.import.field.phone', required: false, type: 'phone' },
    { id: 'company', label: 'Company', labelKey: 'client.import.field.company', required: false, type: 'string' },
    { id: 'address_street', label: 'Street Address', labelKey: 'client.import.field.address.street', required: false, type: 'string' },
    { id: 'address_city', label: 'City', labelKey: 'client.import.field.address.city', required: false, type: 'string' },
    { id: 'address_state', label: 'State', labelKey: 'client.import.field.address.state', required: false, type: 'string' },
    { id: 'address_zip', label: 'Zip Code', labelKey: 'client.import.field.address.zip', required: false, type: 'string' },
    { id: 'address_country', label: 'Country', labelKey: 'client.import.field.address.country', required: false, type: 'string' },
    { id: 'event_type', label: 'Event Type', labelKey: 'client.import.field.event.type', required: false, type: 'string' },
    { id: 'budget', label: 'Budget', labelKey: 'client.import.field.budget', required: false, type: 'number' },
    { id: 'guest_count', label: 'Guest Count', labelKey: 'client.import.field.guest.count', required: false, type: 'number' },
    { id: 'notes', label: 'Notes', labelKey: 'client.import.field.notes', required: false, type: 'string' },
    { id: 'tags', label: 'Tags', labelKey: 'client.import.field.tags', required: false, type: 'string[]' },
  ];

  /**
   * Parse CSV file
   */
  async parseCSV(fileContent: string, limit?: number): Promise<{
    headers: string[];
    rows: Record<string, any>[];
  }> {
    try {
      const lines = fileContent.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        throw new Error('Empty file');
      }

      // Parse headers (handle quoted values)
      const headers = this.parseCSVLine(lines[0]);

      // Parse rows
      const rows: Record<string, any>[] = [];
      const maxRows = limit || lines.length - 1;
      
      for (let i = 1; i < Math.min(lines.length, maxRows + 1); i++) {
        const values = this.parseCSVLine(lines[i]);
        const row: Record<string, any> = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index]?.trim() || '';
        });
        
        rows.push(row);
      }

      return { headers, rows };
    } catch (error) {
      logger.error('[ClientImport] Error parsing CSV:', error);
      throw error;
    }
  }

  /**
   * Parse Excel file
   * Note: Requires xlsx package: npm install xlsx
   */
  async parseExcel(fileBuffer: Buffer, limit?: number): Promise<{
    headers: string[];
    rows: Record<string, any>[];
  }> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer);

      const worksheet = workbook.worksheets?.[0];
      if (!worksheet) {
        throw new Error('No worksheets found in Excel file');
      }

      // Determine headers from first row
      const headerRow = worksheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const raw = cell?.text ?? String(cell?.value ?? '');
        const header = raw.trim();
        if (header) {
          headers[colNumber - 1] = header;
        }
      });

      const normalizedHeaders = headers.filter(Boolean);
      if (normalizedHeaders.length === 0) {
        throw new Error('No headers found in Excel file');
      }

      // Parse rows (start at row 2)
      const rows: Record<string, any>[] = [];
      const maxRows = limit || Math.max(0, worksheet.rowCount - 1);
      const lastRow = Math.min(worksheet.rowCount, maxRows + 1);

      for (let rowIndex = 2; rowIndex <= lastRow; rowIndex++) {
        const row = worksheet.getRow(rowIndex);
        const record: Record<string, any> = {};
        let hasAnyValue = false;

        normalizedHeaders.forEach((header, i) => {
          const cell = row.getCell(i + 1);
          const value =
            cell?.text != null && String(cell.text).length > 0
              ? String(cell.text)
              : cell?.value != null
                ? String(cell.value)
                : '';
          const v = value.trim();
          if (v) hasAnyValue = true;
          record[header] = v;
        });

        if (hasAnyValue) {
          rows.push(record);
        }
      }

      return { headers: normalizedHeaders, rows };
    } catch (error) {
      logger.error('[ClientImport] Error parsing Excel:', error);
      throw error;
    }
  }

  /**
   * Auto-detect field mappings
   */
  autoDetectMappings(fileHeaders: string[]): Record<string, string> {
    const mappings: Record<string, string> = {};

    fileHeaders.forEach(header => {
      const lowerHeader = header.toLowerCase().trim();

      // Try to match with system fields
      for (const field of this.SYSTEM_FIELDS) {
        const fieldLower = field.label.toLowerCase();
        const fieldIdLower = field.id.toLowerCase();

        if (
          lowerHeader === fieldLower ||
          lowerHeader === fieldIdLower ||
          lowerHeader.includes(fieldIdLower) ||
          (field.id === 'name' && (lowerHeader.includes('client') || lowerHeader.includes('name') || lowerHeader === 'contact')) ||
          (field.id === 'email' && (lowerHeader.includes('email') || lowerHeader.includes('mail'))) ||
          (field.id === 'phone' && (lowerHeader.includes('phone') || lowerHeader.includes('tel') || lowerHeader.includes('mobile'))) ||
          (field.id === 'company' && (lowerHeader.includes('company') || lowerHeader.includes('organization') || lowerHeader.includes('org'))) ||
          (field.id === 'address_street' && (lowerHeader.includes('street') || lowerHeader.includes('address') || lowerHeader.includes('addr'))) ||
          (field.id === 'address_city' && (lowerHeader === 'city' || lowerHeader.includes('town'))) ||
          (field.id === 'address_state' && (lowerHeader === 'state' || lowerHeader === 'province')) ||
          (field.id === 'address_zip' && (lowerHeader.includes('zip') || lowerHeader.includes('postal') || lowerHeader.includes('code'))) ||
          (field.id === 'address_country' && (lowerHeader === 'country' || lowerHeader === 'nation')) ||
          (field.id === 'event_type' && (lowerHeader.includes('event') || lowerHeader.includes('type'))) ||
          (field.id === 'budget' && (lowerHeader.includes('budget') || lowerHeader.includes('cost'))) ||
          (field.id === 'guest_count' && (lowerHeader.includes('guest') || lowerHeader.includes('attendee') || lowerHeader.includes('covers'))) ||
          (field.id === 'notes' && (lowerHeader.includes('note') || lowerHeader.includes('comment') || lowerHeader.includes('remark')))
        ) {
          if (!mappings[header]) {
            mappings[header] = field.id;
            break;
          }
        }
      }
    });

    return mappings;
  }

  /**
   * Validate import rows
   */
  async validateRows(
    rows: Record<string, any>[],
    fieldMapping: Record<string, string>,
    orgId: string
  ): Promise<ImportRow[]> {
    try {
      const validated: ImportRow[] = [];
      const existingClients = await this.getExistingClients(orgId);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const errors: string[] = [];
        const errorKeys: string[] = [];
        const mappedData: Record<string, any> = {};

        // Map fields
        for (const [csvColumn, systemField] of Object.entries(fieldMapping)) {
          if (systemField) {
            mappedData[systemField] = row[csvColumn];
          }
        }

        // Validate required fields
        const nameField = this.SYSTEM_FIELDS.find(f => f.id === 'name');
        const emailField = this.SYSTEM_FIELDS.find(f => f.id === 'email');

        if (nameField?.required && !mappedData.name) {
          errors.push('Client name is required');
          errorKeys.push('client.import.validation.name.required');
        }

        if (emailField?.required) {
          if (!mappedData.email) {
            errors.push('Email is required');
            errorKeys.push('client.import.validation.email.required');
          } else if (!this.isValidEmail(mappedData.email)) {
            errors.push('Invalid email format');
            errorKeys.push('client.import.validation.email.invalid');
          }
        }

        // Check for duplicates
        let duplicateOf: string | undefined;
        let duplicateId: string | undefined;

        if (mappedData.email) {
          const existing = existingClients.find(c => c.email?.toLowerCase() === mappedData.email.toLowerCase());
          if (existing) {
            duplicateOf = existing.id;
            duplicateId = existing.id;
            errors.push(`Client with email ${mappedData.email} already exists`);
            errorKeys.push('client.import.validation.duplicate.email');
          }

          // Check within import batch
          const duplicateInBatch = validated.find(v => 
            v.mappedData.email?.toLowerCase() === mappedData.email.toLowerCase()
          );
          if (duplicateInBatch) {
            duplicateOf = duplicateInBatch.id;
            duplicateId = duplicateInBatch.id;
            errors.push(`Duplicate email in import file`);
            errorKeys.push('client.import.validation.duplicate.batch');
          }
        }

        // Validate phone format
        if (mappedData.phone && !this.isValidPhone(mappedData.phone)) {
          errors.push('Invalid phone format');
          errorKeys.push('client.import.validation.phone.invalid');
        }

        // Validate budget (if provided)
        if (mappedData.budget && isNaN(parseFloat(mappedData.budget))) {
          errors.push('Budget must be a number');
          errorKeys.push('client.import.validation.budget.invalid');
        }

        // Validate guest count (if provided)
        if (mappedData.guest_count && isNaN(parseInt(mappedData.guest_count))) {
          errors.push('Guest count must be a number');
          errorKeys.push('client.import.validation.guest.count.invalid');
        }

        const status = errors.length > 0
          ? 'error'
          : duplicateOf
          ? 'duplicate'
          : 'valid';

        validated.push({
          id: `row-${i + 1}`,
          rowNumber: i + 1,
          data: row,
          mappedData,
          status,
          errors: errors.length > 0 ? errors : undefined,
          errorKeys: errorKeys.length > 0 ? errorKeys : undefined,
          duplicateOf,
          duplicateId,
        });
      }

      return validated;
    } catch (error) {
      logger.error('[ClientImport] Error validating rows:', error);
      throw error;
    }
  }

  /**
   * Import validated clients
   */
  async importClients(
    validatedRows: ImportRow[],
    orgId: string,
    userId: string,
    options?: {
      skipDuplicates?: boolean;
      skipErrors?: boolean;
      updateExisting?: boolean;
    }
  ): Promise<ImportResult> {
    try {
      const result: ImportResult = {
        id: `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        orgId,
        uploadedBy: userId,
        fileName: 'import.csv',
        fileType: 'csv',
        totalRows: validatedRows.length,
        successful: 0,
        failed: 0,
        duplicates: 0,
        skipped: 0,
        importedAt: new Date().toISOString(),
        errors: [],
        status: 'processing',
      };

      // Filter rows to import
      const rowsToImport = validatedRows.filter(row => {
        if (row.status === 'error' && options?.skipErrors) {
          result.skipped++;
          return false;
        }
        if (row.status === 'duplicate' && options?.skipDuplicates) {
          result.duplicates++;
          result.skipped++;
          return false;
        }
        return row.status === 'valid' || (row.status === 'duplicate' && options?.updateExisting);
      });

      // Import rows in batches
      const batchSize = 50;
      for (let i = 0; i < rowsToImport.length; i += batchSize) {
        const batch = rowsToImport.slice(i, i + batchSize);
        
        for (const row of batch) {
          try {
            if (row.status === 'duplicate' && options?.updateExisting && row.duplicateId) {
              // Update existing client
              await this.updateClient(row.duplicateId, row.mappedData, orgId);
              result.successful++;
            } else {
              // Create new client
              await this.createClient(row.mappedData, orgId, userId);
              result.successful++;
            }
          } catch (error: any) {
            result.failed++;
            result.errors.push({
              row: row.rowNumber,
              errors: [error.message || 'Import failed'],
              errorKeys: ['client.import.error.generic'],
            });
            logger.error(`[ClientImport] Error importing row ${row.rowNumber}:`, error);
          }
        }
      }

      result.status = 'completed';

      // Save import result
      await this.saveImportResult(result);

      return result;
    } catch (error) {
      logger.error('[ClientImport] Error importing clients:', error);
      throw error;
    }
  }

  /**
   * Create client
   */
  private async createClient(
    data: Record<string, any>,
    orgId: string,
    userId: string
  ): Promise<string> {
    try {
      const supabase = getSupabaseServiceClient();
      const { data: client, error } = await supabase
        .from('clients')
        .insert({
          org_id: orgId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          company: data.company,
          address_street: data.address_street,
          address_city: data.address_city,
          address_state: data.address_state,
          address_zip: data.address_zip,
          address_country: data.address_country || 'USA',
          event_type: data.event_type,
          budget: data.budget ? parseFloat(data.budget) : null,
          guest_count: data.guest_count ? parseInt(data.guest_count) : null,
          notes: data.notes,
          tags: Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [],
          created_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) throw error;

      return client.id;
    } catch (error) {
      logger.error('[ClientImport] Error creating client:', error);
      throw error;
    }
  }

  /**
   * Update existing client
   */
  private async updateClient(
    clientId: string,
    data: Record<string, any>,
    orgId: string
  ): Promise<void> {
    try {
      const supabase = getSupabaseServiceClient();
      const { error } = await supabase
        .from('clients')
        .update({
          name: data.name,
          phone: data.phone,
          company: data.company,
          address_street: data.address_street,
          address_city: data.address_city,
          address_state: data.address_state,
          address_zip: data.address_zip,
          address_country: data.address_country,
          event_type: data.event_type,
          budget: data.budget ? parseFloat(data.budget) : null,
          guest_count: data.guest_count ? parseInt(data.guest_count) : null,
          notes: data.notes,
          tags: Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientId)
        .eq('org_id', orgId);

      if (error) throw error;
    } catch (error) {
      logger.error('[ClientImport] Error updating client:', error);
      throw error;
    }
  }

  /**
   * Get existing clients for duplicate checking
   */
  private async getExistingClients(orgId: string): Promise<Array<{ id: string; email?: string }>> {
    try {
      const supabase = getSupabaseServiceClient();
      const { data, error } = await supabase
        .from('clients')
        .select('id, email')
        .eq('org_id', orgId);

      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('[ClientImport] Error getting existing clients:', error);
      return [];
    }
  }

  /**
   * Get system fields for mapping
   */
  getSystemFields() {
    return this.SYSTEM_FIELDS;
  }

  /**
   * Create a parse session storing the raw uploaded rows server-side
   * so validation/import can run deterministically without re-uploading.
   */
  async createParseSession(params: {
    orgId: string;
    userId: string;
    fileName: string;
    fileType: 'csv' | 'excel';
    headers: string[];
    rows: Record<string, any>[];
    fieldMapping: Record<string, string>;
  }): Promise<ImportSession> {
    const sessionRecord: ImportSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orgId: params.orgId,
      userId: params.userId,
      fileName: params.fileName,
      fileType: params.fileType,
      fieldMapping: params.fieldMapping,
      sourceHeaders: params.headers,
      sourceRowCount: params.rows.length,
      sourceRows: params.rows,
      validationResults: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.from('client_import_sessions').insert({
      id: sessionRecord.id,
      org_id: sessionRecord.orgId,
      user_id: sessionRecord.userId,
      file_name: sessionRecord.fileName,
      file_type: sessionRecord.fileType,
      field_mapping: sessionRecord.fieldMapping,
      source_headers: sessionRecord.sourceHeaders || [],
      source_row_count: sessionRecord.sourceRowCount || 0,
      source_rows: sessionRecord.sourceRows || [],
      validation_results: sessionRecord.validationResults,
      result: sessionRecord.result,
      created_at: sessionRecord.createdAt,
      updated_at: sessionRecord.updatedAt,
    });

    if (error) {
      logger.error('[ClientImport] Error creating parse session:', error);
      throw error;
    }

    return sessionRecord;
  }

  /**
   * Load an existing import session by ID
   */
  async getSessionById(orgId: string, sessionId: string): Promise<ImportSession | null> {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from('client_import_sessions')
      .select('*')
      .eq('org_id', orgId)
      .eq('id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      logger.error('[ClientImport] Error fetching session:', error);
      throw error;
    }

    return data
      ? {
          id: data.id,
          orgId: data.org_id,
          userId: data.user_id,
          fileName: data.file_name,
          fileType: data.file_type,
          fieldMapping: data.field_mapping || {},
          sourceHeaders: data.source_headers || [],
          sourceRowCount: data.source_row_count || 0,
          sourceRows: data.source_rows || [],
          validationResults: data.validation_results || [],
          result: data.result,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        }
      : null;
  }

  /**
   * Persist validation results + mapping to the session
   */
  async updateSessionValidation(params: {
    orgId: string;
    sessionId: string;
    fieldMapping: Record<string, string>;
    validationResults: ImportRow[];
  }): Promise<void> {
    const supabase = getSupabaseServiceClient();
    const { error } = await supabase
      .from('client_import_sessions')
      .update({
        field_mapping: params.fieldMapping,
        validation_results: params.validationResults,
        updated_at: new Date().toISOString(),
      })
      .eq('org_id', params.orgId)
      .eq('id', params.sessionId);

    if (error) {
      logger.error('[ClientImport] Error updating session validation:', error);
      throw error;
    }
  }

  /**
   * Persist final import result to the session
   */
  async updateSessionResult(params: {
    orgId: string;
    sessionId: string;
    result: ImportResult;
  }): Promise<void> {
    const supabase = getSupabaseServiceClient();
    const { error } = await supabase
      .from('client_import_sessions')
      .update({
        result: params.result,
        updated_at: new Date().toISOString(),
      })
      .eq('org_id', params.orgId)
      .eq('id', params.sessionId);

    if (error) {
      logger.error('[ClientImport] Error updating session result:', error);
      throw error;
    }
  }

  /**
   * Save import session
   */
  async saveImportSession(session: Omit<ImportSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<ImportSession> {
    try {
      const sessionRecord: ImportSession = {
        id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...session,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to database
      const supabase = getSupabaseServiceClient();
      const { error } = await supabase
        .from('client_import_sessions')
        .insert({
          id: sessionRecord.id,
          org_id: sessionRecord.orgId,
          user_id: sessionRecord.userId,
          file_name: sessionRecord.fileName,
          file_type: sessionRecord.fileType,
          field_mapping: sessionRecord.fieldMapping,
          source_headers: sessionRecord.sourceHeaders || [],
          source_row_count: sessionRecord.sourceRowCount || 0,
          source_rows: sessionRecord.sourceRows || [],
          validation_results: sessionRecord.validationResults,
          result: sessionRecord.result,
          created_at: sessionRecord.createdAt,
          updated_at: sessionRecord.updatedAt,
        });

      if (error) throw error;

      return sessionRecord;
    } catch (error) {
      logger.error('[ClientImport] Error saving import session:', error);
      throw error;
    }
  }

  /**
   * Get import sessions
   */
  async getImportSessions(orgId: string, limit = 50): Promise<ImportSession[]> {
    try {
      const supabase = getSupabaseServiceClient();
      const { data, error } = await supabase
        .from('client_import_sessions')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        orgId: row.org_id,
        userId: row.user_id,
        fileName: row.file_name,
        fileType: row.file_type,
        fieldMapping: row.field_mapping,
        validationResults: row.validation_results || [],
        result: row.result,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      logger.error('[ClientImport] Error getting import sessions:', error);
      throw error;
    }
  }

  /**
   * Save import result
   */
  private async saveImportResult(result: ImportResult): Promise<void> {
    try {
      const supabase = getSupabaseServiceClient();
      const { error } = await supabase
        .from('client_import_results')
        .insert({
          id: result.id,
          org_id: result.orgId,
          uploaded_by: result.uploadedBy,
          file_name: result.fileName,
          file_type: result.fileType,
          total_rows: result.totalRows,
          successful: result.successful,
          failed: result.failed,
          duplicates: result.duplicates,
          skipped: result.skipped,
          errors: result.errors,
          status: result.status,
          imported_at: result.importedAt,
        });

      if (error) throw error;
    } catch (error) {
      logger.error('[ClientImport] Error saving import result:', error);
    }
  }

  /**
   * Helper methods
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private isValidPhone(phone: string): boolean {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    // Check if it has 10 or 11 digits
    return digits.length >= 10 && digits.length <= 11;
  }
}

export const clientImportService = new ClientImportService();
