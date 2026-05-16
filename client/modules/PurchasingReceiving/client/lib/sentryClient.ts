import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing"; export function initializeSentryClient() { if (!process.env.REACT_APP_SENTRY_DSN) { console.warn("REACT_APP_SENTRY_DSN not configured. Error tracking disabled.", ); return; } Sentry.init({ dsn: process.env.REACT_APP_SENTRY_DSN, environment: process.env.NODE_ENV ||"development", integrations: [ new BrowserTracing({ // Set sampling rate for performance monitoring routingInstrumentation: Sentry.reactRouterV6Instrumentation( window.history, ), }), new Sentry.Replay({ // Capture 10% of all sessions + 100% of sessions with errors maskAllText: true, blockAllMedia: true, }), ], tracesSampleRate: process.env.NODE_ENV ==="production" ? 0.1 : 1.0, replaysSessionSampleRate: 0.1, replaysOnErrorSampleRate: 1.0, maxBreadcrumbs: 50, beforeSend(event, hint) { // Filter out noise if (event.exception) { const error = hint.originalException; // Ignore network errors if (error instanceof Error) { if (error.message.includes("Network")) return null; if (error.message.includes("timeout")) return null; } } return event; }, }); console.log("✓ Sentry client initialized");
} export function captureException( error: unknown, context?: Record<string, any>,
) { Sentry.captureException(error, { contexts: { custom: context, }, });
} export function captureMessage( message: string, level: Sentry.SeverityLevel ="info", context?: Record<string, any>,
) { Sentry.captureMessage(message, { level, contexts: { custom: context, }, });
} export function setUserContext(userId: string, userData?: Record<string, any>) { Sentry.setUser({ id: userId, ...userData, });
} export function clearUserContext() { Sentry.setUser(null);
} export function addBreadcrumb( message: string, category: string ="default", level: Sentry.SeverityLevel ="info", data?: Record<string, any>,
) { Sentry.addBreadcrumb({ message, category, level, data, });
} // Export Sentry for wrapping components
export { Sentry };
