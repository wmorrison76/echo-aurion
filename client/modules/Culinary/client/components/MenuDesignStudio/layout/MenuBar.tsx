import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";
import { FileDialog } from "./FileDialog";
import { useState } from "react";
import type { DesignerState } from "../hooks";

interface MenuBarProps {
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExportPDF: () => void;
  onExportSVG: () => void;
  onPrint: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onSelectAll: () => void;
  onFindReplace?: () => void;
  onVersionHistory?: () => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  onCreateComponent?: () => void;
  onShowGrid: (show: boolean) => void;
  onShowRulers: (show: boolean) => void;
  onShowGuides: (show: boolean) => void;
  onZoomFit: () => void;
  onZoom100: () => void;
  onAddText: () => void;
  onAddImage: () => void;
  onAddShape: () => void;
  onAddDivider: () => void;
  onToggleSnapToGrid?: (enabled: boolean) => void;
  onToggleSnapToElements?: (enabled: boolean) => void;
  canUndo: boolean;
  canRedo: boolean;
  showGrid: boolean;
  showRulers: boolean;
  showGuides: boolean;
  snapToGridEnabled?: boolean;
  snapToElementsEnabled?: boolean;
}

export function MenuBar({
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onExportPDF,
  onExportSVG,
  onPrint,
  onUndo,
  onRedo,
  onCut,
  onCopy,
  onPaste,
  onDelete,
  onSelectAll,
  onFindReplace,
  onVersionHistory,
  onGroup,
  onUngroup,
  onCreateComponent,
  onShowGrid,
  onShowRulers,
  onShowGuides,
  onZoomFit,
  onZoom100,
  onAddText,
  onAddImage,
  onAddShape,
  onAddDivider,
  onToggleSnapToGrid,
  onToggleSnapToElements,
  canUndo,
  canRedo,
  showGrid,
  showRulers,
  showGuides,
  snapToGridEnabled = true,
  snapToElementsEnabled = true,
}: MenuBarProps) {
  return (
    <div className="flex items-center gap-0 border-r border-gray-200 dark:border-gray-800">
      {/* File Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="rounded-none px-3 h-full text-sm font-medium"
          >
            File
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Document</DropdownMenuLabel>
          <DropdownMenuItem onClick={onNew}>
            <span>New Design</span>
            <span className="ml-auto text-xs text-gray-500">Cmd+N</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpen}>
            <span>Open</span>
            <span className="ml-auto text-xs text-gray-500">Cmd+O</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Save & Export</DropdownMenuLabel>
          <DropdownMenuItem onClick={onSave}>
            <span>Save</span>
            <span className="ml-auto text-xs text-gray-500">Cmd+S</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onSaveAs}>
            <span>Save As</span>
            <span className="ml-auto text-xs text-gray-500">Cmd+Shift+S</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Export</DropdownMenuLabel>
          <DropdownMenuItem onClick={onExportPDF}>
            Export as PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportSVG}>
            Export as SVG
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onPrint}>
            <span>Print</span>
            <span className="ml-auto text-xs text-gray-500">Cmd+P</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="rounded-none px-3 h-full text-sm font-medium"
          >
            Edit
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={onUndo} disabled={!canUndo}>
            <span>Undo</span>
            <span className="ml-auto text-xs text-gray-500">Cmd+Z</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onRedo} disabled={!canRedo}>
            <span>Redo</span>
            <span className="ml-auto text-xs text-gray-500">Cmd+Shift+Z</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onCut}>
            <span>Cut</span>
            <span className="ml-auto text-xs text-gray-500">Cmd+X</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onCopy}>
            <span>Copy</span>
            <span className="ml-auto text-xs text-gray-500">Cmd+C</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onPaste}>
            <span>Paste</span>
            <span className="ml-auto text-xs text-gray-500">Cmd+V</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onSelectAll}>
            <span>Select All</span>
            <span className="ml-auto text-xs text-gray-500">Cmd+A</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-red-600">
            <span>Delete</span>
            <span className="ml-auto text-xs text-gray-500">Delete</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Grouping & Components</DropdownMenuLabel>
          <DropdownMenuItem onClick={onGroup || (() => {})}>
            <span>Group</span>
            <span className="ml-auto text-xs text-gray-500">Cmd+G</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onUngroup || (() => {})}>
            <span>Ungroup</span>
            <span className="ml-auto text-xs text-gray-500">Cmd+Shift+G</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onCreateComponent || (() => {})}>
            <span>Create Component</span>
            <span className="ml-auto text-xs text-gray-500">Cmd+K</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onFindReplace || (() => {})}>
            <span>Find & Replace</span>
            <span className="ml-auto text-xs text-gray-500">Cmd+H</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onVersionHistory || (() => {})}>
            <span>Version History</span>
            <span className="ml-auto text-xs text-gray-500">Cmd+Shift+H</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* View Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="rounded-none px-3 h-full text-sm font-medium"
          >
            View
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Zoom</DropdownMenuLabel>
          <DropdownMenuItem onClick={onZoomFit}>
            <span>Fit to Screen</span>
            <span className="ml-auto text-xs text-gray-500">Cmd+1</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onZoom100}>
            <span>100%</span>
            <span className="ml-auto text-xs text-gray-500">Cmd+0</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Display</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => onShowRulers(!showRulers)}
            className="flex items-center justify-between"
          >
            <span>Show Rulers</span>
            {showRulers && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onShowGrid(!showGrid)}
            className="flex items-center justify-between"
          >
            <span>Show Grid</span>
            {showGrid && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onShowGuides(!showGuides)}
            className="flex items-center justify-between"
          >
            <span>Show Guides</span>
            {showGuides && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Snapping</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => onToggleSnapToGrid?.(!snapToGridEnabled)}
            className="flex items-center justify-between"
          >
            <span>Snap to Grid</span>
            {snapToGridEnabled && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onToggleSnapToElements?.(!snapToElementsEnabled)}
            className="flex items-center justify-between"
          >
            <span>Snap to Elements</span>
            {snapToElementsEnabled && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Insert Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="rounded-none px-3 h-full text-sm font-medium"
          >
            Insert
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Objects</DropdownMenuLabel>
          <DropdownMenuItem onClick={onAddText}>
            Text
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAddImage}>
            Image
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAddShape}>
            Shape
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAddDivider}>
            Divider
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Format Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="rounded-none px-3 h-full text-sm font-medium"
          >
            Format
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Style</DropdownMenuLabel>
          <DropdownMenuItem disabled>
            Fill Color (Open Inspector)
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            Stroke (Open Inspector)
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            Effects (Open Inspector)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Text</DropdownMenuLabel>
          <DropdownMenuItem disabled>
            Font (Open Inspector)
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            Size (Open Inspector)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Help Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="rounded-none px-3 h-full text-sm font-medium"
          >
            Help
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem disabled>
            Documentation
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <KeyboardShortcutsDialog>
              <button className="w-full text-left flex items-center gap-2 px-2 py-1.5 text-sm">
                Keyboard Shortcuts
              </button>
            </KeyboardShortcutsDialog>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            Send Feedback
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Compliance Menu — Consumer Advisory & Allergen QR */}
      <ComplianceMenu />
    </div>
  );

function ComplianceMenu() {
  const [showQR, setShowQR] = useState(false);
  const [showAdvisory, setShowAdvisory] = useState(false);

  const allergenScannerUrl = `${window.location.origin}/api/allergen-scanner-page/test-menu`;

  const generateQRDataUrl = (text: string): string => {
    // Simple QR generation using a public API for display
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="rounded-none px-3 h-full text-sm font-medium text-amber-600 dark:text-amber-400"
            data-testid="menu-compliance-btn"
          >
            Compliance
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel>Consumer Advisory</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setShowAdvisory(true)} data-testid="menu-consumer-advisory">
            <span>Consumer Advisory Notice</span>
            <span className="ml-auto text-xs text-amber-500">Required</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Allergen Disclosure</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setShowQR(true)} data-testid="menu-allergen-qr">
            <span>Generate Allergen Scanner QR</span>
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <span>FDA Allergen Matrix (PDF)</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Consumer Advisory Overlay */}
      {showAdvisory && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAdvisory(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full mx-4 p-6" onClick={e => e.stopPropagation()} data-testid="consumer-advisory-modal">
            <div className="flex items-center gap-2 mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Consumer Advisory Notice</h3>
            </div>
            <div className="border rounded-lg p-4 mb-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
              <p className="text-sm text-gray-800 dark:text-gray-200 font-medium mb-2">
                CONSUMER ADVISORY
              </p>
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                *Consuming raw or undercooked meats, poultry, seafood, shellfish, or eggs may increase your risk of foodborne illness, especially if you have certain medical conditions.
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                Items marked with an asterisk (*) contain or may be prepared with ingredients that are raw or undercooked. Please inform your server of any food allergies or dietary restrictions.
              </p>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              This notice is required by law in most jurisdictions. It should appear on all menus that serve raw or undercooked proteins.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAdvisory(false)} className="px-4 py-2 text-sm rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Close</button>
              <button onClick={() => { navigator.clipboard.writeText("*Consuming raw or undercooked meats, poultry, seafood, shellfish, or eggs may increase your risk of foodborne illness, especially if you have certain medical conditions."); setShowAdvisory(false); }} className="px-4 py-2 text-sm rounded-md bg-amber-500 text-white hover:bg-amber-600 transition-colors" data-testid="copy-advisory-btn">Copy to Clipboard</button>
            </div>
          </div>
        </div>
      )}

      {/* Allergen QR Code Overlay */}
      {showQR && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowQR(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()} data-testid="allergen-qr-modal">
            <div className="flex items-center gap-2 mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Allergen Scanner QR Code</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Guests scan this QR code to view all menu allergens and filter by their dietary restrictions.
            </p>
            <div className="flex justify-center mb-4">
              <div className="bg-white p-4 rounded-lg shadow-inner">
                <img src={generateQRDataUrl(allergenScannerUrl + "?allergies=none")} alt="Allergen Scanner QR" width={200} height={200} data-testid="allergen-qr-image" />
              </div>
            </div>
            <div className="text-center mb-4">
              <p className="text-xs font-mono text-gray-500 break-all">{allergenScannerUrl}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Place this QR code on your printed menu next to the Consumer Advisory notice. Guests with allergies can scan to see which items are safe for their specific dietary needs.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowQR(false)} className="px-4 py-2 text-sm rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Close</button>
              <button onClick={() => { window.open(generateQRDataUrl(allergenScannerUrl + "?allergies=none"), "_blank"); }} className="px-4 py-2 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors" data-testid="download-qr-btn">Download QR</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

}
