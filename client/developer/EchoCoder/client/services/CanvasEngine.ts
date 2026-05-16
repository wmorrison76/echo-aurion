import { nanoid } from "nanoid";

export type ToolType =
  | "select"
  | "rectangle"
  | "circle"
  | "polygon"
  | "line"
  | "pen"
  | "text"
  | "image"
  | "component";
export type BlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "lighten"
  | "darken"
  | "color-dodge"
  | "color-burn";

export interface Vector2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Fill {
  type: "solid" | "gradient" | "image";
  color?: string;
  opacity?: number;
  gradientType?: "linear" | "radial";
  gradientStops?: { color: string; position: number }[];
  imageUrl?: string;
}

export interface Stroke {
  color: string;
  width: number;
  type: "solid" | "dashed" | "dotted";
  dashPattern?: number[];
}

export interface Shadow {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight:
    | "normal"
    | "bold"
    | "100"
    | "200"
    | "300"
    | "400"
    | "500"
    | "600"
    | "700"
    | "800"
    | "900";
  fontStyle: "normal" | "italic";
  lineHeight: number;
  letterSpacing: number;
  textAlign: "left" | "center" | "right" | "justify";
  color: string;
}

export interface CanvasElement {
  id: string;
  type:
    | "rectangle"
    | "circle"
    | "polygon"
    | "line"
    | "path"
    | "text"
    | "image"
    | "group"
    | "component";
  name: string;
  bounds: Rect;
  rotation: number;
  opacity: number;
  blendMode: BlendMode;
  visible: boolean;
  locked: boolean;
  fill?: Fill;
  stroke?: Stroke;
  shadow?: Shadow[];
  borderRadius?: number;
  textContent?: string;
  textStyle?: TextStyle;
  imageUrl?: string;
  points?: Vector2[];
  children?: CanvasElement[];
  parentId?: string;
  metadata?: Record<string, any>;
}

export interface CanvasState {
  elements: CanvasElement[];
  selectedIds: string[];
  clipboard?: CanvasElement[];
  history: CanvasElement[][];
  historyIndex: number;
  zoom: number;
  pan: Vector2;
  gridSize: number;
  snapToGrid: boolean;
  showGrid: boolean;
}

