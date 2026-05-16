/**
 * Bulk Upload API
 * Processes up to 5,000 employees at a time
 * Handles Excel/CSV parsing, validation, and batch creation
 */

import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import XLSX from "xlsx";
import {
  parseUploadedFile,
  validateBulkUploadRow,
  batchData,
} from "../lib/bulk-upload-template";
import { generateSecurePassword } from "../lib/password-generator";
import { HQTelemetryClient } from "../lib/hq-telemetry-client";
import { sendgridClient } from "../integrations/sendgrid-client";

// Simple base64 encryption (basic implementation)
const encryptData = (data: string): string =>
  Buffer.from(data).toString("base64");

const router = Router();

// Initialize Supabase client with fallback
let supabase: any;
try {
  if (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
  } else {
    // Provide a stub client for development without Supabase
    supabase = {
      from: () => ({
        select: () => Promise.resolve({ data: null, error: null }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ data: null, error: null }),
        eq: function () {
          return this;
        },
        single: function () {
          return this;
        },
      }),
    };
  }
} catch (err) {
  // Fallback stub if createClient fails
  console.warn("[BULK-UPLOAD] Supabase initialization failed, using stub");
  supabase = {
    from: () => ({
      select: () => Promise.resolve({ data: null, error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
      eq: function () {
        return this;
      },
      single: function () {
        return this;
      },
    }),
  };
}

const telemetry = HQTelemetryClient.getInstance();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ["csv", "xlsx", "xls"];
    const ext = file.originalname.split(".").pop()?.toLowerCase();
    if (ext && allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV and Excel files allowed"));
    }
  },
});

/**
 * POST /api/bulk/upload
 * Upload and process bulk employee file
 */
