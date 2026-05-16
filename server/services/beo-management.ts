// @ts-nocheck
import { db } from "../db.js";
import { logger } from "../utils/logger.js";
import { BEOGeneratorService } from "./beo-export.js";

export interface BEOCreatePayload {
  orgId: string;
  eventId: string;
  outletId?: string; // New: for GL code lookup
  eventDate?: string; // New: for BEO number format (YYYY-MM-DD)
  eventTypeCode?: string; // New: e.g., "WED", "COR", "BAN" (defaults to "OTH" if not provided)
  departmentId: string;
  contentData: Record<string, any>;
  createdByUserId: string;
  // A2: prospect → event → BEO linkage (optional; populated when the BEO
  // is auto-created from an EventRecord that came from a prospect).
  lifecycleEventId?: string;
  prospectId?: string;
}

export interface BEOUpdatePayload {
  contentData: Record<string, any>;
  changeSummary: string;
  userId: string;
  expectedVersion?: number; // For optimistic locking
}

export interface BEOApprovalPayload {
  userId: string;
  approverName?: string;
}

export interface BEOVersion {
  versionNumber: number;
  changeType: string;
  changeSummary?: string;
  changedFields?: Record<string, any>;
  changedByUserId: string;
  createdAt: string;
}

export interface BEO {
  id: string;
  orgId: string;
  eventId: string;
  beoNumber: string;
  beoName?: string;
  eventTypeCode?: string; // New: event type code
  glCode?: string; // New: GL code from outlet
  contentData: Record<string, any>;
  pdfUrl?: string;
  status: string;
  departmentId: string;
  createdByUserId: string;
  approvedByUserId?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  // A2: prospect → event → BEO linkage
  lifecycleEventId?: string;
  prospectId?: string;
}

class BEOManagementService {
  private beoGenerator: BEOGeneratorService;

  constructor() {
    this.beoGenerator = new BEOGeneratorService();
  }

  /**
   * Create a new BEO for an event
   * Supports new enhanced BEO numbering format: AUR-[GL]-[YYYYMMDD]-[Type]-[Seq]
   */
  async createBEO(payload: BEOCreatePayload): Promise<BEO> {
    const {
      orgId,
      eventId,
      outletId,
      eventDate,
      eventTypeCode,
      departmentId,
      contentData,
      createdByUserId,
      lifecycleEventId,
      prospectId,
    } = payload;

    logger.info("[BEO] Creating new BEO", {
      eventId,
      departmentId,
      orgId,
      eventTypeCode,
      outletId,
    });

    try {
      // Fetch event details for date and outlet if not provided
      let eventDateToUse = eventDate;
      let outletIdToUse = outletId;
      let eventTypeToUse = eventTypeCode || "OTH"; // Default to "OTH" if not provided

      if (!eventDateToUse || !outletIdToUse) {
        const eventResult = await db.query(
          `SELECT date, outlet_id FROM calendar_events WHERE id = $1`,
          [eventId],
        );
        if (eventResult.rows[0]) {
          eventDateToUse = eventDateToUse || eventResult.rows[0].date;
          outletIdToUse = outletIdToUse || eventResult.rows[0].outlet_id;
        }
      }

      // Generate unique BEO number using enhanced format
      const beoNumber = await this.generateEnhancedBEONumber(
        orgId,
        outletIdToUse,
        eventDateToUse,
        eventTypeToUse,
      );

      // Get GL code for the outlet
      const glCodeResult = await db.query(
        `SELECT gl_code FROM outlet_gl_codes WHERE org_id = $1 AND outlet_id = $2`,
        [orgId, outletIdToUse],
      );
      const glCode = glCodeResult.rows[0]?.gl_code || "0";

      // Insert BEO record with new columns (A2 adds lifecycle_event_id, prospect_id)
      const result = await db.query(
        `
        INSERT INTO beo_banquet_orders (
          org_id,
          event_id,
          beo_number,
          event_type_code,
          gl_code,
          content_data,
          department_id,
          created_by_user_id,
          lifecycle_event_id,
          prospect_id,
          status,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft', NOW(), NOW())
        RETURNING
          id,
          org_id as "orgId",
          event_id as "eventId",
          beo_number as "beoNumber",
          beo_name as "beoName",
          event_type_code as "eventTypeCode",
          gl_code as "glCode",
          content_data as "contentData",
          pdf_url as "pdfUrl",
          status,
          department_id as "departmentId",
          created_by_user_id as "createdByUserId",
          approved_by_user_id as "approvedByUserId",
          lifecycle_event_id as "lifecycleEventId",
          prospect_id as "prospectId",
          created_at as "createdAt",
          updated_at as "updatedAt",
          approved_at as "approvedAt"
        `,
        [
          orgId,
          eventId,
          beoNumber,
          eventTypeToUse,
          glCode,
          JSON.stringify(contentData),
          departmentId,
          createdByUserId,
          lifecycleEventId ?? null,
          prospectId ?? null,
        ],
      );

      const beo = result.rows[0];

      // Create initial version entry (created)
      await this.createVersion(
        beo.id,
        "created",
        "BEO created",
        {},
        createdByUserId,
        orgId,
      );

      // Link BEO to calendar event
      await db.query(`UPDATE calendar_events SET beo_id = $1 WHERE id = $2`, [
        beo.id,
        eventId,
      ]);

      logger.info("[BEO] BEO created successfully", {
        beoId: beo.id,
        beoNumber,
      });

      return beo;
    } catch (error) {
      logger.error("[BEO] Error creating BEO", error);
      throw error;
    }
  }

