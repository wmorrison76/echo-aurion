import React, { useState, useRef, useEffect } from "react";
import { RecordingSession } from "./types";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Download,
  X,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
interface RecordingPlayerProps {
  recording: RecordingSession;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (recording: RecordingSession) => void;
}
export const RecordingPlayer: React.FC<RecordingPlayerProps> = ({
  recording,
  isOpen,
  onClose,
  onDownload,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const updateTime = () => {
      setCurrentTime(video.currentTime);
    };
    const handleEnded = () => {
      setIsPlaying(false);
    };
    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("ended", handleEnded);
    return () => {
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("ended", handleEnded);
    };
  }, []);
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume / 100;
    }
    if (newVolume > 0) {
      setIsMuted(false);
    }
  };
  const toggleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume / 100;
        setIsMuted(false);
      } else {
        videoRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return "0:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${minutes}:${String(secs).padStart(2, "0")}`;
  };
  const duration = recording.duration || 0;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      {" "}
      <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {" "}
        {/* Header */}{" "}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          {" "}
          <div>
            {" "}
            <h2 className="text-2xl font-bold text-white">
              {recording.title}
            </h2>{" "}
            <p className="text-sm text-gray-400 mt-1">
              {" "}
              Recorded by {recording.recordedBy} •{""}{" "}
              {new Date(recording.startTime).toLocaleDateString()}{" "}
            </p>{" "}
          </div>{" "}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            {" "}
            <X className="w-6 h-6 text-gray-400" />{" "}
          </button>{" "}
        </div>{" "}
        {/* Video Player */}{" "}
        <div className="flex-1 flex items-center justify-center bg-black overflow-hidden">
          {" "}
          {recording.videoUrl ? (
            <video
              ref={videoRef}
              src={recording.videoUrl}
              className="w-full h-full max-w-full max-h-full object-contain"
            />
          ) : recording.thumbnail ? (
            <div className="w-full h-full flex items-center justify-center">
              {" "}
              <img
                src={recording.thumbnail}
                alt="Recording thumbnail"
                className="w-full h-full object-contain"
              />{" "}
              <div className="absolute text-center">
                {" "}
                <div className="text-white text-sm">
                  {" "}
                  Processing:{""}{" "}
                  {recording.isProcessing ? "In Progress..." : "Ready"}{" "}
                </div>{" "}
              </div>{" "}
            </div>
          ) : (
            <div className="text-center text-gray-400">
              {" "}
              <p>No video available</p>{" "}
            </div>
          )}{" "}
        </div>{" "}
        {/* Controls */}{" "}
        <div className="bg-gray-800 border-t border-gray-700 p-4 space-y-4">
          {" "}
          {/* Progress Bar */}{" "}
          <div className="space-y-1">
            {" "}
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full h-1 bg-gray-700 rounded cursor-pointer accent-blue-500"
            />{" "}
            <div className="flex items-center justify-between text-xs text-gray-400">
              {" "}
              <span>{formatTime(currentTime)}</span>{" "}
              <span>{formatTime(duration)}</span>{" "}
            </div>{" "}
          </div>{" "}
          {/* Playback Controls */}{" "}
          <div className="flex items-center justify-between">
            {" "}
            <div className="flex items-center gap-2">
              {" "}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSeek(Math.max(0, currentTime - 5))}
                title="Skip back 5 seconds"
              >
                {" "}
                <SkipBack className="w-4 h-4" />{" "}
              </Button>{" "}
              <Button
                size="lg"
                onClick={handlePlayPause}
                className="bg-primary hover:opacity-90"
              >
                {" "}
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}{" "}
              </Button>{" "}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSeek(Math.min(duration, currentTime + 5))}
                title="Skip forward 5 seconds"
              >
                {" "}
                <SkipForward className="w-4 h-4" />{" "}
              </Button>{" "}
              {/* Volume Control */}{" "}
              <div className="flex items-center gap-2 ml-4 pl-4 border-l border-gray-700">
                {" "}
                <button
                  onClick={toggleMute}
                  className="p-2 hover:bg-gray-700 rounded transition-colors"
                >
                  {" "}
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-gray-400" />
                  )}{" "}
                </button>{" "}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                  className="w-24 h-1 bg-gray-700 rounded cursor-pointer accent-blue-500"
                />{" "}
              </div>{" "}
            </div>{" "}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDownload?.(recording)}
              disabled={recording.isProcessing}
            >
              {" "}
              <Download className="w-4 h-4 mr-2" /> Download{" "}
            </Button>{" "}
          </div>{" "}
          {/* Info */}{" "}
          {recording.isProcessing && (
            <div className="text-sm text-yellow-500 flex items-center gap-2">
              {" "}
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />{" "}
              Processing video... (This may take a moment){" "}
            </div>
          )}{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};
export default RecordingPlayer;
