import React, { useState, useCallback, useRef, useEffect } from "react";
import type {
  CanvasState,
  CanvasSelectable,
  DrawingTool,
  WhiteboardToolState,
  DrawingStroke,
  ShapeElement,
  StickyNote,
  TextElement,
  PanelEmbed,
  ParticipantInfo,
  PDFElement,
  ImageElement,
} from "./types";
import { v4 as uuidv4 } from "uuid";
import { realtimeManager } from "@/lib/supabase";
import { DrawingCanvas } from "./DrawingCanvas";
import { WhiteboardToolbar } from "./Toolbar";
import { DashboardDragIntegration } from "./DashboardDragIntegration";
import { PanelEmbedWidget } from "./PanelEmbed";
import { Templates } from "./Templates";
import {
  exportCanvasAsPNG,
  exportCanvasAsSVG,
  exportCanvasAsPDF,
} from "./DocumentExportManager";
import CloudPersistence from "./CloudPersistence";
import { WhiteboardMinimap } from "./Minimap";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";
import { RealTimeCursorsComponent } from "./RealTimeCursorsComponent";
import { VotingSystem } from "./VotingSystem";
import { WorkshopTimer } from "./WorkshopTimer";
import { AISuggestionsPanel } from "./AISuggestionsPanel";
import { storage, storageKeys } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { FolderOpen, Plus, Trash2, Cloud, CloudOff, Loader2, Presentation, Video, Square, Play, FileUp, Share2 } from "lucide-react";
import { cn } from "@/lib/glass";

interface WhiteboardSessionProps {
  sessionId?: string;
  userId?: string;
  userName?: string;
  userRole?: "viewer" | "editor" | "presenter" | "organizer";
  readOnly?: boolean;
  isPresenter?: boolean;
  onSessionUpdate?: (session: {
    id: string;
    title: string;
    canvasState: unknown;
  }) => void;
}

const DEFAULT_CANVAS_STATE: CanvasState = {
  strokes: [],
  texts: [],
  shapes: [],
  stickyNotes: [],
  panelEmbeds: [],
  connectors: [],
  comments: [],
  documents: [],
  images: [],
  pdfs: [],
  figmaEmbeds: [],
  jiraEmbeds: [],
  dataSourceEmbeds: [],
  googleSheetsEmbeds: [],
  crmEmbeds: [],
  viewportX: 0,
  viewportY: 0,
  zoomLevel: 1,
  backgroundColor: "#ffffff",
  gridSize: 20,
  showGrid: false,
  showRulers: false,
};

const DEFAULT_TOOL_STATE: WhiteboardToolState = {
  selectedTool: "pen",
  selectedColor: "#000000",
  lineWidth: 2,
  opacity: 1,
};

const MAX_UNDO = 50;
const NAMED_SESSIONS_KEY = "echo:whiteboard:named-sessions";
const PAGES_KEY = (sid: string) => `echo:whiteboard:pages:${sid}`;

type NamedSession = { id: string; name: string };

function getInitialSessionState(): {
  list: NamedSession[];
  currentId: string;
} {
  const list = storage.get<NamedSession[]>(NAMED_SESSIONS_KEY, []);
  if (list.length > 0) return { list, currentId: list[0].id };
  const id = `wb-${Date.now()}`;
  const newList: NamedSession[] = [{ id, name: "Untitled" }];
  storage.set(NAMED_SESSIONS_KEY, newList);
  return { list: newList, currentId: id };
}

