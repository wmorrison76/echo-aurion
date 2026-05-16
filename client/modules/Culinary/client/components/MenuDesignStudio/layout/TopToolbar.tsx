import { useState } from "react";
import {
  ChevronDown,
  Save,
  Undo2,
  Redo2,
  Plus,
  Download,
  Settings,
  Menu,
  X,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { MenuBar } from "./MenuBar";
import { PageSizeSelector } from "./PageSizeSelector";
import { PageColorSelector } from "./PageColorSelector";
import { DocumentSettingsDialog } from "./DocumentSettingsDialog";
import { FileDialog } from "./FileDialog";
import type { PageSize, CanvasSettings, DesignerState } from "../hooks";

interface TopToolbarProps {
  documentName: string;
  onDocumentNameChange: (name: string) => void;
  pageSize: PageSize;
  onPageSizeChange: (size: PageSize) => void;
  backgroundColor: string;
  onBackgroundColorChange: (color: string) => void;
  canvasSettings?: CanvasSettings;
  onCanvasSettingsChange?: (settings: Partial<CanvasSettings>) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAddElement: (type: string) => void;
  onExportPDF: () => void;
  onExportSVG: () => void;
  onSave: () => void;
  onLoadDesign?: (state: DesignerState) => void;
  currentState?: DesignerState;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onFindReplace?: () => void;
  onVersionHistory?: () => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  onCreateComponent?: () => void;
  onOpenSettings: () => void;
  isDirty: boolean;
  onBack?: () => void;
  onToggleSnapToGrid?: (enabled: boolean) => void;
  onToggleSnapToElements?: (enabled: boolean) => void;
  snapToGridEnabled?: boolean;
  snapToElementsEnabled?: boolean;
  className?: string;
}

export function TopToolbar({
  documentName,
  onDocumentNameChange,
  pageSize,
  onPageSizeChange,
  backgroundColor,
  onBackgroundColorChange,
  canvasSettings,
  onCanvasSettingsChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAddElement,
  onExportPDF,
  onExportSVG,
  onSave,
  onLoadDesign,
  currentState,
  onCopy,
  onCut,
  onPaste,
  onFindReplace,
  onVersionHistory,
  onGroup,
  onUngroup,
  onCreateComponent,
  onToggleSnapToGrid,
  onToggleSnapToElements,
  snapToGridEnabled = true,
  snapToElementsEnabled = true,
  onOpenSettings,
  isDirty,
  onBack,
  className,
}: TopToolbarProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState(documentName);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNameBlur = () => {
    if (editingName.trim()) {
      onDocumentNameChange(editingName.trim());
    } else {
      setEditingName(documentName);
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNameBlur();
    } else if (e.key === "Escape") {
      setEditingName(documentName);
      setIsEditingName(false);
    }
  };

  return (
    <div className={cn("flex flex-col border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900", className)}>
      {/* Menu Bar Row */}
      <div className="flex items-center h-10 border-b border-gray-200 dark:border-gray-800">
        {/* Back Button */}
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-10 px-3 rounded-none"
            title="Back to Menu Studio"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}

        {/* Menu Bar */}
        <MenuBar
          onNew={() => {
            if (isDirty) {
              const confirmed = window.confirm(
                "You have unsaved changes. Create new design anyway?"
              );
              if (!confirmed) return;
            }
            window.location.reload();
          }}
          onOpen={() => {
            // Trigger FileDialog by clicking the open button
            const openButton = document.querySelector('[data-file-dialog="open"]');
            if (openButton instanceof HTMLElement) {
              openButton.click();
            }
          }}
          onSave={onSave}
          onSaveAs={() => {
            // Trigger FileDialog by clicking the save button
            const saveButton = document.querySelector('[data-file-dialog="save"]');
            if (saveButton instanceof HTMLElement) {
              saveButton.click();
            }
          }}
          onExportPDF={onExportPDF}
          onExportSVG={onExportSVG}
          onPrint={() => window.print()}
          onUndo={onUndo}
          onRedo={onRedo}
          onCut={onCut || (() => {})}
          onCopy={onCopy || (() => {})}
          onPaste={onPaste || (() => {})}
          onFindReplace={onFindReplace}
          onVersionHistory={onVersionHistory}
          onGroup={onGroup}
          onUngroup={onUngroup}
          onCreateComponent={onCreateComponent}
          onDelete={() => alert("Delete: Use Delete key or select element")}
          onSelectAll={() => alert("Select All: Coming soon")}
          onShowGrid={(show) => {
            onCanvasSettingsChange?.({ showGrid: show });
          }}
          onShowRulers={(show) => {
            onCanvasSettingsChange?.({ showMargins: show });
          }}
          onShowGuides={() => alert("Guides: Coming soon")}
          onZoomFit={() => alert("Zoom fit: Coming soon")}
          onZoom100={() => alert("Zoom 100%: Coming soon")}
          onAddText={() => onAddElement("heading")}
          onAddImage={() => onAddElement("image")}
          onAddShape={() => onAddElement("shape")}
          onAddDivider={() => onAddElement("divider")}
          onToggleSnapToGrid={onToggleSnapToGrid}
          onToggleSnapToElements={onToggleSnapToElements}
          canUndo={canUndo}
          canRedo={canRedo}
          showGrid={canvasSettings?.showGrid || false}
          showRulers={canvasSettings?.showMargins || false}
          showGuides={false}
          snapToGridEnabled={snapToGridEnabled}
          snapToElementsEnabled={snapToElementsEnabled}
        />
      </div>

      {/* Toolbar Row - Document Info & Controls */}
      <div className="flex items-center justify-between gap-4 h-12 px-4 py-2">
        {/* Left: Document Name */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 whitespace-nowrap">
            Menu Studio
          </div>

          {isEditingName ? (
            <Input
              autoFocus
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={handleNameKeyDown}
              className="h-7 w-48 text-sm font-medium"
              placeholder="Untitled Menu"
            />
          ) : (
            <button
              onClick={() => {
                setEditingName(documentName);
                setIsEditingName(true);
              }}
              className={cn(
                "text-sm font-medium truncate px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors max-w-xs",
                isDirty && "text-gray-700 dark:text-gray-300",
                !isDirty && "text-gray-600 dark:text-gray-400"
              )}
              title="Click to edit document name"
            >
              {documentName}
              {isDirty && <span className="ml-1 text-[#c8a97e]">•</span>}
            </button>
          )}
        </div>

        {/* Center: Page Size & Color Selectors */}
        <div className="hidden lg:flex items-center gap-4">
          <PageSizeSelector
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
          />
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
          <PageColorSelector
            backgroundColor={backgroundColor}
            onColorChange={onBackgroundColorChange}
          />
        </div>

        {/* Right: Quick Controls */}
        <div className="flex items-center gap-1 ml-auto">
          {/* Desktop Controls */}
          <div className="hidden sm:flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Cmd+Z)"
              className="h-8 w-8 p-0"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Cmd+Shift+Z)"
              className="h-8 w-8 p-0"
            >
              <Redo2 className="h-4 w-4" />
            </Button>

            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

            <Button
              variant="ghost"
              size="sm"
              onClick={onSave}
              title="Save (Cmd+S)"
              className="h-8 w-8 p-0"
            >
              <Save className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1"
                  title="Export menu"
                >
                  <Download className="h-4 w-4" />
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onExportPDF}>
                  <span>Export as PDF</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExportSVG}>
                  <span>Export as SVG</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Hidden FileDialog triggers */}
            <div className="hidden">
              <FileDialog
                mode="open"
                onSelect={onLoadDesign || (() => {})}
              >
                <button data-file-dialog="open" />
              </FileDialog>

              <FileDialog
                mode="save"
                currentDesign={currentState}
                onSave={(name) => {
                  onDocumentNameChange(name);
                  onSave();
                }}
              >
                <button data-file-dialog="save" />
              </FileDialog>
            </div>

            <DocumentSettingsDialog
              pageSize={pageSize}
              canvasSettings={canvasSettings || { background: "#ffffff", margin: 24, bleed: 18, columns: 1, gutter: 24, showGrid: false, showMargins: true, showBleed: false, showColumns: false, zoom: 1, gridSize: 16 }}
              onPageSizeChange={onPageSizeChange}
              onCanvasSettingsChange={onCanvasSettingsChange || (() => {})}
            >
              <Button
                variant="ghost"
                size="sm"
                title="Settings"
                className="h-8 w-8 p-0"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </DocumentSettingsDialog>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden h-8 w-8 p-0"
          >
            {mobileMenuOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Expanded Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 sm:hidden">
          <div className="flex flex-col gap-1 p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onUndo();
                setMobileMenuOpen(false);
              }}
              disabled={!canUndo}
              className="justify-start gap-2"
            >
              <Undo2 className="h-4 w-4" />
              Undo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onRedo();
                setMobileMenuOpen(false);
              }}
              disabled={!canRedo}
              className="justify-start gap-2"
            >
              <Redo2 className="h-4 w-4" />
              Redo
            </Button>
            <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onSave();
                setMobileMenuOpen(false);
              }}
              className="justify-start gap-2"
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onExportPDF();
                setMobileMenuOpen(false);
              }}
              className="justify-start gap-2"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </Button>

            {/* Mobile Page Size Selector */}
            <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 px-2 py-1">
                Page Size
              </p>
              <PageSizeSelector
                pageSize={pageSize}
                onPageSizeChange={onPageSizeChange}
                className="px-2 py-1"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
