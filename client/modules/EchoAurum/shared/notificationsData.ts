import type { ConsoleNotification } from "./notifications";
export const consoleNotifications: ConsoleNotification[] = [
  {
    id: "notif-ap-guardrail",
    title: "Zelda guardrail paused an ACH batch",
    description:
      "Dual approval mismatch detected on LUCCCA Holdings treasury release.",
    severity: "critical",
    createdAt: "2024-11-05T14:22:00Z",
    href: "/console#invoice-payment",
    ctaLabel: "Review batch",
  },
  {
    id: "notif-forecast-scenario",
    title: "Scenario variance exceeds tolerance",
    description:
      "Ai³ projects 6.4% ADR dip in Gulf properties due to severe weather alerts.",
    severity: "warning",
    createdAt: "2024-11-05T13:40:00Z",
    href: "/console#forecast-studio",
    ctaLabel: "Open forecast",
  },
  {
    id: "notif-cpa-binder",
    title: "CPA binder export ready",
    description:
      "Argus notarized evidence packets for LUCCCA Downtown Q3 review.",
    severity: "success",
    createdAt: "2024-11-05T12:15:00Z",
    href: "/console#cpa-portal",
    ctaLabel: "Download binder",
  },
  {
    id: "notif-purchasing-variance",
    title: "Receiving variance resolved",
    description:
      "Sysco Coastal shortage reconciled—invoice ready for Zelda payment release.",
    severity: "info",
    createdAt: "2024-11-05T11:55:00Z",
    href: "/purchasing",
    ctaLabel: "View purchasing",
  },
];
