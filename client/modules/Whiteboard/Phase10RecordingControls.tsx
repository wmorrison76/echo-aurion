import React, { useState } from "react";
import { RecordingSession } from "./types";
import {
  Video,
  Circle,
  Square,
  Download,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ScreenRecordingManager from "./ScreenRecordingManager";
interface Phase10RecordingControlsProps {
  isRecording: boolean;
  recordingSession?: RecordingSession;
  onStartRecording: (sessionId: string, title: string) => void;
  onStopRecording: () => Promise<RecordingSession | null>;
  onSaveRecording?: (recording: RecordingSession) => void;
  onPlayRecording?: (recording: RecordingSession) => void;
  onDeleteRecording?: (recordingId: string) => void;
}
export const Phase10RecordingControls: React.FC<
  Phase10RecordingControlsProps
> = ({
  isRecording,
  recordingSession,
  onStartRecording,
  onStopRecording,
  onSaveRecording,
  onPlayRecording,
  onDeleteRecording,
}) => {
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [recordingTitle, setRecordingTitle] = useState("Whiteboard Recording");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  React.useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      setRecordingDuration(ScreenRecordingManager.getRecordingDuration());
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording]);
  const handleStartRecording = () => {
    setShowRecordingModal(true);
  };
  const handleConfirmStart = () => {
    onStartRecording("current-session", recordingTitle);
    setShowRecordingModal(false);
  };
  const handleStopRecording = async () => {
    const session = await onStopRecording();
    if (session) {
      setRecordingDuration(0);
    }
  };
  const handleSaveRecording = async () => {
    if (!recordingSession) return;
    setSaveStatus("saving");
    try {
      const success =
        await ScreenRecordingManager.saveRecording(recordingSession);
      if (success) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    } catch (error) {
      console.error("Failed to save recording:", error);
    }
  };
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${minutes}:${String(secs).padStart(2, "0")}`;
  };
  return (
    <>
      {" "}
      {/* Recording Controls Bar */}{" "}
      {!isRecording ? (
        <Button
          size="sm"
          variant="outline"
          onClick={handleStartRecording}
          className="flex items-center gap-2"
        >
          {" "}
          <Video className="w-4 h-4" /> Start Recording{" "}
        </Button>
      ) : (
        <div className="flex items-center gap-3 bg-red-50 px-4 py-2 rounded-lg border border-red-200">
          {" "}
          <div className="flex items-center gap-2">
            {" "}
            <Circle className="w-3 h-3 text-red-600 animate-pulse fill-red-600" />{" "}
            <span className="text-sm font-medium text-red-800">
              {" "}
              Recording: {formatDuration(recordingDuration)}{" "}
            </span>{" "}
          </div>{" "}
          <Button
            size="sm"
            onClick={handleStopRecording}
            className="bg-red-600 hover:bg-red-700"
          >
            {" "}
            Stop{" "}
          </Button>{" "}
        </div>
      )}{" "}
      {/* Start Recording Modal */}{" "}
      {showRecordingModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          {" "}
          <div className="bg-background rounded-lg shadow-xl max-w-md w-full mx-4 p-6 space-y-4">
            {" "}
            <h2 className="text-xl font-bold text-gray-900">
              Start Recording
            </h2>{" "}
            <div>
              {" "}
              <label className="block text-sm font-medium text-foreground mb-2">
                {" "}
                Recording Title{" "}
              </label>{" "}
              <input
                type="text"
                value={recordingTitle}
                onChange={(e) => setRecordingTitle(e.target.value)}
                placeholder="e.g., Product Demo"
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />{" "}
            </div>{" "}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              {" "}
              <p className="text-sm text-blue-800">
                {" "}
                💡 The recording will capture all canvas changes and drawing
                activity during your session.{" "}
              </p>{" "}
            </div>{" "}
            <div className="flex gap-3 justify-end">
              {" "}
              <Button
                variant="outline"
                onClick={() => setShowRecordingModal(false)}
              >
                {" "}
                Cancel{" "}
              </Button>{" "}
              <Button
                onClick={handleConfirmStart}
                className="bg-primary hover:opacity-90"
              >
                {" "}
                Start Recording{" "}
              </Button>{" "}
            </div>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Recording Complete Modal */}{" "}
      {recordingSession && !isRecording && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          {" "}
          <div className="bg-background rounded-lg shadow-xl max-w-md w-full mx-4 p-6 space-y-4">
            {" "}
            <div className="flex items-center gap-2">
              {" "}
              <CheckCircle className="w-6 h-6 text-green-600" />{" "}
              <h2 className="text-xl font-bold text-gray-900">
                {" "}
                Recording Complete{" "}
              </h2>{" "}
            </div>{" "}
            <div className="space-y-3 bg-surface p-4 rounded-lg">
              {" "}
              <div>
                {" "}
                <p className="text-sm text-muted-foreground">Title</p>{" "}
                <p className="font-medium text-gray-900">
                  {" "}
                  {recordingSession.title}{" "}
                </p>{" "}
              </div>{" "}
              <div>
                {" "}
                <p className="text-sm text-muted-foreground">Duration</p>{" "}
                <p className="font-medium text-gray-900 flex items-center gap-2">
                  {" "}
                  <Clock className="w-4 h-4" />{" "}
                  {formatDuration(
                    Math.floor(recordingSession.duration || 0),
                  )}{" "}
                </p>{" "}
              </div>{" "}
              <div>
                {" "}
                <p className="text-sm text-muted-foreground">
                  Frames Captured
                </p>{" "}
                <p className="font-medium text-gray-900">
                  {" "}
                  {recordingSession.frameCount || 0}{" "}
                </p>{" "}
              </div>{" "}
              {recordingSession.isProcessing && (
                <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                  {" "}
                  <div className="w-2 h-2 bg-yellow-600 rounded-full animate-pulse" />{" "}
                  Processing video...{" "}
                </div>
              )}{" "}
            </div>{" "}
            <div className="flex gap-3">
              {" "}
              <Button
                variant="outline"
                onClick={() => onDeleteRecording?.(recordingSession.id)}
                className="flex-1"
              >
                {" "}
                <X className="w-4 h-4 mr-2" /> Discard{" "}
              </Button>{" "}
              <Button
                variant="outline"
                onClick={() => onPlayRecording?.(recordingSession)}
                className="flex-1"
              >
                {" "}
                Play{" "}
              </Button>{" "}
              <Button
                onClick={handleSaveRecording}
                disabled={saveStatus !== "idle"}
                className="flex-1 bg-primary hover:opacity-90"
              >
                {" "}
                {saveStatus === "saving" ? (
                  <>Saving...</>
                ) : saveStatus === "saved" ? (
                  <>Saved ✓</>
                ) : (
                  <>
                    {" "}
                    <Download className="w-4 h-4 mr-2" /> Save{" "}
                  </>
                )}{" "}
              </Button>{" "}
            </div>{" "}
          </div>{" "}
        </div>
      )}{" "}
    </>
  );
};
export default Phase10RecordingControls;
