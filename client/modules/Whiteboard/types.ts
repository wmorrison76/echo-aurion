/** * Whiteboard Types & Interfaces * Defines all data structures for collaborative whiteboarding */ export type DrawingTool =

    | "select"
    | "pen"
    | "eraser"
    | "rectangle"
    | "circle"
    | "line"
    | "arrow"
    | "connector"
    | "text"
    | "sticky"
    | "shape";
export type ShapeType =
  | "rectangle"
  | "circle"
  | "triangle"
  | "diamond"
  | "line"
  | "arrow"
  | "connector";
export interface DrawingStroke {
  id: string;
  toolType: DrawingTool;
  color: string;
  lineWidth: number;
  opacity: number;
  points: Array<{ x: number; y: number }>;
  timestamp: number;
  userId?: string;
  sessionId?: string;
}
export interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  fontWeight?: "normal" | "bold";
  isItalic?: boolean;
  isUnderline?: boolean;
  textAlign?: "left" | "center" | "right";
  groupId?: string;
  timestamp: number;
  userId?: string;
  isLocked?: boolean;
}
export interface ShapeElement {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  fillColor?: string;
  lineWidth: number;
  opacity: number;
  rotation?: number;
  groupId?: string;
  timestamp: number;
  userId?: string;
  isLocked?: boolean;
}
export interface StickyNote {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: "yellow" | "pink" | "blue" | "green" | "purple" | "orange";
  groupId?: string;
  timestamp: number;
  userId?: string;
  isLocked?: boolean;
}
export type ConnectorEndpointType =
  | "none"
  | "arrow"
  | "circle"
  | "square"
  | "diamond";
