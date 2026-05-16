import { useEventStore } from "@/store/event-store";
import { useAnalyticsStore } from "@/store/analytics-store";
import type { ReportFormat } from "@/store/report-store";

export interface ExportData {
  events: any[];
  analytics: any;
  integrations: any[];
  metadata: {
    exportedAt: string;
    dateRange: string;
    format: string;
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export class ExportService {
  static async getExportData(report: ReportFormat): Promise<ExportData> {
    const { events } = useEventStore.getState();
    const { snapshots } = useAnalyticsStore.getState();

    const filteredEvents = this.filterEventsByDateRange(events, report);

    return {
      events: filteredEvents,
      analytics: report.includeAnalytics ? snapshots : {},
      integrations: [],
      metadata: {
        exportedAt: new Date().toISOString(),
        dateRange: report.dateRange,
        format: report.format,
      },
    };
  }

  static filterEventsByDateRange(events: any[], report: ReportFormat): any[] {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (report.dateRange) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "custom":
        if (report.startDate && report.endDate) {
          startDate = new Date(report.startDate);
          endDate = new Date(report.endDate);
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return events.filter((event) => {
      const eventDate = new Date(event.start_time);
      return eventDate >= startDate && eventDate <= endDate;
    });
  }

  static generateCSV(data: ExportData): string {
    const headers = [
      "Event ID",
      "Title",
      "Start Time",
      "End Time",
      "Location",
      "Guests",
      "Status",
      "Synced",
    ];

    const escapeCell = (cell: unknown) => {
      const value = cell === null || cell === undefined ? "" : String(cell);
      return `"${value.replace(/"/g, '""')}"`;
    };

    const rows = data.events.map((event) => [
      event.id,
      event.title,
      event.start_time,
      event.end_time,
      event.location || "",
      event.guest_count || 0,
      event.status,
      event.is_synced ? "Yes" : "No",
    ]);

    return [headers, ...rows]
      .map((row) => row.map(escapeCell).join(","))
      .join("\n");
  }

  static generateJSON(data: ExportData): string {
    return JSON.stringify(data, null, 2);
  }

  static generateHTML(data: ExportData, report: ReportFormat): string {
    const totalEvents = data.events.length;
    const totalGuests = data.events.reduce(
      (sum, e) => sum + (typeof e.guest_count === "number" ? e.guest_count : 0),
      0,
    );
    const conflictCount = data.events.filter((e) => e.conflict_detected).length;

    const rows = data.events
      .map((event) => {
        const title = escapeHtml(event.title || "(untitled)");
        const location = escapeHtml(event.location || "");
        const status = escapeHtml(event.status || "");
        const start = escapeHtml(formatDateTime(event.start_time));
        const end = escapeHtml(formatDateTime(event.end_time));
        const guests = escapeHtml(String(event.guest_count || 0));
        const synced = event.is_synced ? "Yes" : "No";

        return `
          <tr>
            <td>${escapeHtml(String(event.id))}</td>
            <td>${title}</td>
            <td>${start}</td>
            <td>${end}</td>
            <td>${location}</td>
            <td style="text-align:right">${guests}</td>
            <td>${status}</td>
            <td>${synced}</td>
          </tr>
        `;
      })
      .join("\n");

    const generatedAt = new Date(data.metadata.exportedAt).toLocaleString();

    return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color:#111827; }
      h1 { margin:0 0 8px 0; font-size: 22px; color:#1e3a8a; }
      .meta { font-size: 12px; color:#6b7280; margin-bottom: 16px; }
      .summary { display:flex; gap:12px; margin: 12px 0 16px 0; }
      .card { border:1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; flex:1; }
      .card .label { font-size: 11px; color:#6b7280; }
      .card .value { font-size: 16px; font-weight: 700; margin-top: 4px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #e5e7eb; padding: 8px; font-size: 11px; vertical-align: top; }
      th { background: #f9fafb; text-align: left; }
      .footer { margin-top: 16px; font-size: 10px; color:#9ca3af; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(report.name)}</h1>
    <div class="meta">
      Generated: ${escapeHtml(generatedAt)} &nbsp;•&nbsp;
      Range: ${escapeHtml(report.dateRange)} &nbsp;•&nbsp;
      Type: ${escapeHtml(report.type)}
    </div>

    <div class="summary">
      <div class="card"><div class="label">Total Events</div><div class="value">${totalEvents}</div></div>
      <div class="card"><div class="label">Total Guests</div><div class="value">${totalGuests}</div></div>
      <div class="card"><div class="label">Conflicts</div><div class="value">${conflictCount}</div></div>
    </div>

    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Title</th>
          <th>Start</th>
          <th>End</th>
          <th>Location</th>
          <th>Guests</th>
          <th>Status</th>
          <th>Synced</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="footer">LUCCCA Mobile Export</div>
  </body>
</html>
    `.trim();
  }
}
