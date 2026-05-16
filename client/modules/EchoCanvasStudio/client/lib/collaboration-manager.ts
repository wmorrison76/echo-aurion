/**
 * Collaboration Manager
 * Manages design sessions, permissions, and collaborative workflows
 * 
 * Features:
 * - Session creation and lifecycle management
 * - Permission model (readonly, exclusive, shared)
 * - Viewer management
 * - Audit logging
 * - Control transfer
 */

import { supabase } from "./supabase";
import type { DesignSession, CollaborationEvent } from "../../shared/types";
import { getBakeryId, getUserId, getUserDisplayName } from "./luccca-integration";

export interface SessionCreateRequest {
  designId: string;
  mode: "readonly" | "exclusive" | "shared";
  viewers?: string[];
}

export interface SessionJoinRequest {
  sessionId: string;
  userId: string;
  userName: string;
}

export class CollaborationManager {
  /**
   * Create a new design session
   */
  async createSession(request: SessionCreateRequest): Promise<DesignSession> {
    try {
      const bakeryId = getBakeryId();
      const primaryChefId = getUserId();

      if (!primaryChefId || !bakeryId) {
        throw new Error("User context not available for session creation");
      }

      const { data, error } = await supabase
        .from("design_sessions")
        .insert({
          design_id: request.designId,
          bakery_id: bakeryId,
          primary_chef_id: primaryChefId,
          mode: request.mode,
          permission_transfer_required: request.mode === "exclusive",
          viewers: request.viewers || [],
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("[Collaboration] Failed to create session", error);
        throw error;
      }

      // Log session creation event
      await this.logEvent(request.designId, data.id, "session_created", {
        mode: request.mode,
        primaryChef: primaryChefId,
      });

      console.log("[Collaboration] Session created", data.id);
      return data as DesignSession;
    } catch (error) {
      console.error("[Collaboration] Session creation failed", error);
      throw error;
    }
  }

  /**
   * Join an existing session as viewer
   */
  async joinSession(request: SessionJoinRequest): Promise<DesignSession> {
    try {
      // Get current session
      const { data: session, error: fetchError } = await supabase
        .from("design_sessions")
        .select("*")
        .eq("id", request.sessionId)
        .single();

      if (fetchError) {
        console.error("[Collaboration] Failed to fetch session", fetchError);
        throw fetchError;
      }

      // Add viewer to session
      const viewers = (session.viewers || []) as Array<{
        user_id: string;
        viewer_name: string;
        joined_at: string;
      }>;

      // Check if already joined
      const alreadyJoined = viewers.some((v) => v.user_id === request.userId);
      if (alreadyJoined) {
        console.log("[Collaboration] User already in session");
        return session as DesignSession;
      }

      const newViewers = [
        ...viewers,
        {
          user_id: request.userId,
          viewer_name: request.userName,
          joined_at: new Date().toISOString(),
        },
      ];

      const { data, error: updateError } = await supabase
        .from("design_sessions")
        .update({ viewers: newViewers })
        .eq("id", request.sessionId)
        .select()
        .single();

      if (updateError) {
        console.error("[Collaboration] Failed to update session", updateError);
        throw updateError;
      }

      // Log join event
      await this.logEvent(session.design_id, request.sessionId, "viewer_joined", {
        viewerId: request.userId,
        viewerName: request.userName,
        viewerCount: newViewers.length,
      });

      console.log(
        "[Collaboration] User joined session",
        request.sessionId,
        request.userId
      );

      return data as DesignSession;
    } catch (error) {
      console.error("[Collaboration] Failed to join session", error);
      throw error;
    }
  }

  /**
   * Leave a session
   */
  async leaveSession(
    sessionId: string,
    userId: string
  ): Promise<DesignSession> {
    try {
      // Get current session
      const { data: session, error: fetchError } = await supabase
        .from("design_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Remove viewer from session
      const viewers = (session.viewers || []) as Array<{
        user_id: string;
        viewer_name: string;
        joined_at: string;
      }>;

      const newViewers = viewers.filter((v) => v.user_id !== userId);

      const { data, error: updateError } = await supabase
        .from("design_sessions")
        .update({ viewers: newViewers })
        .eq("id", sessionId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Log leave event
      await this.logEvent(session.design_id, sessionId, "viewer_left", {
        viewerId: userId,
        remainingViewers: newViewers.length,
      });

      console.log(
        "[Collaboration] User left session",
        sessionId,
        userId
      );

      return data as DesignSession;
    } catch (error) {
      console.error("[Collaboration] Failed to leave session", error);
      throw error;
    }
  }

  /**
   * End a design session
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      const { data: session, error: fetchError } = await supabase
        .from("design_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      const { error } = await supabase
        .from("design_sessions")
        .update({
          ended_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (error) {
        throw error;
      }

      // Log session end event
      await this.logEvent(session.design_id, sessionId, "session_ended", {
        duration: Date.now() - new Date(session.started_at).getTime(),
      });

      console.log("[Collaboration] Session ended", sessionId);
    } catch (error) {
      console.error("[Collaboration] Failed to end session", error);
      throw error;
    }
  }

  /**
   * Transfer control to another chef
   */
  async transferControl(
    sessionId: string,
    newPrimaryChefId: string
  ): Promise<DesignSession> {
    try {
      const currentUserId = getUserId();

      // Get current session
      const { data: session, error: fetchError } = await supabase
        .from("design_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Only current primary chef can transfer control
      if (session.primary_chef_id !== currentUserId) {
        throw new Error(
          "Only primary chef can transfer control"
        );
      }

      const { data, error } = await supabase
        .from("design_sessions")
        .update({
          primary_chef_id: newPrimaryChefId,
        })
        .eq("id", sessionId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Log control transfer event
      await this.logEvent(session.design_id, sessionId, "control_transferred", {
        fromChef: currentUserId,
        toChef: newPrimaryChefId,
      });

      console.log(
        "[Collaboration] Control transferred",
        newPrimaryChefId
      );

      return data as DesignSession;
    } catch (error) {
      console.error("[Collaboration] Failed to transfer control", error);
      throw error;
    }
  }

  /**
   * Get active session for a design
   */
  async getActiveSession(designId: string): Promise<DesignSession | null> {
    try {
      const { data, error } = await supabase
        .from("design_sessions")
        .select("*")
        .eq("design_id", designId)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code === "PGRST116") {
        // No rows returned
        return null;
      }

      if (error) {
        throw error;
      }

      return data as DesignSession;
    } catch (error) {
      console.error("[Collaboration] Failed to get active session", error);
      return null;
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<DesignSession | null> {
    try {
      const { data, error } = await supabase
        .from("design_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (error && error.code === "PGRST116") {
        return null;
      }

      if (error) {
        throw error;
      }

      return data as DesignSession;
    } catch (error) {
      console.error("[Collaboration] Failed to get session", error);
      return null;
    }
  }

  /**
   * Log collaboration event
   */
  async logEvent(
    designId: string,
    sessionId: string,
    eventType: string,
    data?: any
  ): Promise<CollaborationEvent | null> {
    try {
      const userId = getUserId();
      if (!userId) {
        console.warn("[Collaboration] User ID not available for logging");
        return null;
      }

      const { data: event, error } = await supabase
        .from("collaboration_events")
        .insert({
          design_id: designId,
          session_id: sessionId,
          event_type: eventType,
          user_id: userId,
          data: data || {},
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("[Collaboration] Failed to log event", error);
        return null;
      }

      return event as CollaborationEvent;
    } catch (error) {
      console.error("[Collaboration] Event logging failed", error);
      return null;
    }
  }

  /**
   * Get session event history
   */
  async getSessionEventHistory(
    sessionId: string,
    limit: number = 100
  ): Promise<CollaborationEvent[]> {
    try {
      const { data, error } = await supabase
        .from("collaboration_events")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return (data || []) as CollaborationEvent[];
    } catch (error) {
      console.error("[Collaboration] Failed to get event history", error);
      return [];
    }
  }

  /**
   * Get design event timeline
   */
  async getDesignTimeline(
    designId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<CollaborationEvent[]> {
    try {
      const { data, error } = await supabase
        .from("collaboration_events")
        .select("*")
        .eq("design_id", designId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return (data || []) as CollaborationEvent[];
    } catch (error) {
      console.error("[Collaboration] Failed to get design timeline", error);
      return [];
    }
  }

  /**
   * Check if user can modify design
   */
  async canModifyDesign(
    designId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const session = await this.getActiveSession(designId);

      if (!session) {
        // No active session - owner can modify
        return true;
      }

      // Check if user is primary chef
      if (session.primary_chef_id === userId) {
        return true;
      }

      // Check if mode allows shared editing
      if (session.mode === "shared") {
        return true;
      }

      return false;
    } catch (error) {
      console.error("[Collaboration] Failed to check modify permission", error);
      return false;
    }
  }

  /**
   * Check if user is viewing design
   */
  isUserViewing(session: DesignSession, userId: string): boolean {
    return session.viewers.some((v) => v.user_id === userId);
  }

  /**
   * Get viewer count
   */
  getViewerCount(session: DesignSession): number {
    return session.viewers.length;
  }
}

// Export singleton instance
export const collaborationManager = new CollaborationManager();

export default collaborationManager;