export type ConnectorRoutingStyle = "straight" | "curved" | "orthogonal";
export interface ConnectorEndpoint {
  targetId: string;
  targetKind: "shape" | "text" | "sticky";
  position: "top" | "bottom" | "left" | "right" | "center";
  offsetX?: number;
  offsetY?: number;
}
export interface Connector {
  id: string;
  fromEndpoint: ConnectorEndpoint;
  toEndpoint: ConnectorEndpoint;
  color: string;
  lineWidth: number;
  opacity: number;
  fromEndpointType: ConnectorEndpointType;
  toEndpointType: ConnectorEndpointType;
  routingStyle: ConnectorRoutingStyle;
  controlPoints?: Array<{ x: number; y: number }>;
  timestamp: number;
  userId?: string;
  isLocked?: boolean;
}
export interface PDFElement {
  id: string;
  fileUrl: string;
  fileName: string;
  pageNumber: number;
  totalPages: number;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rotation?: number;
  opacity: number;
  groupId?: string;
  timestamp: number;
  userId?: string;
  isLocked?: boolean;
}
export interface ImageElement {
  id: string;
  fileUrl: string;
  fileName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity: number;
  groupId?: string;
  timestamp: number;
  userId?: string;
  isLocked?: boolean;
}
export interface DocumentElement {
  id: string;
  fileUrl: string;
  fileName: string;
  fileType: "pdf" | "image" | "svg";
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber?: number;
  totalPages?: number;
  rotation?: number;
  opacity: number;
  scale: number;
  annotations: Array<{
    id: string;
    type: "highlight" | "note" | "arrow" | "underline";
    content: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
  }>;
  groupId?: string;
  timestamp: number;
  userId?: string;
  isLocked?: boolean;
}
export type CanvasSelectable = {
  kind:
    | "shape"
    | "text"
    | "sticky"
    | "embed"
    | "connector"
    | "document"
    | "image"
    | "pdf"
    | "figma"
    | "jira"
    | "datasource"
    | "googlesheets"
    | "crm";
  id: string;
};
export interface PanelEmbed {
  id: string;
  panelId: string; // dashboard, culinary, etc x: number; y: number; width: number; height: number; zoomLevel: number; drillDownLevel: number; // 1-5 selectedMetrics?: string[]; groupId?: string; timestamp: number; userId?: string; // Widget metadata for rendering actual content widgetTitle?: string; widgetType?: string; // e.g.,"revenue","labor-cost","occupancy" widgetIcon?: string; widgetData?: Record<string, any>; // Store additional widget-specific data
}
export interface WhiteboardSession {
  id: string;
  title: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  canvasState: CanvasState;
  participants: ParticipantInfo[];
  isArchived: boolean;
  isPublic: boolean;
}
export interface CanvasState {
  strokes: DrawingStroke[];
  texts: TextElement[];
  shapes: ShapeElement[];
  stickyNotes: StickyNote[];
  panelEmbeds: PanelEmbed[];
  connectors: Connector[];
  comments: ObjectComment[];
  documents: DocumentElement[];
  images: ImageElement[];
  pdfs: PDFElement[];
  figmaEmbeds: FigmaEmbed[];
  jiraEmbeds: JiraEmbed[];
  dataSourceEmbeds: DataSourceEmbed[];
  googleSheetsEmbeds: GoogleSheetsEmbed[];
  crmEmbeds: CRMEmbed[];
  viewportX: number;
  viewportY: number;
  zoomLevel: number;
  backgroundColor: string;
  gridSize: number;
  showGrid: boolean;
  showRulers: boolean;
}
export interface WhiteboardPage {
  id: string;
  name: string;
  canvasState: CanvasState;
  createdAt: number;
  updatedAt: number;
}
export interface ParticipantInfo {
  userId: string;
  userName: string;
  userRole: "viewer" | "editor" | "presenter" | "organizer";
  cursorX?: number;
  cursorY?: number;
  isActive: boolean;
  joinedAt: number;
  color: string;
  selectedTool?: DrawingTool;
}
export interface WhiteboardToolState {
  selectedTool: DrawingTool;
  selectedColor: string;
  selectedFillColor?: string;
  lineWidth: number;
  opacity: number;
  fontSize?: number;
  fontFamily?: string;
  rotation?: number;
}
export interface DrillDownSnapshot {
  panelEmbedId: string;
  level: number;
  dataSnapshot: Record<string, any>;
  timestamp: number;
  metrics: Array<{
    name: string;
    value: number | string;
    subMetrics?: Array<{ name: string; value: number | string }>;
  }>;
}
export interface WhiteboardMessage {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  text: string;
  emoji?: string;
  isPrivate: boolean;
  recipientId?: string;
  timestamp: number;
}
export interface CommentReply {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  mentions?: string[];
  timestamp: number;
  isResolved?: boolean;
}
export interface ObjectComment {
  id: string;
  targetId: string;
  targetKind: "shape" | "text" | "sticky" | "connector";
  authorId: string;
  authorName: string;
  text: string;
  mentions?: string[];
  timestamp: number;
  isResolved?: boolean;
  replies?: CommentReply[];
}
export interface CursorPosition {
  userId: string;
  userName: string;
  color: string;
  x: number;
  y: number;
  timestamp: number;
}
export interface FigmaEmbed {
  id: string;
  fileId: string;
  fileName: string;
  projectId?: string;
  projectName?: string;
  nodeId?: string;
  nodeName?: string;
  iframeUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity: number;
  groupId?: string;
  timestamp: number;
  userId?: string;
  isLocked?: boolean;
  cachedPreviewUrl?: string;
  lastSyncedAt?: number;
}
export interface JiraEmbed {
  id: string;
  issueKey: string;
  issueId: string;
  projectKey: string;
  summary: string;
  description?: string;
  status: string;
  priority: string;
  assignee?: string;
  dueDate?: string;
  labels?: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity: number;
  groupId?: string;
  timestamp: number;
  userId?: string;
  isLocked?: boolean;
  jiraUrl: string;
  lastSyncedAt?: number;
  customFields?: Record<string, any>;
}
export interface DataSourceEmbed {
  id: string;
  sourceType: "rest-api" | "sql" | "graphql" | "spreadsheet";
  sourceName: string;
  endpoint?: string;
  query?: string;
  headers?: Record<string, string>;
  refreshInterval?: number; // ms dataMapping?: Record<string, string>; // map response fields to display chartType?:"line" |"bar" |"pie" |"area" |"scatter" |"table"; x: number; y: number; width: number; height: number; rotation?: number; opacity: number; groupId?: string; timestamp: number; userId?: string; isLocked?: boolean; lastSyncedAt?: number; cachedData?: Record<string, any>; errorMessage?: string;
}
export interface GoogleSheetsEmbed {
  id: string;
  spreadsheetId: string;
  spreadsheetName: string;
  sheetId?: string;
  sheetName?: string;
  range?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity: number;
  groupId?: string;
  timestamp: number;
  userId?: string;
  isLocked?: boolean;
  iframeUrl: string;
  cachedPreviewUrl?: string;
  lastSyncedAt?: number;
  displayMode?: "preview" | "editable" | "read-only";
}
export interface CRMEmbed {
  id: string;
  crmType: "salesforce" | "hubspot";
  entityType: "account" | "contact" | "opportunity" | "lead";
  entityId: string;
  entityName: string;
  data: Record<string, any>;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity: number;
  groupId?: string;
  timestamp: number;
  userId?: string;
  isLocked?: boolean;
  lastSyncedAt?: number;
  externalUrl?: string;
}
export interface SlackShareConfig {
  channel?: string;
  threadId?: string;
  message?: string;
  includePreview: boolean;
  previewMode?: "thumbnail" | "detailed" | "minimal";
  timestamp?: number;
}
export interface EmailShareConfig {
  recipients: string[];
  subject: string;
  message: string;
  includePreview: boolean;
  previewMode?: "thumbnail" | "detailed" | "minimal";
  timestamp?: number;
}
export interface PresentationSlide {
  id: string;
  title: string;
  description?: string;
  elements: {
    kind: "shape" | "text" | "sticky" | "image" | "pdf" | "embed";
    id: string;
    animationDelay?: number;
    animationType?: "fade-in" | "slide-in" | "zoom-in" | "none";
  }[];
  speakerNotes: string;
  duration?: number; // seconds backgroundColor?: string;
}
export interface PresentationDeck {
  id: string;
  title: string;
  description?: string;
  sessionId: string;
  slides: PresentationSlide[];
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  isAutoGenerated: boolean;
  settings?: {
    autoAdvance?: boolean;
    autoAdvanceInterval?: number;
    transitionDuration?: number;
    showSpeakerNotes?: boolean;
  };
}
export interface RecordingSession {
  id: string;
  sessionId: string;
  title: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  videoBlob?: Blob;
  videoUrl?: string;
  thumbnail?: string;
  isProcessing: boolean;
  recordedBy: string;
  canvasStateSnapshot?: CanvasState;
  frameCount?: number;
}
export interface RecordingFrame {
  timestamp: number;
  canvasState: CanvasState;
  screenData?: ImageData;
  audioBuffer?: AudioBuffer;
}
export interface WhiteboardEvent {
  type:
    | "stroke"
    | "text"
    | "shape"
    | "sticky"
    | "embed"
    | "delete"
    | "update"
    | "cursor"
    | "chat"
    | "drilldown"
    | "document"
    | "image"
    | "pdf"
    | "annotation"
    | "figma"
    | "jira"
    | "datasource"
    | "share"
    | "presentation"
    | "recording";
  userId: string;
  sessionId: string;
  timestamp: number;
  data: any;
}
