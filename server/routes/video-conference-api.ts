/**
 * Video Conference API Endpoints
 * Handles room management, guest links, and session tracking
 */

import express, { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { getDailyService } from "../services/DailyVideoService";
import {
  CreateRoomRequest,
  CreateGuestLinkRequest,
} from "@/modules/VideoConference/types/VideoConferenceTypes";

const router: Router = express.Router();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

/**
 * POST /api/video-conference/rooms
 * Create a new video conference room
 */
router.post("/rooms", async (req: Request, res: Response) => {
  try {
    const request: CreateRoomRequest = req.body;
    const userId = req.user?.id || "unknown";

    if (!request.roomName) {
      return res.status(400).json({ error: "roomName is required" });
    }

    // Generate unique Daily.co room name
    const dailyRoomName = `room-${uuidv4()}`;

    const daily = getDailyService();

    // Create room in Daily.co
    const dailyRoom = await daily.createRoom(dailyRoomName, {
      displayName: request.roomName,
      maxParticipants: request.maxParticipants || 100,
      allowScreenShare: request.allowScreenShare !== false,
      allowRecording: request.allowRecording !== false,
      allowChat: request.allowChat !== false,
    });

    // Store room metadata in database
    const { data: room, error } = await supabase
      .from("video_conference_rooms")
      .insert([
        {
          daily_room_name: dailyRoomName,
          room_name: request.roomName,
          room_description: request.roomDescription,
          room_type: request.roomType || "private",
          privacy_level: request.privacyLevel || "private",
          max_participants: request.maxParticipants || 100,
          allow_recording: request.allowRecording !== false,
          allow_screen_share: request.allowScreenShare !== false,
          allow_chat: request.allowChat !== false,
          meeting_start_time: request.meetingStartTime
            ? new Date(request.meetingStartTime)
            : null,
          scheduled_duration: request.scheduledDuration,
          owner_id: userId,
          created_by: userId,
          board_id: request.boardId,
          metadata: {
            ...(request.metadata || {}),
            ...(request.tableId != null && { table_id: request.tableId }),
            ...(request.servicePeriodId != null && { service_period_id: request.servicePeriodId }),
            ...((request as any).venueId != null && { venue_id: (request as any).venueId }),
            ...((request as any).role != null && { role: (request as any).role }),
          },
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      success: true,
      room,
      dailyRoom,
    });
  } catch (error) {
    console.error("Create room error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to create room",
    });
  }
});

/**
 * GET /api/video-conference/rooms/:roomId
 * Get room details
 */
router.get("/rooms/:roomId", async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;

    const { data: room, error } = await supabase
      .from("video_conference_rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (error || !room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Get current participants
    const { data: participants } = await supabase
      .from("video_conference_participants")
      .select("*")
      .eq("room_id", roomId)
      .is("leave_time", null);

    return res.json({
      success: true,
      room,
      participants: participants || [],
    });
  } catch (error) {
    console.error("Get room error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to get room",
    });
  }
});

/**
 * GET /api/video-conference/rooms
 * List user's rooms
 */
router.get("/rooms", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || "unknown";

    const { data: rooms, error } = await supabase
      .from("video_conference_rooms")
      .select("*")
      .eq("owner_id", userId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      success: true,
      rooms: rooms || [],
    });
  } catch (error) {
    console.error("List rooms error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to list rooms",
    });
  }
});

/**
 * DELETE /api/video-conference/rooms/:roomId
 * Delete a room
 */
router.delete("/rooms/:roomId", async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = req.user?.id || "unknown";

    // Get room to verify ownership
    const { data: room, error: getError } = await supabase
      .from("video_conference_rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (getError || !room) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (room.owner_id !== userId) {
      return res.status(403).json({ error: "Only room owner can delete" });
    }

    // Delete from Daily.co
    const daily = getDailyService();
    await daily.deleteRoom(room.daily_room_name);

    // Soft delete in database
    const { error: deleteError } = await supabase
      .from("video_conference_rooms")
      .update({ deleted_at: new Date(), is_active: false })
      .eq("id", roomId);

    if (deleteError) {
      return res.status(500).json({ error: deleteError.message });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Delete room error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to delete room",
    });
  }
});

/**
 * POST /api/video-conference/join
 * Join a video conference
 */
