type ActionType =
  | "ui_action"
  | "event_emitted"
  | "api_call"
  | "store_snapshot"
  | "error";

export interface SessionRecord {
  timestamp: string;
  action: ActionType;
  payload: Record<string, any>;
}

const MAX_RECORDS = 800;

class SessionRecorder {
  private records: SessionRecord[] = [];

  record(action: ActionType, payload: Record<string, any>) {
    const sanitized = { ...payload };
    this.records.push({
      timestamp: new Date().toISOString(),
      action,
      payload: sanitized,
    });
    if (this.records.length > MAX_RECORDS) {
      this.records.shift();
    }
  }

  exportJson(): string {
    return this.records.map((r) => JSON.stringify(r)).join("\n");
  }

  download(filename = "ekg-session.json") {
    if (typeof window === "undefined") return;
    const blob = new Blob([this.exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  getLatest(count = 100) {
    return this.records.slice(-count);
  }
}

export const sessionRecorder = new SessionRecorder();
