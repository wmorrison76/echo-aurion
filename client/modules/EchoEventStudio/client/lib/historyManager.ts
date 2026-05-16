import type { Database } from "../types/database";
type LayoutItem = Database["public"]["Tables"]["layout_items"]["Row"];
export interface HistoryState {
  items: LayoutItem[];
  timestamp: number;
}
export class HistoryManager {
  private history: HistoryState[] = [];
  private currentIndex: number = -1;
  private maxHistory: number = 50;
  constructor(initialState: LayoutItem[]) {
    this.history = [
      {
        items: JSON.parse(JSON.stringify(initialState)),
        timestamp: Date.now(),
      },
    ];
    this.currentIndex = 0;
  }
  push(state: LayoutItem[]): void {
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }
    this.history.push({
      items: JSON.parse(JSON.stringify(state)),
      timestamp: Date.now(),
    });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }
  }
  undo(): LayoutItem[] | null {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return JSON.parse(JSON.stringify(this.history[this.currentIndex].items));
    }
    return null;
  }
  redo(): LayoutItem[] | null {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      return JSON.parse(JSON.stringify(this.history[this.currentIndex].items));
    }
    return null;
  }
  canUndo(): boolean {
    return this.currentIndex > 0;
  }
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }
  getSize(): number {
    return this.history.length;
  }
  getCurrentIndex(): number {
    return this.currentIndex;
  }
}
