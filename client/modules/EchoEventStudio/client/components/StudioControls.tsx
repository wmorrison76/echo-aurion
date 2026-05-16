import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HelpCircle,
  Keyboard,
  Play,
  Settings,
  Grid3X3,
  Download,
  RotateCcw,
  Sparkles,
  Eye,
} from "lucide-react";
import { KeyboardShortcutsDialog } from "@/components/KeyboardShortcutsDialog";
import { AIGuidedHelp } from "@/components/AIGuidedHelp";
import { GuidedTour } from "@/components/GuidedTour";
import { Panorama360Viewer } from "@/components/Panorama360Viewer";
import {
  useKeyboardShortcuts,
  DefaultShortcuts,
} from "@/hooks/useKeyboardShortcuts";
import { toast } from "@/hooks/use-toast";
export interface StudioControlsProps {
  onToggleGrid?: (show: boolean) => void;
  onExportPNG?: () => void;
  onExport360?: () => void;
  onReset?: () => void;
  onGenerateAI?: () => void;
  showGrid?: boolean;
}
export function StudioControls({
  onToggleGrid,
  onExportPNG,
  onExport360,
  onReset,
  onGenerateAI,
  showGrid = true,
}: StudioControlsProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showPanorama, setShowPanorama] = useState(false);
  const { registerShortcut } = useKeyboardShortcuts(); // Register keyboard shortcuts useEffect(() => { registerShortcut({ key: '?', shift: true, handler: () => setShowShortcuts(true), description: 'Show keyboard shortcuts', }); registerShortcut({ key: 'h', shift: true, handler: () => setShowHelp(true), description: 'Show help', }); registerShortcut({ key: 'g', handler: () => { onToggleGrid?.(!showGrid); toast({ title: `Grid ${!showGrid ? 'shown' : 'hidden'}`, description: 'Use"G" to toggle grid visibility' }); }, description: 'Toggle grid', }); registerShortcut({ key: 'e', ctrl: true, handler: () => { if (onExportPNG) { onExportPNG(); toast({ title: 'Exporting PNG...', description: 'Your render is being exported' }); } }, description: 'Export as PNG', }); registerShortcut({ key: 'p', ctrl: true, handler: () => { setShowPanorama(true); toast({ title: 'Opening 360° panorama view...' }); }, description: 'Open 360° view', }); registerShortcut({ key: 'r', handler: () => { if (onReset) { onReset(); toast({ title: 'Layout reset' }); } }, description: 'Reset layout', }); }, [registerShortcut, showGrid, onToggleGrid, onExportPNG, onReset]); return ( <> {/* Help Button Dropdown */} <DropdownMenu> <DropdownMenuTrigger asChild> <Button variant="outline" size="sm" className="gap-2" title="Help & Tools (Ctrl+H)" > <HelpCircle className="w-4 h-4" /> Help </Button> </DropdownMenuTrigger> <DropdownMenuContent align="end" className="w-48"> <DropdownMenuItem onClick={() => setShowTour(true)}> <Play className="w-4 h-4 mr-2" /> <span>Guided Tour</span> </DropdownMenuItem> <DropdownMenuItem onClick={() => setShowHelp(true)}> <Sparkles className="w-4 h-4 mr-2" /> <span>AI Guide & Tips</span> </DropdownMenuItem> <DropdownMenuSeparator /> <DropdownMenuItem onClick={() => setShowShortcuts(true)}> <Keyboard className="w-4 h-4 mr-2" /> <span>Keyboard Shortcuts</span> <span className="ml-auto text-xs text-muted-foreground">Shift+?</span> </DropdownMenuItem> <DropdownMenuItem disabled> <Settings className="w-4 h-4 mr-2" /> <span>Settings</span> </DropdownMenuItem> </DropdownMenuContent> </DropdownMenu> {/* View & Export Controls */} <div className="flex gap-2"> <Button variant="outline" size="sm" className="gap-2" onClick={() => onToggleGrid?.(!showGrid)} title={`${showGrid ? 'Hide' : 'Show'} grid (G)`} > <Grid3X3 className="w-4 h-4" /> Grid </Button> <DropdownMenu> <DropdownMenuTrigger asChild> <Button variant="outline" size="sm" className="gap-2" title="Export options" > <Download className="w-4 h-4" /> Export </Button> </DropdownMenuTrigger> <DropdownMenuContent align="end" className="w-48"> <DropdownMenuItem onClick={onExportPNG}> <Download className="w-4 h-4 mr-2" /> <span>Export PNG</span> <span className="ml-auto text-xs text-muted-foreground">Ctrl+E</span> </DropdownMenuItem> <DropdownMenuItem onClick={() => setShowPanorama(true)}> <Eye className="w-4 h-4 mr-2" /> <span>360° Panorama</span> <span className="ml-auto text-xs text-muted-foreground">Ctrl+P</span> </DropdownMenuItem> <DropdownMenuSeparator /> <DropdownMenuItem onClick={onGenerateAI} disabled={!onGenerateAI}> <Sparkles className="w-4 h-4 mr-2" /> <span>Generate with AI</span> </DropdownMenuItem> <DropdownMenuItem onClick={onReset}> <RotateCcw className="w-4 h-4 mr-2" /> <span>Reset Layout</span> </DropdownMenuItem> </DropdownMenuContent> </DropdownMenu> </div> {/* Dialogs */} <KeyboardShortcutsDialog isOpen={showShortcuts} onOpenChange={setShowShortcuts} /> <AIGuidedHelp isOpen={showHelp} onOpenChange={setShowHelp} /> <GuidedTour isActive={showTour} onComplete={() => setShowTour(false)} /> <Panorama360Viewer isOpen={showPanorama} onClose={() => setShowPanorama(false)} title="360° Panorama View" /> </> );
}