router.post("/join", async (req: Request, res: Response) => {
  try {
    const { roomId: bodyRoomId, userId, guestToken, linkId, guestName, guestEmail, userName } =
      req.body;
    const tokenOrLinkId = guestToken || linkId;

    let roomId = bodyRoomId;
    let link: any = null;

    // Guest join by link: look up link by token to get roomId
    if (tokenOrLinkId && !roomId) {
      const { data: linkRow } = await supabase
        .from("video_conference_guest_links")
        .select("*")
        .eq("guest_token", tokenOrLinkId)
        .single();
      if (!linkRow || linkRow.is_revoked) {
        return res.status(403).json({ success: false, error: "Invalid or revoked guest link" });
      }
      if (linkRow.expires_at && new Date(linkRow.expires_at) < new Date()) {
        return res.status(403).json({ success: false, error: "Guest link has expired" });
      }
      link = linkRow;
      roomId = link.room_id;
    }

    // Get room
    const { data: room, error: roomError } = await supabase
      .from("video_conference_rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Waiting room: create join request instead of joining immediately.
    // Auto-allow users from the same company (org): they skip the waiting room and join directly.
    const waitingRoom = link && (link.metadata as any)?.waiting_room;
    const reqUser = (req as any).user;
    const isInternalUser =
      reqUser?.id &&
      room.org_id &&
      reqUser.org_id != null &&
      String(reqUser.org_id) === String(room.org_id);
    if (waitingRoom && guestName && !isInternalUser) {
      const { data: joinRequest, error: insertErr } = await supabase
        .from("video_conference_join_requests")
        .insert([
          {
            room_id: roomId,
            link_id: link?.id,
            guest_name: guestName,
            guest_email: guestEmail,
            status: "pending",
          },
        ])
        .select("id")
        .single();
      if (insertErr) {
        return res.status(500).json({ success: false, error: "Failed to submit join request" });
      }
      return res.json({
        success: true,
        status: "waiting",
        requestId: joinRequest?.id,
        message: "Waiting for host to let you in.",
      });
    }

    // Verify guest link if provided (non-waiting flow)
    let isGuest = false;
    if (tokenOrLinkId) {
      const linkToUse = link || (await supabase.from("video_conference_guest_links").select("*").eq("guest_token", tokenOrLinkId).eq("room_id", roomId).single()).data;
      if (!linkToUse || linkToUse.is_revoked) {
        return res.status(403).json({ error: "Invalid or revoked guest link" });
      }
      if (linkToUse.expires_at && new Date(linkToUse.expires_at) < new Date()) {
        return res.status(403).json({ error: "Guest link has expired" });
      }
      isGuest = true;
      link = linkToUse;
      await supabase
        .from("video_conference_guest_links")
        .update({ current_uses: (linkToUse.current_uses || 0) + 1 })
        .eq("id", linkToUse.id);
    }

    // Generate Daily.co token
    const daily = getDailyService();
    const token = await daily.generateParticipantToken({
      roomName: room.daily_room_name,
      userName: userName || guestName || "Guest",
      userEmail: guestEmail,
      isOwner: userId === room.owner_id,
    });

    // Record participant in database
    const { data: participant } = await supabase
      .from("video_conference_participants")
      .insert([
        {
          room_id: roomId,
          user_id: userId,
          guest_name: guestName,
          guest_email: guestEmail,
          participant_role:
            userId === room.owner_id ? "moderator" : "participant",
          is_guest: isGuest,
          join_time: new Date(),
        },
      ])
      .select()
      .single();

    return res.json({
      success: true,
      room,
      token,
      participant,
      dailyRoomUrl: `https://daily.co/${room.daily_room_name}`,
    });
  } catch (error) {
    console.error("Join room error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to join room",
    });
  }
});

/**
 * GET /api/video-conference/guest-links?roomId=...
 * List active guest links for a room (owner only)
 */
router.get("/guest-links", async (req: Request, res: Response) => {
  try {
    const roomId = req.query.roomId as string;
    const userId = req.user?.id || "unknown";
    if (!roomId) {
      return res.status(400).json({ error: "roomId query is required" });
    }
    const { data: room } = await supabase
      .from("video_conference_rooms")
      .select("owner_id")
      .eq("id", roomId)
      .single();
    if (!room || room.owner_id !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const { data: links, error } = await supabase
      .from("video_conference_guest_links")
      .select("*")
      .eq("room_id", roomId)
      .eq("is_revoked", false)
      .order("created_at", { ascending: false });
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json(links || []);
  } catch (error) {
    console.error("List guest links error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to list guest links",
    });
  }
});

