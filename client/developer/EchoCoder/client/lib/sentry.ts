import * as Sentry from "@sentry/react";

export function initializeSentry() {
  const sentryDSN = import.meta.env.VITE_SENTRY_DSN;

  if (!sentryDSN) {
    console.warn(
      "Sentry DSN not configured. Set VITE_SENTRY_DSN environment variable.",
    );
    return;
  }

  Sentry.init({
    dsn: sentryDSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.MODE === "production" ? 0.1 : 1.0,
    integrations: [
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    replaysSessionSampleRate: import.meta.env.MODE === "production" ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
  });
}

export function captureSentryError(
  error: Error,
  context?: Record<string, any>,
) {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    return;
  }

  Sentry.captureException(error, {
    contexts: {
      custom: context || {},
    },
  });
}

export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
) {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    return;
  }

  Sentry.captureMessage(message, level);
}

export async function getRecentErrors(projectId?: string): Promise<any[]> {
  try {
    const response = await fetch("/api/sentry/errors", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch errors");
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to get recent errors:", error);
    return [];
  }
}

export async function getSentryInsights(projectId?: string): Promise<string[]> {
  try {
    const response = await fetch("/api/sentry/insights", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch insights");
    }

    const data = await response.json();
    return data.insights || [];
  } catch (error) {
    console.error("Failed to get insights:", error);
    return [];
  }
}

export function setUserContext(user: {
  id: string;
  email?: string;
  username?: string;
}) {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

export function clearUserContext() {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    return;
  }

  Sentry.setUser(null);
}
