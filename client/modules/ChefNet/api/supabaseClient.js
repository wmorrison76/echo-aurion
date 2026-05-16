/**
 * ChefNet Supabase Client
 * Handles all database operations for the ChefNet system
 */

import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("[ChefNet] Supabase credentials not found. Using fallback mode.");
}

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/**
 * Badge point configuration based on triggers
 * Maps trigger events to point awards
 */
export const BADGE_TRIGGERS = {
  "recognition.sent": {
    category: "gratitude",
    points: 3,
    event: "peer_shoutout",
  },
  "recognition.received": {
    category: "gratitude",
    points: 2,
    event: "recognition_received",
  },
  "post.created": {
    category: "culture_builder",
    points: 2,
    event: "post_created",
  },
  "vent.shared": {
    category: "wellbeing_ally",
    points: 1,
    event: "vulnerability_shared",
  },
};

/**
 * Calculate the current badge level based on points
 * Levels: none (0), spark (3), glow (15), beacon (60)
 */
export function calculateBadgeLevel(points) {
  if (points >= 60) return "beacon";
  if (points >= 15) return "glow";
  if (points >= 3) return "spark";
  return "none";
}

/**
 * Update user badge points after an action
 * Creates or updates badge record and tracks history
 */
export async function awardBadgePoints(userId, category, points, triggerEvent, referenceId = null) {
  if (!supabase) {
    console.warn("[ChefNet] Supabase not configured. Skipping badge award.");
    return null;
  }

  try {
    // Get current badge record
    const { data: badgeData, error: badgeError } = await supabase
      .from("chefnet_user_badges")
      .select("id, points, current_level")
      .eq("user_id", userId)
      .eq("category", category)
      .single();

    let newPoints = points;
    let newLevel = "spark";

    if (badgeData) {
      newPoints = badgeData.points + points;
      newLevel = calculateBadgeLevel(newPoints);

      // Update existing badge
      const { error: updateError } = await supabase
        .from("chefnet_user_badges")
        .update({
          points: newPoints,
          current_level: newLevel,
          updated_at: new Date().toISOString(),
        })
        .eq("id", badgeData.id);

      if (updateError) throw updateError;
    } else {
      newLevel = calculateBadgeLevel(newPoints);

      // Create new badge record
      const { error: insertError } = await supabase
        .from("chefnet_user_badges")
        .insert({
          user_id: userId,
          category,
          points: newPoints,
          current_level: newLevel,
          earned_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;
    }

    // Track points history
    const { error: historyError } = await supabase
      .from("chefnet_user_points_history")
      .insert({
        user_id: userId,
        category,
        points_awarded: points,
        trigger_event: triggerEvent,
        reference_id: referenceId,
        created_at: new Date().toISOString(),
      });

    if (historyError) {
      console.error("[ChefNet] Failed to track points history:", historyError);
    }

    return { newPoints, newLevel };
  } catch (error) {
    console.error("[ChefNet] Error awarding badge points:", error);
    throw error;
  }
}

/**
 * Fetch user badges
 */
export async function getUserBadges(userId) {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("chefnet_user_badges")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("[ChefNet] Error fetching user badges:", error);
    return [];
  }
}

/**
 * Fetch all recognitions
 */
export async function getAllRecognitions(limit = 50) {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("chefnet_recognitions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("[ChefNet] Error fetching recognitions:", error);
    return [];
  }
}

/**
 * Create a new recognition and award points
 */
export async function createRecognitionWithPoints(userId, userEmail, userName, recognition) {
  if (!supabase) {
    console.warn("[ChefNet] Supabase not configured. Skipping recognition creation.");
    return null;
  }

  try {
    // Create the recognition record
    const { data: recData, error: recError } = await supabase
      .from("chefnet_recognitions")
      .insert({
        sender_id: userId,
        sender_email: userEmail,
        sender_name: userName,
        recipient_name: recognition.recipientName,
        recipient_email: recognition.recipientEmail,
        category: recognition.category,
        message: recognition.message,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (recError) throw recError;

    // Award badge points to sender
    const trigger = BADGE_TRIGGERS["recognition.sent"];
    if (trigger) {
      await awardBadgePoints(
        userId,
        trigger.category,
        trigger.points,
        trigger.event,
        recData.id
      );
    }

    return recData;
  } catch (error) {
    console.error("[ChefNet] Error creating recognition:", error);
    throw error;
  }
}

/**
 * Create a new post and award points
 */
export async function createPostWithPoints(userId, userEmail, userName, post) {
  if (!supabase) {
    console.warn("[ChefNet] Supabase not configured. Skipping post creation.");
    return null;
  }

  try {
    // Create the post record
    const { data: postData, error: postError } = await supabase
      .from("chefnet_posts")
      .insert({
        user_id: userId,
        user_email: userEmail,
        user_name: userName,
        title: post.title,
        content: post.content,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (postError) throw postError;

    // Award badge points to poster
    const trigger = BADGE_TRIGGERS["post.created"];
    if (trigger) {
      await awardBadgePoints(
        userId,
        trigger.category,
        trigger.points,
        trigger.event,
        postData.id
      );
    }

    return postData;
  } catch (error) {
    console.error("[ChefNet] Error creating post:", error);
    throw error;
  }
}

/**
 * Create a new venting message and award points
 */
export async function createVentingMessageWithPoints(anonymousId, message) {
  if (!supabase) {
    console.warn("[ChefNet] Supabase not configured. Skipping vent creation.");
    return null;
  }

  try {
    const { data: ventData, error: ventError } = await supabase
      .from("chefnet_venting_messages")
      .insert({
        anonymous_id: anonymousId,
        text: message,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (ventError) throw ventError;
    return ventData;
  } catch (error) {
    console.error("[ChefNet] Error creating venting message:", error);
    throw error;
  }
}

/**
 * Fetch all posts
 */
export async function getAllPosts(limit = 50) {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("chefnet_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("[ChefNet] Error fetching posts:", error);
    return [];
  }
}

/**
 * Fetch all venting messages
 */
export async function getAllVentingMessages(limit = 50) {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("chefnet_venting_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("[ChefNet] Error fetching venting messages:", error);
    return [];
  }
}

/**
 * Fetch culture metrics for dashboard
 */
export async function getCultureMetrics(organizationId, days = 30) {
  if (!supabase) return null;

  try {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const { data: metrics, error: metricsError } = await supabase
      .from("chefnet_culture_metrics")
      .select("*")
      .eq("organization_id", organizationId)
      .gte("metric_date", dateThreshold.toISOString().split("T")[0])
      .order("metric_date", { ascending: false });

    if (metricsError) throw metricsError;

    // Also fetch raw data to supplement
    const { data: recognitions, error: recError } = await supabase
      .from("chefnet_recognitions")
      .select("*")
      .gte("created_at", dateThreshold.toISOString())
      .order("created_at", { ascending: false });

    if (recError) throw recError;

    const { data: posts, error: postsError } = await supabase
      .from("chefnet_posts")
      .select("*")
      .gte("created_at", dateThreshold.toISOString())
      .order("created_at", { ascending: false });

    if (postsError) throw postsError;

    return {
      metrics: metrics || [],
      recognitions: recognitions || [],
      posts: posts || [],
      totalRecognitions: recognitions?.length || 0,
      totalPosts: posts?.length || 0,
      activeMembers: new Set([
        ...(recognitions?.map((r) => r.sender_id) || []),
        ...(posts?.map((p) => p.user_id) || []),
      ]).size,
    };
  } catch (error) {
    console.error("[ChefNet] Error fetching culture metrics:", error);
    return null;
  }
}
