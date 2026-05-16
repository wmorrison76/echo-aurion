import { logger } from "./logger";
export interface EmailTemplate {
  templateId?: string;
  subject: string;
  htmlContent?: string;
  plainContent?: string;
  variables?: Record<string, string>;
}
export interface EmailOptions {
  to: string | string[];
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  htmlContent?: string;
  plainContent?: string;
  template?: EmailTemplate;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    type?: string;
  }>;
}
export interface SendGridResponse {
  messageId?: string;
  success: boolean;
  statusCode: number;
  error?: string;
} /** * SendGrid Email Service * Integrates with SendGrid v3 API for transactional and notification emails * * Required environment variables: * - SENDGRID_API_KEY: SendGrid API key from https://app.sendgrid.com/settings/api_keys * - SENDGRID_FROM_EMAIL: Default from email address */
export class SendGridService {
  private apiKey = process.env.SENDGRID_API_KEY || "";
  private fromEmail = process.env.SENDGRID_FROM_EMAIL || "noreply@example.com";
  private baseUrl = "https://api.sendgrid.com/v3";
  private initialized = false;
  constructor() {
    this.validateConfig();
  }
  private validateConfig(): void {
    if (!this.apiKey) {
      logger.warn(
        "SendGrid: SENDGRID_API_KEY is not configured. Email sending will not work.",
        { configStatus: "missing_api_key" },
      );
    }
    if (!this.fromEmail) {
      logger.warn(
        "SendGrid: SENDGRID_FROM_EMAIL is not configured. Using default noreply@example.com",
        { configStatus: "missing_from_email" },
      );
    }
    this.initialized = true;
  }
  /** * Send email via SendGrid API */ async sendEmail(
    options: EmailOptions,
  ): Promise<SendGridResponse> {
    try {
      if (!this.apiKey) {
        throw new Error("SendGrid API key is not configured");
      }
      const payload = this.buildEmailPayload(options);
      const response = await fetch(`${this.baseUrl}/mail/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (response.status === 202) {
        const messageId = response.headers.get("server-id") || "unknown";
        logger.info("Email sent via SendGrid", {
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          messageId,
        });
        return { success: true, statusCode: 202, messageId };
      }
      if (response.status >= 400) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.errors?.[0]?.message ||
          `SendGrid API error: ${response.status}`;
        logger.error("SendGrid API error", {
          statusCode: response.status,
          error: errorMessage,
          to: Array.isArray(options.to) ? options.to : [options.to],
        });
        return {
          success: false,
          statusCode: response.status,
          error: errorMessage,
        };
      }
      return { success: true, statusCode: response.status };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Error sending email via SendGrid", {
        error: errorMessage,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
      });
      return { success: false, statusCode: 500, error: errorMessage };
    }
  }
  /** * Send notification email */ async sendNotification(
    to: string | string[],
    subject: string,
    content: string,
    htmlContent?: string,
  ): Promise<SendGridResponse> {
    return this.sendEmail({
      to,
      subject,
      plainContent: content,
      htmlContent: htmlContent || `<p>${content}</p>`,
    });
  }
  /** * Send transactional email with template */ async sendTransactionalEmail(
    to: string | string[],
    template: EmailTemplate,
  ): Promise<SendGridResponse> {
    return this.sendEmail({
      to,
      subject: template.subject,
      htmlContent: template.htmlContent,
      plainContent: template.plainContent,
      template,
    });
  }
  /** * Send invoice notification email */ async sendInvoiceNotification(
    to: string,
    invoiceData: {
      invoiceNumber: string;
      vendor: string;
      amount: number;
      dueDate: string;
      subject?: string;
    },
  ): Promise<SendGridResponse> {
    const subject =
      invoiceData.subject ||
      `Invoice ${invoiceData.invoiceNumber} from ${invoiceData.vendor}`;
    const htmlContent = ` <h2>Invoice Notification</h2> <p><strong>Invoice Number:</strong> ${invoiceData.invoiceNumber}</p> <p><strong>Vendor:</strong> ${invoiceData.vendor}</p> <p><strong>Amount:</strong> $${invoiceData.amount.toFixed(2)}</p> <p><strong>Due Date:</strong> ${invoiceData.dueDate}</p> <p>Please process this invoice in a timely manner.</p> `;
    return this.sendEmail({
      to,
      subject,
      htmlContent,
      plainContent: `Invoice ${invoiceData.invoiceNumber} from ${invoiceData.vendor} for $${invoiceData.amount.toFixed(2)} is due on ${invoiceData.dueDate}`,
    });
  }
  /** * Send approval request email */ async sendApprovalRequest(
    to: string | string[],
    data: {
      itemType: string;
      itemId: string;
      requesterName: string;
      description: string;
      approvalUrl: string;
    },
  ): Promise<SendGridResponse> {
    const subject = `Approval Requested: ${data.itemType} from ${data.requesterName}`;
    const htmlContent = ` <h2>Approval Request</h2> <p><strong>Item Type:</strong> ${data.itemType}</p> <p><strong>Description:</strong> ${data.description}</p> <p><strong>Requested by:</strong> ${data.requesterName}</p> <p><a href="${data.approvalUrl}">View and Approve</a></p> `;
    return this.sendEmail({
      to,
      subject,
      htmlContent,
      plainContent: `${data.requesterName} has requested your approval for ${data.itemType}: ${data.description}`,
    });
  }
  /** * Send order confirmation email */ async sendOrderConfirmation(
    to: string,
    orderData: {
      orderNumber: string;
      supplierName: string;
      items: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
      }>;
      totalAmount: number;
      deliveryDate: string;
    },
  ): Promise<SendGridResponse> {
    const itemsHtml = orderData.items
      .map(
        (item) =>
          `<tr> <td>${item.description}</td> <td>${item.quantity}</td> <td>$${item.unitPrice.toFixed(2)}</td> <td>$${(item.quantity * item.unitPrice).toFixed(2)}</td> </tr>`,
      )
      .join("");
    const htmlContent = ` <h2>Order Confirmation</h2> <p><strong>Order Number:</strong> ${orderData.orderNumber}</p> <p><strong>Supplier:</strong> ${orderData.supplierName}</p> <table style="width:100%;border-collapse:collapse;"> <thead> <tr style="background:#f0f0f0;"> <th style="border:1px solid #ddd;padding:8px;">Item</th> <th style="border:1px solid #ddd;padding:8px;">Qty</th> <th style="border:1px solid #ddd;padding:8px;">Unit Price</th> <th style="border:1px solid #ddd;padding:8px;">Total</th> </tr> </thead> <tbody> ${itemsHtml} </tbody> <tfoot> <tr style="font-weight:bold;background:#f9f9f9;"> <td colspan="3" style="border:1px solid #ddd;padding:8px;text-align:right;">Total:</td> <td style="border:1px solid #ddd;padding:8px;">$${orderData.totalAmount.toFixed(2)}</td> </tr> </tfoot> </table> <p><strong>Expected Delivery:</strong> ${orderData.deliveryDate}</p> `;
    return this.sendEmail({
      to,
      subject: `Order Confirmation #${orderData.orderNumber}`,
      htmlContent,
      plainContent: `Order ${orderData.orderNumber} confirmed with ${orderData.supplierName}. Total: $${orderData.totalAmount.toFixed(2)}. Delivery: ${orderData.deliveryDate}`,
    });
  }
  /** * Build SendGrid email payload */ private buildEmailPayload(
    options: EmailOptions,
  ): Record<string, any> {
    const toArray = Array.isArray(options.to) ? options.to : [options.to];
    const ccArray = options.cc
      ? Array.isArray(options.cc)
        ? options.cc
        : [options.cc]
      : [];
    const bccArray = options.bcc
      ? Array.isArray(options.bcc)
        ? options.bcc
        : [options.bcc]
      : [];
    return {
      personalizations: [
        {
          to: toArray.map((email) => ({ email })),
          cc:
            ccArray.length > 0
              ? ccArray.map((email) => ({ email }))
              : undefined,
          bcc:
            bccArray.length > 0
              ? bccArray.map((email) => ({ email }))
              : undefined,
          subject: options.subject,
        },
      ],
      from: { email: options.from || this.fromEmail },
      reply_to: options.replyTo ? { email: options.replyTo } : undefined,
      content: [
        options.htmlContent && {
          type: "text/html",
          value: options.htmlContent,
        },
        options.plainContent && {
          type: "text/plain",
          value: options.plainContent,
        },
      ].filter(Boolean),
      attachments: options.attachments?.map((att) => ({
        filename: att.filename,
        content:
          typeof att.content === "string"
            ? att.content
            : att.content.toString("base64"),
        type: att.type || "application/octet-stream",
        disposition: "attachment",
      })),
    };
  }
}
export const sendGridService = new SendGridService();