/**
 * POST /api/video-conference/guest-links
 * Create guest link for room
 */
router.post("/guest-links", async (req: Request, res: Response) => {
  try {
    const request: CreateGuestLinkRequest = req.body;
    const userId = req.user?.id || "unknown";

    if (!request.roomId) {
      return res.status(400).json({ error: "roomId is required" });
    }

    // Verify room ownership
    const { data: room, error: roomError } = await supabase
      .from("video_conference_rooms")
      .select("*")
      .eq("id", request.roomId)
      .single();

    if (roomError || !room) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (room.owner_id !== userId) {
      return res
        .status(403)
        .json({ error: "Only room owner can create links" });
    }

    // Generate token
    const guestToken = crypto.randomBytes(32).toString("hex");

    // Hash password if provided
    let passwordHash = null;
    if (request.password) {
      passwordHash = crypto
        .createHash("sha256")
        .update(request.password)
        .digest("hex");
    }

    // Create link – support expirationMinutes (minutes) or expiresIn (ms)
    const expirationMs =
      request.expirationMinutes != null
        ? request.expirationMinutes * 60 * 1000
        : (request as any).expiresIn != null
          ? Number((request as any).expiresIn)
          : null;
    const expiresAt = expirationMs
      ? new Date(Date.now() + expirationMs)
      : null;

    const metadata = (request as any).metadata || null;
    const { data: link, error } = await supabase
      .from("video_conference_guest_links")
      .insert([
        {
          room_id: request.roomId,
          guest_token: guestToken,
          created_by: userId,
          guest_name: request.guestName,
          allowed_email: request.allowedEmail,
          max_uses: request.maxUses,
          expires_at: expiresAt,
          require_password: request.requirePassword || false,
          password_hash: passwordHash,
          metadata: metadata,
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Generate join URL
    const joinUrl = `${process.env.APP_URL}/video-conference/join/${guestToken}`;

    return res.json({
      success: true,
      link,
      joinUrl,
    });
  } catch (error) {
    console.error("Create guest link error:", error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to create guest link",
    });
  }
});

/**
 * POST /api/video-conference/guest-links/:linkId/revoke
 * Revoke guest link
 */
router.post(
  "/guest-links/:linkId/revoke",
  async (req: Request, res: Response) => {
    try {
      const { linkId } = req.params;
      const userId = req.user?.id || "unknown";
      const { reason } = req.body;

      // Get link and verify room ownership
      const { data: link, error: linkError } = await supabase
        .from("video_conference_guest_links")
        .select("*")
        .eq("id", linkId)
        .single();

      if (linkError || !link) {
        return res.status(404).json({ error: "Link not found" });
      }

      const { data: room } = await supabase
        .from("video_conference_rooms")
        .select("*")
        .eq("id", link.room_id)
        .single();

      if (room?.owner_id !== userId) {
        return res.status(403).json({ error: "Only room owner can revoke" });
      }

      // Revoke link
      const { error } = await supabase
        .from("video_conference_guest_links")
        .update({
          is_revoked: true,
          revoked_at: new Date(),
          revoked_by: userId,
          revoke_reason: reason,
        })
        .eq("id", linkId);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error("Revoke link error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to revoke link",
      });
    }
  },
);

/**
 * GET /api/video-conference/guest-links/:linkId/validate
 * Validate guest link
 */
router.get(
  "/guest-links/:linkId/validate",
  async (req: Request, res: Response) => {
    try {
      const { linkId } = req.params;

      const { data: link, error } = await supabase
        .from("video_conference_guest_links")
        .select("*")
        .eq("guest_token", linkId)
        .single();

      if (error || !link) {
        return res.json({
          valid: false,
          reason: "Invalid link",
        });
      }

      if (link.is_revoked) {
        return res.json({
          valid: false,
          reason: "Link has been revoked",
        });
      }

      if (link.expires_at && new Date(link.expires_at) < new Date()) {
        return res.json({
          valid: false,
          reason: "Link has expired",
        });
      }

      if (link.max_uses && link.current_uses >= link.max_uses) {
        return res.json({
          valid: false,
          reason: "Link has reached maximum uses",
        });
      }

      // Get room details
      const { data: room } = await supabase
        .from("video_conference_rooms")
        .select("*")
        .eq("id", link.room_id)
        .single();

      const waitingRoom = !!(link.metadata as any)?.waiting_room;
      return res.json({
        valid: true,
        room,
        requiresPassword: link.require_password,
        expiresAt: link.expires_at,
        waitingRoom,
      });
    } catch (error) {
      console.error("Validate link error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Validation failed",
      });
    }
  },
);

