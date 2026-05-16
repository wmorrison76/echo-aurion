/**
 * Assembly Animation Playback Controls
 * UI for controlling cake layer assembly animation playback
 */

import React, { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, FastForward, Rewind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { AssemblyAnimationTimelineManager } from "@/lib/cake-assembly-animation";
import { ANIMATION_PRESETS } from "@/lib/cake-assembly-animation";

interface AssemblyAnimationControlsProps {
  timelineManager: AssemblyAnimationTimelineManager;
  onStateChange?: (state: { isPlaying: boolean; progress: number }) => void;
}

export default function AssemblyAnimationControls({
  timelineManager,
  onStateChange,
}: AssemblyAnimationControlsProps) {
  const [state, setState] = useState(timelineManager.getState());
  const [selectedSpeed, setSelectedSpeed] = useState(1);

  // Update state regularly during playback
  useEffect(() => {
    const interval = setInterval(() => {
      const newState = timelineManager.getState();
      setState(newState);
      onStateChange?.({
        isPlaying: newState.isPlaying,
        progress: newState.progress,
      });
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [timelineManager, onStateChange]);

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = Math.floor((ms % 1000) / 100);
    return `${seconds}.${milliseconds}s`;
  };

  const handlePlayPause = () => {
    if (state.isPlaying) {
      timelineManager.pause();
    } else {
      timelineManager.play();
    }
    setState(timelineManager.getState());
  };

  const handleStop = () => {
    timelineManager.stop();
    setState(timelineManager.getState());
  };

  const handleRewind = () => {
    timelineManager.seek(Math.max(0, state.currentTime - 500));
    setState(timelineManager.getState());
  };

  const handleFastForward = () => {
    timelineManager.seek(Math.min(state.duration, state.currentTime + 500));
    setState(timelineManager.getState());
  };

  const handleSpeedChange = (speed: number) => {
    timelineManager.setSpeed(speed);
    setSelectedSpeed(speed);
  };

  const handleSeek = (progress: number) => {
    timelineManager.seekByProgress(progress);
    setState(timelineManager.getState());
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "16px",
        backgroundColor: "#1a1a1a",
        borderRadius: "8px",
        border: "1px solid #333",
      }}
    >
      {/* Playback Controls */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={handleRewind}
          title="Rewind 0.5s"
          style={{ padding: "6px" }}
        >
          <Rewind size={16} />
        </Button>

        <Button
          variant={state.isPlaying ? "default" : "outline"}
          size="sm"
          onClick={handlePlayPause}
          title={state.isPlaying ? "Pause" : "Play"}
          style={{ padding: "8px 16px" }}
        >
          {state.isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleFastForward}
          title="Forward 0.5s"
          style={{ padding: "6px" }}
        >
          <FastForward size={16} />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleStop}
          title="Stop and Reset"
          style={{ padding: "8px 16px" }}
        >
          <RotateCcw size={16} />
        </Button>
      </div>

      {/* Timeline Scrubber */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              color: "#00f0ff",
              fontSize: "11px",
              fontWeight: "bold",
            }}
          >
            Timeline
          </span>
          <span
            style={{
              color: "#888",
              fontSize: "10px",
            }}
          >
            {formatTime(state.currentTime)} / {formatTime(state.duration)}
          </span>
        </div>

        <Slider
          value={[state.progress]}
          min={0}
          max={1}
          step={0.01}
          onValueChange={(value) => handleSeek(value[0])}
          style={{ cursor: "pointer" }}
        />
      </div>

      {/* Progress Bar */}
      <div
        style={{
          width: "100%",
          height: "4px",
          backgroundColor: "#0a0a0a",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${state.progress * 100}%`,
            backgroundColor: "#00f0ff",
            transition: "width 0.016s linear",
          }}
        />
      </div>

      {/* Speed Controls */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label
          style={{
            color: "#00f0ff",
            fontSize: "11px",
            fontWeight: "bold",
          }}
        >
          Playback Speed: {selectedSpeed.toFixed(2)}x
        </label>

        <div
          style={{
            display: "flex",
            gap: "4px",
            flexWrap: "wrap",
          }}
        >
          {Object.entries(ANIMATION_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => handleSpeedChange(preset.speed)}
              style={{
                padding: "6px 12px",
                backgroundColor:
                  selectedSpeed === preset.speed ? "#00f0ff" : "#0a0a0a",
                color: selectedSpeed === preset.speed ? "#000" : "#00f0ff",
                border: `1px solid ${selectedSpeed === preset.speed ? "#00f0ff" : "#333"}`,
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "10px",
                fontWeight: "bold",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (selectedSpeed !== preset.speed) {
                  e.currentTarget.style.borderColor = "#00f0ff";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedSpeed !== preset.speed) {
                  e.currentTarget.style.borderColor = "#333";
                }
              }}
              title={preset.name}
            >
              {preset.speed}x
            </button>
          ))}
        </div>

        {/* Custom Speed Slider */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Slider
            value={[selectedSpeed]}
            min={0.25}
            max={4}
            step={0.25}
            onValueChange={(value) => handleSpeedChange(value[0])}
            style={{ flex: 1 }}
          />
          <input
            type="number"
            min="0.25"
            max="4"
            step="0.25"
            value={selectedSpeed.toFixed(2)}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) {
                handleSpeedChange(Math.max(0.25, Math.min(4, val)));
              }
            }}
            style={{
              width: "50px",
              padding: "4px",
              backgroundColor: "#0a0a0a",
              color: "#00f0ff",
              border: "1px solid #333",
              borderRadius: "4px",
              fontSize: "10px",
              textAlign: "center",
            }}
          />
        </div>
      </div>

      {/* Info */}
      <div
        style={{
          padding: "8px",
          backgroundColor: "rgba(0, 240, 255, 0.05)",
          borderRadius: "4px",
          borderLeft: "2px solid #00f0ff",
        }}
      >
        <p
          style={{
            color: "#888",
            fontSize: "10px",
            margin: 0,
            lineHeight: "1.4",
          }}
        >
          {state.isPlaying ? "▶ Playing" : "⏸ Paused"} • Progress:{" "}
          {Math.round(state.progress * 100)}% • Duration:{" "}
          {formatTime(state.duration)}
        </p>
      </div>
    </div>
  );
}
