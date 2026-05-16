import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  Camera,
  Check,
  AlertCircle,
  Loader2,
  FileUp,
} from "lucide-react";

interface ProductionTask {
  id: string;
  name: string;
  status: "pending" | "in-progress" | "completed" | "blocked";
  expectedDueTime?: string;
}

export interface TabletProductionUpdatesProps {
  deviceId: string;
  tasks?: ProductionTask[];
  onClose?: () => void;
}

export function TabletProductionUpdates({
  deviceId,
  tasks = [],
  onClose,
}: TabletProductionUpdatesProps) {
  const { toast } = useToast();

  const [selectedTask, setSelectedTask] = useState<ProductionTask | null>(
    tasks.length > 0 ? tasks[0] : null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [newStatus, setNewStatus] = useState<string>("in-progress");

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCapturePhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      // Create video element
      const video = document.createElement("video");
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play();

        // Wait a moment for video to stabilize
        setTimeout(() => {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const file = new File(
                    [blob],
                    `production-${Date.now()}.jpg`,
                    {
                      type: "image/jpeg",
                    },
                  );
                  setSelectedFile(file);
                  setPreviewUrl(canvas.toDataURL("image/jpeg"));
                }
              },
              "image/jpeg",
              0.95,
            );
          }

          // Stop stream
          stream.getTracks().forEach((track) => track.stop());
        }, 500);
      };
    } catch (error) {
      toast({
        title: "Camera access denied",
        description: "Please allow camera access to take a photo",
        variant: "destructive",
      });
    }
  };

  const handleSubmitUpdate = async () => {
    if (!selectedTask) {
      toast({
        title: "Error",
        description: "Please select a production task",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);

      let screenshotUrl = "";

      // Upload screenshot if provided
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("type", "production-screenshot");

        // This would typically upload to cloud storage
        // For now, we'll create a data URL
        const reader = new FileReader();
        reader.onloadend = () => {
          screenshotUrl = reader.result as string;
        };
        reader.readAsDataURL(selectedFile);
      }

      const response = await fetch("/api/tablet/production/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          productionTaskId: selectedTask.id,
          status: newStatus,
          screenshotUrl,
          notes,
          employeeId: localStorage.getItem("tablet:employeeId") || "Unknown",
        }),
      });

      if (!response.ok) throw new Error("Failed to update production status");

      toast({
        title: "Success",
        description:
          "Production status updated. All tablets have been notified.",
      });

      // Clear form
      setSelectedFile(null);
      setPreviewUrl(null);
      setNotes("");
      setNewStatus("in-progress");
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update production status",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <CardTitle className="dark:text-slate-50">
                Production Updates
              </CardTitle>
              <CardDescription className="dark:text-slate-400">
                Update production status with screenshots for all kitchen stations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {tasks.length === 0 ? (
            <Alert className="border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
              <AlertCircle className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <AlertDescription className="text-slate-700 dark:text-slate-300">
                No active production tasks. Create tasks in the production
                system to track them here.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Select Production Task *
                </label>
                <Select
                  value={selectedTask?.id || ""}
                  onValueChange={(taskId) => {
                    const task = tasks.find((t) => t.id === taskId);
                    setSelectedTask(task || null);
                  }}
                >
                  <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                    {tasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.name} ({task.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTask && (
                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-50">
                    {selectedTask.name}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Current Status: <span className="font-semibold">{selectedTask.status}</span>
                  </p>
                  {selectedTask.expectedDueTime && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Due: {selectedTask.expectedDueTime}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                  Production Screenshot
                </h3>

                {previewUrl ? (
                  <div className="space-y-3">
                    <div className="relative bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden max-w-md mx-auto">
                      <img
                        src={previewUrl}
                        alt="Production screenshot"
                        className="w-full h-auto"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(null);
                        }}
                        className="absolute top-2 right-2 bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 text-center bg-slate-50 dark:bg-slate-800">
                      <Camera className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        Take a photo of the current production status
                      </p>
                      <div className="flex gap-2 flex-col sm:flex-row justify-center">
                        <Button
                          onClick={handleCapturePhoto}
                          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Take Photo
                        </Button>
                        <Button variant="outline" className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700">
                          <label className="flex items-center cursor-pointer">
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Image
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileSelect}
                              className="hidden"
                            />
                          </label>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Production Status *
                </label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="blocked">Blocked/Delayed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  placeholder="Any updates or notes about production status..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                {onClose && (
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  onClick={handleSubmitUpdate}
                  disabled={isUploading || !selectedTask}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Update Production Status
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
