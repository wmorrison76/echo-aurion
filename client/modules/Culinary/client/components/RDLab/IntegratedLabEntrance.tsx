import { useState, useEffect } from "react";
import { useLabSession } from "@/hooks/use-lab-session";
import { EchoChatInterface } from "./EchoChatInterface";
import { SlidingDoorPanels } from "./SlidingDoorPanels";
import { EnhancedLabWhiteboard, FontStyle } from "./EnhancedLabWhiteboard";
import { LabSettingsPopup } from "./LabSettingsPopup";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { toast } from "sonner";

type TransitionState =
  | "idle"
  | "collecting_data"
  | "preloading"
  | "dissolving_chat"
  | "opening_doors"
  | "lab_active";

interface IntegratedLabEntranceProps {
  onLabEnter?: (projectInfo: {
    projectName: string;
    projectId: string;
  }) => void;
  blackboardImageUrl?: string;
}

export function IntegratedLabEntrance({
  onLabEnter,
  blackboardImageUrl,
}: IntegratedLabEntranceProps) {
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [transitionState, setTransitionState] = useState<TransitionState>("idle");
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [fontStyle, setFontStyle] = useState<FontStyle>("chalkboard");
  const [chatOpacity, setChatOpacity] = useState(1);
  const [whiteboardOpacity, setWhiteboardOpacity] = useState(0);
  const [whiteboardVisible, setWhiteboardVisible] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);

  // Load or create session
  const {
    sessionData,
    isLoading,
    updateProject,
    updateEntries,
    setFontStyle: saveFontStyle,
    setDoorsOpen: saveDoorsOpen,
  } = useLabSession(currentProjectId || "default");

  // Manage transition sequence
  useEffect(() => {
    if (transitionState === "idle") {
      setChatOpacity(1);
      setWhiteboardOpacity(0);
      setWhiteboardVisible(false);
    } else if (transitionState === "collecting_data") {
      // AI is collecting data - show visual feedback
      setChatOpacity(1);
      setWhiteboardOpacity(0);
    } else if (transitionState === "preloading") {
      // Preload whiteboard to 50% visibility
      setWhiteboardVisible(true);
      const preloadInterval = setInterval(() => {
        setWhiteboardOpacity((prev) => {
          const newVal = Math.min(prev + 0.1, 0.5);
          if (newVal >= 0.5) {
            clearInterval(preloadInterval);
            setTransitionState("dissolving_chat");
          }
          return newVal;
        });
      }, 50);
      return () => clearInterval(preloadInterval);
    } else if (transitionState === "dissolving_chat") {
      // Fade out chat window
      const dissolveInterval = setInterval(() => {
        setChatOpacity((prev) => {
          const newVal = Math.max(prev - 0.08, 0);
          if (newVal <= 0) {
            clearInterval(dissolveInterval);
            setTransitionState("opening_doors");
          }
          return newVal;
        });
      }, 50);
      return () => clearInterval(dissolveInterval);
    } else if (transitionState === "opening_doors") {
      // Continue revealing whiteboard as doors open
      setDoorsOpen(true);
      saveDoorsOpen(true);
      const revealInterval = setInterval(() => {
        setWhiteboardOpacity((prev) => {
          const newVal = Math.min(prev + 0.08, 1);
          if (newVal >= 1) {
            clearInterval(revealInterval);
            setTransitionState("lab_active");
          }
          return newVal;
        });
      }, 50);
      return () => clearInterval(revealInterval);
    }
  }, [transitionState, saveDoorsOpen]);

  // Handle lab trigger from chat
  const handleLabTrigger = (projectInfo: {
    projectName: string;
    projectId: string;
    conversationContext: string;
    extractedData?: any;
  }) => {
    try {
      setCurrentProjectId(projectInfo.projectId);
      setExtractedData(projectInfo.extractedData || null);
      updateProject(
        projectInfo.projectName,
        "culinary",
        "fine-dining"
      );
      onLabEnter?.(projectInfo);

      // Start transition sequence
      setTransitionState("preloading");
      toast.success(`${projectInfo.projectName} lab activated!`);
    } catch (err) {
      console.error("Failed to activate lab:", err);
      toast.error("Failed to activate lab. Please try again.");
      setTransitionState("idle");
    }
  };

  const handleFontChange = (newStyle: FontStyle) => {
    setFontStyle(newStyle);
    saveFontStyle(newStyle);
  };

  const handleCloseLab = () => {
    setDoorsOpen(false);
    saveDoorsOpen(false);
    setTransitionState("idle");
    setCurrentProjectId(null);
    setChatOpacity(1);
    setWhiteboardOpacity(0);
    setWhiteboardVisible(false);
  };

  if (!currentProjectId) {
    // Initial chat interface - always shows during idle state
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black">
        <div
          style={{
            opacity: chatOpacity,
            transition: "opacity 0.3s ease-out",
          }}
        >
          <EchoChatInterface onLabTrigger={handleLabTrigger} />
        </div>
      </div>
    );
  }

  // During and after transition - composite view
  return (
    <div className="w-full h-full relative bg-gradient-to-br from-slate-950 via-slate-900 to-black overflow-hidden">
      {/* Chat interface with dissolution animation */}
      {chatOpacity > 0 && (
        <div
          className="absolute bottom-4 left-4 z-30 max-w-xs max-h-96 rounded-lg shadow-2xl bg-slate-900/90 border border-slate-700/50 backdrop-blur-md overflow-hidden"
          style={{
            opacity: chatOpacity,
            transition: "opacity 0.6s ease-in-out",
            pointerEvents: chatOpacity > 0 ? "auto" : "none",
          }}
        >
          <div className="p-4 flex flex-col h-96">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-100">ECHO Chat</h3>
              {transitionState === "idle" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCloseLab}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {transitionState === "idle" && (
              <EchoChatInterface onLabTrigger={handleLabTrigger} />
            )}
          </div>
        </div>
      )}

      {/* Preloading whiteboard - appears before doors open */}
      {whiteboardVisible && transitionState !== "idle" && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
          style={{
            opacity: whiteboardOpacity,
            transition: "opacity 0.3s ease-out",
          }}
        >
          <div className="w-5/6 h-5/6 rounded-lg overflow-hidden">
            <div className="w-full h-full bg-slate-900/80 border border-slate-700/50 rounded-lg p-6">
              {isLoading ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <span className="text-sm">Loading whiteboard...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-amber-100">
                      {sessionData?.projectName || "Lab Whiteboard"}
                    </h2>
                    <p className="text-xs text-amber-100/60">
                      {sessionData?.entries?.length || 0} entries
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sliding door panels with whiteboard */}
      <SlidingDoorPanels
        isOpen={doorsOpen}
        onToggle={(isOpen) => {
          setDoorsOpen(isOpen);
          if (!isOpen) {
            handleCloseLab();
          }
        }}
        labMode="culinary"
      >
        <div className="w-full h-full flex items-center justify-center p-8">
          {isLoading ? (
            <div className="text-slate-400">Loading lab...</div>
          ) : (
            <div
              className="w-full h-full flex flex-col gap-4"
              style={{
                opacity: whiteboardOpacity,
                transition: "opacity 0.4s ease-out",
              }}
            >
              {/* Top controls */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-900/50 rounded-lg border border-slate-700/30">
                <div>
                  <h2 className="text-xl font-bold text-amber-100">
                    {sessionData?.projectName || "Lab Whiteboard"}
                  </h2>
                  <p className="text-xs text-amber-100/60">
                    Lab Session • {sessionData?.entries?.length || 0} entries
                  </p>
                </div>
                <LabSettingsPopup
                  fontStyle={fontStyle}
                  onFontStyleChange={handleFontChange}
                  onClose={() => {}}
                />
              </div>

              {/* Whiteboard */}
              <EnhancedLabWhiteboard
                isVisible={true}
                projectName={sessionData?.projectName || "Unnamed Project"}
                projectId={currentProjectId}
                onClose={handleCloseLab}
                entries={sessionData?.entries || []}
                onEntriesChange={updateEntries}
                fontStyle={fontStyle}
                onFontStyleChange={handleFontChange}
                blackboardImage={blackboardImageUrl}
              />
            </div>
          )}
        </div>
      </SlidingDoorPanels>

      {/* Quick access toolbar - visible when doors closed after transition */}
      {!doorsOpen && transitionState === "idle" && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 bg-slate-900/80 border border-slate-700/50 rounded-lg p-4 backdrop-blur-md">
          <div className="text-center space-y-3">
            <p className="text-sm text-slate-300">Lab minimized</p>
            <p className="text-xs text-slate-500">
              Click the 20px peek on the sides or the button below to open
            </p>
            <Button
              size="sm"
              onClick={() => setDoorsOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Open Lab
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