  /**
   * Get BEO by ID with full data
   */
  async getBEO(beoId: string): Promise<BEO | null> {
    try {
      const result = await db.query(
        `
        SELECT
          id,
          org_id as "orgId",
          event_id as "eventId",
          beo_number as "beoNumber",
          beo_name as "beoName",
          event_type_code as "eventTypeCode",
          gl_code as "glCode",
          content_data as "contentData",
          pdf_url as "pdfUrl",
          status,
          department_id as "departmentId",
          created_by_user_id as "createdByUserId",
          approved_by_user_id as "approvedByUserId",
          created_at as "createdAt",
          updated_at as "updatedAt",
          approved_at as "approvedAt"
        FROM beo_banquet_orders
        WHERE id = $1
        `,
        [beoId],
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error("[BEO] Error fetching BEO", error);
      throw error;
    }
  }

  /**
   * Update BEO content and create version entry
   */
  async updateBEO(beoId: string, payload: BEOUpdatePayload): Promise<BEO> {
    const { contentData, changeSummary, userId, expectedVersion } = payload;

    logger.info("[BEO] Updating BEO", {
      beoId,
      changeSummary,
      expectedVersion,
    });

    try {
      // Get current BEO with version
      const beo = await this.getBEO(beoId);
      if (!beo) {
        throw new Error(`BEO not found: ${beoId}`);
      }

      // Optimistic locking: Check version if expectedVersion provided
      if (expectedVersion !== undefined) {
        const currentVersion = beo.version ?? 0;
        if (currentVersion !== expectedVersion) {
          const error = new Error(
            `BEO version conflict: expected version ${expectedVersion}, but current version is ${currentVersion}. Please refresh and try again.`
          );
          (error as any).code = 'VERSION_CONFLICT';
          (error as any).expectedVersion = expectedVersion;
          (error as any).currentVersion = currentVersion;
          throw error;
        }
      }

      // Calculate changed fields (simplified diff)
      const changedFields = this.calculateDiff(beo.contentData, contentData);

      // Update BEO (version check already passed, safe to update)
      const result = await db.query(
        `
        UPDATE beo_banquet_orders
        SET 
          content_data = $1,
          updated_at = NOW()
        WHERE id = $2
        RETURNING 
          id,
          org_id as "orgId",
          event_id as "eventId",
          beo_number as "beoNumber",
          beo_name as "beoName",
          content_data as "contentData",
          pdf_url as "pdfUrl",
          status,
          department_id as "departmentId",
          created_by_user_id as "createdByUserId",
          approved_by_user_id as "approvedByUserId",
          created_at as "createdAt",
          updated_at as "updatedAt",
          approved_at as "approvedAt"
        `,
        [JSON.stringify(contentData), beoId],
      );

      const updatedBEO = result.rows[0];

      // Create version entry
      const newVersion = (await this.getVersionCount(beoId)) + 1;
      await this.createVersion(
        beoId,
        "updated",
        changeSummary,
        changedFields,
        userId,
        beo.orgId,
      );

      logger.info("[BEO] BEO updated successfully", {
        beoId,
        previousVersion: expectedVersion,
        newVersion,
      });

      // Return BEO with new version number
      return {
        ...updatedBEO,
        version: newVersion,
      };
    } catch (error) {
      // Re-throw version conflict errors as-is
      if ((error as any)?.code === 'VERSION_CONFLICT') {
        throw error;
      }
      logger.error("[BEO] Error updating BEO", error);
      throw error;
    }
  }

  /**
   * Approve BEO (Exec Chef/Department Head only)
   */
  async approveBEO(beoId: string, payload: BEOApprovalPayload): Promise<BEO> {
    const { userId } = payload;

    logger.info("[BEO] Approving BEO", { beoId, userId });

    try {
      const beo = await this.getBEO(beoId);
      if (!beo) {
        throw new Error(`BEO not found: ${beoId}`);
      }

      // Update status and approval info
      const result = await db.query(
        `
        UPDATE beo_banquet_orders
        SET 
          status = 'approved',
          approved_by_user_id = $1,
          approved_at = NOW(),
          updated_at = NOW()
        WHERE id = $2
        RETURNING 
          id,
          org_id as "orgId",
          event_id as "eventId",
          beo_number as "beoNumber",
          beo_name as "beoName",
          content_data as "contentData",
          pdf_url as "pdfUrl",
          status,
          department_id as "departmentId",
          created_by_user_id as "createdByUserId",
          approved_by_user_id as "approvedByUserId",
          created_at as "createdAt",
          updated_at as "updatedAt",
          approved_at as "approvedAt"
        `,
        [userId, beoId],
      );

      const approvedBEO = result.rows[0];

      // Create approval version entry
      await this.createVersion(
        beoId,
        "approved",
        "BEO approved for execution",
        {},
        userId,
        beo.orgId,
      );

      logger.info("[BEO] BEO approved successfully", { beoId });

      return approvedBEO;
    } catch (error) {
      logger.error("[BEO] Error approving BEO", error);
      throw error;
    }
  }

  /**
   * Get all versions of a BEO
   */
  async getBEOVersions(beoId: string): Promise<BEOVersion[]> {
    try {
      const result = await db.query(
        `
        SELECT 
          version_number as "versionNumber",
          change_type as "changeType",
          change_summary as "changeSummary",
          changed_fields as "changedFields",
          changed_by_user_id as "changedByUserId",
          created_at as "createdAt"
        FROM beo_versions
        WHERE beo_id = $1
        ORDER BY version_number ASC
        `,
        [beoId],
      );

      return result.rows;
    } catch (error) {
      logger.error("[BEO] Error fetching BEO versions", error);
      throw error;
    }
  }

  /**
   * Get specific version of a BEO
   */
  async getBEOVersion(
    beoId: string,
    versionNumber: number,
  ): Promise<{
    version: number;
    content: Record<string, any>;
    createdAt: string;
    changedBy: string;
  } | null> {
    try {
      const result = await db.query(
        `
        SELECT 
          version_number as "version",
          content_snapshot as "content",
          created_at as "createdAt",
          changed_by_user_id as "changedBy"
        FROM beo_versions
        WHERE beo_id = $1 AND version_number = $2
        `,
        [beoId, versionNumber],
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error("[BEO] Error fetching BEO version", error);
      throw error;
    }
  }

  /**
   * Restore BEO to specific version
   */
  async restoreBEOVersion(
    beoId: string,
    versionNumber: number,
    userId: string,
  ): Promise<BEO> {
    logger.info("[BEO] Restoring BEO to version", {
      beoId,
      versionNumber,
    });

    try {
      const beo = await this.getBEO(beoId);
      if (!beo) {
        throw new Error(`BEO not found: ${beoId}`);
      }

      // Get the target version
      const versionData = await this.getBEOVersion(beoId, versionNumber);
      if (!versionData) {
        throw new Error(`BEO version not found: ${beoId} v${versionNumber}`);
      }

      // Calculate changed fields
      const changedFields = this.calculateDiff(
        beo.contentData,
        versionData.content,
      );

      // Update BEO with version content
      const result = await db.query(
        `
        UPDATE beo_banquet_orders
        SET 
          content_data = $1,
          updated_at = NOW()
        WHERE id = $2
        RETURNING 
          id,
          org_id as "orgId",
          event_id as "eventId",
          beo_number as "beoNumber",
          beo_name as "beoName",
          content_data as "contentData",
          pdf_url as "pdfUrl",
          status,
          department_id as "departmentId",
          created_by_user_id as "createdByUserId",
          approved_by_user_id as "approvedByUserId",
          created_at as "createdAt",
          updated_at as "updatedAt",
          approved_at as "approvedAt"
        `,
        [JSON.stringify(versionData.content), beoId],
      );

      const restoredBEO = result.rows[0];

      // Create restoration version entry
      await this.createVersion(
        beoId,
        "restored",
        `Restored to version ${versionNumber}`,
        changedFields,
        userId,
        beo.orgId,
      );

      logger.info("[BEO] BEO restored successfully", {
        beoId,
        restoredVersion: versionNumber,
      });

      return restoredBEO;
    } catch (error) {
      logger.error("[BEO] Error restoring BEO version", error);
      throw error;
    }
  }

  /**
   * Generate and store PDF for BEO
   */
  async generateAndStorePDF(beoId: string): Promise<string> {
    logger.info("[BEO] Generating PDF for BEO", { beoId });

    try {
      const beo = await this.getBEO(beoId);
      if (!beo) {
        throw new Error(`BEO not found: ${beoId}`);
      }

      // Use BEO export service to generate PDF
      const pdfBuffer = await this.beoGenerator.generateBEOPDF({
        beoNumber: beo.beoNumber,
        eventId: beo.eventId,
        contentData: beo.contentData,
      });

      // Store PDF (save locally or upload to S3)
      // For now, using local storage path pattern
      const timestamp = Date.now();
      const pdfPath = `/uploads/beos/${beo.orgId}/${beo.eventId}/BEO_${beo.beoNumber}_v${await this.getVersionCount(beoId)}_${timestamp}.pdf`;

      // Save file locally (in production, use S3 or cloud storage)
      const fs = await import("fs").then((m) => m.promises);
      const path = await import("path");
      const uploadDir = path.join(
        process.cwd(),
        "public",
        "uploads",
        "beos",
        beo.orgId,
        beo.eventId,
      );

      try {
        await fs.mkdir(uploadDir, { recursive: true });
        await fs.writeFile(
          path.join(
            uploadDir,
            `BEO_${beo.beoNumber}_v${await this.getVersionCount(beoId)}_${timestamp}.pdf`,
          ),
          pdfBuffer,
        );
      } catch (fsError) {
        logger.warn("[BEO] Could not save PDF to disk", fsError);
      }

      // Update BEO with PDF URL
      await db.query(
        `UPDATE beo_banquet_orders SET pdf_url = $1, pdf_generated_at = NOW() WHERE id = $2`,
        [pdfPath, beoId],
      );

      // Store attachment record
      await db.query(
        `
        INSERT INTO calendar_event_attachments (
          org_id,
          event_id,
          beo_id,
          file_name,
          file_url,
          file_type,
          file_size_bytes,
          storage_provider,
          uploaded_by_user_id,
          is_current_version,
          version_number,
          uploaded_at
        ) VALUES ($1, $2, $3, $4, $5, 'pdf', $6, 'local', $7, TRUE, $8, NOW())
        `,
        [
          beo.orgId,
          beo.eventId,
          beoId,
          `BEO_${beo.beoNumber}.pdf`,
          pdfPath,
          pdfBuffer.length,
          beo.createdByUserId,
          await this.getVersionCount(beoId),
        ],
      );

      logger.info("[BEO] PDF generated and stored successfully", {
        beoId,
        pdfPath,
      });

      return pdfPath;
    } catch (error) {
      logger.error("[BEO] Error generating PDF", error);
      throw error;
    }
  }

  /**
   * Get change feed for a BEO
   */
  async getBEOChangeFeed(
    beoId: string,
    limit: number = 50,
  ): Promise<
    Array<{
      id: string;
      changeType: string;
      changeSummary?: string;
      changedFields?: Record<string, any>;
      changedByUserId: string;
      changedByName?: string;
      createdAt: string;
    }>
  > {
    try {
      const result = await db.query(
        `
        SELECT 
          id,
          change_type as "changeType",
          change_summary as "changeSummary",
          changed_fields as "changedFields",
          changed_by_user_id as "changedByUserId",
          changed_by_name as "changedByName",
          created_at as "createdAt"
        FROM beo_change_feed
        WHERE beo_id = $1
        ORDER BY created_at DESC
        LIMIT $2
        `,
        [beoId, limit],
      );

      return result.rows;
    } catch (error) {
      logger.error("[BEO] Error fetching change feed", error);
      throw error;
    }
  }

  /**
   * Get all BEOs for an event
   */
  async getBEOsByEvent(eventId: string): Promise<BEO[]> {
    try {
      const result = await db.query(
        `
        SELECT 
          id,
          org_id as "orgId",
          event_id as "eventId",
          beo_number as "beoNumber",
          beo_name as "beoName",
          content_data as "contentData",
          pdf_url as "pdfUrl",
          status,
          department_id as "departmentId",
          created_by_user_id as "createdByUserId",
          approved_by_user_id as "approvedByUserId",
          created_at as "createdAt",
          updated_at as "updatedAt",
          approved_at as "approvedAt"
        FROM beo_banquet_orders
        WHERE event_id = $1
        ORDER BY created_at DESC
        `,
        [eventId],
      );

      return result.rows;
    } catch (error) {
      logger.error("[BEO] Error fetching BEOs by event", error);
      throw error;
    }
  }

  /**
   * List BEOs by department
   */
  async getBEOsByDepartment(
    orgId: string,
    departmentId: string,
    status?: string,
    limit: number = 50,
  ): Promise<BEO[]> {
    try {
      let query = `
        SELECT 
          id,
          org_id as "orgId",
          event_id as "eventId",
          beo_number as "beoNumber",
          beo_name as "beoName",
          content_data as "contentData",
          pdf_url as "pdfUrl",
          status,
          department_id as "departmentId",
          created_by_user_id as "createdByUserId",
          approved_by_user_id as "approvedByUserId",
          created_at as "createdAt",
          updated_at as "updatedAt",
          approved_at as "approvedAt"
        FROM beo_banquet_orders
        WHERE org_id = $1 AND department_id = $2
      `;

      const params: any[] = [orgId, departmentId];

      if (status) {
        query += ` AND status = $3`;
        params.push(status);
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await db.query(query, params);

      return result.rows;
    } catch (error) {
      logger.error("[BEO] Error fetching BEOs by department", error);
      throw error;
    }
  }

  // ==================== Private Helper Methods ====================

  /**
   * Generate unique BEO number using enhanced format
   * Format: AUR-[GL]-[YYYYMMDD]-[Type]-[Seq]
   * Example: AUR-0-20250314-WED-0001
   */
  private async generateEnhancedBEONumber(
    orgId: string,
    outletId: string,
    eventDate: string,
    eventTypeCode: string,
  ): Promise<string> {
    try {
      const result = await db.query(
        `SELECT generate_enhanced_beo_number($1, $2, $3, $4) as beo_number`,
        [orgId, outletId, eventDate, eventTypeCode],
      );

      if (!result.rows[0]?.beo_number) {
        throw new Error("Failed to generate BEO number");
      }

      return result.rows[0].beo_number;
    } catch (error) {
      logger.error("[BEO] Error generating enhanced BEO number", {
        orgId,
        outletId,
        eventDate,
        eventTypeCode,
        error,
      });
      throw error;
    }
  }

  /**
   * Generate unique BEO number (legacy format)
   * Format: BEO-YYYY-NNN
   * Deprecated: Use generateEnhancedBEONumber instead
   */
  private async generateBEONumber(orgId: string): Promise<string> {
    try {
      const result = await db.query(
        `SELECT generate_beo_number($1) as beo_number`,
        [orgId],
      );

      return result.rows[0].beo_number;
    } catch (error) {
      logger.error("[BEO] Error generating legacy BEO number", error);
      throw error;
    }
  }

  /**
   * Create a BEO version entry
   */
  private async createVersion(
    beoId: string,
    changeType: string,
    changeSummary: string,
    changedFields: Record<string, any>,
    userId: string,
    orgId: string,
  ): Promise<void> {
    try {
      const versionNumber = (await this.getVersionCount(beoId)) + 1;

      // Get current BEO content
      const beo = await this.getBEO(beoId);
      if (!beo) {
        throw new Error(`BEO not found: ${beoId}`);
      }

      // Get user name if available
      const userResult = await db.query(
        `SELECT email FROM auth.users WHERE id = $1 LIMIT 1`,
        [userId],
      );
      const userName = userResult.rows[0]?.email || "System";

      // Insert version
      await db.query(
        `
        INSERT INTO beo_versions (
          org_id,
          beo_id,
          version_number,
          change_type,
          change_summary,
          changed_fields,
          content_snapshot,
          changed_by_user_id,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        `,
        [
          orgId,
          beoId,
          versionNumber,
          changeType,
          changeSummary,
          JSON.stringify(changedFields),
          JSON.stringify(beo.contentData),
          userId,
        ],
      );

      // Log to change feed
      await db.query(
        `
        INSERT INTO beo_change_feed (
          org_id,
          beo_id,
          change_type,
          change_summary,
          changed_fields,
          changed_by_user_id,
          changed_by_name,
          affected_department_id,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        `,
        [
          orgId,
          beoId,
          changeType,
          changeSummary,
          JSON.stringify(changedFields),
          userId,
          userName,
          beo.departmentId,
        ],
      );
    } catch (error) {
      logger.error("[BEO] Error creating version", error);
      throw error;
    }
  }

  /**
   * Get current version count for BEO
   */
  private async getVersionCount(beoId: string): Promise<number> {
    try {
      const result = await db.query(
        `SELECT COUNT(*) as count FROM beo_versions WHERE beo_id = $1`,
        [beoId],
      );

      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error("[BEO] Error getting version count", error);
      return 0;
    }
  }

  /**
   * Calculate diff between two objects
   */
  private calculateDiff(
    oldData: Record<string, any>,
    newData: Record<string, any>,
  ): Record<string, any> {
    const diff: Record<string, any> = {};

    // Check for changed/new fields
    Object.keys(newData).forEach((key) => {
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        diff[key] = {
          old: oldData[key],
          new: newData[key],
        };
      }
    });

    // Check for deleted fields
    Object.keys(oldData).forEach((key) => {
      if (!(key in newData)) {
        diff[key] = {
          old: oldData[key],
          new: undefined,
        };
      }
    });

    return diff;
  }
}

export const beoManagementService = new BEOManagementService();