export class CanvasEngine {
  private state: CanvasState;
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    this.state = {
      elements: [],
      selectedIds: [],
      history: [[]],
      historyIndex: 0,
      zoom: 1,
      pan: { x: 0, y: 0 },
      gridSize: 10,
      snapToGrid: false,
      showGrid: false,
    };
  }

  // Shape creation
  createRectangle(bounds: Rect, fill?: Fill, stroke?: Stroke): CanvasElement {
    return {
      id: nanoid(),
      type: "rectangle",
      name: "Rectangle",
      bounds,
      rotation: 0,
      opacity: 1,
      blendMode: "normal",
      visible: true,
      locked: false,
      fill: fill || { type: "solid", color: "#3B82F6", opacity: 1 },
      stroke: stroke || { color: "#1E40AF", width: 1, type: "solid" },
    };
  }

  createCircle(bounds: Rect, fill?: Fill, stroke?: Stroke): CanvasElement {
    return {
      id: nanoid(),
      type: "circle",
      name: "Circle",
      bounds,
      rotation: 0,
      opacity: 1,
      blendMode: "normal",
      visible: true,
      locked: false,
      fill: fill || { type: "solid", color: "#10B981", opacity: 1 },
      stroke: stroke || { color: "#047857", width: 1, type: "solid" },
    };
  }

  createText(
    bounds: Rect,
    text: string,
    style?: Partial<TextStyle>,
  ): CanvasElement {
    return {
      id: nanoid(),
      type: "text",
      name: "Text",
      bounds,
      rotation: 0,
      opacity: 1,
      blendMode: "normal",
      visible: true,
      locked: false,
      textContent: text,
      textStyle: {
        fontFamily: "Inter, sans-serif",
        fontSize: 16,
        fontWeight: "400",
        fontStyle: "normal",
        lineHeight: 1.5,
        letterSpacing: 0,
        textAlign: "left",
        color: "#000000",
        ...style,
      },
    };
  }

  createLine(start: Vector2, end: Vector2, stroke?: Stroke): CanvasElement {
    return {
      id: nanoid(),
      type: "line",
      name: "Line",
      bounds: {
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        width: Math.abs(end.x - start.x),
        height: Math.abs(end.y - start.y),
      },
      rotation: 0,
      opacity: 1,
      blendMode: "normal",
      visible: true,
      locked: false,
      stroke: stroke || { color: "#000000", width: 2, type: "solid" },
      points: [start, end],
    };
  }

  createPath(points: Vector2[], stroke?: Stroke): CanvasElement {
    const minX = Math.min(...points.map((p) => p.x));
    const maxX = Math.max(...points.map((p) => p.x));
    const minY = Math.min(...points.map((p) => p.y));
    const maxY = Math.max(...points.map((p) => p.y));

    return {
      id: nanoid(),
      type: "path",
      name: "Path",
      bounds: {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      },
      rotation: 0,
      opacity: 1,
      blendMode: "normal",
      visible: true,
      locked: false,
      stroke: stroke || { color: "#000000", width: 2, type: "solid" },
      points,
    };
  }

  createImage(bounds: Rect, imageUrl: string): CanvasElement {
    return {
      id: nanoid(),
      type: "image",
      name: "Image",
      bounds,
      rotation: 0,
      opacity: 1,
      blendMode: "normal",
      visible: true,
      locked: false,
      imageUrl,
    };
  }

  // Element management
  addElement(element: CanvasElement): void {
    this.state.elements.push(element);
    this.pushHistory();
    this.emit("change", this.state);
  }

  deleteElement(id: string): void {
    this.state.elements = this.state.elements.filter((el) => el.id !== id);
    this.state.selectedIds = this.state.selectedIds.filter((sid) => sid !== id);
    this.pushHistory();
    this.emit("change", this.state);
  }

  updateElement(id: string, updates: Partial<CanvasElement>): void {
    const element = this.state.elements.find((el) => el.id === id);
    if (element) {
      Object.assign(element, updates);
      this.pushHistory();
      this.emit("change", this.state);
    }
  }

  selectElements(ids: string[]): void {
    this.state.selectedIds = ids;
    this.emit("selection", ids);
  }

  getSelectedElements(): CanvasElement[] {
    return this.state.elements.filter((el) =>
      this.state.selectedIds.includes(el.id),
    );
  }

  // Transformations
  moveElements(ids: string[], delta: Vector2): void {
    ids.forEach((id) => {
      const element = this.state.elements.find((el) => el.id === id);
      if (element) {
        element.bounds.x += delta.x;
        element.bounds.y += delta.y;
      }
    });
    this.pushHistory();
    this.emit("change", this.state);
  }

  resizeElement(id: string, newBounds: Rect): void {
    const element = this.state.elements.find((el) => el.id === id);
    if (element) {
      element.bounds = newBounds;
      this.pushHistory();
      this.emit("change", this.state);
    }
  }

  rotateElement(id: string, angle: number): void {
    const element = this.state.elements.find((el) => el.id === id);
    if (element) {
      element.rotation = angle;
      this.pushHistory();
      this.emit("change", this.state);
    }
  }

  // Groups
  groupElements(ids: string[]): CanvasElement {
    const elements = this.state.elements.filter((el) => ids.includes(el.id));
    if (elements.length === 0) throw new Error("No elements to group");

    const minX = Math.min(...elements.map((e) => e.bounds.x));
    const maxX = Math.max(...elements.map((e) => e.bounds.x + e.bounds.width));
    const minY = Math.min(...elements.map((e) => e.bounds.y));
    const maxY = Math.max(...elements.map((e) => e.bounds.y + e.bounds.height));

    const group: CanvasElement = {
      id: nanoid(),
      type: "group",
      name: "Group",
      bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
      rotation: 0,
      opacity: 1,
      blendMode: "normal",
      visible: true,
      locked: false,
      children: elements,
    };

    this.state.elements = this.state.elements.filter(
      (el) => !ids.includes(el.id),
    );
    this.state.elements.push(group);
    this.pushHistory();
    this.emit("change", this.state);
    return group;
  }

  ungroupElements(id: string): void {
    const group = this.state.elements.find(
      (el) => el.id === id && el.type === "group",
    );
    if (!group || !group.children) throw new Error("Not a group");

    this.state.elements = this.state.elements.filter((el) => el.id !== id);
    this.state.elements.push(...group.children);
    this.pushHistory();
    this.emit("change", this.state);
  }

  // History
  pushHistory(): void {
    this.state.history = this.state.history.slice(
      0,
      this.state.historyIndex + 1,
    );
    this.state.history.push(JSON.parse(JSON.stringify(this.state.elements)));
    this.state.historyIndex = this.state.history.length - 1;
  }

  undo(): void {
    if (this.state.historyIndex > 0) {
      this.state.historyIndex--;
      this.state.elements = JSON.parse(
        JSON.stringify(this.state.history[this.state.historyIndex]),
      );
      this.emit("change", this.state);
    }
  }

  redo(): void {
    if (this.state.historyIndex < this.state.history.length - 1) {
      this.state.historyIndex++;
      this.state.elements = JSON.parse(
        JSON.stringify(this.state.history[this.state.historyIndex]),
      );
      this.emit("change", this.state);
    }
  }

  // Clipboard
  copy(ids: string[]): void {
    this.state.clipboard = this.state.elements
      .filter((el) => ids.includes(el.id))
      .map((el) => JSON.parse(JSON.stringify(el)));
  }

  paste(): CanvasElement[] {
    if (!this.state.clipboard) return [];
    const pasted = this.state.clipboard.map((el) => ({
      ...JSON.parse(JSON.stringify(el)),
      id: nanoid(),
      bounds: { ...el.bounds, x: el.bounds.x + 20, y: el.bounds.y + 20 },
    }));
    this.state.elements.push(...pasted);
    this.pushHistory();
    this.emit("change", this.state);
    return pasted;
  }

  // State management
  getState(): CanvasState {
    return this.state;
  }

  setState(newState: Partial<CanvasState>): void {
    Object.assign(this.state, newState);
    this.emit("change", this.state);
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }

  exportJSON(): string {
    return JSON.stringify(this.state.elements, null, 2);
  }

  importJSON(json: string): void {
    try {
      this.state.elements = JSON.parse(json);
      this.pushHistory();
      this.emit("change", this.state);
    } catch (error) {
      throw new Error("Invalid JSON format");
    }
  }
}

export const canvasEngine = new CanvasEngine();