/**
 * GET /api/video-conference/join-requests/status/:requestId
 * Guest polls for approval status; returns { status, token? }
 */
router.get("/join-requests/status/:requestId", async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { data: row, error } = await supabase
      .from("video_conference_join_requests")
      .select("status, token")
      .eq("id", requestId)
      .single();
    if (error || !row) {
      return res.status(404).json({ error: "Request not found" });
    }
    return res.json({ status: row.status, token: row.token ?? undefined });
  } catch (e) {
    return res.status(500).json({ error: "Failed to get status" });
  }
});

/**
 * GET /api/video-conference/rooms/:roomId/join-requests
 * Host lists pending join requests for a room
 */
router.get("/rooms/:roomId/join-requests", async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = req.user?.id || "unknown";
    const { data: room } = await supabase.from("video_conference_rooms").select("owner_id").eq("id", roomId).single();
    if (!room || room.owner_id !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const { data: list, error } = await supabase
      .from("video_conference_join_requests")
      .select("*")
      .eq("room_id", roomId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(list || []);
  } catch (e) {
    return res.status(500).json({ error: "Failed to list join requests" });
  }
});

/**
 * POST /api/video-conference/join-requests/:id/approve
 * Host approves a join request; generates token and stores for guest to poll
 */
router.post("/join-requests/:id/approve", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || "unknown";
    const { data: reqRow, error: fetchErr } = await supabase
      .from("video_conference_join_requests")
      .select("*")
      .eq("id", id)
      .eq("status", "pending")
      .single();
    if (fetchErr || !reqRow) {
      return res.status(404).json({ error: "Request not found or already handled" });
    }
    const { data: room } = await supabase.from("video_conference_rooms").select("*").eq("id", reqRow.room_id).single();
    if (!room || room.owner_id !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const daily = getDailyService();
    const token = await daily.generateParticipantToken({
      roomName: room.daily_room_name,
      userName: reqRow.guest_name || "Guest",
      userEmail: reqRow.guest_email,
      isOwner: false,
    });
    await supabase
      .from("video_conference_join_requests")
      .update({
        status: "approved",
        token,
        reviewed_by: userId,
        reviewed_at: new Date(),
      })
      .eq("id", id);
    await supabase.from("video_conference_participants").insert([
      {
        room_id: room.id,
        guest_name: reqRow.guest_name,
        guest_email: reqRow.guest_email,
        participant_role: "participant",
        is_guest: true,
        join_time: new Date(),
      },
    ]);
    return res.json({ success: true, message: "Guest approved" });
  } catch (e) {
    return res.status(500).json({ error: "Failed to approve" });
  }
});

/**
 * GET /api/video-conference/recordings/:roomId
 * Get room recordings (filtered by visibility: only open, or owner, or in allowed_viewer_ids)
 */
router.get("/recordings/:roomId", async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = req.user?.id as string | undefined;

    const { data: raw, error } = await supabase
      .from("video_conference_recordings")
      .select("*, room:video_conference_rooms(owner_id)")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const recordings = (raw || []).filter((rec: any) => {
      const visibility = rec.visibility || "open";
      const ownerId = rec.room?.owner_id;
      const allowed = rec.allowed_viewer_ids || [];
      if (visibility === "open") return true;
      if (userId && ownerId === userId) return true;
      if (visibility === "invitees_only" && userId && allowed.includes(userId)) return true;
      if (visibility === "owner_only" && userId && ownerId === userId) return true;
      return false;
    }).map(({ room, ...r }: any) => r);

    return res.json({
      success: true,
      recordings,
    });
  } catch (error) {
    console.error("Get recordings error:", error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to get recordings",
    });
  }
});