export default function WhiteboardSession(props: WhiteboardSessionProps = {}) {
  const {
    sessionId: propsSessionId,
    userId = "local-user",
    userName = "User",
    userRole = "editor",
    readOnly = false,
  } = props;

  const [sessionListState, setSessionListState] = useState(getInitialSessionState);
  const sessionId = propsSessionId ?? sessionListState.currentId;
  const canvasRef = useRef<HTMLDivElement>(null);
  const contentCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cloudRestoreDone = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [canvasState, setCanvasState] = useState<CanvasState>(() => {
    const saved = storage.get<CanvasState>(
      storageKeys.moduleState(`whiteboard-canvas-${sessionId}`),
      DEFAULT_CANVAS_STATE
    );
    return saved ?? DEFAULT_CANVAS_STATE;
  });
  const [toolState, setToolState] = useState<WhiteboardToolState>(() => {
    const saved = storage.get<WhiteboardToolState>(
      storageKeys.moduleState(`whiteboard-tools-${sessionId}`),
      DEFAULT_TOOL_STATE
    );
    return saved ?? DEFAULT_TOOL_STATE;
  });
  const [syncStatus, setSyncStatus] = useState(CloudPersistence.getSyncStatus());
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [remoteParticipants, setRemoteParticipants] = useState<ParticipantInfo[]>([]);
  const [isPresenting, setIsPresenting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showPlayback, setShowPlayback] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const recordingFramesRef = useRef<Array<{ timestamp: number; state: CanvasState }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  type PageItem = { id: string; name: string; canvasState: CanvasState };
  const [pages, setPages] = useState<PageItem[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string>("");
  const pagesLoadedRef = useRef(false);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cursorThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCursorRef = useRef<{ x: number; y: number } | null>(null);
  const PARTICIPANT_COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];
  const [selectedTargets, setSelectedTargets] = useState<CanvasSelectable[]>([]);
  const [showGrid, setShowGrid] = useState(false);
  const [showRulers, setShowRulers] = useState(false);
  const [undoStack, setUndoStack] = useState<CanvasState[]>([]);
  const [redoStack, setRedoStack] = useState<CanvasState[]>([]);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [fullscreenEmbedId, setFullscreenEmbedId] = useState<string | null>(null);

  // When switching session (internal mode), load canvas/tool from storage
  const prevSessionIdRef = useRef(sessionId);
  useEffect(() => {
    if (propsSessionId != null) return;
    if (prevSessionIdRef.current === sessionId) return;
    prevSessionIdRef.current = sessionId;
    pagesLoadedRef.current = false;
    const canvas = storage.get<CanvasState>(
      storageKeys.moduleState(`whiteboard-canvas-${sessionId}`),
      DEFAULT_CANVAS_STATE
    );
    const tools = storage.get<WhiteboardToolState>(
      storageKeys.moduleState(`whiteboard-tools-${sessionId}`),
      DEFAULT_TOOL_STATE
    );
    setCanvasState(canvas ?? DEFAULT_CANVAS_STATE);
    setToolState(tools ?? DEFAULT_TOOL_STATE);
    setUndoStack([]);
    setRedoStack([]);
  }, [sessionId, propsSessionId]);

  // Load or init pages when in internal mode
  useEffect(() => {
    if (propsSessionId != null) return;
    const stored = storage.get<{ pages: PageItem[]; currentPageId: string }>(PAGES_KEY(sessionId));
    if (stored?.pages?.length) {
      setPages(stored.pages);
      setCurrentPageId(stored.currentPageId || stored.pages[0]!.id);
      setCanvasState(stored.pages.find((p) => p.id === (stored!.currentPageId || stored.pages[0]!.id))?.canvasState ?? DEFAULT_CANVAS_STATE);
    } else {
      const id = `page-${Date.now()}`;
      const canvas = storage.get<CanvasState>(storageKeys.moduleState(`whiteboard-canvas-${sessionId}`), DEFAULT_CANVAS_STATE);
      const page: PageItem = { id, name: "Page 1", canvasState: canvas ?? DEFAULT_CANVAS_STATE };
      setPages([page]);
      setCurrentPageId(id);
      setCanvasState(page.canvasState);
      storage.set(PAGES_KEY(sessionId), { pages: [page], currentPageId: id });
    }
    pagesLoadedRef.current = true;
  }, [sessionId, propsSessionId]);

  const switchPage = useCallback((pageId: string) => {
    setPages((prev) => {
      const current = prev.find((p) => p.id === currentPageId);
      const next = current ? prev.map((p) => (p.id === currentPageId ? { ...p, canvasState } : p)) : prev;
      storage.set(PAGES_KEY(sessionId), { pages: next, currentPageId: pageId });
      return next;
    });
    setCurrentPageId(pageId);
    const page = pages.find((p) => p.id === pageId);
    if (page) setCanvasState(page.canvasState);
  }, [currentPageId, canvasState, sessionId, pages]);

  const addPage = useCallback(() => {
    const id = `page-${Date.now()}`;
    const newPage: PageItem = { id, name: `Page ${pages.length + 1}`, canvasState: DEFAULT_CANVAS_STATE };
    const nextPages = [...pages.map((p) => (p.id === currentPageId ? { ...p, canvasState } : p)), newPage];
    setPages(nextPages);
    setCurrentPageId(id);
    setCanvasState(DEFAULT_CANVAS_STATE);
    storage.set(PAGES_KEY(sessionId), { pages: nextPages, currentPageId: id });
  }, [pages, currentPageId, canvasState, sessionId]);

  // Cloud restore on session load
  useEffect(() => {
    void CloudPersistence.restoreSession(sessionId)
      .then((restored) => {
        if (restored) setCanvasState(restored);
      })
      .catch(() => undefined);
    const interval = setInterval(() => setSyncStatus(CloudPersistence.getSyncStatus()), 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
        e.preventDefault();
        setShowShortcutsModal((v) => !v);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Define handleCanvasStateChange early so it can be used in other callbacks
  const handleCanvasStateChange = useCallback(
    (
      newState: CanvasState,
      options?: { pushUndo?: boolean; undoBase?: CanvasState }
    ) => {
      const pushUndo = options?.pushUndo !== false;
      if (pushUndo) {
        const base = options?.undoBase ?? canvasState;
        setUndoStack((prev) => {
          const next = [...prev, base];
          if (next.length > MAX_UNDO) next.shift();
          return next;
        });
        setRedoStack([]);
      }
      setCanvasState(newState);
      storage.set(
        storageKeys.moduleState(`whiteboard-canvas-${sessionId}`),
        newState
      );
      if (propsSessionId == null && pages.length > 0 && currentPageId) {
        setPages((prev) => {
          const next = prev.map((p) => (p.id === currentPageId ? { ...p, canvasState: newState } : p));
          storage.set(PAGES_KEY(sessionId), { pages: next, currentPageId });
          return next;
        });
      }
      if (options?.broadcast?.length) {
        for (const b of options.broadcast) {
          realtimeManager.broadcastEvent(sessionId, {
            type: b.type,
            userId,
            sessionId,
            timestamp: Date.now(),
            data: b.data,
          });
        }
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        CloudPersistence.queueChange(sessionId, newState);
        setSyncStatus(CloudPersistence.getSyncStatus());
        debounceRef.current = null;
      }, 2000);
      props.onSessionUpdate?.({
        id: sessionId,
        title: `Session ${sessionId.slice(0, 8)}`,
        canvasState: newState,
      });
    },
    [canvasState, sessionId, userId, props.onSessionUpdate, propsSessionId, pages.length, currentPageId]
  );

  const handleMinimapNavigate = useCallback(
    (next: { viewportX: number; viewportY: number }) => {
      handleCanvasStateChange(
        { ...canvasState, viewportX: next.viewportX, viewportY: next.viewportY },
        { pushUndo: false }
      );
    },
    [canvasState, handleCanvasStateChange]
  );

  useEffect(() => {
    const unsubStroke = realtimeManager.subscribe(sessionId, "stroke", (data: any) => {
      if (data?.userId === userId) return;
      setCanvasState((prev) => ({
        ...prev,
        strokes: [...prev.strokes, data].filter(Boolean),
      }));
    });
    const unsubShape = realtimeManager.subscribe(sessionId, "shape", (data: any) => {
      if (data?.userId === userId) return;
      setCanvasState((prev) => {
        const next = prev.shapes.filter((s) => s.id !== data?.id);
        if (data?.id) next.push(data);
        return { ...prev, shapes: next };
      });
    });
    const unsubText = realtimeManager.subscribe(sessionId, "text", (data: any) => {
      if (data?.userId === userId) return;
      setCanvasState((prev) => {
        const next = prev.texts.filter((t) => t.id !== data?.id);
        if (data?.id) next.push(data);
        return { ...prev, texts: next };
      });
    });
    const unsubSticky = realtimeManager.subscribe(sessionId, "sticky", (data: any) => {
      if (data?.userId === userId) return;
      setCanvasState((prev) => {
        const next = prev.stickyNotes.filter((n) => n.id !== data?.id);
        if (data?.id) next.push(data);
        return { ...prev, stickyNotes: next };
      });
    });
    const unsubEmbed = realtimeManager.subscribe(sessionId, "embed", (data: any) => {
      if (data?.userId === userId) return;
      setCanvasState((prev) => ({
        ...prev,
        panelEmbeds: [...prev.panelEmbeds.filter((e) => e.id !== data?.id), data].filter(Boolean),
      }));
    });
    const unsubDelete = realtimeManager.subscribe(sessionId, "delete", (data: any) => {
      const id = data?.id;
      if (!id) return;
      setCanvasState((prev) => ({
        ...prev,
        shapes: prev.shapes.filter((s) => s.id !== id),
        texts: prev.texts.filter((t) => t.id !== id),
        stickyNotes: prev.stickyNotes.filter((n) => n.id !== id),
      }));
    });
    const unsubCursor = realtimeManager.subscribe(sessionId, "cursor", (data: any) => {
      const uid = data?.userId ?? data?.data?.userId;
      if (uid === userId) return;
      const x = data?.cursorX ?? data?.data?.cursorX;
      const y = data?.cursorY ?? data?.data?.cursorY;
      const color = data?.color ?? data?.data?.color ?? PARTICIPANT_COLORS[0];
      setRemoteParticipants((prev) => {
        const existing = prev.find((p) => p.userId === uid);
        const next = existing
          ? prev.map((p) => (p.userId === uid ? { ...p, cursorX: x, cursorY: y, isActive: true, color } : p))
          : [...prev.filter((p) => p.userId !== uid), { userId: uid, userName: uid.slice(0, 8), userRole: "editor" as const, cursorX: x, cursorY: y, isActive: true, joinedAt: Date.now(), color }];
        return next.slice(-20);
      });
    });
    return () => {
      unsubStroke();
      unsubShape();
      unsubText();
      unsubSticky();
      unsubEmbed();
      unsubDelete();
      unsubCursor();
    };
  }, [sessionId, userId]);

  const canvasStateRef = useRef(canvasState);
  useEffect(() => {
    canvasStateRef.current = canvasState;
  }, [canvasState]);

  const startRecording = useCallback(() => {
    recordingFramesRef.current = [];
    setIsRecording(true);
    recordingIntervalRef.current = setInterval(() => {
      recordingFramesRef.current.push({
        timestamp: Date.now(),
        state: JSON.parse(JSON.stringify(canvasStateRef.current)),
      });
    }, 2000);
  }, []);

  const handleDocumentImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      const file = files[0];
      const url = URL.createObjectURL(file);
      const isPdf = file.type === "application/pdf";
      const baseX = 100;
      const baseY = 100;
      if (isPdf) {
        const el: PDFElement = {
          id: uuidv4(),
          fileUrl: url,
          fileName: file.name,
          pageNumber: 1,
          totalPages: 1,
          x: baseX,
          y: baseY,
          width: 400,
          height: 500,
          scale: 1,
          opacity: 1,
          timestamp: Date.now(),
        };
        handleCanvasStateChange(
          { ...canvasState, pdfs: [...canvasState.pdfs, el] },
          { pushUndo: true, undoBase: canvasState }
        );
      } else if (file.type.startsWith("image/")) {
        const el: ImageElement = {
          id: uuidv4(),
          fileUrl: url,
          fileName: file.name,
          x: baseX,
          y: baseY,
          width: 300,
          height: 200,
          opacity: 1,
          timestamp: Date.now(),
        };
        handleCanvasStateChange(
          { ...canvasState, images: [...canvasState.images, el] },
          { pushUndo: true, undoBase: canvasState }
        );
      }
      e.target.value = "";
    },
    [canvasState, handleCanvasStateChange]
  );

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    recordingFramesRef.current.push({
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(canvasStateRef.current)),
    });
    setHasRecording(true);
  }, []);

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (cursorThrottleRef.current) return;
      const el = canvasRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const zoom = canvasState.zoomLevel || 1;
      const worldX = (e.clientX - rect.left - canvasState.viewportX) / zoom;
      const worldY = (e.clientY - rect.top - canvasState.viewportY) / zoom;
      lastCursorRef.current = { x: worldX, y: worldY };
      cursorThrottleRef.current = setTimeout(() => {
        cursorThrottleRef.current = null;
        const cur = lastCursorRef.current;
        if (cur) {
          realtimeManager.sendCursor(sessionId, {
            userId,
            cursorX: cur.x,
            cursorY: cur.y,
            color: PARTICIPANT_COLORS[0],
          });
        }
      }, 80);
    },
    [sessionId, userId, canvasState.zoomLevel, canvasState.viewportX, canvasState.viewportY]
  );

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setViewportSize({ width: rect.width, height: rect.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => {
      const next = [...r, canvasState];
      if (next.length > MAX_UNDO) next.shift();
      return next;
    });
    setUndoStack((u) => u.slice(0, -1));
    setCanvasState(prev);
  }, [undoStack, canvasState]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((u) => {
      const arr = [...u, canvasState];
      if (arr.length > MAX_UNDO) arr.shift();
      return arr;
    });
    setRedoStack((r) => r.slice(0, -1));
    setCanvasState(next);
  }, [redoStack, canvasState]);

  const handleClear = useCallback(() => {
    handleCanvasStateChange(
      {
        ...DEFAULT_CANVAS_STATE,
        viewportX: canvasState.viewportX,
        viewportY: canvasState.viewportY,
        zoomLevel: canvasState.zoomLevel,
        backgroundColor: canvasState.backgroundColor,
        gridSize: canvasState.gridSize,
        showGrid: canvasState.showGrid,
        showRulers: canvasState.showRulers,
      },
      { pushUndo: true, undoBase: canvasState }
    );
    setSelectedTargets([]);
  }, [canvasState, handleCanvasStateChange]);

  const handleZoom = useCallback(
    (delta: number) => {
      const nextZoom = Math.max(
        0.1,
        Math.min(5, canvasState.zoomLevel + delta)
      );
      handleCanvasStateChange(
        { ...canvasState, zoomLevel: nextZoom },
        { pushUndo: false }
      );
    },
    [canvasState, handleCanvasStateChange]
  );

  const handleStrokeComplete = useCallback((_stroke: DrawingStroke) => {}, []);
  const handleShapeComplete = useCallback((_shape: ShapeElement) => {}, []);

  const handlePanelDropped = useCallback(
    (panelEmbed: PanelEmbed) => {
      const embed: PanelEmbed = {
        ...panelEmbed,
        userId: panelEmbed.userId ?? userId,
        timestamp: panelEmbed.timestamp ?? Date.now(),
      };
      handleCanvasStateChange(
        {
          ...canvasState,
          panelEmbeds: [...canvasState.panelEmbeds, embed],
        },
        { pushUndo: true, undoBase: canvasState }
      );
    },
    [canvasState, handleCanvasStateChange, userId]
  );

  const handleEmbedUpdate = useCallback(
    (updated: PanelEmbed) => {
      if (readOnly || userRole === "viewer") return;
      handleCanvasStateChange(
        {
          ...canvasState,
          panelEmbeds: canvasState.panelEmbeds.map((p) =>
            p.id === updated.id ? { ...updated, userId, timestamp: Date.now() } : p
          ),
        },
        { pushUndo: true, undoBase: canvasState }
      );
    },
    [canvasState, handleCanvasStateChange, readOnly, userRole, userId]
  );

  const handleEmbedRemove = useCallback(
    (id: string) => {
      if (readOnly || userRole === "viewer") return;
      setFullscreenEmbedId((prev) => (prev === id ? null : prev));
      setSelectedTargets((prev) => prev.filter((t) => !(t.kind === "embed" && t.id === id)));
      handleCanvasStateChange(
        {
          ...canvasState,
          panelEmbeds: canvasState.panelEmbeds.filter((p) => p.id !== id),
        },
        { pushUndo: true, undoBase: canvasState }
      );
    },
    [canvasState, handleCanvasStateChange, readOnly, userRole]
  );

  const baseName = `whiteboard-${sessionId.slice(0, 8)}`;
  const handleExportPng = useCallback(async () => {
    const canvas = contentCanvasRef.current;
    if (!canvas) return;
    await exportCanvasAsPNG(canvas, `${baseName}.png`);
  }, [sessionId]);
  const handleExportSvg = useCallback(() => {
    const w = viewportSize.width || 1920;
    const h = viewportSize.height || 1080;
    exportCanvasAsSVG(canvasState, w, h, `${baseName}.svg`);
  }, [canvasState, viewportSize.width, viewportSize.height, sessionId]);
  const handleExportPdf = useCallback(async () => {
    const w = viewportSize.width || 1920;
    const h = viewportSize.height || 1080;
    await exportCanvasAsPDF(canvasState, w, h, `${baseName}.pdf`);
  }, [canvasState, viewportSize.width, viewportSize.height, sessionId]);

  const handleApplyTemplate = useCallback(
    (update: Partial<CanvasState>) => {
      handleCanvasStateChange(
        { ...canvasState, ...update },
        { pushUndo: true, undoBase: canvasState }
      );
    },
    [canvasState, handleCanvasStateChange]
  );

  const handleNewBoard = useCallback(() => {
    const id = `wb-${Date.now()}`;
    const newList = [...sessionListState.list, { id, name: "Untitled" }];
    storage.set(NAMED_SESSIONS_KEY, newList);
    setSessionListState({ list: newList, currentId: id });
    setCanvasState(DEFAULT_CANVAS_STATE);
    setToolState(DEFAULT_TOOL_STATE);
    setUndoStack([]);
    setRedoStack([]);
    storage.set(storageKeys.moduleState(`whiteboard-canvas-${id}`), DEFAULT_CANVAS_STATE);
    storage.set(storageKeys.moduleState(`whiteboard-tools-${id}`), DEFAULT_TOOL_STATE);
    setShowSessionsModal(false);
  }, [sessionListState.list]);

  const handleOpenBoard = useCallback((id: string) => {
    setSessionListState((prev) => ({ ...prev, currentId: id }));
    setShowSessionsModal(false);
  }, []);

  const handleDeleteBoard = useCallback((id: string) => {
    const nextList = sessionListState.list.filter((s) => s.id !== id);
    const nextCurrent = sessionListState.currentId === id
      ? (nextList[0]?.id ?? (() => {
          const newId = `wb-${Date.now()}`;
          storage.set(NAMED_SESSIONS_KEY, [{ id: newId, name: "Untitled" }]);
          return newId;
        })())
      : sessionListState.currentId;
    if (nextList.length === 0) {
      const newId = `wb-${Date.now()}`;
      const newList = [{ id: newId, name: "Untitled" }];
      storage.set(NAMED_SESSIONS_KEY, newList);
      setSessionListState({ list: newList, currentId: newId });
      setCanvasState(DEFAULT_CANVAS_STATE);
      setToolState(DEFAULT_TOOL_STATE);
      setUndoStack([]);
      setRedoStack([]);
    } else {
      storage.set(NAMED_SESSIONS_KEY, nextList);
      setSessionListState({ list: nextList, currentId: nextCurrent });
    }
  }, [sessionListState]);

  useEffect(() => {
    const onPanelEmbedRequested = (e: Event) => {
      const detail = (e as CustomEvent<{ panelId: string; id?: string; x?: number; y?: number; width?: number; height?: number }>)?.detail;
      if (!detail?.panelId) return;
      const panelEmbed: PanelEmbed = {
        id: detail.id ?? `embed-${Date.now()}`,
        panelId: detail.panelId,
        x: detail.x ?? 100,
        y: detail.y ?? 100,
        width: detail.width ?? 400,
        height: detail.height ?? 300,
        zoomLevel: 1,
        drillDownLevel: 1,
        timestamp: Date.now(),
        userId,
      };
      handlePanelDropped(panelEmbed);
    };
    window.addEventListener("panel-embed-requested", onPanelEmbedRequested);
    return () => window.removeEventListener("panel-embed-requested", onPanelEmbedRequested);
  }, [userId, handlePanelDropped]);

  return (
    <div className={cn("w-full h-full flex flex-col min-h-0 bg-background", isPresenting && "fixed inset-0 z-50")}>
      <div
        ref={canvasRef}
        className="flex-1 relative min-h-0 min-w-0"
        style={{ minHeight: 200 }}
        onPointerMove={handleCanvasPointerMove}
      >
        <DashboardDragIntegration
          sessionId={sessionId}
          canvasRef={canvasRef}
          onPanelDropped={handlePanelDropped}
        />
        {!isPresenting && !readOnly && (
          <AISuggestionsPanel
            canvasState={canvasState}
            onApplyPartialState={(update) =>
              handleCanvasStateChange(
                { ...canvasState, ...update },
                { pushUndo: true, undoBase: canvasState }
              )
            }
            readOnly={readOnly}
          />
        )}
        {isPresenting && (
          <Button
            className="absolute top-3 right-3 z-50"
            variant="secondary"
            size="sm"
            onClick={() => setIsPresenting(false)}
          >
            Exit present
          </Button>
        )}
        {!isPresenting && propsSessionId == null && pages.length > 0 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-background/90 border border-border rounded-lg px-2 py-1 shadow">
          {pages.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => p.id !== currentPageId && switchPage(p.id)}
              className={cn(
                "px-3 py-1 rounded text-sm",
                p.id === currentPageId ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              {p.name}
            </button>
          ))}
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={addPage} title="Add page">
            +
          </Button>
        </div>
        )}
        {!isPresenting && (
        <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
          {propsSessionId == null && (
            <>
              <Button
                onClick={() => setShowSessionsModal(true)}
                variant="outline"
                size="sm"
                className={cn("gap-2 rounded-lg border-blue-400/30 hover:border-blue-400", "text-primary dark:text-blue-400")}
              >
                <FolderOpen size={16} />
                Boards
              </Button>
              <span
                className={cn(
                  "flex items-center gap-1 rounded px-2 py-1 text-xs",
                  syncStatus.pending > 0 ? "bg-amber-500/20 text-amber-700 dark:text-amber-400" : "bg-muted/50 text-muted-foreground"
                )}
                title={syncStatus.pending > 0 ? `${syncStatus.pending} pending` : "Synced"}
              >
                {syncStatus.pending > 0 ? <Loader2 size={12} className="animate-spin" /> : syncStatus.isOnline ? <Cloud size={12} /> : <CloudOff size={12} />}
              </span>
            </>
          )}
          <Templates
            onApplyTemplate={handleApplyTemplate}
            currentZoom={canvasState.zoomLevel}
            viewportX={canvasState.viewportX}
            viewportY={canvasState.viewportY}
          />
          <Button variant="outline" size="sm" className="gap-2 rounded-lg" onClick={() => setIsPresenting(true)} title="Presentation mode">
            <Presentation size={16} />
            Present
          </Button>
          {!isRecording ? (
            <Button variant="outline" size="sm" className="gap-2 rounded-lg" onClick={startRecording} title="Start recording">
              <Video size={16} />
              Record
            </Button>
          ) : (
            <Button variant="destructive" size="sm" className="gap-2 rounded-lg" onClick={stopRecording} title="Stop recording">
              <Square size={16} />
              Stop
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/*"
            className="hidden"
            onChange={handleDocumentImport}
          />
          <Button variant="outline" size="sm" className="gap-2 rounded-lg" onClick={() => fileInputRef.current?.click()} title="Import PDF or image">
            <FileUp size={16} />
            Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-lg"
            onClick={() => {
              const url = typeof window !== "undefined" ? window.location.href : "";
              const link = url ? `${url}${url.includes("?") ? "&" : "?"}session=${sessionId}` : "";
              if (link && navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(link);
              }
            }}
            title="Copy share link"
          >
            <Share2 size={16} />
            Share
          </Button>
          {hasRecording && (
            <Button variant="outline" size="sm" className="gap-2 rounded-lg" onClick={() => setShowPlayback(true)} title="Play recording">
              <Play size={16} />
              Play
            </Button>
          )}
        </div>
        )}
        {showSessionsModal && propsSessionId == null && (
          <div className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black/40")} onClick={() => setShowSessionsModal(false)}>
            <div className={cn("bg-background border border-border rounded-lg shadow-2xl p-6 max-w-md w-full max-h-[80vh] flex flex-col")} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Boards</h3>
                <Button onClick={() => setShowSessionsModal(false)} variant="ghost" size="sm" className="text-muted-foreground">✕</Button>
              </div>
              <div className="flex gap-2 mb-3">
                <Button onClick={handleNewBoard} size="sm" className="gap-1"><Plus size={14} /> New board</Button>
              </div>
              <ul className="space-y-1 overflow-y-auto flex-1 min-h-0">
                {sessionListState.list.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2 group">
                    <button type="button" onClick={() => handleOpenBoard(s.id)} className={cn("flex-1 text-left truncate", sessionId === s.id && "font-semibold text-primary")}>
                      {s.name}
                    </button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-70 hover:opacity-100" onClick={() => handleDeleteBoard(s.id)} title="Delete"><Trash2 size={14} /></Button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <DrawingCanvas
          sessionId={sessionId}
          userId={userId}
          canvasState={canvasState}
          selectedTool={toolState.selectedTool}
          selectedColor={toolState.selectedColor}
          selectedFillColor={toolState.selectedFillColor}
          lineWidth={toolState.lineWidth}
          opacity={toolState.opacity}
          selectedTargets={selectedTargets}
          onSelectionChange={setSelectedTargets}
          onStateChange={handleCanvasStateChange}
          onStrokeComplete={handleStrokeComplete}
          onShapeComplete={handleShapeComplete}
          readOnly={readOnly || userRole === "viewer"}
          showGrid={showGrid}
          showRulers={showRulers}
          snappingEnabled={true}
        />
        {/* Panel embeds layer: same viewport as canvas so they pan/zoom together */}
        {canvasState.panelEmbeds.length > 0 && (
          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              transform: `translate(${canvasState.viewportX}px, ${canvasState.viewportY}px) scale(${canvasState.zoomLevel})`,
              transformOrigin: "0 0",
              pointerEvents: "none",
            }}
          >
            {canvasState.panelEmbeds.map((embed) => (
              <PanelEmbedWidget
                key={embed.id}
                embed={embed}
                isFullscreen={false}
                onFullscreen={(isFullscreen) =>
                  setFullscreenEmbedId(isFullscreen ? embed.id : null)
                }
                onUpdate={handleEmbedUpdate}
                onRemove={handleEmbedRemove}
                readOnly={readOnly || userRole === "viewer"}
                isSelected={selectedTargets.some(
                  (t) => t.kind === "embed" && t.id === embed.id
                )}
                onSelect={() =>
                  setSelectedTargets([{ kind: "embed", id: embed.id }])
                }
              />
            ))}
          </div>
        )}
        {canvasState.pdfs.length > 0 && (
          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              transform: `translate(${canvasState.viewportX}px, ${canvasState.viewportY}px) scale(${canvasState.zoomLevel})`,
              transformOrigin: "0 0",
              pointerEvents: "none",
            }}
          >
            {canvasState.pdfs.map((pdf) => (
              <div
                key={pdf.id}
                className="absolute bg-white border border-border shadow"
                style={{
                  left: pdf.x,
                  top: pdf.y,
                  width: pdf.width,
                  height: pdf.height,
                  opacity: pdf.opacity,
                }}
              >
                <iframe
                  title={pdf.fileName}
                  src={pdf.fileUrl}
                  className="w-full h-full border-0"
                />
              </div>
            ))}
          </div>
        )}
        {canvasState.images.length > 0 && (
          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              transform: `translate(${canvasState.viewportX}px, ${canvasState.viewportY}px) scale(${canvasState.zoomLevel})`,
              transformOrigin: "0 0",
              pointerEvents: "none",
            }}
          >
            {canvasState.images.map((img) => (
              <img
                key={img.id}
                src={img.fileUrl}
                alt={img.fileName}
                className="absolute object-contain border border-border shadow"
                style={{
                  left: img.x,
                  top: img.y,
                  width: img.width,
                  height: img.height,
                  opacity: img.opacity,
                }}
              />
            ))}
          </div>
        )}
        {/* Fullscreen embed overlay */}
        {fullscreenEmbedId && (() => {
          const embed = canvasState.panelEmbeds.find((e) => e.id === fullscreenEmbedId);
          if (!embed) return null;
          return (
            <div className="absolute inset-0 z-50 bg-background/95 flex flex-col">
              <PanelEmbedWidget
                embed={embed}
                isFullscreen
                onFullscreen={() => setFullscreenEmbedId(null)}
                onUpdate={handleEmbedUpdate}
                onRemove={handleEmbedRemove}
                readOnly={readOnly || userRole === "viewer"}
              />
            </div>
          );
        })()}
        {!isPresenting && (
        <WhiteboardMinimap
          canvasState={canvasState}
          viewportSize={viewportSize}
          selectedTargets={selectedTargets}
          onNavigate={handleMinimapNavigate}
        />
        )}
        <RealTimeCursorsComponent
          participants={remoteParticipants}
          currentUserId={userId}
          viewportX={canvasState.viewportX}
          viewportY={canvasState.viewportY}
          zoomLevel={canvasState.zoomLevel}
          canvasWidth={viewportSize.width}
          canvasHeight={viewportSize.height}
        />
      </div>

      <KeyboardShortcutsModal isOpen={showShortcutsModal} onClose={() => setShowShortcutsModal(false)} />

      {showPlayback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowPlayback(false)}>
          <div className="bg-background border border-border rounded-lg shadow-2xl p-6 max-w-lg w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-3">Recording playback</h3>
            <p className="text-sm text-muted-foreground mb-3">
              {recordingFramesRef.current.length} frame(s). Apply a frame to restore canvas state.
            </p>
            <ul className="space-y-1 overflow-y-auto flex-1 min-h-0">
              {recordingFramesRef.current.map((frame, i) => (
                <li key={i} className="flex items-center justify-between gap-2 py-1 border-b border-border/50">
                  <span className="text-sm">Frame {i + 1} at {new Date(frame.timestamp).toLocaleTimeString()}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCanvasState(frame.state);
                      setShowPlayback(false);
                    }}
                  >
                    Apply
                  </Button>
                </li>
              ))}
            </ul>
            <Button className="mt-3" variant="secondary" onClick={() => setShowPlayback(false)}>Close</Button>
          </div>
        </div>
      )}

      {!readOnly && !isPresenting && (
        <>
          <VotingSystem
            sessionId={sessionId}
            userId={userId}
            userName={userName}
            participants={[
              { userId, userName, userRole, isActive: true, joinedAt: Date.now(), color: PARTICIPANT_COLORS[0] },
              ...remoteParticipants,
            ]}
          />
          <WorkshopTimer sessionId={sessionId} userId={userId} />
        </>
      )}

      {!isPresenting && (
      <WhiteboardToolbar
        toolState={toolState}
        onToolChange={(tool) =>
          setToolState((prev) => ({ ...prev, selectedTool: tool }))
        }
        onColorChange={(color) =>
          setToolState((prev) => ({ ...prev, selectedColor: color }))
        }
        onLineWidthChange={(width) =>
          setToolState((prev) => ({ ...prev, lineWidth: width }))
        }
        onOpacityChange={(opacity) =>
          setToolState((prev) => ({ ...prev, opacity }))
        }
        onGridToggle={setShowGrid}
        onRulersToggle={setShowRulers}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onZoom={handleZoom}
        showGrid={showGrid}
        showRulers={showRulers}
        zoomLevel={canvasState.zoomLevel}
        readOnly={readOnly}
        onExportPng={handleExportPng}
        onExportSvg={handleExportSvg}
        onExportPdf={handleExportPdf}
      />
      )}
    </div>
  );
}
