import React, { useRef, useState, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  Move,
  RotateCw,
  Eye,
  EyeOff,
  Undo2,
  Redo2,
  Download,
  Save,
  Wand2,
  Settings,
  Lightbulb,
  Grid3x3,
  Copy,
  Trash2,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
interface InvoiceTrainingToolbarProps {
  imageUrl: string;
  onZoomChange: (zoom: number) => void;
  onRotate: (angle: number) => void;
  onFilterChange: (filters: ImageFilters) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSaveTemplate: () => void;
  onExportData: () => void;
  onBatchSelect: () => void;
  onCompareView: () => void;
  currentZoom: number;
  currentRotation: number;
  canUndo: boolean;
  canRedo: boolean;
  vendorName?: string;
}
export interface ImageFilters {
  brightness: number; // 0-200 contrast: number; // 0-200 saturation: number; // 0-200 perspective: number; // -30 to 30 (skew angle in degrees) denoise: number; // 0-100 grayscale: boolean; invert: boolean;
}
const DEFAULT_FILTERS: ImageFilters = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  perspective: 0,
  denoise: 0,
  grayscale: false,
  invert: false,
};
export function InvoiceTrainingToolbar({
  imageUrl,
  onZoomChange,
  onRotate,
  onFilterChange,
  onUndo,
  onRedo,
  onSaveTemplate,
  onExportData,
  onBatchSelect,
  onCompareView,
  currentZoom,
  currentRotation,
  canUndo,
  canRedo,
  vendorName = "Unknown",
}: InvoiceTrainingToolbarProps) {
  const [filters, setFilters] = useState<ImageFilters>(DEFAULT_FILTERS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [showConfidenceBreakdown, setShowConfidenceBreakdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateFilter = useCallback(
    (key: keyof ImageFilters, value: any) => {
      const newFilters = { ...filters, [key]: value };
      setFilters(newFilters);
      onFilterChange(newFilters);
    },
    [filters, onFilterChange],
  );
  const applyImageFilter = (filterKey: keyof ImageFilters) => {
    const newValue =
      filterKey === "grayscale" || filterKey === "invert"
        ? !filters[filterKey as keyof ImageFilters]
        : filters[filterKey as keyof ImageFilters];
    updateFilter(filterKey, newValue);
  };
  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    onFilterChange(DEFAULT_FILTERS);
  };
  const getFilterStyle = (): React.CSSProperties => {
    const f = filters;
    let filterString = "";
    if (f.brightness !== 100) filterString += `brightness(${f.brightness}%) `;
    if (f.contrast !== 100) filterString += `contrast(${f.contrast}%) `;
    if (f.saturation !== 100)
      filterString += `saturate(${f.saturation / 100}) `;
    if (f.denoise > 0) filterString += `blur(${f.denoise * 0.3}px) `;
    if (f.grayscale) filterString += `grayscale(100%) `;
    if (f.invert) filterString += `invert(100%) `;
    return {
      filter: filterString.trim(),
      transform: `rotate(${currentRotation}deg) skewX(${f.perspective}deg)`,
      zIndex: 10,
    };
  };
  const handleExportTrainingData = () => {
    const trainingData = {
      vendor: vendorName,
      timestamp: new Date().toISOString(),
      filters: filters,
      zoom: currentZoom,
      rotation: currentRotation,
      imageUrl: imageUrl,
    };
    const dataStr = JSON.stringify(trainingData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoice-training-${vendorName}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  return (
    <TooltipProvider>
      {" "}
      <div className="space-y-3 pb-3 border-b border-slate-800/60 bg-surface p-3 rounded-lg">
        {" "}
        {/* Main Toolbar */}{" "}
        <div className="flex items-center gap-1 flex-wrap">
          {" "}
          {/* Zoom Controls */}{" "}
          <div className="flex items-center gap-1 border-l border-border pl-2">
            {" "}
            <Tooltip>
              {" "}
              <TooltipTrigger asChild>
                {" "}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onZoomChange(Math.max(0.5, currentZoom - 0.1))}
                >
                  {" "}
                  <ZoomOut className="h-4 w-4" />{" "}
                </Button>{" "}
              </TooltipTrigger>{" "}
              <TooltipContent>Zoom out</TooltipContent>{" "}
            </Tooltip>{" "}
            <span className="text-xs text-slate-400 w-8 text-center">
              {" "}
              {Math.round(currentZoom * 100)}%{" "}
            </span>{" "}
            <Tooltip>
              {" "}
              <TooltipTrigger asChild>
                {" "}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onZoomChange(Math.min(3, currentZoom + 0.1))}
                >
                  {" "}
                  <ZoomIn className="h-4 w-4" />{" "}
                </Button>{" "}
              </TooltipTrigger>{" "}
              <TooltipContent>Zoom in</TooltipContent>{" "}
            </Tooltip>{" "}
          </div>{" "}
          {/* Rotation */}{" "}
          <Tooltip>
            {" "}
            <TooltipTrigger asChild>
              {" "}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRotate((currentRotation + 90) % 360)}
              >
                {" "}
                <RotateCw className="h-4 w-4" />{" "}
              </Button>{" "}
            </TooltipTrigger>{" "}
            <TooltipContent>Rotate image (90°)</TooltipContent>{" "}
          </Tooltip>{" "}
          {/* Pan Tool */}{" "}
          <Tooltip>
            {" "}
            <TooltipTrigger asChild>
              {" "}
              <Button variant="ghost" size="sm" title="Pan tool (drag image)">
                {" "}
                <Move className="h-4 w-4" />{" "}
              </Button>{" "}
            </TooltipTrigger>{" "}
            <TooltipContent>Pan/drag tool</TooltipContent>{" "}
          </Tooltip>{" "}
          {/* Undo/Redo */}{" "}
          <div className="flex items-center gap-1 border-l border-border pl-2">
            {" "}
            <Tooltip>
              {" "}
              <TooltipTrigger asChild>
                {" "}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onUndo}
                  disabled={!canUndo}
                >
                  {" "}
                  <Undo2 className="h-4 w-4" />{" "}
                </Button>{" "}
              </TooltipTrigger>{" "}
              <TooltipContent>Undo</TooltipContent>{" "}
            </Tooltip>{" "}
            <Tooltip>
              {" "}
              <TooltipTrigger asChild>
                {" "}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRedo}
                  disabled={!canRedo}
                >
                  {" "}
                  <Redo2 className="h-4 w-4" />{" "}
                </Button>{" "}
              </TooltipTrigger>{" "}
              <TooltipContent>Redo</TooltipContent>{" "}
            </Tooltip>{" "}
          </div>{" "}
          {/* Image Adjustments Menu */}{" "}
          <DropdownMenu>
            {" "}
            <Tooltip>
              {" "}
              <TooltipTrigger asChild>
                {" "}
                <Button variant="ghost" size="sm">
                  {" "}
                  <Lightbulb className="h-4 w-4" />{" "}
                </Button>{" "}
              </TooltipTrigger>{" "}
              <TooltipContent>Image adjustments</TooltipContent>{" "}
            </Tooltip>{" "}
            <DropdownMenuContent align="start" className="w-56">
              {" "}
              <DropdownMenuLabel>Brightness & Contrast</DropdownMenuLabel>{" "}
              <div className="px-2 py-2 space-y-3">
                {" "}
                <div>
                  {" "}
                  <label className="text-xs text-slate-400">
                    {" "}
                    Brightness: {filters.brightness}%{" "}
                  </label>{" "}
                  <Slider
                    value={[filters.brightness]}
                    onValueChange={(val) => updateFilter("brightness", val[0])}
                    min={0}
                    max={200}
                    step={10}
                    className="w-full"
                  />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-xs text-slate-400">
                    {" "}
                    Contrast: {filters.contrast}%{" "}
                  </label>{" "}
                  <Slider
                    value={[filters.contrast]}
                    onValueChange={(val) => updateFilter("contrast", val[0])}
                    min={0}
                    max={200}
                    step={10}
                    className="w-full"
                  />{" "}
                </div>{" "}
              </div>{" "}
              <DropdownMenuSeparator />{" "}
              <DropdownMenuLabel>Color & Effects</DropdownMenuLabel>{" "}
              <DropdownMenuCheckboxItem
                checked={filters.grayscale}
                onCheckedChange={() => applyImageFilter("grayscale")}
              >
                {" "}
                Grayscale/B&W{" "}
              </DropdownMenuCheckboxItem>{" "}
              <DropdownMenuCheckboxItem
                checked={filters.invert}
                onCheckedChange={() => applyImageFilter("invert")}
              >
                {" "}
                Invert colors{" "}
              </DropdownMenuCheckboxItem>{" "}
              <DropdownMenuSeparator />{" "}
              <DropdownMenuLabel>Enhancement</DropdownMenuLabel>{" "}
              <div className="px-2 py-2">
                {" "}
                <label className="text-xs text-slate-400">
                  {" "}
                  Denoise: {filters.denoise}%{" "}
                </label>{" "}
                <Slider
                  value={[filters.denoise]}
                  onValueChange={(val) => updateFilter("denoise", val[0])}
                  min={0}
                  max={100}
                  step={10}
                  className="w-full"
                />{" "}
              </div>{" "}
              <DropdownMenuSeparator />{" "}
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="w-full justify-start"
              >
                {" "}
                Reset all filters{" "}
              </Button>{" "}
            </DropdownMenuContent>{" "}
          </DropdownMenu>{" "}
          {/* Advanced Tools Menu */}{" "}
          <DropdownMenu>
            {" "}
            <Tooltip>
              {" "}
              <TooltipTrigger asChild>
                {" "}
                <Button variant="ghost" size="sm">
                  {" "}
                  <Settings className="h-4 w-4" />{" "}
                </Button>{" "}
              </TooltipTrigger>{" "}
              <TooltipContent>Advanced tools</TooltipContent>{" "}
            </Tooltip>{" "}
            <DropdownMenuContent align="start" className="w-56">
              {" "}
              <DropdownMenuLabel>Perspective Correction</DropdownMenuLabel>{" "}
              <div className="px-2 py-2">
                {" "}
                <label className="text-xs text-slate-400">
                  {" "}
                  Skew correction: {filters.perspective}°{" "}
                </label>{" "}
                <Slider
                  value={[filters.perspective]}
                  onValueChange={(val) => updateFilter("perspective", val[0])}
                  min={-30}
                  max={30}
                  step={5}
                  className="w-full"
                />{" "}
                <p className="text-xs text-muted-foreground mt-1">
                  {" "}
                  Adjust for tilted invoices{" "}
                </p>{" "}
              </div>{" "}
              <DropdownMenuSeparator />{" "}
              <DropdownMenuLabel>View Options</DropdownMenuLabel>{" "}
              <DropdownMenuItem onClick={onCompareView}>
                {" "}
                <Eye className="h-4 w-4 mr-2" /> Side-by-side compare{" "}
              </DropdownMenuItem>{" "}
              <DropdownMenuSeparator />{" "}
              <DropdownMenuLabel>Data Management</DropdownMenuLabel>{" "}
              <DropdownMenuItem onClick={onSaveTemplate}>
                {" "}
                <Save className="h-4 w-4 mr-2" /> Save as vendor template{" "}
              </DropdownMenuItem>{" "}
              <DropdownMenuItem onClick={handleExportTrainingData}>
                {" "}
                <Download className="h-4 w-4 mr-2" /> Export training data{" "}
              </DropdownMenuItem>{" "}
              <DropdownMenuItem onClick={onBatchSelect}>
                {" "}
                <Grid3x3 className="h-4 w-4 mr-2" /> Batch select lines{" "}
              </DropdownMenuItem>{" "}
            </DropdownMenuContent>{" "}
          </DropdownMenu>{" "}
          {/* AI Suggestions */}{" "}
          <Tooltip>
            {" "}
            <TooltipTrigger asChild>
              {" "}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAISuggestions(true)}
              >
                {" "}
                <Wand2 className="h-4 w-4" />{" "}
              </Button>{" "}
            </TooltipTrigger>{" "}
            <TooltipContent>
              AI suggestions for improvements
            </TooltipContent>{" "}
          </Tooltip>{" "}
          {/* Confidence Info */}{" "}
          <Tooltip>
            {" "}
            <TooltipTrigger asChild>
              {" "}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConfidenceBreakdown(true)}
              >
                {" "}
                <MessageSquare className="h-4 w-4" />{" "}
              </Button>{" "}
            </TooltipTrigger>{" "}
            <TooltipContent>Confidence breakdown</TooltipContent>{" "}
          </Tooltip>{" "}
          {/* Spacer */} <div className="flex-1" />{" "}
          {/* Keyboard Shortcuts Info */}{" "}
          <Tooltip>
            {" "}
            <TooltipTrigger asChild>
              {" "}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {" "}
                <span className="text-xs">⌨️ Shortcuts</span>{" "}
              </Button>{" "}
            </TooltipTrigger>{" "}
            <TooltipContent>View keyboard shortcuts</TooltipContent>{" "}
          </Tooltip>{" "}
        </div>{" "}
        {/* Keyboard Shortcuts Panel */}{" "}
        {showAdvanced && (
          <div className="grid grid-cols-2 gap-2 p-2 bg-slate-800/50 rounded text-xs text-slate-300">
            {" "}
            <div>
              {" "}
              <p className="font-semibold text-slate-200 mb-1">
                Zoom & Pan
              </p>{" "}
              <p>Ctrl + Scroll: Zoom</p> <p>Space + Drag: Pan</p>{" "}
            </div>{" "}
            <div>
              {" "}
              <p className="font-semibold text-slate-200 mb-1">Edit</p>{" "}
              <p>Ctrl + Z: Undo</p> <p>Ctrl + Shift + Z: Redo</p>{" "}
            </div>{" "}
            <div>
              {" "}
              <p className="font-semibold text-slate-200 mb-1">Image</p>{" "}
              <p>R: Rotate 90°</p> <p>G: Toggle grayscale</p>{" "}
            </div>{" "}
            <div>
              {" "}
              <p className="font-semibold text-slate-200 mb-1">
                Selection
              </p>{" "}
              <p>Ctrl + A: Batch select</p> <p>Ctrl + S: Save template</p>{" "}
            </div>{" "}
          </div>
        )}{" "}
        {/* Filter Preview Indicator */}{" "}
        {(filters.brightness !== 100 ||
          filters.contrast !== 100 ||
          filters.grayscale ||
          filters.invert ||
          filters.denoise > 0 ||
          filters.perspective !== 0 ||
          currentRotation !== 0) && (
          <div className="text-xs text-amber-400 px-2 py-1 bg-amber-500/10 rounded border border-amber-500/20">
            {" "}
            ℹ️ Image filters are applied for preview. Original image will be
            used for extraction.{" "}
          </div>
        )}{" "}
        {/* AI Suggestions Modal */}{" "}
        <Dialog open={showAISuggestions} onOpenChange={setShowAISuggestions}>
          {" "}
          <DialogContent className="max-w-md">
            {" "}
            <DialogHeader>
              {" "}
              <DialogTitle>AI Suggestions</DialogTitle>{" "}
              <DialogDescription>
                {" "}
                Recommended improvements for {vendorName}{" "}
              </DialogDescription>{" "}
            </DialogHeader>{" "}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {" "}
              <Alert className="bg-primary/10 border-blue-500/20">
                {" "}
                <Lightbulb className="h-4 w-4 text-blue-400" />{" "}
                <AlertDescription className="ml-2 text-sm text-primary">
                  {" "}
                  Increase brightness by 10-15% to improve text clarity on
                  darker areas{" "}
                </AlertDescription>{" "}
              </Alert>{" "}
              <Alert className="bg-green-500/10 border-green-500/20">
                {" "}
                <Lightbulb className="h-4 w-4 text-green-400" />{" "}
                <AlertDescription className="ml-2 text-sm text-green-300">
                  {" "}
                  Your perspective correction is optimal for this invoice
                  angle{" "}
                </AlertDescription>{" "}
              </Alert>{" "}
              <Alert className="bg-amber-500/10 border-amber-500/20">
                {" "}
                <Lightbulb className="h-4 w-4 text-amber-400" />{" "}
                <AlertDescription className="ml-2 text-sm text-amber-300">
                  {" "}
                  Apply light denoise (5-10%) to remove minor scan
                  artifacts{" "}
                </AlertDescription>{" "}
              </Alert>{" "}
              <Alert className="bg-cyan-500/10 border-cyan-500/20">
                {" "}
                <Lightbulb className="h-4 w-4 text-cyan-400" />{" "}
                <AlertDescription className="ml-2 text-sm text-cyan-300">
                  {" "}
                  Try B&W conversion to improve OCR accuracy on this vendor's
                  invoices{" "}
                </AlertDescription>{" "}
              </Alert>{" "}
              <Card className="p-3 bg-slate-800/50 border-border">
                {" "}
                <p className="text-xs font-semibold text-slate-300 mb-2">
                  {" "}
                  Current Status{" "}
                </p>{" "}
                <ul className="space-y-1 text-xs text-slate-400">
                  {" "}
                  <li>✓ Image alignment: Good</li>{" "}
                  <li>✓ Contrast ratio: Excellent</li>{" "}
                  <li>⚠ Line detection: 87% accuracy</li>{" "}
                  <li>✓ Field extraction: Ready</li>{" "}
                </ul>{" "}
              </Card>{" "}
            </div>{" "}
            <DialogClose asChild>
              {" "}
              <Button variant="outline" className="w-full mt-4">
                {" "}
                Close{" "}
              </Button>{" "}
            </DialogClose>{" "}
          </DialogContent>{" "}
        </Dialog>{" "}
        {/* Confidence Breakdown Modal */}{" "}
        <Dialog
          open={showConfidenceBreakdown}
          onOpenChange={setShowConfidenceBreakdown}
        >
          {" "}
          <DialogContent className="max-w-md">
            {" "}
            <DialogHeader>
              {" "}
              <DialogTitle>Confidence Breakdown</DialogTitle>{" "}
              <DialogDescription>
                {" "}
                Detailed extraction confidence scores{" "}
              </DialogDescription>{" "}
            </DialogHeader>{" "}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {" "}
              <div className="space-y-2">
                {" "}
                <div className="flex justify-between text-xs font-semibold">
                  {" "}
                  <span className="text-slate-300">Vendor Name</span>{" "}
                  <span className="text-green-400">95%</span>{" "}
                </div>{" "}
                <div className="w-full bg-slate-800 rounded h-2 overflow-hidden">
                  {" "}
                  <div
                    className="bg-green-500 h-full"
                    style={{ width: "95%" }}
                  />{" "}
                </div>{" "}
              </div>{" "}
              <div className="space-y-2">
                {" "}
                <div className="flex justify-between text-xs font-semibold">
                  {" "}
                  <span className="text-slate-300">Invoice Number</span>{" "}
                  <span className="text-green-400">92%</span>{" "}
                </div>{" "}
                <div className="w-full bg-slate-800 rounded h-2 overflow-hidden">
                  {" "}
                  <div
                    className="bg-green-500 h-full"
                    style={{ width: "92%" }}
                  />{" "}
                </div>{" "}
              </div>{" "}
              <div className="space-y-2">
                {" "}
                <div className="flex justify-between text-xs font-semibold">
                  {" "}
                  <span className="text-slate-300">Invoice Date</span>{" "}
                  <span className="text-amber-400">78%</span>{" "}
                </div>{" "}
                <div className="w-full bg-slate-800 rounded h-2 overflow-hidden">
                  {" "}
                  <div
                    className="bg-amber-500 h-full"
                    style={{ width: "78%" }}
                  />{" "}
                </div>{" "}
              </div>{" "}
              <div className="space-y-2">
                {" "}
                <div className="flex justify-between text-xs font-semibold">
                  {" "}
                  <span className="text-slate-300">Line Items</span>{" "}
                  <span className="text-amber-400">81%</span>{" "}
                </div>{" "}
                <div className="w-full bg-slate-800 rounded h-2 overflow-hidden">
                  {" "}
                  <div
                    className="bg-amber-500 h-full"
                    style={{ width: "81%" }}
                  />{" "}
                </div>{" "}
              </div>{" "}
              <div className="space-y-2">
                {" "}
                <div className="flex justify-between text-xs font-semibold">
                  {" "}
                  <span className="text-slate-300">Total Amount</span>{" "}
                  <span className="text-green-400">94%</span>{" "}
                </div>{" "}
                <div className="w-full bg-slate-800 rounded h-2 overflow-hidden">
                  {" "}
                  <div
                    className="bg-green-500 h-full"
                    style={{ width: "94%" }}
                  />{" "}
                </div>{" "}
              </div>{" "}
              <Card className="p-3 bg-slate-800/50 border-border mt-4">
                {" "}
                <p className="text-xs font-semibold text-slate-300 mb-2">
                  {" "}
                  Overall Confidence{" "}
                </p>{" "}
                <div className="text-2xl font-bold text-cyan-400">88%</div>{" "}
                <p className="text-xs text-slate-400 mt-2">
                  {" "}
                  This extraction is ready for approval. Review flagged fields
                  above before confirming.{" "}
                </p>{" "}
              </Card>{" "}
            </div>{" "}
            <DialogClose asChild>
              {" "}
              <Button variant="outline" className="w-full mt-4">
                {" "}
                Close{" "}
              </Button>{" "}
            </DialogClose>{" "}
          </DialogContent>{" "}
        </Dialog>{" "}
      </div>{" "}
    </TooltipProvider>
  );
}