/**
 * POST /api/video-conference/recordings/save-for-training
 * Mark current call or create a training recording placeholder (metadata: type=training, venueId)
 */
router.post("/recordings/save-for-training", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || "unknown";
    const { roomId, label, venueId } = req.body || {};
    if (!roomId) {
      return res.status(400).json({ error: "roomId is required" });
    }
    const { data: room } = await supabase.from("video_conference_rooms").select("owner_id").eq("id", roomId).single();
    if (!room || room.owner_id !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const { data: rec, error } = await supabase
      .from("video_conference_recordings")
      .insert([
        {
          room_id: roomId,
          recording_id: `training-${Date.now()}`,
          status: "ready",
          metadata: { type: "training", label: label || "Training", venueId: venueId || null, savedAt: new Date().toISOString(), savedBy: userId, defaultCaptionLanguage: "en" },
        },
      ])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, recording: rec });
  } catch (e) {
    return res.status(500).json({ error: "Failed to save for training" });
  }
});

/**
 * POST /api/video-conference/recordings/:id/attach-incident
 * Attach a recording to an incident (metadata.incidentId); exempts from default retention
 */
router.post("/recordings/:id/attach-incident", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || "unknown";
    const { incidentId } = req.body || {};
    if (!incidentId) return res.status(400).json({ error: "incidentId is required" });
    const { data: rec } = await supabase.from("video_conference_recordings").select("*, room:video_conference_rooms(owner_id)").eq("id", id).single();
    if (!rec || (rec as any).room?.owner_id !== userId) return res.status(403).json({ error: "Forbidden" });
    const meta = (rec.metadata as Record<string, unknown>) || {};
    const { error } = await supabase
      .from("video_conference_recordings")
      .update({ metadata: { ...meta, incidentId, attachedAt: new Date().toISOString() } })
      .eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: "Failed to attach to incident" });
  }
});

/**
 * POST /api/video-conference/feedback
 * Post-meeting feedback from organizer (quality, issues, comment)
 */
router.post("/feedback", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || "unknown";
    const { roomId, qualityRating, issuesText, comment } = req.body || {};
    if (!roomId) return res.status(400).json({ error: "roomId is required" });
    const { data: room } = await supabase.from("video_conference_rooms").select("owner_id").eq("id", roomId).single();
    if (!room || room.owner_id !== userId) return res.status(403).json({ error: "Forbidden" });
    const { data: row, error } = await supabase
      .from("video_conference_post_meeting_feedback")
      .insert([
        {
          room_id: roomId,
          submitted_by: userId,
          quality_rating: qualityRating != null ? Number(qualityRating) : null,
          issues_text: issuesText || null,
          comment: comment || null,
        },
      ])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, feedback: row });
  } catch (e) {
    return res.status(500).json({ error: "Failed to submit feedback" });
  }
});

/**
 * POST /api/video-conference/recordings/:id/view
 * Record or update a recording view (heartbeat: progress_pct, last_position_sec, completed_at, device)
 */
