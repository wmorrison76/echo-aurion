/**
 * ChefNet apiClient
 * All external IO passes through these functions.
 * Falls back to memory storage if Supabase is not configured.
 */

import {
  supabase,
  createRecognitionWithPoints,
  createPostWithPoints,
  createVentingMessageWithPoints,
  getAllRecognitions,
  getAllPosts,
  getAllVentingMessages,
  getUserBadges,
  getCultureMetrics,
} from "./supabaseClient";

// Memory fallback database
let memoryDb = {
  posts: [],
  vents: [],
  recognitions: [],
  jobs: [],
};

function delay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Load initial snapshot of ChefNet data
 * Uses Supabase if available, falls back to memory
 */
export async function loadSnapshot() {
  if (supabase) {
    try {
      const [recognitions, posts, vents] = await Promise.all([
        getAllRecognitions(50),
        getAllPosts(50),
        getAllVentingMessages(50),
      ]);

      return {
        posts: posts.map((p) => ({
          id: p.id,
          createdAt: p.created_at,
          author: p.user_name,
          title: p.title,
          content: p.content,
        })),
        ventingMessages: vents.map((v) => ({
          id: v.id,
          createdAt: v.created_at,
          text: v.text,
        })),
        recognitions: recognitions.map((r) => ({
          id: r.id,
          createdAt: r.created_at,
          from: r.sender_name,
          recipientName: r.recipient_name,
          category: r.category,
          message: r.message,
        })),
        jobs: [],
        wellbeingSignals: [],
        mentors: [],
        resources: [],
      };
    } catch (error) {
      console.error("[ChefNet] Error loading snapshot from Supabase:", error);
      // Fall back to memory
    }
  }

  // Memory fallback
  await delay(200);
  return {
    posts: memoryDb.posts,
    ventingMessages: memoryDb.vents,
    recognitions: memoryDb.recognitions,
    jobs: memoryDb.jobs,
    wellbeingSignals: [],
    mentors: [],
    resources: [],
  };
}

/**
 * Create a public post in ChefNet feed
 */
export async function createPost(payload) {
  if (supabase) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      const result = await createPostWithPoints(
        user.id,
        user.email,
        payload.author || "Anonymous",
        {
          title: payload.title,
          content: payload.content,
        }
      );

      return {
        id: result.id,
        createdAt: new Date().toISOString(),
        ...payload,
      };
    } catch (error) {
      console.error("[ChefNet] Error creating post:", error);
      // Fall back to memory
    }
  }

  // Memory fallback
  await delay();
  const post = {
    id: "post-" + Date.now().toString(36),
    createdAt: new Date().toISOString(),
    ...payload,
  };
  memoryDb.posts.unshift(post);
  return post;
}

/**
 * Create an anonymous venting message
 */
export async function createVent(payload) {
  if (supabase) {
    try {
      const anonymousId = payload.anonymousId || "vent-" + Date.now().toString(36);

      const result = await createVentingMessageWithPoints(anonymousId, payload.text);

      return {
        id: result.id,
        createdAt: new Date().toISOString(),
        ...payload,
      };
    } catch (error) {
      console.error("[ChefNet] Error creating vent:", error);
      // Fall back to memory
    }
  }

  // Memory fallback
  await delay();
  const vent = {
    id: "vent-" + Date.now().toString(36),
    createdAt: new Date().toISOString(),
    ...payload,
  };
  memoryDb.vents.unshift(vent);
  return vent;
}

/**
 * Create a recognition and award badge points
 */
export async function createRecognition(payload) {
  if (supabase) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      const result = await createRecognitionWithPoints(
        user.id,
        user.email,
        payload.from || "Grateful Colleague",
        {
          recipientName: payload.recipientName,
          recipientEmail: payload.recipientEmail,
          category: payload.category,
          message: payload.message,
        }
      );

      return {
        id: result.id,
        createdAt: new Date().toISOString(),
        ...payload,
      };
    } catch (error) {
      console.error("[ChefNet] Error creating recognition:", error);
      // Fall back to memory
    }
  }

  // Memory fallback
  await delay();
  const rec = {
    id: "rec-" + Date.now().toString(36),
    createdAt: new Date().toISOString(),
    ...payload,
  };
  memoryDb.recognitions.unshift(rec);
  return rec;
}

/**
 * Create a job board post
 */
export async function createJobPost(payload) {
  if (supabase) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("chefnet_jobs")
        .insert({
          posted_by_id: user?.id,
          posted_by_name: payload.postedBy || "Anonymous",
          posted_by_email: user?.email,
          title: payload.title,
          description: payload.description,
          status: "open",
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) throw error;

      return {
        id: data.id,
        createdAt: new Date().toISOString(),
        ...payload,
      };
    } catch (error) {
      console.error("[ChefNet] Error creating job post:", error);
      // Fall back to memory
    }
  }

  // Memory fallback
  await delay();
  const job = {
    id: "job-" + Date.now().toString(36),
    createdAt: new Date().toISOString(),
    ...payload,
  };
  memoryDb.jobs.unshift(job);
  return job;
}

/**
 * Get user badges and points
 */
export async function getUserProfile(userId) {
  if (supabase) {
    try {
      const badges = await getUserBadges(userId);

      // Map badges to profile format
      const scores = {};
      badges.forEach((badge) => {
        scores[badge.category] = badge.points;
      });

      return {
        userId,
        badges,
        scores,
      };
    } catch (error) {
      console.error("[ChefNet] Error fetching user profile:", error);
      return { userId, badges: [], scores: {} };
    }
  }

  return { userId, badges: [], scores: {} };
}

/**
 * Get culture dashboard metrics
 */
export async function getCultureDashboard(organizationId) {
  if (supabase) {
    try {
      const metrics = await getCultureMetrics(organizationId, 30);

      if (!metrics) {
        return {
          totalPosts: 0,
          totalRecognitions: 0,
          activeMembers: 0,
          cultureScore: 0,
          topCategory: "Gratitude",
          recentMilestone: "Keep building positive culture!",
        };
      }

      return {
        totalPosts: metrics.totalPosts,
        totalRecognitions: metrics.totalRecognitions,
        activeMembers: metrics.activeMembers,
        cultureScore: Math.min(100, Math.floor((metrics.totalRecognitions / 10) * 10)),
        topCategory: "Gratitude",
        recentMilestone: `Team reached ${metrics.totalRecognitions} recognitions this month! 🎉`,
      };
    } catch (error) {
      console.error("[ChefNet] Error fetching culture dashboard:", error);
      return {
        totalPosts: 0,
        totalRecognitions: 0,
        activeMembers: 0,
        cultureScore: 0,
        topCategory: "Gratitude",
        recentMilestone: "Keep building positive culture!",
      };
    }
  }

  return {
    totalPosts: 0,
    totalRecognitions: 0,
    activeMembers: 0,
    cultureScore: 0,
    topCategory: "Gratitude",
    recentMilestone: "Keep building positive culture!",
  };
}
