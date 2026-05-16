import React, { useState, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Presentation,
  Slide,
  PresentationExportOptions,
} from "./types/PresentationTypes";
import { VoiceRecorder } from "./VoiceRecorder";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Download,
  Play,
  Edit,
  Loader,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/glass";
import {
  exportToPDF,
  exportToPPTX,
  exportToJSON,
} from "./utils/ExportHandlers";
import { useSubscriptionFeatures } from "./hooks/useSubscriptionFeatures";
interface PresentationBuilderProps {
  onPresentationChange?: (presentation: Presentation) => void;
  onModeChange?: (mode: "edit" | "presenting" | "playback") => void;
  subscriptionTier?: "basic" | "pro" | "enterprise";
}
const DEFAULT_PRESENTATION: Presentation = {
  id: uuidv4(),
  title: "Untitled Presentation",
  slides: [
    {
      id: uuidv4(),
      title: "Welcome",
      content: "Click to add content",
      shapes: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ],
  currentSlideIndex: 0,
  mode: "edit",
  isRecording: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  downloadFormats: ["pdf", "mp4", "pptx", "json"],
};
export const PresentationBuilder: React.FC<PresentationBuilderProps> = ({
  onPresentationChange,
  onModeChange,
  subscriptionTier = "basic",
}) => {
  const [presentation, setPresentation] = useState<Presentation>({
    ...DEFAULT_PRESENTATION,
    subscriptionTier,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subscriptionFeatures = useSubscriptionFeatures(subscriptionTier);
  const currentSlide = presentation.slides[presentation.currentSlideIndex];
  const canAddSlide = !subscriptionFeatures.exceedsSlideLimit(
    presentation.slides.length + 1,
  );
  const remainingSlides = subscriptionFeatures.getRemainingSlides(
    presentation.slides.length,
  );
  const availableExportFormats = subscriptionFeatures.getExportFormats(); // Slide Management const addSlide = useCallback(() => { if ( subscriptionFeatures.exceedsSlideLimit(presentation.slides.length + 1) ) { alert( `Slide limit (${subscriptionFeatures.getFeatureValue("maxSlidesPerPresentation")}) reached. Upgrade your subscription to add more slides.`, ); return; } const newSlide: Slide = { id: uuidv4(), title: `Slide ${presentation.slides.length + 1}`, content:"Click to add content", shapes: [], createdAt: Date.now(), updatedAt: Date.now(), }; const updatedPresentation = { ...presentation, slides: [...presentation.slides, newSlide], currentSlideIndex: presentation.slides.length, updatedAt: Date.now(), }; setPresentation(updatedPresentation); onPresentationChange?.(updatedPresentation); }, [presentation, onPresentationChange, subscriptionFeatures]); const deleteSlide = useCallback( (index: number) => { if (presentation.slides.length === 1) return; // Keep at least one slide const updatedSlides = presentation.slides.filter((_, i) => i !== index); const newIndex = Math.max(0, Math.min(index, updatedSlides.length - 1)); const updatedPresentation = { ...presentation, slides: updatedSlides, currentSlideIndex: newIndex, updatedAt: Date.now(), }; setPresentation(updatedPresentation); onPresentationChange?.(updatedPresentation); }, [presentation, onPresentationChange], ); const updateSlide = useCallback( (index: number, updates: Partial<Slide>) => { const updatedSlides = [...presentation.slides]; updatedSlides[index] = { ...updatedSlides[index], ...updates, updatedAt: Date.now(), }; const updatedPresentation = { ...presentation, slides: updatedSlides, updatedAt: Date.now(), }; setPresentation(updatedPresentation); onPresentationChange?.(updatedPresentation); }, [presentation, onPresentationChange], ); const goToSlide = useCallback( (index: number) => { const newIndex = Math.max( 0, Math.min(index, presentation.slides.length - 1), ); setPresentation((prev) => ({ ...prev, currentSlideIndex: newIndex, })); }, [presentation.slides.length], ); const nextSlide = useCallback(() => { goToSlide(presentation.currentSlideIndex + 1); }, [presentation.currentSlideIndex, goToSlide]); const prevSlide = useCallback(() => { goToSlide(presentation.currentSlideIndex - 1); }, [presentation.currentSlideIndex, goToSlide]); // Mode Management const startPresentation = useCallback(() => { const updatedPresentation = { ...presentation, mode:"presenting" as const, currentSlideIndex: 0, }; setPresentation(updatedPresentation); onModeChange?.("presenting"); onPresentationChange?.(updatedPresentation); }, [presentation, onModeChange, onPresentationChange]); const exitPresentation = useCallback(() => { const updatedPresentation = { ...presentation, mode:"edit" as const, }; setPresentation(updatedPresentation); onModeChange?.("edit"); onPresentationChange?.(updatedPresentation); }, [presentation, onModeChange, onPresentationChange]); const handleExport = useCallback( async (format:"pdf" |"mp4" |"pptx" |"json") => { setIsExporting(true); try { const fileName = `${presentation.title}.${format ==="mp4" ?"mp4" : format ==="pptx" ?"pptx" : format ==="pdf" ?"pdf" :"json"}`; switch (format) { case"pdf": await exportToPDF(presentation, fileName); break; case"pptx": await exportToPPTX(presentation, fileName); break; case"json": await exportToJSON(presentation, fileName); break; case"mp4": // MP4 export requires FFmpeg WASM - for now, export as JSON with instruction alert("MP4 export requires video encoding. For now, please use PDF or PPTX format.", ); await exportToJSON( presentation, `${presentation.title}-export.json`, ); break; } } catch (error) { console.error("Export failed:", error); alert( `Export failed: ${error instanceof Error ? error.message :"Unknown error"}`, ); } finally { setIsExporting(false); } }, [presentation], ); if (presentation.mode ==="presenting") { return ( <div className="fixed inset-0 bg-black z-50 flex flex-col"> {/* Presentation Playback */} <div className="flex-1 flex items-center justify-center overflow-hidden"> <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center"> <div className="text-center"> <h1 className="text-5xl font-bold text-white mb-4"> {currentSlide?.title} </h1> <p className="text-2xl text-gray-300 mb-8"> {currentSlide?.content} </p> <p className="text-sm text-muted-foreground"> Slide {presentation.currentSlideIndex + 1} of{""} {presentation.slides.length} </p> </div> </div> </div> {/* Controls */} <div className="bg-surface border-t border-border/30 px-4 py-3 flex items-center justify-between"> <Button onClick={prevSlide} variant="ghost" disabled={presentation.currentSlideIndex === 0} className="text-white hover:bg-slate-700" > <ChevronLeft size={20} /> </Button> <div className="flex gap-2"> {presentation.slides.map((_, index) => ( <button key={index} onClick={() => goToSlide(index)} className={cn("w-2 h-2 rounded-full transition-all", index === presentation.currentSlideIndex ?"bg-cyan-400 w-6" :"bg-gray-600", )} /> ))} </div> <div className="flex gap-2"> <Button onClick={nextSlide} variant="ghost" disabled={ presentation.currentSlideIndex === presentation.slides.length - 1 } className="text-white hover:bg-slate-700" > <ChevronRight size={20} /> </Button> <Button onClick={exitPresentation} variant="outline" className="text-white border-white hover:bg-slate-700" > Exit </Button> </div> </div> </div> ); } // Edit Mode return ( <div className="flex flex-col gap-4 bg-background/80 backdrop-blur-sm border border-border/30 rounded-lg p-4"> {/* Header */} <div className="flex items-center justify-between"> <div className="flex-1"> <input type="text" value={presentation.title} onChange={(e) => setPresentation((prev) => ({ ...prev, title: e.target.value, updatedAt: Date.now(), })) } className="w-full text-xl font-bold bg-transparent border-b border-border/30 focus:outline-none text-foreground placeholder:text-foreground/50" placeholder="Presentation Title" /> </div> </div> {/* Slide Editor */} {currentSlide && ( <div className="border border-border/30 rounded-lg p-4 bg-background/50"> <div className="space-y-4"> <input type="text" value={currentSlide.title} onChange={(e) => updateSlide(presentation.currentSlideIndex, { title: e.target.value, }) } className="w-full text-lg font-bold bg-transparent border-b border-border/30 focus:outline-none text-foreground" placeholder="Slide Title" /> <textarea value={currentSlide.content} onChange={(e) => updateSlide(presentation.currentSlideIndex, { content: e.target.value, }) } className="w-full min-h-32 bg-surface border border-border/30 rounded p-3 text-foreground focus:outline-none resize-none" placeholder="Slide Content" /> {/* Voice Recording */} <VoiceRecorder existingAudioUrl={currentSlide.narration?.audioUrl} existingDuration={currentSlide.narration?.duration || 0} onRecordingComplete={(audioBlob, duration) => { const audioUrl = URL.createObjectURL(audioBlob); updateSlide(presentation.currentSlideIndex, { narration: { audioBlob, audioUrl, duration, }, }); }} /> </div> </div> )} {/* Slide Navigation */} <div className="flex items-center gap-2"> <Button onClick={prevSlide} variant="outline" size="sm" disabled={presentation.currentSlideIndex === 0} > <ChevronLeft size={16} /> </Button> <span className="text-sm text-foreground/70 min-w-fit"> Slide {presentation.currentSlideIndex + 1} of{""} {presentation.slides.length} </span> <Button onClick={nextSlide} variant="outline" size="sm" disabled={ presentation.currentSlideIndex === presentation.slides.length - 1 } > <ChevronRight size={16} /> </Button> <Button onClick={addSlide} variant="outline" size="sm" className="ml-auto" disabled={!canAddSlide} title={ !canAddSlide ? `Maximum ${subscriptionFeatures.getFeatureValue("maxSlidesPerPresentation")} slides reached` :"" } > <Plus size={16} /> Add Slide {!canAddSlide && <Lock size={14} className="ml-1" />} {subscriptionTier !=="enterprise" && ( <span className="text-xs ml-1">({remainingSlides} left)</span> )} </Button> <Button onClick={() => deleteSlide(presentation.currentSlideIndex)} variant="outline" size="sm" disabled={presentation.slides.length === 1} > <Trash2 size={16} /> </Button> </div> {/* Actions */} <div className="flex items-center gap-2 border-t border-border/30 pt-4"> <Button onClick={startPresentation} className="gap-2 bg-green-600 hover:bg-green-700" disabled={isExporting} > <Play size={16} /> Present </Button> <div className="ml-auto flex gap-2"> {subscriptionFeatures.canExport("pdf") && ( <Button onClick={() => handleExport("pdf")} variant="outline" size="sm" className="gap-1" disabled={isExporting} > {isExporting ? ( <Loader size={14} className="animate-spin" /> ) : ( <Download size={14} /> )} PDF </Button> )} {subscriptionFeatures.canExport("pptx") && ( <Button onClick={() => handleExport("pptx")} variant="outline" size="sm" className="gap-1" disabled={isExporting} > {isExporting ? ( <Loader size={14} className="animate-spin" /> ) : ( <Download size={14} /> )} PPTX </Button> )} {subscriptionFeatures.canExport("mp4") && ( <Button onClick={() => handleExport("mp4")} variant="outline" size="sm" className="gap-1" disabled={isExporting} title="Requires Enterprise tier" > {isExporting ? ( <Loader size={14} className="animate-spin" /> ) : ( <Download size={14} /> )} MP4 </Button> )} {!subscriptionFeatures.canExport("pdf") && ( <Button variant="outline" size="sm" className="gap-1" disabled title="Upgrade subscription for more export formats" > <Lock size={14} /> Upgrade </Button> )} </div> </div> {/* Slide Thumbnails */} <div className="border-t border-border/30 pt-4"> <p className="text-xs text-foreground/50 mb-2"> Slides ({presentation.slides.length}) </p> <div className="grid grid-cols-6 gap-2 max-h-24 overflow-y-auto"> {presentation.slides.map((slide, index) => ( <button key={slide.id} onClick={() => goToSlide(index)} className={cn("aspect-video bg-slate-800 border-2 rounded text-xs p-2 text-center truncate transition-all hover:border-cyan-400", index === presentation.currentSlideIndex ?"border-cyan-400" :"border-border/30", )} > {slide.title} </button> ))} </div> </div> </div> );
};
export default PresentationBuilder;
