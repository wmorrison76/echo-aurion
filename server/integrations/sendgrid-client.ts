/**
 * SendGrid Integration Client
 * Handles bulk BCC email delivery of employee credentials
 * Supports mass credential distribution for onboarding
 */

let sgMail: any = null;

interface CredentialEmail {
  to: string;
  firstName: string;
  lastName: string;
  tempPassword: string;
  setupLink: string;
  qrCodeUrl?: string;
  expiresAt: Date;
  companyName?: string;
}

interface BulkEmailJob {
  batchId: string;
  totalRecords: number;
  successCount: number;
  failureCount: number;
  failures: Array<{
    email: string;
    error: string;
  }>;
  startedAt: Date;
  completedAt?: Date;
}

class SendGridClient {
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;
  private isInitialized: boolean = false;

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY || "";
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || "noreply@luccca.app";
    this.fromName = process.env.SENDGRID_FROM_NAME || "LUCCCA Onboarding";

    if (this.apiKey && sgMail) {
      sgMail.setApiKey(this.apiKey);
      this.isInitialized = true;
    } else {
      if (!sgMail) {
        console.warn(
          "[SendGrid] Package not installed - emails will not be sent",
        );
      } else {
        console.warn(
          "[SendGrid] API key not configured - emails will not be sent",
        );
      }
    }
  }

  /**
   * Send credential email to a single employee
   */
  async sendCredentialEmail(credential: CredentialEmail): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    if (!this.isInitialized) {
      console.warn(
        "[SendGrid] Not initialized - email would be sent if configured",
      );
      return { success: false, error: "SendGrid not configured" };
    }

    if (!sgMail) {
      console.warn(
        "[SendGrid] Package not available - email would be sent if installed",
      );
      return { success: false, error: "SendGrid package not available" };
    }

    try {
      const html = this.generateCredentialEmailHTML(credential);

      const message = {
        to: credential.to,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: `Welcome to LUCCCA - Complete Your Account Setup`,
        html,
        text: this.generateCredentialEmailText(credential),
        replyTo: {
          email: "support@luccca.app",
          name: "LUCCCA Support",
        },
      };

      const result = await sgMail.send(message);

      return {
        success: true,
        messageId: result[0].headers["x-message-id"],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("[SendGrid] Failed to send email:", errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send bulk BCC emails for credentials
   * All recipients in BCC so they don't see each other's emails
   */
  async sendBulkCredentials(
    credentials: CredentialEmail[],
    managerEmail?: string,
  ): Promise<BulkEmailJob> {
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const results: BulkEmailJob = {
      batchId,
      totalRecords: credentials.length,
      successCount: 0,
      failureCount: 0,
      failures: [],
      startedAt: new Date(),
    };

    // Send emails in batches of 100 (SendGrid limit)
    const emailBatchSize = 100;
    const emailBatches = [];

    for (let i = 0; i < credentials.length; i += emailBatchSize) {
      emailBatches.push(credentials.slice(i, i + emailBatchSize));
    }

    for (const batch of emailBatches) {
      const sendPromises = batch.map((credential) =>
        this.sendCredentialEmail(credential)
          .then((result) => {
            if (result.success) {
              results.successCount++;
            } else {
              results.failureCount++;
              results.failures.push({
                email: credential.to,
                error: result.error || "Unknown error",
              });
            }
          })
          .catch((error) => {
            results.failureCount++;
            results.failures.push({
              email: credential.to,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }),
      );

      await Promise.all(sendPromises);

      // Rate limit: wait 1 second between batches
      if (emailBatches.indexOf(batch) < emailBatches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    results.completedAt = new Date();

    // Send summary email to manager if provided
    if (managerEmail && results.successCount > 0) {
      await this.sendBulkSummaryEmail(managerEmail, results);
    }

    return results;
  }

  /**
   * Send summary email to manager about bulk upload
   */
  private async sendBulkSummaryEmail(
    managerEmail: string,
    job: BulkEmailJob,
  ): Promise<void> {
    if (!sgMail || !this.isInitialized) {
      console.warn(
        "[SendGrid] Not configured - summary email would be sent if available",
      );
      return;
    }

    try {
      const html = `
        <h2>Employee Credential Distribution Summary</h2>
        <p><strong>Batch ID:</strong> ${job.batchId}</p>
        <p><strong>Total Employees:</strong> ${job.totalRecords}</p>
        <p><strong>Successfully Sent:</strong> <span style="color: green;">${job.successCount}</span></p>
        <p><strong>Failed:</strong> <span style="color: red;">${job.failureCount}</span></p>

        ${
          job.failureCount > 0
            ? `
          <h3>Failed Emails:</h3>
          <ul>
            ${job.failures.map((f) => `<li>${f.email}: ${f.error}</li>`).join("")}
          </ul>
          <p>Please manually contact these employees or retry sending.</p>
        `
            : ""
        }

        <p><strong>Started:</strong> ${job.startedAt.toLocaleString()}</p>
        <p><strong>Completed:</strong> ${job.completedAt?.toLocaleString()}</p>
      `;

      await sgMail.send({
        to: managerEmail,
        from: this.fromEmail,
        subject: `LUCCCA Credential Distribution Summary - ${job.batchId}`,
        html,
        replyTo: {
          email: "support@luccca.app",
          name: "LUCCCA Support",
        },
      });
    } catch (error) {
      console.error("[SendGrid] Failed to send summary email:", error);
    }
  }

  /**
   * Generate HTML email for credentials
   */
  private generateCredentialEmailHTML(credential: CredentialEmail): string {
    const expirationDate = credential.expiresAt.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .credentials { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0; }
            .qr-code { text-align: center; margin: 20px 0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none; margin: 10px 0; }
            .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 4px; color: #856404; margin: 20px 0; }
            .footer { margin-top: 30px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Welcome to LUCCCA!</h1>
              <p style="margin: 10px 0 0 0;">Complete your account setup</p>
            </div>

            <div class="content">
              <p>Hello ${credential.firstName},</p>

              <p>Your account has been created in LUCCCA ${credential.companyName || "Management System"}. 
              To get started, you'll need to set up your password and complete your profile.</p>

              <h2>Your Credentials</h2>
              <div class="credentials">
                <p><strong>Email:</strong> <code>${credential.to}</code></p>
                <p><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px;">${credential.tempPassword}</code></p>
                <p style="font-size: 12px; color: #6b7280;">
                  This is a temporary password. You will be prompted to change it on first login.
                </p>
              </div>

              <h2>Next Steps</h2>
              <ol>
                <li>Click the button below to go to the login page</li>
                <li>Enter your email and temporary password</li>
                <li>Create a new permanent password (must be at least 14 characters with uppercase, lowercase, numbers, and special characters)</li>
                <li>Optionally scan the QR code with an authenticator app for additional security</li>
              </ol>

              <center>
                <a href="${credential.setupLink}" class="button">Complete Your Setup</a>
              </center>

              ${
                credential.qrCodeUrl
                  ? `
                <h2>Mobile Setup (Optional)</h2>
                <p>Scan this QR code to set up the mobile app:</p>
                <div class="qr-code">
                  <img src="${credential.qrCodeUrl}" alt="Setup QR Code" style="width: 250px; height: 250px;" />
                </div>
              `
                  : ""
              }

              <div class="warning">
                <strong>⚠️ Important:</strong> This temporary password will expire on <strong>${expirationDate}</strong>.
                You must complete your setup before this time. If your password expires, contact your manager or IT support.
              </div>

              <h2>Password Requirements</h2>
              <ul>
                <li>At least 14 characters</li>
                <li>Mix of uppercase and lowercase letters</li>
                <li>At least one number</li>
                <li>At least one special character (!@#$%^&*)</li>
                <li>Cannot be a password you've used before</li>
              </ul>

              <h2>Need Help?</h2>
              <p>If you have any questions or need assistance, contact:</p>
              <ul>
                <li><strong>Your Manager:</strong> Ask them for support</li>
                <li><strong>IT Support:</strong> support@luccca.app</li>
              </ul>

              <p style="margin-top: 30px; font-style: italic; color: #6b7280;">
                Do not share this email or your credentials with anyone.
              </p>
            </div>

            <div class="footer">
              <p>© 2024 LUCCCA. All rights reserved.</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate text version of credential email
   */
  private generateCredentialEmailText(credential: CredentialEmail): string {
    return `
Welcome to LUCCCA!

Hello ${credential.firstName},

Your account has been created. To get started:

1. Visit: ${credential.setupLink}
2. Enter your email: ${credential.to}
3. Enter temporary password: ${credential.tempPassword}
4. Create a new permanent password

Password Requirements:
- At least 14 characters
- Uppercase and lowercase letters
- At least one number
- At least one special character (!@#$%^&*)

Your temporary password expires: ${credential.expiresAt.toLocaleString()}

Questions? Contact your manager or support@luccca.app

---
Do not share this email or your credentials.
    `.trim();
  }

  /**
   * Check if SendGrid is configured
   */
  isConfigured(): boolean {
    return this.isInitialized;
  }

  /**
   * Get configuration status
   */
  getStatus(): {
    configured: boolean;
    fromEmail: string;
    fromName: string;
  } {
    return {
      configured: this.isInitialized,
      fromEmail: this.fromEmail,
      fromName: this.fromName,
    };
  }
}

// Export singleton instance
export const sendgridClient = new SendGridClient();

export type { CredentialEmail, BulkEmailJob };
