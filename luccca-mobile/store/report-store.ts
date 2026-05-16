import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import * as MailComposer from "expo-mail-composer";
import * as Notifications from "expo-notifications";
import { ExportService } from "@/lib/export-service";

export interface ReportFormat {
  id: string;
  name: string;
  format: "pdf" | "csv" | "json";
  type: "calendar" | "analytics" | "integrations" | "all";
  dateRange: "today" | "week" | "month" | "custom";
  startDate?: string;
  endDate?: string;
  includeAnalytics: boolean;
  includeAttendees: boolean;
  createdAt: string;
  fileName: string;
}

export interface ScheduledReport {
  id: string;
  name: string;
  format: ReportFormat;
  frequency: "daily" | "weekly" | "monthly";
  recipients: string[];
  enabled: boolean;
  nextRunAt: string;
  lastRunAt?: string;
  createdAt: string;
  notificationId?: string;
}

export interface ReportStore {
  reports: ReportFormat[];
  scheduledReports: ScheduledReport[];
  isGenerating: boolean;
  generationProgress: number;
  lastGeneratedReport: ReportFormat | null;

  createReport: (
    format: Omit<ReportFormat, "id" | "createdAt" | "fileName">,
  ) => Promise<ReportFormat>;
  generatePDF: (report: ReportFormat) => Promise<string>;
  generateCSV: (report: ReportFormat) => Promise<string>;
  generateJSON: (report: ReportFormat) => Promise<string>;
  downloadReport: (report: ReportFormat) => Promise<string>;
  emailReport: (report: ReportFormat, recipients: string[]) => Promise<void>;

  createScheduledReport: (
    report: Omit<ScheduledReport, "id" | "createdAt" | "notificationId">,
  ) => Promise<ScheduledReport>;
  updateScheduledReport: (
    id: string,
    updates: Partial<Omit<ScheduledReport, "id" | "createdAt" | "format">>,
  ) => Promise<void>;
  deleteScheduledReport: (id: string) => Promise<void>;

  listReports: () => Promise<ReportFormat[]>;
  listScheduledReports: () => Promise<ScheduledReport[]>;
  deleteReport: (id: string) => Promise<void>;
}

const STORAGE_KEY = "report-store";

function sanitizeFileName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9\-_\.]/g, "")
    .toLowerCase();
}

function buildFileName(name: string, format: ReportFormat["format"]): string {
  const date = new Date().toISOString().split("T")[0];
  const safe = sanitizeFileName(name);
  return `${safe || "report"}-${date}.${format}`;
}

function getRepeatSeconds(frequency: ScheduledReport["frequency"]): number {
  switch (frequency) {
    case "daily":
      return 24 * 60 * 60;
    case "weekly":
      return 7 * 24 * 60 * 60;
    case "monthly":
      return 30 * 24 * 60 * 60;
  }
}

function nextRunAtISO(frequency: ScheduledReport["frequency"]): string {
  const now = Date.now();
  return new Date(now + getRepeatSeconds(frequency) * 1000).toISOString();
}