router.post("/recordings/:id/view", async (req: Request, res: Response) => {
  try {
    const { id: recordingId } = req.params;
    const userId = req.user?.id as string | undefined;
    const { progressPct, lastPositionSec, completedAt, device } = req.body || {};
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket?.remoteAddress;
    const userAgent = (req.headers["user-agent"] as string) || null;

    const { data: rec } = await supabase.from("video_conference_recordings").select("id, room_id").eq("id", recordingId).single();
    if (!rec) return res.status(404).json({ error: "Recording not found" });

    const guestEmail = (req.body?.guestEmail as string) || null;
    const upsert: Record<string, unknown> = {
      recording_id: recordingId,
      progress_pct: progressPct != null ? Number(progressPct) : 0,
      last_position_sec: lastPositionSec != null ? Number(lastPositionSec) : 0,
      completed_at: completedAt ? new Date(completedAt) : null,
      device: device || null,
      ip_address: ip || null,
      user_agent: userAgent,
      updated_at: new Date(),
    };
    if (userId) upsert.user_id = userId;
    else if (guestEmail) upsert.guest_email = guestEmail;

    let existing: { id: string } | null = null;
    if (userId) {
      const r = await supabase
        .from("video_conference_recording_views")
        .select("id")
        .eq("recording_id", recordingId)
        .eq("user_id", userId)
        .maybeSingle();
      existing = r.data;
    } else if (guestEmail) {
      const r = await supabase
        .from("video_conference_recording_views")
        .select("id")
        .eq("recording_id", recordingId)
        .eq("guest_email", guestEmail)
        .is("user_id", null)
        .maybeSingle();
      existing = r.data;
    }

    if (existing) {
      await supabase
        .from("video_conference_recording_views")
        .update(upsert)
        .eq("id", existing.id);
    } else {
      await supabase.from("video_conference_recording_views").insert([{ ...upsert, created_at: new Date() }]);
    }

    await supabase.from("video_conference_audit").insert([
      {
        room_id: rec.room_id,
        event_type: "RECORDING_VIEWED",
        user_id: userId || null,
        guest_email: guestEmail,
        event_details: { recording_id: recordingId, progress_pct: upsert.progress_pct, last_position_sec: upsert.last_position_sec },
        ip_address: ip || null,
        user_agent: userAgent,
      },
    ]);

    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: "Failed to record view" });
  }
});

/**
 * GET /api/video-conference/recordings/:id/views
 * List who watched a recording (owner only)
 */
router.get("/recordings/:id/views", async (req: Request, res: Response) => {
  try {
    const { id: recordingId } = req.params;
    const userId = req.user?.id || "unknown";
    const { data: rec } = await supabase
      .from("video_conference_recordings")
      .select("id, room_id")
      .eq("id", recordingId)
      .single();
    if (!rec) return res.status(404).json({ error: "Recording not found" });
    const { data: room } = await supabase.from("video_conference_rooms").select("owner_id").eq("id", rec.room_id).single();
    if (!room || room.owner_id !== userId) return res.status(403).json({ error: "Forbidden" });
    const { data: views, error } = await supabase
      .from("video_conference_recording_views")
      .select("*")
      .eq("recording_id", recordingId)
      .order("updated_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, views: views || [] });
  } catch (e) {
    return res.status(500).json({ error: "Failed to list views" });
  }
});

/**
 * POST /api/video-conference/recordings/:id/assign-training
 * Assign a training recording to org/venue/role or all
 */
router.post("/recordings/:id/assign-training", async (req: Request, res: Response) => {
  try {
    const { id: recordingId } = req.params;
    const userId = req.user?.id || "unknown";
    const { targetType, targetId } = req.body || {};
    if (!targetType || !["all", "org", "venue", "role"].includes(targetType)) {
      return res.status(400).json({ error: "targetType must be one of: all, org, venue, role" });
    }
    const { data: rec } = await supabase
      .from("video_conference_recordings")
      .select("id, room_id")
      .eq("id", recordingId)
      .single();
    if (!rec) return res.status(404).json({ error: "Recording not found" });
    const { data: room } = await supabase.from("video_conference_rooms").select("owner_id").eq("id", rec.room_id).single();
    if (!room || room.owner_id !== userId) return res.status(403).json({ error: "Forbidden" });
    const { error } = await supabase.from("video_conference_training_assignments").insert([
      { recording_id: recordingId, assigned_by: userId, target_type: targetType, target_id: targetId || null },
    ]);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: "Failed to assign training" });
  }
});

/**
 * GET /api/video-conference/trainings/available
 * List trainings available to current user (by org/venue/role or all)
 */
router.get("/trainings/available", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id as string | undefined;
    const orgId = (req.query.orgId as string) || (req.headers["x-org-id"] as string);
    const venueId = req.query.venueId as string | undefined;
    const role = req.query.role as string | undefined;

    const { data: assignments } = await supabase
      .from("video_conference_training_assignments")
      .select("recording_id, target_type, target_id");
    const allAssignments = assignments || [];
    const recIds = new Set<string>();
    for (const a of allAssignments) {
      if (a.target_type === "all") recIds.add(a.recording_id);
      if (a.target_type === "org" && (a.target_id == null || a.target_id === orgId)) recIds.add(a.recording_id);
      if (a.target_type === "venue" && venueId && a.target_id === venueId) recIds.add(a.recording_id);
      if (a.target_type === "role" && role && a.target_id === role) recIds.add(a.recording_id);
    }
    if (recIds.size === 0) return res.json({ success: true, trainings: [] });
    const { data: recordings, error } = await supabase
      .from("video_conference_recordings")
      .select("*")
      .in("id", Array.from(recIds))
      .eq("status", "ready")
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    const list = (recordings || []).filter((r: any) => (r.metadata || {}).type === "training");
    return res.json({ success: true, trainings: list });
  } catch (e) {
    return res.status(500).json({ error: "Failed to list trainings" });
  }
});

