/**
 * Guest Link Service
 * Manages creation, validation, and revocation of guest access links
 */

import { VideoConferenceGuestLink } from "@/modules/VideoConference/types/VideoConferenceTypes";

export interface GuestLinkOptions {
  maxUses?: number;
  expiresIn?: number;
  requirePassword?: boolean;
  password?: string;
  guestName?: string;
  allowedEmail?: string;
  /** When true, guests must be approved by host before joining (waiting room) */
  waitingRoom?: boolean;
}

export interface GuestLinkResponse {
  link: VideoConferenceGuestLink;
  shareUrl: string;
}

export interface LinkValidationResult {
  valid: boolean;
  reason?: string;
  room?: any;
  requiresPassword?: boolean;
  expiresAt?: number;
}

class GuestLinkService {
  private baseUrl = "/api/video-conference";

  private getOrgId(): string {
    return (
      localStorage.getItem("org-id") ||
      localStorage.getItem("orgId") ||
      "default"
    );
  }

  async generateShareLink(
    roomId: string,
    options?: GuestLinkOptions,
  ): Promise<GuestLinkResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/guest-links`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Org-ID": this.getOrgId(),
        },
        body: JSON.stringify({
          roomId,
          maxUses: options?.maxUses,
          expiresIn: options?.expiresIn,
          requirePassword: options?.requirePassword,
          password: options?.password,
          guestName: options?.guestName,
          allowedEmail: options?.allowedEmail,
          metadata: options?.waitingRoom ? { waiting_room: true } : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate guest link");
      }

      const data = await response.json();
      const token = data.guestToken ?? data.guest_token ?? "";
      if (!token) throw new Error("No guest token in response");
      const shareUrl = `${window.location.origin}/conference/join/${token}`;

      return {
        link: data,
        shareUrl,
      };
    } catch (error) {
      console.error("Error generating guest link:", error);
      throw error;
    }
  }

  async validateGuestLink(linkId: string): Promise<LinkValidationResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/guest-links/${linkId}/validate`,
        {
          headers: { "X-Org-ID": this.getOrgId() },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to validate link");
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error validating guest link:", error);
      throw error;
    }
  }

  async revokeLink(linkId: string, reason?: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/guest-links/${linkId}/revoke`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Org-ID": this.getOrgId(),
          },
          body: JSON.stringify({ reason }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to revoke link");
      }
    } catch (error) {
      console.error("Error revoking link:", error);
      throw error;
    }
  }

  async getActiveLinks(roomId: string): Promise<VideoConferenceGuestLink[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/guest-links?roomId=${roomId}`,
        {
          headers: { "X-Org-ID": this.getOrgId() },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch active links");
      }

      const rows = await response.json();
      if (!Array.isArray(rows)) return [];
      return rows.map((r: any) => ({
        id: r.id,
        roomId: r.room_id,
        guestToken: r.guest_token,
        createdBy: r.created_by,
        guestName: r.guest_name,
        allowedEmail: r.allowed_email,
        maxUses: r.max_uses,
        currentUses: r.current_uses ?? 0,
        expiresAt: r.expires_at ? new Date(r.expires_at).getTime() : undefined,
        isRevoked: r.is_revoked ?? false,
        revokedAt: r.revoked_at ? new Date(r.revoked_at).getTime() : undefined,
        revokedBy: r.revoked_by,
        revokeReason: r.revoke_reason,
        requirePassword: r.require_password ?? false,
        createdAt: r.created_at ? new Date(r.created_at).getTime() : 0,
        updatedAt: r.updated_at ? new Date(r.updated_at).getTime() : 0,
      }));
    } catch (error) {
      console.error("Error fetching active links:", error);
      throw error;
    }
  }

  copyToClipboard(shareUrl: string): Promise<void> {
    return navigator.clipboard.writeText(shareUrl);
  }

  getShareMessage(roomName: string, shareUrl: string): string {
    return `Join me for a video conference: "${roomName}". Click here: ${shareUrl}`;
  }

  generateShareLinks(shareUrl: string, roomName: string) {
    const message = this.getShareMessage(roomName, shareUrl);
    return {
      email: `mailto:?subject=Join ${roomName}&body=${encodeURIComponent(message)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(roomName)}`,
      directLink: shareUrl,
    };
  }

  /**
   * Send an invite to an external recipient by email (cloud). Backend sends the email
   * with the join link; production should use SendGrid/SES or similar.
   */
  async sendInviteByEmail(
    roomId: string,
    roomName: string,
    shareUrl: string,
    toEmail: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/invite/send-email`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Org-ID": this.getOrgId(),
        },
        body: JSON.stringify({
          roomId,
          roomName,
          shareUrl,
          toEmail: toEmail.trim(),
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return {
          success: false,
          error: (err as { message?: string }).message ?? "Failed to send email invite",
        };
      }
      return { success: true };
    } catch (error) {
      console.error("Error sending email invite:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send email invite",
      };
    }
  }

  /**
   * Send an invite to an external recipient by SMS (cloud, mobile-friendly). Backend
   * sends the SMS with the join link; production should use Twilio or similar.
   */
  async sendInviteBySms(
    roomId: string,
    roomName: string,
    shareUrl: string,
    toPhone: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/invite/send-sms`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Org-ID": this.getOrgId(),
        },
        body: JSON.stringify({
          roomId,
          roomName,
          shareUrl,
          toPhone: toPhone.trim(),
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return {
          success: false,
          error: (err as { message?: string }).message ?? "Failed to send SMS invite",
        };
      }
      return { success: true };
    } catch (error) {
      console.error("Error sending SMS invite:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send SMS invite",
      };
    }
  }
}

export const guestLinkService = new GuestLinkService();