async function ensureWritableDirectory(): Promise<string> {
  if (!FileSystem.documentDirectory) {
    throw new Error("File system is not available");
  }

  const dir = `${FileSystem.documentDirectory}luccca-reports/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }

  return dir;
}

async function writeTextFile(fileUri: string, content: string): Promise<void> {
  await FileSystem.writeAsStringAsync(fileUri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

async function scheduleReportReminder(
  schedule: Omit<ScheduledReport, "notificationId">,
): Promise<string> {
  const triggerSeconds = getRepeatSeconds(schedule.frequency);
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Report reminder",
      body: `Time to send: ${schedule.name}`,
      data: {
        type: "report_reminder",
        reportId: schedule.format.id,
        scheduleId: schedule.id,
      },
    },
    trigger: {
      seconds: triggerSeconds,
      repeats: true,
    },
  });

  return notificationId;
}

export const useReportStore = create<ReportStore>()(
  persist(
    (set, get) => ({
      reports: [],
      scheduledReports: [],
      isGenerating: false,
      generationProgress: 0,
      lastGeneratedReport: null,

      createReport: async (format) => {
        const id = `report-${Date.now()}`;
        const fileName = buildFileName(format.name, format.format);

        const report: ReportFormat = {
          id,
          ...format,
          createdAt: new Date().toISOString(),
          fileName,
        };

        set((state) => ({ reports: [...state.reports, report] }));
        return report;
      },

      generatePDF: async (report) => {
        set({ isGenerating: true, generationProgress: 0 });

        try {
          set({ generationProgress: 15 });
          const exportData = await ExportService.getExportData(report);

          set({ generationProgress: 45 });
          const html = ExportService.generateHTML(exportData, report);

          set({ generationProgress: 70 });
          const dir = await ensureWritableDirectory();
          const outUri = `${dir}${report.fileName}`;

          const result = await Print.printToFileAsync({
            html,
            base64: false,
          });

          set({ generationProgress: 85 });
          await FileSystem.copyAsync({ from: result.uri, to: outUri });

          set({ generationProgress: 100, lastGeneratedReport: report });
          return outUri;
        } finally {
          set({ isGenerating: false });
        }
      },

      generateCSV: async (report) => {
        set({ isGenerating: true, generationProgress: 0 });

        try {
          set({ generationProgress: 20 });
          const exportData = await ExportService.getExportData(report);

          set({ generationProgress: 60 });
          const csv = ExportService.generateCSV(exportData);

          set({ generationProgress: 80 });
          const dir = await ensureWritableDirectory();
          const outUri = `${dir}${report.fileName}`;
          await writeTextFile(outUri, csv);

          set({ generationProgress: 100, lastGeneratedReport: report });
          return outUri;
        } finally {
          set({ isGenerating: false });
        }
      },

      generateJSON: async (report) => {
        set({ isGenerating: true, generationProgress: 0 });

        try {
          set({ generationProgress: 20 });
          const exportData = await ExportService.getExportData(report);

          set({ generationProgress: 60 });
          const json = ExportService.generateJSON(exportData);

          set({ generationProgress: 80 });
          const dir = await ensureWritableDirectory();
          const outUri = `${dir}${report.fileName}`;
          await writeTextFile(outUri, json);

          set({ generationProgress: 100, lastGeneratedReport: report });
          return outUri;
        } finally {
          set({ isGenerating: false });
        }
      },

      downloadReport: async (report) => {
        switch (report.format) {
          case "pdf":
            return await get().generatePDF(report);
          case "csv":
            return await get().generateCSV(report);
          case "json":
            return await get().generateJSON(report);
        }
      },

      emailReport: async (report, recipients) => {
        const isAvailable = await MailComposer.isAvailableAsync();
        if (!isAvailable) {
          throw new Error("Email composer is not available on this device");
        }

        const uri = await get().downloadReport(report);

        const subject = `LUCCCA Report: ${report.name}`;
        const body = `Attached is the ${report.name} report.`;

        await MailComposer.composeAsync({
          recipients,
          subject,
          body,
          attachments: [uri],
        });
      },

      createScheduledReport: async (scheduleInput) => {
        const id = `scheduled-${Date.now()}`;
        const schedule: Omit<ScheduledReport, "notificationId"> = {
          id,
          ...scheduleInput,
          createdAt: new Date().toISOString(),
          nextRunAt: nextRunAtISO(scheduleInput.frequency),
        };

        const notificationId = await scheduleReportReminder(schedule);

        const stored: ScheduledReport = { ...schedule, notificationId };

        set((state) => ({
          scheduledReports: [...state.scheduledReports, stored],
        }));

        return stored;
      },

      updateScheduledReport: async (id, updates) => {
        const current = get().scheduledReports.find((r) => r.id === id);
        if (!current) return;

        let nextNotificationId = current.notificationId;

        if (
          updates.enabled !== undefined &&
          updates.enabled !== current.enabled
        ) {
          if (!updates.enabled && current.notificationId) {
            await Notifications.cancelScheduledNotificationAsync(
              current.notificationId,
            );
            nextNotificationId = undefined;
          }

          if (updates.enabled && !current.notificationId) {
            const base: Omit<ScheduledReport, "notificationId"> = {
              ...current,
              enabled: true,
              nextRunAt: nextRunAtISO(current.frequency),
            };
            nextNotificationId = await scheduleReportReminder(base);
          }
        }

        set((state) => ({
          scheduledReports: state.scheduledReports.map((r) =>
            r.id === id
              ? {
                  ...r,
                  ...updates,
                  notificationId: nextNotificationId,
                  nextRunAt:
                    updates.frequency && updates.frequency !== r.frequency
                      ? nextRunAtISO(updates.frequency)
                      : r.nextRunAt,
                }
              : r,
          ),
        }));
      },

      deleteScheduledReport: async (id) => {
        const current = get().scheduledReports.find((r) => r.id === id);
        if (current?.notificationId) {
          await Notifications.cancelScheduledNotificationAsync(
            current.notificationId,
          );
        }

        set((state) => ({
          scheduledReports: state.scheduledReports.filter((r) => r.id !== id),
        }));
      },

      listReports: async () => {
        return get().reports;
      },

      listScheduledReports: async () => {
        return get().scheduledReports;
      },

      deleteReport: async (id) => {
        set((state) => ({ reports: state.reports.filter((r) => r.id !== id) }));
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
    },
  ),
);
