import { EmployeeRow, DayKey, DAYS, weeklyHours } from "./schedule";
export interface PrintOptions {
  layout: "horizontal" | "vertical";
  companyLogo?: string;
  outletLogo?: string;
  logoDataUrl?: string;
  scheduleTitle?: string;
  contextLabel?: string;
  managerMessage?: string;
  includeTotals: boolean;
}
function dayLabels(
  weekStartISO: string,
): { key: DayKey; label: string; date: string }[] {
  const start = new Date(weekStartISO);
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    const key = DAYS[i] as DayKey;
    const label = dt
      .toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "2-digit",
      })
      .replace(/\s+/g, "");
    return { key, label, date: dt.toISOString().slice(0, 10) };
  });
}
function displayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const last = parts[parts.length - 1];
  const initial = last.charAt(0).toUpperCase();
  return `${first} ${initial}.`;
}
function hoursForCell(cell: any): number {
  if (!cell || (!cell.in && !cell.out)) return 0;
  if (cell.range) {
    const mins = cell.range.end - cell.range.start;
    const breakMin = cell.breakMin || 0;
    return (mins - breakMin) / 60;
  }
  return 0;
}

function resolvedLogo(options: PrintOptions) {
  return options.logoDataUrl || options.companyLogo || options.outletLogo;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function scheduleHeaderHtml(dateRange: string, options: PrintOptions) {
  const logo = resolvedLogo(options);
  const title = escapeHtml(options.scheduleTitle || "Weekly Schedule");
  const context = escapeHtml([options.contextLabel, dateRange].filter(Boolean).join(" · "));
  const message = options.managerMessage
    ? `<div style="margin-top: 10px; padding: 10px 12px; border: 1px solid #ddd; border-radius: 10px; font-size: 12px; line-height: 1.45; white-space: pre-wrap;">${escapeHtml(options.managerMessage)}</div>`
    : "";

  return ` <div style="display:flex; gap:20px; margin-bottom:18px; align-items:center;"> ${logo ? `<img src="${logo}" style="max-height:60px; max-width:160px; object-fit:contain;" alt="Schedule Logo" />` : ""} <div style="min-width:0;"> <h1 style="margin:0; font-size:24px; font-weight:700; color:#000;">${title}</h1> <p style="margin:4px 0 0 0; font-size:14px; color:#666;">${context}</p> ${message} </div> </div> `;
}

export function generatePrintHTML(
  weekStartISO: string,
  employees: EmployeeRow[],
  options: PrintOptions,
): string {
  const headers = dayLabels(weekStartISO);
  const start = new Date(weekStartISO);
  const end = new Date(weekStartISO);
  end.setDate(start.getDate() + 6);
  const dateRange = `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  if (options.layout === "horizontal") {
    return generateHorizontalHTML(dateRange, headers, employees, options);
  }
  return generateVerticalHTML(dateRange, headers, employees, options);
}
function generateHorizontalHTML(
  dateRange: string,
  headers: { key: DayKey; label: string; date: string }[],
  employees: EmployeeRow[],
  options: PrintOptions,
): string {
  const showTotals = options.includeTotals !== false;
  const tableHtml = ` <table style="width: 100%; border-collapse: collapse; font-size: 12px;"> <thead> <tr style="background-color: #f5f5f5;"> <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">Employee</th> ${headers.map((h) => ` <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;"> <div>${escapeHtml(h.label)}</div> <div style="font-size: 10px; color: #666;">IN / OUT</div> </th> `).join("")} ${showTotals ? `<th style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">Total Hrs</th>` : ""} </tr> </thead> <tbody> ${employees
    .map((emp) => {
      const hours = weeklyHours(emp);
      return ` <tr> <td style="border: 1px solid #ddd; padding: 8px; font-weight: 500;">${escapeHtml(displayName(emp.name))}</td> ${headers
        .map((h) => {
          const cell = emp.shifts[h.key];
          const inVal = cell?.in || "";
          const outVal = cell?.out || "";
          const display = inVal && outVal ? `${escapeHtml(inVal)} / ${escapeHtml(outVal)}` : "—";
          return `<td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 11px; font-family: monospace;">${display}</td>`;
        })
        .join("")} ${showTotals ? `<td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: 500;">${hours.toFixed(1)}h</td>` : ""} </tr> `;
    })
    .join("")} </tbody> </table> `;
  return ` <!DOCTYPE html> <html> <head> <meta charset="UTF-8"> <title>Schedule - ${dateRange}</title> <style> @media print { body { margin: 0.5in; } table { page-break-inside: avoid; } } body { font-family: -apple-system, BlinkMacSystemFont,"Segoe UI", sans-serif; color: #000; background-color: #fff; margin: 0; padding: 0; } h1 { color: #000; } </style> </head> <body> ${scheduleHeaderHtml(dateRange, options)} ${tableHtml} </body> </html> `;
}
function generateVerticalHTML(
  dateRange: string,
  headers: { key: DayKey; label: string; date: string }[],
  employees: EmployeeRow[],
  options: PrintOptions,
): string {
  const daySchedules = headers
    .map((h) => {
      const dayEmployees = employees.filter((emp) => {
        const cell = emp.shifts[h.key];
        return cell && (cell.in || cell.out);
      });
      if (dayEmployees.length === 0) {
        return ` <div style="margin-bottom: 20px;"> <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 5px;">${escapeHtml(h.label)}</h3> <p style="margin: 0; color: #666; font-size: 12px;">No shifts scheduled</p> </div> `;
      }
      const schedule = dayEmployees
        .map((emp) => {
          const cell = emp.shifts[h.key];
          const inVal = cell?.in || "";
          const outVal = cell?.out || "";
          const display =
            inVal && outVal
              ? `${inVal} – ${outVal}`
              : inVal
                ? `${inVal}`
                : outVal
                  ? `${outVal}`
                  : "—";
          return ` <div style="padding: 8px 0; font-size: 12px; border-bottom: 1px solid #e0e0e0;"> <div style="font-weight: 500;">${escapeHtml(displayName(emp.name))}</div> <div style="font-size: 11px; color: #666; font-family: monospace;">${escapeHtml(display)}</div> </div> `;
        })
        .join("");
      return ` <div style="margin-bottom: 20px; page-break-inside: avoid;"> <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 5px;">${escapeHtml(h.label)}</h3> ${schedule} </div> `;
    })
    .join("");
  return ` <!DOCTYPE html> <html> <head> <meta charset="UTF-8"> <title>Schedule - ${dateRange}</title> <style> @media print { body { margin: 0.5in; } .day-section { page-break-inside: avoid; } } body { font-family: -apple-system, BlinkMacSystemFont,"Segoe UI", sans-serif; color: #000; background-color: #fff; margin: 0; padding: 0; } h1 { color: #000; } h3 { color: #000; } .day-section { margin-bottom: 20px; } </style> </head> <body> ${scheduleHeaderHtml(dateRange, options)} <div class="day-section">${daySchedules}</div> </body> </html> `;
}