/**
 * POST /api/video-conference/invite/send-email
 * Send an invite to an external recipient by email (cloud). Production: wire to SendGrid/SES.
 */
router.post("/invite/send-email", async (req: Request, res: Response) => {
  try {
    const { roomId, roomName, shareUrl, toEmail } = req.body || {};
    if (!toEmail || typeof toEmail !== "string" || !toEmail.includes("@")) {
      return res.status(400).json({ success: false, message: "Valid email required" });
    }
    // TODO: send email via SendGrid/SES with shareUrl and roomName
    console.info("[video-conference] Invite by email (stub):", { toEmail: toEmail.trim(), roomId, roomName });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: "Failed to send email invite" });
  }
});

/**
 * POST /api/video-conference/invite/send-sms
 * Send an invite to an external recipient by SMS (cloud). Production: wire to Twilio etc.
 */
router.post("/invite/send-sms", async (req: Request, res: Response) => {
  try {
    const { roomId, roomName, shareUrl, toPhone } = req.body || {};
    if (!toPhone || typeof toPhone !== "string" || !String(toPhone).trim()) {
      return res.status(400).json({ success: false, message: "Phone number required" });
    }
    // TODO: send SMS via Twilio with shareUrl and roomName
    console.info("[video-conference] Invite by SMS (stub):", { toPhone: String(toPhone).trim(), roomId, roomName });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: "Failed to send SMS invite" });
  }
});

/**
 * POST /api/video-conference/translate
 * Translate caption text to the user's preferred language (for per-user closed captions).
 * Request: { text: string, targetLanguage: string }. Response: { translatedText: string }.
 * Stub returns same text; production can wire to LibreTranslate, Google Translate, etc.
 */
router.post("/translate", async (req: Request, res: Response) => {
  try {
    const { text = "", targetLanguage = "en" } = req.body || {};
    const source = typeof text === "string" ? text : "";
    if (!source.trim() || targetLanguage === "en") {
      return res.json({ translatedText: source });
    }
    // TODO: call translation API (e.g. LibreTranslate, Google Cloud Translation)
    // For now return same text so captions still display
    return res.json({ translatedText: source });
  } catch (e) {
    return res.status(500).json({ error: "Translation failed" });
  }
});

/**
 * GET /api/video-conference/capacity
 * Current concurrent rooms and participants (for display); optional org limit from config
 */
router.get("/capacity", async (req: Request, res: Response) => {
  try {
    const orgId = (req.query.orgId as string) || (req.headers["x-org-id"] as string) || "default";
    const { data: activeRooms } = await supabase
      .from("video_conference_participants")
      .select("room_id")
      .is("leave_time", null);
    const roomIds = new Set((activeRooms || []).map((r: any) => r.room_id));
    const currentRooms = roomIds.size;
    const currentParticipants = (activeRooms || []).length;
    const { data: config } = await supabase
      .from("video_conference_capacity_config")
      .select("max_concurrent_rooms, max_concurrent_participants")
      .eq("org_id", orgId)
      .single();
    const maxRooms = config?.max_concurrent_rooms ?? parseInt(process.env.VIDEO_CONFERENCE_MAX_CONCURRENT_ROOMS || "0", 10) || null;
    const maxParticipants = config?.max_concurrent_participants ?? parseInt(process.env.VIDEO_CONFERENCE_MAX_CONCURRENT_PARTICIPANTS || "0", 10) || null;
    return res.json({
      success: true,
      currentConcurrentRooms: currentRooms,
      currentConcurrentParticipants: currentParticipants,
      maxConcurrentRooms: maxRooms,
      maxConcurrentParticipants: maxParticipants,
    });
  } catch (e) {
    return res.status(500).json({ error: "Failed to get capacity" });
  }
});

export default router;
