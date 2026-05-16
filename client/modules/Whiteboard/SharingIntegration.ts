/** * Sharing Integration Manager * Handles Slack and Email sharing with previews */ import {
  SlackShareConfig,
  EmailShareConfig,
  CanvasState,
} from "./types";
interface SlackAuthConfig {
  slackToken?: string;
  slackWebhookUrl?: string;
  appId?: string;
}
interface SharePreview {
  thumbnailUrl: string;
  title: string;
  description?: string;
  elementCount: number;
  lastModified: number;
}
class SharingIntegrationManager {
  private static slackConfig: SlackAuthConfig = {};
  static setSlackAuthConfig(config: Partial<SlackAuthConfig>): void {
    this.slackConfig = { ...this.slackConfig, ...config };
  }
  static generateSharePreview(canvasState: CanvasState): SharePreview {
    const elementCount =
      canvasState.shapes.length +
      canvasState.texts.length +
      canvasState.stickyNotes.length +
      canvasState.connectors.length +
      canvasState.documents.length;
    return {
      thumbnailUrl: this.generateThumbnailDataUrl(canvasState),
      title: `Whiteboard with ${elementCount} elements`,
      description: `Created with ${canvasState.shapes.length} shapes, ${canvasState.texts.length} texts, and ${canvasState.stickyNotes.length} notes`,
      elementCount,
      lastModified: Date.now(),
    };
  }
  private static generateThumbnailDataUrl(canvasState: CanvasState): string {
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 320;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.fillStyle = canvasState.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width / 1920, canvas.height / 1080);
    ctx.fillStyle = "#3B82F6";
    canvasState.shapes.forEach((shape) => {
      const x = (shape.x - canvasState.viewportX) * scale + canvas.width / 2;
      const y = (shape.y - canvasState.viewportY) * scale + canvas.height / 2;
      const w = shape.width * scale;
      const h = shape.height * scale;
      if (x > -w && x < canvas.width && y > -h && y < canvas.height) {
        if (shape.type === "rectangle") {
          ctx.fillRect(x, y, w, h);
        } else if (shape.type === "circle") {
          ctx.beginPath();
          ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
    return canvas.toDataURL("image/png");
  }
  static async shareToSlack(
    config: SlackShareConfig,
    canvasState: CanvasState,
    boardTitle: string,
    boardUrl: string,
  ): Promise<{ success: boolean; error?: string; messageId?: string }> {
    try {
      if (!this.slackConfig.slackWebhookUrl) {
        throw new Error("Slack webhook URL not configured");
      }
      const preview = this.generateSharePreview(canvasState);
      const message = {
        text: config.message || `Check out this whiteboard: ${boardTitle}`,
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: boardTitle, emoji: true },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: config.message || `Shared a whiteboard`,
            },
          },
          ...(config.includePreview
            ? [
                {
                  type: "image",
                  image_url: preview.thumbnailUrl,
                  alt_text: "Whiteboard preview",
                },
              ]
            : []),
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Elements:*\n${preview.elementCount}` },
              {
                type: "mrkdwn",
                text: `*Mode:*\n${config.previewMode || "Standard"}`,
              },
            ],
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "View Whiteboard",
                  emoji: true,
                },
                url: boardUrl,
                action_id: "view_whiteboard",
              },
            ],
          },
        ],
      };
      const response = await fetch(this.slackConfig.slackWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });
      if (!response.ok) {
        throw new Error(`Slack API error: ${response.statusText}`);
      }
      return { success: true };
    } catch (error) {
      console.error("[SharingIntegration] Slack share failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
  static async shareViaEmail(
    config: EmailShareConfig,
    canvasState: CanvasState,
    boardTitle: string,
    boardUrl: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const preview = this.generateSharePreview(canvasState);
      const emailPayload = {
        to: config.recipients,
        subject: config.subject || `Shared Whiteboard: ${boardTitle}`,
        html: this.generateEmailHTML(
          boardTitle,
          config.message,
          preview,
          boardUrl,
          config.previewMode,
        ),
      };
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailPayload),
      });
      if (!response.ok) {
        throw new Error(`Email service error: ${response.statusText}`);
      }
      return { success: true };
    } catch (error) {
      console.error("[SharingIntegration] Email share failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
  private static generateEmailHTML(
    boardTitle: string,
    message: string,
    preview: SharePreview,
    boardUrl: string,
    previewMode?: string,
  ): string {
    return ` <!DOCTYPE html> <html> <head> <style> body { font-family: Arial, sans-serif; color: #333; } .container { max-width: 600px; margin: 0 auto; padding: 20px; } .header { border-bottom: 2px solid #3B82F6; padding-bottom: 20px; } .title { font-size: 24px; font-weight: bold; color: #1F2937; margin: 0; } .message { margin: 20px 0; color: #4B5563; line-height: 1.6; } .preview-section { margin: 20px 0; } .preview-image { width: 100%; max-height: 320px; border-radius: 8px; border: 1px solid #E5E7EB; } .stats { display: flex; gap: 20px; margin: 20px 0; } .stat { flex: 1; } .stat-label { font-size: 12px; color: #6B7280; text-transform: uppercase; } .stat-value { font-size: 24px; font-weight: bold; color: #1F2937; } .button { display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; } .footer { border-top: 1px solid #E5E7EB; padding-top: 20px; font-size: 12px; color: #6B7280; } </style> </head> <body> <div class="container"> <div class="header"> <p class="title">${boardTitle}</p> </div> ${message ? `<p class="message">${message}</p>` : ""} ${previewMode !== "minimal" ? ` <div class="preview-section"> <img src="${preview.thumbnailUrl}" alt="Whiteboard preview" class="preview-image"> </div> <div class="stats"> <div class="stat"> <div class="stat-label">Elements</div> <div class="stat-value">${preview.elementCount}</div> </div> <div class="stat"> <div class="stat-label">Updated</div> <div class="stat-value">${new Date(preview.lastModified).toLocaleDateString()}</div> </div> </div> ` : ""} <a href="${boardUrl}" class="button">View Whiteboard</a> <div class="footer"> <p>This whiteboard was shared with you. Click the button above to view it.</p> </div> </div> </body> </html> `;
  }
  static generateShareUrl(sessionId: string, baseUrl: string = ""): string {
    const base = baseUrl || window.location.origin;
    return `${base}/whiteboard/${sessionId}?shared=true`;
  }
  static validateEmailAddresses(emails: string[]): {
    valid: boolean;
    invalid: string[];
  } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalid = emails.filter((email) => !emailRegex.test(email));
    return { valid: invalid.length === 0, invalid };
  }
}
export default SharingIntegrationManager;