router.post(
  "/upload",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const orgId = req.user?.org_id;
      if (!orgId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Parse file
      const { data: rows, errors: parseErrors } = await parseUploadedFile(
        req.file,
      );

      if (parseErrors.length > 0) {
        return res
          .status(400)
          .json({ error: "Failed to parse file", details: parseErrors });
      }

      if (rows.length === 0) {
        return res.status(400).json({ error: "No data rows in file" });
      }

      if (rows.length > 5000) {
        return res.status(400).json({
          error: `Too many records (${rows.length}). Maximum is 5,000 per upload.`,
        });
      }

      // Validate all rows
      const validationResults = rows.map((row, idx) =>
        validateBulkUploadRow(row, idx + 1),
      );

      const invalidRows = validationResults.filter((r) => !r.valid);
      if (invalidRows.length > 0) {
        return res.status(400).json({
          error: `${invalidRows.length} rows have validation errors`,
          errors: invalidRows.flatMap((r) => r.errors),
        });
      }

      // Create job record
      const { data: job, error: jobError } = await supabase
        .from("bulk_upload_jobs")
        .insert([
          {
            org_id: orgId,
            filename: req.file.originalname,
            total_records: rows.length,
            status: "PROCESSING",
            created_by: req.user?.id,
          },
        ])
        .select()
        .single();

      if (jobError) throw jobError;

      // Process in background (fire and forget)
      processEmployeeBatch(orgId, rows, job.id, req.user?.id).catch((err) => {
        console.error("[Bulk Upload] Processing error:", err);
        // Update job status
        supabase
          .from("bulk_upload_jobs")
          .update({ status: "FAILED" })
          .eq("id", job.id);
      });

      telemetry.recordUsage(
        req.user?.id || "system",
        req.user?.email || "system",
        "Bulk Operations",
        "upload-employees",
        { job_id: job.id, record_count: rows.length },
      );

      res.json({
        job_id: job.id,
        total_records: rows.length,
        status: "PROCESSING",
        message: "Upload started. You will be notified when complete.",
      });
    } catch (error) {
      telemetry.recordError(
        req.user?.id || "system",
        req.user?.email || "system",
        "Bulk Operations",
        "upload-employees",
        error instanceof Error ? error : new Error("Unknown error"),
        "error",
      );

      res.status(500).json({
        error: "Upload failed",
        detail: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * GET /api/bulk/status/:job_id
 * Get upload job status
 */
router.get("/status/:job_id", async (req: Request, res: Response) => {
  try {
    const { job_id } = req.params;
    const orgId = req.user?.org_id;

    const { data: job, error } = await supabase
      .from("bulk_upload_jobs")
      .select("*")
      .eq("id", job_id)
      .eq("org_id", orgId)
      .single();

    if (error) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json({
      job_id: job.id,
      status: job.status,
      total_records: job.total_records,
      processed_records: job.processed_records,
      successful_records: job.successful_records,
      failed_records: job.failed_records,
      progress: Math.round((job.processed_records / job.total_records) * 100),
      errors: job.errors,
      started_at: job.started_at,
      completed_at: job.completed_at,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch status" });
  }
});

/**
 * POST /api/bulk/send-credentials
 * Send credentials via email for employees created by bulk upload
 */
router.post("/send-credentials", async (req: Request, res: Response) => {
  try {
    const { job_id, employee_ids } = req.body;
    const orgId = req.user?.org_id;

    if (!job_id && !employee_ids) {
      return res.status(400).json({
        error: "Either job_id or employee_ids required",
      });
    }

    if (!sendgridClient.isConfigured()) {
      return res.status(400).json({
        error: "SendGrid not configured. Contact administrator.",
      });
    }

    // Get employees
    let query = supabase
      .from("employee_profiles")
      .select("*")
      .eq("org_id", orgId)
      .eq("is_deleted", false);

    if (job_id) {
      // Get from job
      query = query.eq("bulk_upload_job_id", job_id);
    } else if (employee_ids) {
      // Get specific employees
      query = query.in("id", employee_ids);
    }

    const { data: employees, error } = await query;

    if (error) throw error;

    if (!employees || employees.length === 0) {
      return res.status(404).json({ error: "No employees found" });
    }

    // Prepare credential emails
    const credentialEmails = await Promise.all(
      employees.map(async (emp) => {
        const tempPassword = generateSecurePassword();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // Update credentials
        await supabase
          .from("employee_credentials")
          .update({
            temporary_password_hash: encryptData(tempPassword),
            password_expires_at: expiresAt.toISOString(),
          })
          .eq("employee_id", emp.id);

        return {
          to: emp.email,
          firstName: emp.first_name,
          lastName: emp.last_name,
          tempPassword,
          setupLink: `${process.env.VITE_APP_URL}/setup?employee=${emp.id}`,
          expiresAt,
          companyName: process.env.VITE_COMPANY_NAME || "LUCCCA",
        };
      }),
    );

    // Send bulk emails
    const batchResult = await sendgridClient.sendBulkCredentials(
      credentialEmails,
      req.user?.email,
    );

    telemetry.recordUsage(
      req.user?.id || "system",
      req.user?.email || "system",
      "Bulk Operations",
      "send-credentials",
      { job_id, count: employees.length, successful: batchResult.successCount },
    );

    res.json({
      batch_id: batchResult.batchId,
      total_sent: batchResult.successCount,
      failed: batchResult.failureCount,
      failures: batchResult.failures,
    });
  } catch (error) {
    telemetry.recordError(
      req.user?.id || "system",
      req.user?.email || "system",
      "Bulk Operations",
      "send-credentials",
      error instanceof Error ? error : new Error("Unknown error"),
      "error",
    );

    res.status(500).json({ error: "Failed to send credentials" });
  }
});

/**
 * Process employee batch (background job)
 */
async function processEmployeeBatch(
  orgId: string,
  rows: Record<string, any>[],
  jobId: string,
  createdBy?: string,
): Promise<void> {
  const batches = batchData(rows, 100); // Process in chunks of 100

  let successCount = 0;
  let failedCount = 0;
  const errors: Array<{
    row_number: number;
    employee_number: string;
    error_message: string;
  }> = [];

  // Update job start time
  await supabase
    .from("bulk_upload_jobs")
    .update({ started_at: new Date().toISOString() })
    .eq("id", jobId);

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];

    for (const row of batch) {
      try {
        const tempPassword = generateSecurePassword();
        const passwordExpires = new Date();
        passwordExpires.setHours(passwordExpires.getHours() + 24);

        // Create employee
        const { data: employee, error: empError } = await supabase
          .from("employee_profiles")
          .insert([
            {
              org_id: orgId,
              employee_number: row.employee_number,
              first_name: row.first_name,
              last_name: row.last_name,
              email: row.email,
              phone: row.phone,
              department: row.department,
              outlet_id: row.outlet_id,
              outlet_name: row.outlet_name,
              position_title: row.position_title,
              hire_date: row.hire_date,
              employment_type: row.employment_type,
              hourly_rate: row.hourly_rate
                ? parseFloat(row.hourly_rate)
                : undefined,
              salary: row.salary ? parseFloat(row.salary) : undefined,
              commission_structure: row.commission_structure,
              commission_rate: row.commission_rate
                ? parseFloat(row.commission_rate)
                : undefined,
              is_tip_position: row.is_tip_position === "YES",
              work_authorization_type: row.work_authorization,
              access_level: "FULL",
              can_access_system: true,
              shift_pattern: row.shift_pattern,
              primary_shift_start: row.primary_shift_start,
              primary_shift_end: row.primary_shift_end,
              password_temporary: true,
              password_expires_at: passwordExpires.toISOString(),
              created_by: createdBy,
              bulk_upload_job_id: jobId,
            },
          ])
          .select()
          .single();

        if (empError) throw empError;

        // Create credentials
        await supabase.from("employee_credentials").insert([
          {
            employee_id: employee.id,
            temporary_password_hash: encryptData(tempPassword),
            password_expires_at: passwordExpires.toISOString(),
            email_status: "PENDING",
          },
        ]);

        successCount++;
      } catch (error) {
        failedCount++;
        errors.push({
          row_number: rows.indexOf(row) + 1,
          employee_number: row.employee_number,
          error_message:
            error instanceof Error ? error.message : "Unknown error",
        });
      }

      // Update progress
      const processed = successCount + failedCount;
      if (processed % 10 === 0) {
        await supabase
          .from("bulk_upload_jobs")
          .update({
            processed_records: processed,
            successful_records: successCount,
            failed_records: failedCount,
          })
          .eq("id", jobId);
      }
    }
  }

  // Mark job as complete
  await supabase
    .from("bulk_upload_jobs")
    .update({
      status: failedCount === 0 ? "COMPLETED" : "PARTIALLY_COMPLETED",
      processed_records: successCount + failedCount,
      successful_records: successCount,
      failed_records: failedCount,
      errors: errors.length > 0 ? errors : undefined,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

export default router;
