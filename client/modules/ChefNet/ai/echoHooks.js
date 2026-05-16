/**
 * Echo Integration for ChefNet
 * Sends culture and engagement events to Echo for analytics
 */

/**
 * Send culture event to Echo
 * Tracks posts, discussions, and team interactions
 */
export function sendCultureEventToEcho(event) {
  try {
    // Track with window.echo if available
    if (window.echo && typeof window.echo.track === "function") {
      window.echo.track("culture_event", {
        timestamp: new Date().toISOString(),
        ...event,
      });
    }

    // Also log for debugging
    console.debug("[ChefNet Echo] culture_event", event);
  } catch (error) {
    console.error("[ChefNet Echo] Error sending culture event:", error);
  }
}

/**
 * Send anonymous venting signal to Echo
 * Tracks emotional health and team wellbeing
 */
export function sendAnonymousVentingSignal(payload) {
  try {
    if (window.echo && typeof window.echo.track === "function") {
      window.echo.track("anonymous_vent", {
        timestamp: new Date().toISOString(),
        ...payload,
      });
    }

    console.debug("[ChefNet Echo] anonymous_vent", payload);
  } catch (error) {
    console.error("[ChefNet Echo] Error sending venting signal:", error);
  }
}

/**
 * Send recognition event to Echo
 * Tracks peer recognition, gratitude, and culture building
 * This triggers badge point awards
 */
export function sendRecognitionEvent(event) {
  try {
    if (window.echo && typeof window.echo.track === "function") {
      window.echo.track("recognition", {
        timestamp: new Date().toISOString(),
        ...event,
      });
    }

    console.debug("[ChefNet Echo] recognition", event);
  } catch (error) {
    console.error("[ChefNet Echo] Error sending recognition event:", error);
  }
}

/**
 * Send burnout risk signal to Echo
 * Tracks overwork patterns and team stress levels
 */
export function sendBurnoutRiskSignal(signal) {
  try {
    if (window.echo && typeof window.echo.track === "function") {
      window.echo.track("burnout_risk", {
        timestamp: new Date().toISOString(),
        ...signal,
      });
    }

    console.debug("[ChefNet Echo] burnout_risk", signal);
  } catch (error) {
    console.error("[ChefNet Echo] Error sending burnout risk signal:", error);
  }
}

/**
 * Send badge achievement to Echo
 * Tracks user progression and gamification milestones
 */
export function sendBadgeAchievementEvent(event) {
  try {
    if (window.echo && typeof window.echo.track === "function") {
      window.echo.track("badge_achievement", {
        timestamp: new Date().toISOString(),
        ...event,
      });
    }

    console.debug("[ChefNet Echo] badge_achievement", event);
  } catch (error) {
    console.error("[ChefNet Echo] Error sending badge achievement event:", error);
  }
}

/**
 * Send wellbeing check-in to Echo
 * Tracks team health and morale
 */
export function sendWellbeingCheckIn(event) {
  try {
    if (window.echo && typeof window.echo.track === "function") {
      window.echo.track("wellbeing_checkin", {
        timestamp: new Date().toISOString(),
        ...event,
      });
    }

    console.debug("[ChefNet Echo] wellbeing_checkin", event);
  } catch (error) {
    console.error("[ChefNet Echo] Error sending wellbeing check-in:", error);
  }
}

/**
 * Send job board activity to Echo
 * Tracks career development and team opportunities
 */
export function sendJobBoardEvent(event) {
  try {
    if (window.echo && typeof window.echo.track === "function") {
      window.echo.track("job_board_activity", {
        timestamp: new Date().toISOString(),
        ...event,
      });
    }

    console.debug("[ChefNet Echo] job_board_activity", event);
  } catch (error) {
    console.error("[ChefNet Echo] Error sending job board event:", error);
  }
}

/**
 * Send mentorship event to Echo
 * Tracks professional development and knowledge sharing
 */
export function sendMentorshipEvent(event) {
  try {
    if (window.echo && typeof window.echo.track === "function") {
      window.echo.track("mentorship_activity", {
        timestamp: new Date().toISOString(),
        ...event,
      });
    }

    console.debug("[ChefNet Echo] mentorship_activity", event);
  } catch (error) {
    console.error("[ChefNet Echo] Error sending mentorship event:", error);
  }
}

/**
 * Send culture metric snapshot to Echo
 * Used for dashboards and trend analysis
 */
export function sendCultureMetricSnapshot(snapshot) {
  try {
    if (window.echo && typeof window.echo.track === "function") {
      window.echo.track("culture_metrics", {
        timestamp: new Date().toISOString(),
        ...snapshot,
      });
    }

    console.debug("[ChefNet Echo] culture_metrics", snapshot);
  } catch (error) {
    console.error("[ChefNet Echo] Error sending culture metrics:", error);
  }
}
