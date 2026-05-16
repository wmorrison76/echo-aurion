import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  useDesignerState,
  useCanvasOperations,
  useHistory,
  useKeyboardShortcuts,
  createKeyboardShortcuts,
  useAutoSave,
  type DesignerElement,
} from "./hooks";
import { TopToolbar } from "./layout/TopToolbar";
import { DesignerCanvas } from "./canvas/DesignerCanvas";
import { LayersPanel } from "./panels/LayersPanel";
import { InspectorPanel } from "./panels/InspectorPanel";
import { StatusBar } from "./layout/StatusBar";
import { AI3SuggestionsPanel } from "./panels/AI3SuggestionsPanel";
import { CompletedDishesGallery } from "./panels/CompletedDishesGallery";
import { DishAssemblyBridge, type DishData, type AI3Suggestion } from "./integration/DishAssemblyBridge";
import { FindReplaceDialog } from "./layout/FindReplaceDialog";
import { VersioningDialog, type DesignVersion } from "./layout/VersioningDialog";
import { ComponentsPanel } from "./panels/ComponentsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MenuDesignStudioProps {
  initialState?: any;
  onSave?: (state: any) => void;
  onExport?: (format: "pdf" | "svg", data: any) => void;
  onBack?: () => void;
}

export function MenuDesignStudio({
  initialState,
  onSave,
  onExport,
  onBack,
}: MenuDesignStudioProps) {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const [rightPanelTab, setRightPanelTab] = useState<"inspector" | "ai" | "dishes" | "components">("inspector");
  const [snapToGridEnabled, setSnapToGridEnabled] = useState(true);
  const [snapToElementsEnabled, setSnapToElementsEnabled] = useState(true);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [isVersioningOpen, setIsVersioningOpen] = useState(false);
  const [designVersions, setDesignVersions] = useState<DesignVersion[]>([]);

  const {
    state,
    addElement,
    removeElement,
    updateElement,
    selectElement,
    getSelectedElement,
    selectMultiple,
    addToSelection,
    removeFromSelection,
    toggleSelection,
    clearSelection,
    updateMultiple,
    deleteMultiple,
    getSelectedElements,
    updateCanvasSettings,
    setDocumentName,
    setPageSize,
    setDirty,
    setElements,
    copyElements,
    cutElements,
    pasteElements,
    groupElements,
    ungroupElements,
    createComponent,
    deleteComponent,
    createComponentInstance,
    updateComponentOverride,
    setComponents,
  } = useDesignerState(initialState);

  const {
    dragState,
    resizeState,
    editingId,
    startDrag,
    updateDrag,
    endDrag,
    startResize,
    updateResize,
    endResize,
    startEditingText,
    endEditingText,
    alignLeft,
    alignCenter,
    alignRight,
    alignTop,
    alignMiddle,
    alignBottom,
    distributeHorizontally,
    distributeVertically,
    matchWidth,
    matchHeight,
  } = useCanvasOperations();

  const { push: historyPush, undo, redo, canUndo, canRedo } = useHistory();
  const { save: saveDesign } = useAutoSave(state);

  // Alignment handlers
  const handleAlignLeft = useCallback(() => {
    const selected = getSelectedElements();
    if (selected.length > 1) {
      const updates = alignLeft(selected);
      Object.entries(updates).forEach(([id, update]) => {
        updateElement(id, update);
      });
      historyPush(state);
    }
  }, [state, getSelectedElements, alignLeft, updateElement, historyPush]);

  const handleAlignCenter = useCallback(() => {
    const selected = getSelectedElements();
    if (selected.length > 1) {
      const updates = alignCenter(selected);
      Object.entries(updates).forEach(([id, update]) => {
        updateElement(id, update);
      });
      historyPush(state);
    }
  }, [state, getSelectedElements, alignCenter, updateElement, historyPush]);

  const handleAlignRight = useCallback(() => {
    const selected = getSelectedElements();
    if (selected.length > 1) {
      const updates = alignRight(selected);
      Object.entries(updates).forEach(([id, update]) => {
        updateElement(id, update);
      });
      historyPush(state);
    }
  }, [state, getSelectedElements, alignRight, updateElement, historyPush]);

  const handleAlignTop = useCallback(() => {
    const selected = getSelectedElements();
    if (selected.length > 1) {
      const updates = alignTop(selected);
      Object.entries(updates).forEach(([id, update]) => {
        updateElement(id, update);
      });
      historyPush(state);
    }
  }, [state, getSelectedElements, alignTop, updateElement, historyPush]);

  const handleAlignMiddle = useCallback(() => {
    const selected = getSelectedElements();
    if (selected.length > 1) {
      const updates = alignMiddle(selected);
      Object.entries(updates).forEach(([id, update]) => {
        updateElement(id, update);
      });
      historyPush(state);
    }
  }, [state, getSelectedElements, alignMiddle, updateElement, historyPush]);

  const handleAlignBottom = useCallback(() => {
    const selected = getSelectedElements();
    if (selected.length > 1) {
      const updates = alignBottom(selected);
      Object.entries(updates).forEach(([id, update]) => {
        updateElement(id, update);
      });
      historyPush(state);
    }
  }, [state, getSelectedElements, alignBottom, updateElement, historyPush]);

  const handleDistributeHorizontally = useCallback(() => {
    const selected = getSelectedElements();
    if (selected.length > 2) {
      const updates = distributeHorizontally(selected);
      Object.entries(updates).forEach(([id, update]) => {
        updateElement(id, update);
      });
      historyPush(state);
      toast({
        title: "Distributed",
        description: "Elements distributed horizontally",
      });
    }
  }, [state, getSelectedElements, distributeHorizontally, updateElement, historyPush, toast]);

  const handleDistributeVertically = useCallback(() => {
    const selected = getSelectedElements();
    if (selected.length > 2) {
      const updates = distributeVertically(selected);
      Object.entries(updates).forEach(([id, update]) => {
        updateElement(id, update);
      });
      historyPush(state);
      toast({
        title: "Distributed",
        description: "Elements distributed vertically",
      });
    }
  }, [state, getSelectedElements, distributeVertically, updateElement, historyPush, toast]);

  const handleMatchWidth = useCallback(() => {
    const selected = getSelectedElements();
    if (selected.length > 1) {
      const updates = matchWidth(selected);
      Object.entries(updates).forEach(([id, update]) => {
        updateElement(id, update);
      });
      historyPush(state);
    }
  }, [state, getSelectedElements, matchWidth, updateElement, historyPush]);

  const handleMatchHeight = useCallback(() => {
    const selected = getSelectedElements();
    if (selected.length > 1) {
      const updates = matchHeight(selected);
      Object.entries(updates).forEach(([id, update]) => {
        updateElement(id, update);
      });
      historyPush(state);
    }
  }, [state, getSelectedElements, matchHeight, updateElement, historyPush]);

  const handleCopy = useCallback(() => {
    if (state.selectedElementIds.length > 0) {
      copyElements(state.selectedElementIds);
      toast({
        title: "Copied",
        description: `${state.selectedElementIds.length} element${state.selectedElementIds.length !== 1 ? "s" : ""} copied to clipboard`,
      });
    }
  }, [state.selectedElementIds, copyElements, toast]);

  const handleCut = useCallback(() => {
    if (state.selectedElementIds.length > 0) {
      cutElements(state.selectedElementIds);
      clearSelection();
      historyPush(state);
      toast({
        title: "Cut",
        description: `${state.selectedElementIds.length} element${state.selectedElementIds.length !== 1 ? "s" : ""} cut to clipboard`,
      });
    }
  }, [state, state.selectedElementIds, cutElements, clearSelection, historyPush, toast]);

  const handlePaste = useCallback(() => {
    const pastedIds = pasteElements();
    if (pastedIds.length > 0) {
      selectMultiple(pastedIds);
      historyPush(state);
      toast({
        title: "Pasted",
        description: `${pastedIds.length} element${pastedIds.length !== 1 ? "s" : ""} pasted`,
      });
    } else {
      toast({
        title: "Paste Failed",
        description: "Nothing to paste",
        variant: "destructive",
      });
    }
  }, [pasteElements, selectMultiple, historyPush, state, toast]);

  const handleGroupElements = useCallback(() => {
    const selected = getSelectedElements();
    if (selected.length < 2) {
      toast({
        title: "Cannot Group",
        description: "Select at least 2 elements to group",
        variant: "destructive",
      });
      return;
    }
    const groupName = `Group ${state.elements.filter((el) => el.type === "group").length + 1}`;
    groupElements(
      selected.map((el) => el.id),
      groupName
    );
    historyPush(state);
    toast({
      title: "Grouped",
      description: `${selected.length} elements grouped as "${groupName}"`,
    });
  }, [state, getSelectedElements, groupElements, historyPush, toast]);

  const handleUngroupElements = useCallback(() => {
    const selectedEl = getSelectedElement();
    if (!selectedEl || selectedEl.type !== "group") {
      toast({
        title: "Cannot Ungroup",
        description: "Select a group to ungroup",
        variant: "destructive",
      });
      return;
    }
    ungroupElements(selectedEl.id);
    historyPush(state);
    toast({
      title: "Ungrouped",
      description: "Group has been ungrouped",
    });
  }, [state, getSelectedElement, ungroupElements, historyPush, toast]);

  const handleCreateComponent = useCallback(() => {
    const selected = getSelectedElement();
    if (!selected) {
      toast({
        title: "Cannot Create Component",
        description: "Select an element to create a component",
        variant: "destructive",
      });
      return;
    }
    const componentName = `Component ${state.components.length + 1}`;
    createComponent(selected.id, componentName);
    historyPush(state);
    toast({
      title: "Component Created",
      description: `Component "${componentName}" has been created`,
    });
  }, [state, getSelectedElement, createComponent, historyPush, toast]);

  const handleLoadDesign = useCallback(
    (loadedState: typeof state) => {
      setElements(loadedState.elements);
      setPageSize(loadedState.pageSize);
      setDocumentName(loadedState.documentName);
      updateCanvasSettings(loadedState.canvasSettings);
      clearSelection();
      toast({
        title: "Design Loaded",
        description: `"${loadedState.documentName}" has been loaded`,
      });
    },
    [setElements, setPageSize, setDocumentName, updateCanvasSettings, clearSelection, toast]
  );

  // Setup keyboard shortcuts
  const shortcuts = useMemo(
    () =>
      createKeyboardShortcuts([
        {
          label: "Undo",
          key: "z",
          modifiers: ["meta"],
          callback: () => {
            const previousState = undo();
            if (previousState) {
              setDirty(true);
              toast({
                title: "Undo",
                description: "Action undone",
              });
            }
          },
        },
        {
          label: "Redo",
          key: "z",
          modifiers: ["meta", "shift"],
          callback: () => {
            const nextState = redo();
            if (nextState) {
              setDirty(true);
              toast({
                title: "Redo",
                description: "Action redone",
              });
            }
          },
        },
        {
          label: "Copy",
          key: "c",
          modifiers: ["meta"],
          callback: handleCopy,
        },
        {
          label: "Cut",
          key: "x",
          modifiers: ["meta"],
          callback: handleCut,
        },
        {
          label: "Paste",
          key: "v",
          modifiers: ["meta"],
          callback: handlePaste,
        },
        {
          label: "Delete",
          key: "Delete",
          modifiers: [],
          callback: () => {
            if (state.selectedElementIds.length > 0) {
              if (state.selectedElementIds.length > 1) {
                deleteMultiple(state.selectedElementIds);
              } else {
                const selected = getSelectedElement();
                if (selected) {
                  removeElement(selected.id);
                }
              }
              historyPush(state);
            }
          },
        },
        {
          label: "Duplicate",
          key: "d",
          modifiers: ["meta"],
          callback: () => {
            const selected = getSelectedElement();
            if (selected) {
              const newElement: Omit<DesignerElement, "id"> = {
                ...selected,
                x: selected.x + 20,
                y: selected.y + 20,
                name: `${selected.name} (copy)`,
              };
              addElement(newElement);
              historyPush(state);
            }
          },
        },
        {
          label: "Save",
          key: "s",
          modifiers: ["meta"],
          callback: () => {
            handleSave();
          },
        },
        {
          label: "Select All",
          key: "a",
          modifiers: ["meta"],
          callback: () => {
            selectMultiple(state.elements.map((el) => el.id));
            toast({
              title: "Select All",
              description: `${state.elements.length} elements selected`,
            });
          },
        },
        {
          label: "Align Left",
          key: "l",
          modifiers: ["alt"],
          callback: handleAlignLeft,
        },
        {
          label: "Align Center",
          key: "c",
          modifiers: ["alt"],
          callback: handleAlignCenter,
        },
        {
          label: "Align Right",
          key: "r",
          modifiers: ["alt"],
          callback: handleAlignRight,
        },
        {
          label: "Align Top",
          key: "t",
          modifiers: ["alt"],
          callback: handleAlignTop,
        },
        {
          label: "Align Middle",
          key: "m",
          modifiers: ["alt"],
          callback: handleAlignMiddle,
        },
        {
          label: "Align Bottom",
          key: "b",
          modifiers: ["alt"],
          callback: handleAlignBottom,
        },
        {
          label: "Distribute Horizontally",
          key: "h",
          modifiers: ["alt", "shift"],
          callback: handleDistributeHorizontally,
        },
        {
          label: "Distribute Vertically",
          key: "v",
          modifiers: ["alt", "shift"],
          callback: handleDistributeVertically,
        },
        {
          label: "Find & Replace",
          key: "h",
          modifiers: ["meta"],
          callback: () => setIsFindReplaceOpen(true),
        },
        {
          label: "Version History",
          key: "shift+h",
          modifiers: ["meta"],
          callback: () => setIsVersioningOpen(true),
        },
        {
          label: "Group",
          key: "g",
          modifiers: ["meta"],
          callback: handleGroupElements,
        },
        {
          label: "Ungroup",
          key: "g",
          modifiers: ["meta", "shift"],
          callback: handleUngroupElements,
        },
        {
          label: "Create Component",
          key: "k",
          modifiers: ["meta"],
          callback: handleCreateComponent,
        },
      ]),
    [
      undo,
      redo,
      getSelectedElement,
      removeElement,
      addElement,
      state,
      historyPush,
      toast,
      selectMultiple,
      deleteMultiple,
      handleAlignLeft,
      handleAlignCenter,
      handleAlignRight,
      handleAlignTop,
      handleAlignMiddle,
      handleAlignBottom,
      handleDistributeHorizontally,
      handleDistributeVertically,
      handleCopy,
      handleCut,
      handlePaste,
      setIsFindReplaceOpen,
      setIsVersioningOpen,
      handleGroupElements,
      handleUngroupElements,
      handleCreateComponent,
      getSelectedElements,
    ]
  );

  useKeyboardShortcuts(shortcuts);

  // Track state changes in history
  useEffect(() => {
    historyPush(state);
  }, [state.elements.length]);

  const handleSave = useCallback(() => {
    const designId = `design-${Date.now()}`;
    const saved = saveDesign(designId, state.documentName);
    if (saved) {
      setDirty(false);
      toast({
        title: "Design Saved",
        description: `"${state.documentName}" has been saved`,
      });
      onSave?.(state);
    } else {
      toast({
        title: "Save Failed",
        description: "Could not save design",
        variant: "destructive",
      });
    }
  }, [state, saveDesign, setDirty, toast, onSave]);

  const handleExportPDF = useCallback(() => {
    try {
      onExport?.("pdf", state);
      toast({
        title: "Exporting",
        description: "Your menu is being exported as PDF",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not export as PDF",
        variant: "destructive",
      });
    }
  }, [state, onExport, toast]);

  const handleExportSVG = useCallback(() => {
    try {
      onExport?.("svg", state);
      toast({
        title: "Exporting",
        description: "Your menu is being exported as SVG",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not export as SVG",
        variant: "destructive",
      });
    }
  }, [state, onExport, toast]);

  const handleSaveVersion = useCallback(
    (name: string, description: string) => {
      const newVersion: DesignVersion = {
        id: `version-${Date.now()}`,
        name,
        description,
        timestamp: Date.now(),
        state: JSON.parse(JSON.stringify(state)),
      };
      setDesignVersions([newVersion, ...designVersions]);
      toast({
        title: "Version Saved",
        description: `"${name}" has been saved`,
      });
    },
    [state, designVersions, toast]
  );

  const handleLoadVersion = useCallback(
    (version: DesignVersion) => {
      setElements(version.state.elements);
      setPageSize(version.state.pageSize);
      setDocumentName(version.state.documentName);
      updateCanvasSettings(version.state.canvasSettings);
      clearSelection();
      historyPush(state);
      toast({
        title: "Version Loaded",
        description: `"${version.name}" has been loaded`,
      });
    },
    [setElements, setPageSize, setDocumentName, updateCanvasSettings, clearSelection, historyPush, state, toast]
  );

  const handleDeleteVersion = useCallback(
    (versionId: string) => {
      setDesignVersions(designVersions.filter((v) => v.id !== versionId));
      toast({
        title: "Version Deleted",
        description: "Version has been removed",
      });
    },
    [designVersions, toast]
  );

  const handleAddElement = useCallback(
    (type: string) => {
      // Position new elements in center-top area of canvas for better visibility
      const centerX = Math.max(50, (state.pageSize.width - 200) / 2);
      const centerY = 50;

      const baseElement = {
        type: type as DesignerElement["type"],
        name: `${type.charAt(0).toUpperCase()}${type.slice(1)}`,
        x: centerX,
        y: centerY,
        width: 200,
        height: 60,
        rotation: 0,
        opacity: 1,
        zIndex: state.elements.length,
      };

      let element: any = baseElement;
      if (type === "text" || type === "heading" || type === "subheading" || type === "body") {
        element = {
          ...baseElement,
          text: "Sample text",
          fontFamily: "'Inter', sans-serif",
          fontSize: 16,
          fontWeight: 400,
          color: "#000000",
          align: "left" as const,
        };
      } else if (type === "menu-item") {
        element = {
          ...baseElement,
          text: "Menu Item Name",
          description: "Item description",
          price: 12.99,
          currency: "USD",
          fontFamily: "'Inter', sans-serif",
          fontSize: 14,
          color: "#000000",
        };
      } else if (type === "image") {
        element = {
          ...baseElement,
          imageUrl: "https://via.placeholder.com/200x200",
        };
      } else if (type === "shape") {
        element = {
          ...baseElement,
          shape: "rectangle" as const,
          fill: "#e0e7ff",
          borderColor: "#c7d2fe",
          borderWidth: 1,
        };
      }

      addElement(element);
      historyPush(state);
    },
    [state, addElement, historyPush]
  );

  const handleApplyTemplate = useCallback(
    (templateElements: Omit<DesignerElement, "id">[]) => {
      // Clear existing elements and add template elements
      setElements(templateElements as DesignerElement[]);
      historyPush(state);
      toast({
        title: "Template Applied",
        description: "Template elements have been added to your canvas",
      });
    },
    [setElements, state, historyPush, toast]
  );

  // AI³ Integration Handlers
  const handleApplySuggestion = useCallback(
    (suggestion: AI3Suggestion) => {
      if (suggestion.type === "color") {
        // Apply color palette
        if (suggestion.details?.colors) {
          updateCanvasSettings({ background: suggestion.details.colors[4] || "#ffffff" });
          toast({
            title: "Palette Applied",
            description: `${suggestion.title} color scheme applied`,
          });
        }
      } else if (suggestion.type === "layout") {
        toast({
          title: "Layout Suggestion",
          description: suggestion.title,
        });
      } else if (suggestion.type === "typography") {
        toast({
          title: "Typography Applied",
          description: suggestion.title,
        });
      } else if (suggestion.type === "content" || suggestion.type === "composition") {
        toast({
          title: "Analysis Complete",
          description: suggestion.title,
        });
      }
      historyPush(state);
    },
    [updateCanvasSettings, historyPush, state, toast]
  );

  const handleGenerateLayoutsFromDishes = useCallback(
    (style: string) => {
      // This would connect to Dish Assembly data
      toast({
        title: "Generate from Dishes",
        description: "Select dishes from the gallery to create a menu design",
      });
      setRightPanelTab("dishes");
    },
    [toast]
  );

  const handleGenerateMenuDesign = useCallback(
    (dishes: DishData | DishData[]) => {
      const dishArray = Array.isArray(dishes) ? dishes : [dishes];
      const elements = DishAssemblyBridge.generateMenuFromDishes(dishArray, "featured");

      // Add generated elements to canvas
      elements.forEach((element) => {
        addElement(element);
      });

      historyPush(state);
      toast({
        title: "Menu Generated",
        description: `${dishArray.length} dish${dishArray.length !== 1 ? "es" : ""} added to canvas`,
      });
      setRightPanelTab("inspector");
    },
    [addElement, historyPush, state, toast]
  );

  const handleSelectDish = useCallback(
    (dish: DishData) => {
      toast({
        title: "Dish Selected",
        description: `Ready to design with "${dish.name}"`,
      });
    },
    [toast]
  );

  const selectedElement = getSelectedElement();

  return (
    <div ref={containerRef} className="flex h-screen flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden" style={{ position: "relative", zIndex: 0 }}>
      {/* Top Toolbar with Menu Bar and Page Selector */}
      <TopToolbar
        documentName={state.documentName}
        onDocumentNameChange={setDocumentName}
        pageSize={state.pageSize}
        onPageSizeChange={setPageSize}
        backgroundColor={state.canvasSettings.background}
        onBackgroundColorChange={(color) => {
          updateCanvasSettings({ background: color });
        }}
        canvasSettings={state.canvasSettings}
        onCanvasSettingsChange={updateCanvasSettings}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onAddElement={handleAddElement}
        onExportPDF={handleExportPDF}
        onExportSVG={handleExportSVG}
        onSave={handleSave}
        onLoadDesign={handleLoadDesign}
        currentState={state}
        onCopy={handleCopy}
        onCut={handleCut}
        onPaste={handlePaste}
        onFindReplace={() => setIsFindReplaceOpen(true)}
        onVersionHistory={() => setIsVersioningOpen(true)}
        onGroup={handleGroupElements}
        onUngroup={handleUngroupElements}
        onCreateComponent={handleCreateComponent}
        onOpenSettings={() => {
          toast({
            title: "Settings",
            description: "Settings panel coming soon",
          });
        }}
        isDirty={state.isDirty}
        onBack={onBack}
        onToggleSnapToGrid={setSnapToGridEnabled}
        onToggleSnapToElements={setSnapToElementsEnabled}
        snapToGridEnabled={snapToGridEnabled}
        snapToElementsEnabled={snapToElementsEnabled}
      />

      {/* Main Content Area - Fixed sizing */}
      <div className="flex flex-1 overflow-hidden min-h-0" style={{ position: "relative", zIndex: 1 }}>
        {/* Left Sidebar - Layers Panel */}
        <div className="hidden w-56 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:flex lg:flex-col overflow-y-auto shadow-lg">
          <LayersPanel
            elements={state.elements}
            selectedElementId={state.selectedElementId}
            onSelectElement={selectElement}
            onRemoveElement={removeElement}
            onUpdateElement={updateElement}
          />
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-950 min-w-0">
          <DesignerCanvas
            elements={state.elements}
            selectedElementId={state.selectedElementId}
            selectedElementIds={state.selectedElementIds}
            pageSize={state.pageSize}
            canvasSettings={state.canvasSettings}
            onSelectElement={selectElement}
            onSelectMultiple={selectMultiple}
            onAddToSelection={addToSelection}
            onToggleSelection={toggleSelection}
            onClearSelection={clearSelection}
            onUpdateElement={updateElement}
            onUpdateMultiple={updateMultiple}
            onStartDrag={startDrag}
            onUpdateDrag={updateDrag}
            onEndDrag={endDrag}
            onStartResize={startResize}
            onUpdateResize={updateResize}
            onEndResize={endResize}
            onStartEditingText={startEditingText}
            onEndEditingText={endEditingText}
            onAlignLeft={handleAlignLeft}
            onAlignCenter={handleAlignCenter}
            onAlignRight={handleAlignRight}
            onAlignTop={handleAlignTop}
            onAlignMiddle={handleAlignMiddle}
            onAlignBottom={handleAlignBottom}
            onDistributeHorizontally={handleDistributeHorizontally}
            onDistributeVertically={handleDistributeVertically}
            onMatchWidth={handleMatchWidth}
            onMatchHeight={handleMatchHeight}
            dragState={dragState}
            resizeState={resizeState}
            editingId={editingId}
            snapToGridEnabled={snapToGridEnabled}
            snapToElementsEnabled={snapToElementsEnabled}
          />
        </div>

        {/* Right Sidebar - Tabbed Panel with Inspector, AI³, and Dishes */}
        <div className="hidden w-80 border-l border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 xl:flex xl:flex-col overflow-hidden shadow-lg">
          <Tabs value={rightPanelTab} onValueChange={(val) => setRightPanelTab(val as any)} className="flex flex-col h-full">
            <TabsList className="grid w-full grid-cols-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <TabsTrigger value="inspector" className="text-xs">
                Inspector
              </TabsTrigger>
              <TabsTrigger value="components" className="text-xs">
                Components
              </TabsTrigger>
              <TabsTrigger value="ai" className="text-xs">
                AI³
              </TabsTrigger>
              <TabsTrigger value="dishes" className="text-xs">
                Dishes
              </TabsTrigger>
            </TabsList>

            {/* Inspector Tab */}
            <TabsContent value="inspector" className="flex-1 overflow-y-auto">
              {selectedElement && (
                <InspectorPanel
                  element={selectedElement}
                  pageSize={state.pageSize}
                  canvasSettings={state.canvasSettings}
                  onUpdateElement={(updates) => {
                    updateElement(selectedElement.id, updates);
                    historyPush(state);
                  }}
                  onUpdateCanvasSettings={(settings) => {
                    updateCanvasSettings(settings);
                    historyPush(state);
                  }}
                  onApplyTemplate={handleApplyTemplate}
                />
              )}
              {!selectedElement && (
                <InspectorPanel
                  element={{
                    id: "placeholder",
                    type: "heading",
                    name: "No Element Selected",
                    x: 0,
                    y: 0,
                    width: 100,
                    height: 100,
                    rotation: 0,
                    opacity: 1,
                    zIndex: 0,
                    text: "",
                    fontSize: 16,
                    fontWeight: 400,
                    fontFamily: "'Inter', sans-serif",
                    color: "#000000",
                    align: "left",
                  }}
                  pageSize={state.pageSize}
                  canvasSettings={state.canvasSettings}
                  onUpdateElement={() => {}}
                  onUpdateCanvasSettings={() => {}}
                  onApplyTemplate={handleApplyTemplate}
                />
              )}
            </TabsContent>

            {/* Components Tab */}
            <TabsContent value="components" className="flex-1 overflow-hidden">
              <ComponentsPanel
                components={state.components}
                elements={state.elements}
                onCreateInstance={(componentId) => {
                  createComponentInstance(componentId, 100, 100);
                  historyPush(state);
                  toast({
                    title: "Instance Created",
                    description: "Component instance has been created on the canvas",
                  });
                }}
                onDeleteComponent={(componentId) => {
                  deleteComponent(componentId);
                  historyPush(state);
                  toast({
                    title: "Component Deleted",
                    description: "Component has been deleted",
                  });
                }}
              />
            </TabsContent>

            {/* AI³ Suggestions Tab */}
            <TabsContent value="ai" className="flex-1 overflow-hidden">
              <AI3SuggestionsPanel
                elements={state.elements}
                selectedElementId={state.selectedElementId}
                onApplySuggestion={handleApplySuggestion}
                onGenerateLayouts={handleGenerateLayoutsFromDishes}
                onEnhanceContent={(elementId) => {
                  toast({
                    title: "Content Enhancement",
                    description: "AI-generated content suggestions coming soon",
                  });
                }}
              />
            </TabsContent>

            {/* Completed Dishes Tab */}
            <TabsContent value="dishes" className="flex-1 overflow-hidden">
              <CompletedDishesGallery
                dishes={[]}
                onGenerateDesign={handleGenerateMenuDesign}
                onSelectDish={handleSelectDish}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar
        zoom={state.canvasSettings.zoom}
        selectedElementCount={state.selectedElementIds.length}
        totalElementCount={state.elements.length}
      />

      {/* Find & Replace Dialog */}
      <FindReplaceDialog
        elements={state.elements}
        onReplace={(elementId, updates) => {
          updateElement(elementId, updates);
          historyPush(state);
        }}
        isOpen={isFindReplaceOpen}
        onClose={() => setIsFindReplaceOpen(false)}
      />

      {/* Versioning Dialog */}
      <VersioningDialog
        versions={designVersions}
        onSaveVersion={handleSaveVersion}
        onLoadVersion={handleLoadVersion}
        onDeleteVersion={handleDeleteVersion}
        isOpen={isVersioningOpen}
        onClose={() => setIsVersioningOpen(false)}
        currentState={state}
      />
    </div>
  );
}

export default MenuDesignStudio;
