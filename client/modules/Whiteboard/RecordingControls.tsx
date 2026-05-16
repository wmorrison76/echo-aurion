/** * Recording Controls Component * Displays recording controls for whiteboard (presenter-only) */ import React, {
  useState,
  useEffect,
} from "react";
import { RecordingManager, RecordingState } from "./RecordingManager";
import { Button } from "@/components/ui/button";
import { Circle, Pause, Play, Square } from "lucide-react";
import { cn } from "@/lib/glass";
interface RecordingControlsProps {
  sessionId: string;
  presenter: string;
  isPresenter: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onRecordingStateChange?: (state: RecordingState) => void;
}
export const RecordingControls: React.FC<RecordingControlsProps> = ({
  sessionId,
  presenter,
  isPresenter,
  canvasRef,
  onRecordingStateChange,
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const recordingManager = RecordingManager.getInstance(); // Subscribe to recording state changes useEffect(() => { const unsubscribe = recordingManager.onStateChange((state) => { setRecordingState(state); onRecordingStateChange?.(state); }); return unsubscribe; }, [recordingManager, onRecordingStateChange]); const handleStartRecording = async () => { if (!canvasRef.current) { console.error("Canvas ref not available"); return; } setIsLoading(true); try { await recordingManager.startRecording(canvasRef.current); } catch (error) { console.error("Failed to start recording:", error); alert("Failed to start recording. Please check your browser permissions."); } finally { setIsLoading(false); } }; const handlePauseRecording = () => { recordingManager.pauseRecording(); }; const handleResumeRecording = () => { recordingManager.resumeRecording(); }; const handleStopRecording = async () => { setIsLoading(true); try { const metadata = await recordingManager.stopRecording( sessionId, presenter, `Whiteboard Session - ${new Date().toLocaleString()}`, ); if (metadata) { alert(`✅ Recording saved! Duration: ${RecordingManager.formatDuration(metadata.duration)}`); } } catch (error) { console.error("Failed to stop recording:", error); alert("Failed to save recording. Please try again."); } finally { setIsLoading(false); } }; if (!isPresenter) { return null; } return ( <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/80 backdrop-blur border border-border/20"> {/* Recording Status Indicator */} {recordingState.isRecording && ( <div className="flex items-center gap-2"> <Circle size={12} className={cn("fill-current", recordingState.isPaused ?"text-yellow-500 animate-pulse" :"text-red-500 animate-pulse", )} /> <span className="text-xs font-semibold text-foreground"> {recordingState.isPaused ?"Paused" :"Recording"} </span> <span className="text-xs text-foreground/60"> {RecordingManager.formatDuration(recordingState.duration)} </span> </div> )} {/* Recording Controls */} <div className="flex items-center gap-1"> {!recordingState.isRecording ? ( <Button size="sm" variant="destructive" onClick={handleStartRecording} disabled={isLoading} className="gap-1" title="Start recording" > <Circle size={14} className="fill-current" /> <span className="hidden sm:inline">Record</span> </Button> ) : recordingState.isPaused ? ( <> <Button size="sm" variant="default" onClick={handleResumeRecording} disabled={isLoading} className="gap-1" title="Resume recording" > <Play size={14} className="fill-current" /> <span className="hidden sm:inline">Resume</span> </Button> <Button size="sm" variant="outline" onClick={handleStopRecording} disabled={isLoading} className="gap-1" title="Stop recording" > <Square size={14} /> <span className="hidden sm:inline">Stop</span> </Button> </> ) : ( <> <Button size="sm" variant="secondary" onClick={handlePauseRecording} disabled={isLoading} className="gap-1" title="Pause recording" > <Pause size={14} /> <span className="hidden sm:inline">Pause</span> </Button> <Button size="sm" variant="outline" onClick={handleStopRecording} disabled={isLoading} className="gap-1" title="Stop recording" > <Square size={14} /> <span className="hidden sm:inline">Stop</span> </Button> </> )} </div> </div> );
};
