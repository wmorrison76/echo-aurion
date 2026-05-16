import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { recordVoiceLog } from "@/lib/offline-channels";
import { Store, id } from "@/lib/store";
import { useAuth } from "@/context/AuthContext";
import {
  parseVoiceInput,
  extractQuantity,
  matchItem,
  matchLocation,
  normalizeUnit,
} from "@/lib/voice-nlp";
import type { CountLine, CountSession, InventoryItem } from "@shared/inventory";
import { Undo2, Trash2, Volume2, CheckCircle2 } from "lucide-react";
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: Array<{
    isFinal: boolean;
    length: number;
    [index: number]: { transcript: string };
    0: { transcript: string };
  }>;
};
interface CaptureRecord {
  id: string;
  itemId?: string;
  itemName: string;
  quantity: number;
  unit: string;
  location?: string;
  locationBin?: string;
  confidence: number;
  transcript: string;
  committedAt: number;
  lineId?: string; // reference to the CountLine
}
interface UndoAction {
  id: string;
  lineId: string;
  timestamp: number;
}
function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const globalWindow = window as typeof window & {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  };
  return (
    globalWindow.SpeechRecognition ||
    globalWindow.webkitSpeechRecognition ||
    null
  );
}
function formatConfidence(value: number): string {
  if (!Number.isFinite(value)) return "";
  return `${Math.round(value * 100)}%`;
}
export function VoiceInventoryCaptureV2({
  outletId,
  onSessionPosted,
}: {
  outletId: string;
  onSessionPosted?: () => void;
}) {
  const { toast } = useToast();
  const { user } = useAuth(); // State const [isListening, setIsListening] = useState(false); const [supported, setSupported] = useState(false); const [interimTranscript, setInterimTranscript] = useState(""); const [manualInput, setManualInput] = useState(""); const [captures, setCapturesState] = useState<CaptureRecord[]>([]); const [undoHistory, setUndoHistory] = useState<UndoAction[]>([]); const [lastError, setLastError] = useState<string>(""); const [isProcessing, setIsProcessing] = useState(false); // Refs const recognitionRef = useRef<SpeechRecognitionLike | null>(null); const listeningRef = useRef(false); const capturesRef = useRef<CaptureRecord[]>([]); // Data const items = useMemo( () => Store.listItems().filter((item) => item.outletId === outletId), [outletId, captures.length], ); const outlets = useMemo(() => Store.listOutlets(), []); const outletName = useMemo( () => outlets.find((outlet) => outlet.id === outletId)?.name ??"Outlet", [outlets, outletId], ); const availableLocations = useMemo(() => { const locSet = new Set<string>(); const result: Array<{ name: string; bin?: string | null; outletId: string }> = []; for (const item of items) { for (const loc of item.storage) { if (loc.outletId !== outletId) continue; const key = `${loc.name}|${loc.bin ||""}`; if (!locSet.has(key)) { locSet.add(key); result.push({ name: loc.name, bin: loc.bin ?? null, outletId, }); } } } return result; }, [items, outletId]); // Check speech recognition support useEffect(() => { const ctor = getSpeechRecognition(); setSupported(Boolean(ctor)); return () => { recognitionRef.current?.abort(); }; }, []); // Commit a single capture directly to inventory const commitCapture = useCallback( async (capture: Omit<CaptureRecord,"id" |"committedAt" |"lineId">) => { try { let itemId = capture.itemId; let itemName = capture.itemName; // Ensure item exists if (!itemId) { const ensured = Store.ensureItem(outletId, itemName); itemId = ensured.id; } // Create and apply count line immediately const countLine: CountLine = { itemId, qty: Math.max(1, capture.quantity), unit: normalizeUnit(capture.unit), location: capture.location || undefined, bin: capture.locationBin || undefined, }; const countSession: CountSession = { id: id(), outletId, startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), lines: [countLine], }; Store.applyCountSession(countSession); const record: CaptureRecord = { ...capture, id: id(), committedAt: Date.now(), lineId: countLine.itemId, }; capturesRef.current = [record, ...capturesRef.current]; setCapturesState(capturesRef.current); // Log the capture await recordVoiceLog({ transcript: capture.transcript, parsedItems: [ { name: itemName, quantity: capture.quantity, unit: capture.unit, bin: capture.location ? `${capture.location}${capture.locationBin ? ` • ${capture.locationBin}` :""}` : undefined, }, ], outlet: outletName, user: user?.name, capturedAt: Date.now(), }); return true; } catch (error) { console.error("Capture commit error:", error); return false; } }, [outletId, outletName, user?.name], ); // Process a transcript and auto-commit const processTranscript = useCallback( async (transcript: string) => { const trimmed = transcript.trim(); if (!trimmed) return; setIsProcessing(true); try { // Parse using advanced NLP const parsed = parseVoiceInput(trimmed, items, availableLocations); if (!parsed) { setLastError("Could not parse:" + trimmed); return; } // Auto-commit the capture const success = await commitCapture({ itemId: parsed.itemId, itemName: parsed.itemName, quantity: parsed.quantity, unit: parsed.unit, location: parsed.location?.name, locationBin: parsed.location?.bin ?? undefined, confidence: parsed.confidence, transcript: trimmed, }); if (success) { toast({ title:"✓ Captured", description: `${parsed.quantity} ${parsed.unit} of ${parsed.itemName}${parsed.location ? ` in ${parsed.location.name}` :""}`, duration: 2000, }); setLastError(""); } } catch (error) { const errorMsg = error instanceof Error ? error.message :"Unknown error"; setLastError(errorMsg); toast({ variant:"destructive", title:"Capture failed", description: errorMsg, }); } finally { setIsProcessing(false); } }, [items, availableLocations, commitCapture, toast], ); const ensureRecognition = useCallback(() => { const ctor = getSpeechRecognition(); if (!ctor) return null; if (!recognitionRef.current) { const recognition = new ctor(); recognition.lang ="en-US"; recognition.continuous = true; recognition.interimResults = true; recognition.maxAlternatives = 1; recognition.onresult = (event) => { let interim =""; const finals: string[] = []; for (let i = event.resultIndex; i < event.results.length; i++) { const transcript = event.results[i][0]?.transcript?.trim(); if (!transcript) continue; if (event.results[i].isFinal) { finals.push(transcript); } else { interim = `${interim} ${transcript}`.trim(); } } setInterimTranscript(interim); // Process final transcripts immediately for (const final of finals) { processTranscript(final); } }; recognition.onerror = (event) => { const errorMsg = event.error ||"Speech recognition error"; setLastError(errorMsg); toast({ variant:"destructive", title:"Voice capture error", description: errorMsg, }); listeningRef.current = false; setIsListening(false); }; recognition.onend = () => { if (listeningRef.current) { try { recognition.start(); } catch { listeningRef.current = false; setIsListening(false); } } }; recognitionRef.current = recognition; } return recognitionRef.current; }, [processTranscript, toast]); const startListening = useCallback(() => { const recognition = ensureRecognition(); if (!recognition) { toast({ variant:"destructive", title:"Speech recognition unavailable", description:"Your browser does not support voice capture.", }); return; } try { listeningRef.current = true; setIsListening(true); setLastError(""); recognition.start(); toast({ title:"🎤 Listening", description:"Speak naturally. Each phrase is captured immediately.", duration: 2000, }); } catch (error) { listeningRef.current = false; setIsListening(false); const errorMsg = error instanceof Error ? error.message :"Unable to start microphone"; setLastError(errorMsg); } }, [ensureRecognition, toast]); const stopListening = useCallback(() => { listeningRef.current = false; recognitionRef.current?.stop(); setIsListening(false); setInterimTranscript(""); }, []); const handleManualInput = useCallback(() => { const trimmed = manualInput.trim(); if (!trimmed) return; processTranscript(trimmed); setManualInput(""); }, [manualInput, processTranscript]); const undoLastCapture = useCallback(() => { if (capturesRef.current.length === 0) { toast({ variant:"destructive", title:"Nothing to undo", description:"No recent captures to undo.", }); return; } const last = capturesRef.current[0]; capturesRef.current = capturesRef.current.slice(1); setCapturesState(capturesRef.current); setUndoHistory((prev) => [ ...prev, { id: last.id, lineId: last.lineId ||"", timestamp: Date.now(), }, ]); toast({ title:"✓ Undone", description: `Removed: ${last.quantity} ${last.unit} of ${last.itemName}`, duration: 2000, }); }, [toast]); const clearAll = useCallback(() => { if (capturesRef.current.length === 0) return; const count = capturesRef.current.length; capturesRef.current = []; setCapturesState([]); setUndoHistory([]); toast({ title:"✓ Cleared", description: `${count} capture${count === 1 ?"" :"s"} removed.`, duration: 2000, }); }, [toast]); const isListeningIndicator = isListening ?"🎤 Listening…" : supported ?"Ready" :"Unavailable"; const canUndo = captures.length > 0; const totalQty = captures.reduce((sum, c) => sum + c.quantity, 0); return ( <Card className="border-2"> <CardHeader> <CardTitle>Voice Inventory Capture</CardTitle> <CardDescription> Speak naturally anywhere. Each phrase is captured and logged immediately—no review needed. Say"add 3 cases tomatoes in dry storage" and it works! </CardDescription> </CardHeader> <CardContent className="space-y-6"> {/* Controls */} <div className="flex flex-wrap items-center gap-2"> <Button onClick={isListening ? stopListening : startListening} disabled={!supported || isProcessing} className="gap-2" variant={isListening ?"destructive" :"default"} > <Volume2 className="h-4 w-4" /> {isListening ?"Stop" :"Start"} </Button> <div className="flex items-center gap-2"> <Badge variant={isListening ?"default" :"outline"} className="font-medium"> {isListeningIndicator} </Badge> {interimTranscript && ( <Badge variant="secondary" className="max-w-xs truncate"> {interimTranscript} </Badge> )} </div> <div className="ml-auto flex items-center gap-2"> {canUndo && ( <Button variant="outline" size="sm" onClick={undoLastCapture} className="gap-1" title="Undo last capture" > <Undo2 className="h-3.5 w-3.5" /> Undo </Button> )} {captures.length > 0 && ( <Button variant="outline" size="sm" onClick={clearAll} className="gap-1" title="Clear all captures" > <Trash2 className="h-3.5 w-3.5" /> Clear </Button> )} </div> </div> {/* Manual Input */} <div className="grid gap-3"> <label className="text-sm font-medium"> Manual entry (or paste transcript) <Textarea value={manualInput} onChange={(e) => setManualInput(e.target.value)} onKeyDown={(e) => { if (e.key ==="Enter" && e.ctrlKey) { handleManualInput(); } }} placeholder='Example:"add 3 cases of tomatoes in walk-in cooler"' className="mt-1" disabled={isProcessing} /> </label> <Button variant="secondary" onClick={handleManualInput} disabled={!manualInput.trim() || isProcessing} > Parse & Capture </Button> </div> {/* Error Display */} {lastError && ( <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400"> ⚠️ {lastError} </div> )} {/* Quick Summary */} <div className="rounded-md bg-blue-50 p-3 dark:bg-blue-900/20"> <div className="flex items-center justify-between"> <div className="text-sm"> <span className="font-semibold text-blue-900 dark:text-blue-200"> {captures.length} item{captures.length === 1 ?"" :"s"} captured </span> {captures.length > 0 && ( <span className="ml-2 text-blue-700 dark:text-primary"> ({totalQty} {totalQty === 1 ?"unit" :"units"} total) </span> )} </div> {captures.length > 0 && ( <Badge variant="default" className="gap-1"> <CheckCircle2 className="h-3 w-3" /> Auto-logged </Badge> )} </div> </div> {/* Recent Captures List */} {captures.length > 0 && ( <div className="space-y-2"> <h3 className="text-sm font-semibold">Recent captures (most recent first)</h3> <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-3"> {captures.slice(0, 20).map((capture) => ( <div key={capture.id} className="flex items-center justify-between rounded bg-slate-50 px-3 py-2 text-sm dark:bg-surface" > <div className="min-w-0 flex-1"> <div className="font-medium"> {capture.quantity} {capture.unit} </div> <div className="text-xs text-muted-foreground"> {capture.itemName} {capture.location && <span> • {capture.location}</span>} </div> </div> <Badge variant="outline" className="ml-2 whitespace-nowrap"> {formatConfidence(capture.confidence)} </Badge> </div> ))} {captures.length > 20 && ( <div className="px-3 py-2 text-xs text-muted-foreground"> +{captures.length - 20} more </div> )} </div> </div> )} {/* Empty State */} {captures.length === 0 && !isListening && ( <div className="rounded-md border border-dashed p-8 text-center"> <div className="space-y-2 text-sm text-muted-foreground"> <p className="font-medium">Ready to capture inventory</p> <p className="text-xs">Click"Start" or use manual entry to begin</p> </div> </div> )} {/* Info Footer */} <div className="rounded-md bg-slate-50 p-3 text-xs text-muted-foreground dark:bg-surface"> <p className="mb-1 font-medium">💡 How to use:</p> <ul className="space-y-1"> <li>• Speak in natural language:"3 cases of tomatoes in dry storage"</li> <li>• Or say"6 lbs chicken breast, freezer"</li> <li>• Mistakes are auto-corrected ("walkin" →"dry storage")</li> <li>• Use Undo if you capture the wrong item</li> <li>• All captures are logged automatically</li> </ul> </div> </CardContent> </Card> );
}
