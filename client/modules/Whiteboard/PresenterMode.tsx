import React, { useState, useEffect, useRef } from "react";
import { PresentationDeck, PresentationSlide, CanvasState } from "./types";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Clock,
  BookOpen,
  Settings,
  X,
  Eye,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
interface PresenterModeProps {
  deck: PresentationDeck;
  canvasState: CanvasState;
  onSlideChange?: (slideIndex: number) => void;
  onExitPresenter?: () => void;
  onStartPresentation?: () => void;
}
interface SlideTimerState {
  elapsedSeconds: number;
  isRunning: boolean;
}
export const PresenterMode: React.FC<PresenterModeProps> = ({
  deck,
  canvasState,
  onSlideChange,
  onExitPresenter,
  onStartPresentation,
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [timerState, setTimerState] = useState<SlideTimerState>({
    elapsedSeconds: 0,
    isRunning: false,
  });
  const [showSpeakerNotes, setShowSpeakerNotes] = useState(true);
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const totalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentSlide = deck.slides[currentSlideIndex];
  useEffect(() => {
    if (timerState.isRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerState((prev) => ({
          ...prev,
          elapsedSeconds: prev.elapsedSeconds + 1,
        }));
      }, 1000);
      totalTimerRef.current = setInterval(() => {
        setTotalElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    };
  }, [timerState.isRunning]);
  const handleNextSlide = () => {
    if (currentSlideIndex < deck.slides.length - 1) {
      const newIndex = currentSlideIndex + 1;
      setCurrentSlideIndex(newIndex);
      setTimerState({ elapsedSeconds: 0, isRunning: timerState.isRunning });
      onSlideChange?.(newIndex);
    }
  };
  const handlePreviousSlide = () => {
    if (currentSlideIndex > 0) {
      const newIndex = currentSlideIndex - 1;
      setCurrentSlideIndex(newIndex);
      setTimerState({ elapsedSeconds: 0, isRunning: timerState.isRunning });
      onSlideChange?.(newIndex);
    }
  };
  const handleGoToSlide = (index: number) => {
    setCurrentSlideIndex(index);
    setTimerState({ elapsedSeconds: 0, isRunning: timerState.isRunning });
    onSlideChange?.(index);
  };
  const toggleTimer = () => {
    setTimerState((prev) => ({ ...prev, isRunning: !prev.isRunning }));
  };
  const resetTimer = () => {
    setTimerState({ elapsedSeconds: 0, isRunning: false });
  };
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${minutes}:${String(secs).padStart(2, "0")}`;
  };
  return (
    <div className="fixed inset-0 bg-gray-900 z-[9999] flex flex-col text-white">
      {" "}
      {/* Main Presentation Area */}{" "}
      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        {" "}
        {/* Slide Preview (Main) */}{" "}
        <div className="flex-1 flex flex-col">
          {" "}
          <div className="flex-1 bg-black rounded-lg overflow-hidden border-2 border-blue-500 shadow-2xl">
            {" "}
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-black">
              {" "}
              <div className="text-center">
                {" "}
                <h1 className="text-5xl font-bold mb-4">
                  {" "}
                  {currentSlide.title}{" "}
                </h1>{" "}
                {currentSlide.description && (
                  <p className="text-xl text-gray-400">
                    {" "}
                    {currentSlide.description}{" "}
                  </p>
                )}{" "}
                <div className="mt-8 text-sm text-muted-foreground">
                  {" "}
                  {currentSlide.elements.length} elements{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
          {/* Slide Navigation Controls */}{" "}
          <div className="mt-4 flex items-center justify-between gap-4">
            {" "}
            <Button
              size="sm"
              variant="outline"
              onClick={handlePreviousSlide}
              disabled={currentSlideIndex === 0}
            >
              {" "}
              <ChevronLeft className="w-4 h-4 mr-2" /> Previous{" "}
            </Button>{" "}
            <div className="flex items-center gap-2">
              {" "}
              <span className="text-sm font-medium">
                {" "}
                {currentSlideIndex + 1} / {deck.slides.length}{" "}
              </span>{" "}
            </div>{" "}
            <Button
              size="sm"
              variant="outline"
              onClick={handleNextSlide}
              disabled={currentSlideIndex === deck.slides.length - 1}
            >
              {" "}
              Next <ChevronRight className="w-4 h-4 ml-2" />{" "}
            </Button>{" "}
          </div>{" "}
        </div>{" "}
        {/* Right Panel: Speaker Notes & Controls */}{" "}
        <div className="w-96 flex flex-col bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
          {" "}
          {/* Timer Section */}{" "}
          <div className="p-4 border-b border-gray-700">
            {" "}
            <div className="flex items-center justify-between mb-3">
              {" "}
              <div className="flex items-center gap-2">
                {" "}
                <Clock className="w-5 h-5 text-blue-400" />{" "}
                <span className="text-sm font-semibold">Slide Timer</span>{" "}
              </div>{" "}
              <button
                onClick={resetTimer}
                className="text-xs text-gray-400 hover:text-white transition"
              >
                {" "}
                Reset{" "}
              </button>{" "}
            </div>{" "}
            <div className="text-4xl font-mono font-bold text-center mb-3">
              {" "}
              {formatTime(timerState.elapsedSeconds)}{" "}
            </div>{" "}
            <div className="flex gap-2 justify-center mb-3">
              {" "}
              <Button
                size="sm"
                variant={timerState.isRunning ? "default" : "outline"}
                onClick={toggleTimer}
              >
                {" "}
                {timerState.isRunning ? (
                  <>
                    {" "}
                    <Pause className="w-3 h-3 mr-1" /> Pause{" "}
                  </>
                ) : (
                  <>
                    {" "}
                    <Play className="w-3 h-3 mr-1" /> Start{" "}
                  </>
                )}{" "}
              </Button>{" "}
            </div>{" "}
            <div className="text-xs text-gray-400 text-center">
              {" "}
              Total: {formatTime(totalElapsedSeconds)}{" "}
            </div>{" "}
          </div>{" "}
          {/* Speaker Notes */}{" "}
          <div className="flex-1 flex flex-col overflow-hidden border-b border-gray-700">
            {" "}
            <div className="px-4 py-3 bg-gray-700 flex items-center justify-between">
              {" "}
              <div className="flex items-center gap-2">
                {" "}
                <BookOpen className="w-4 h-4" />{" "}
                <span className="text-sm font-semibold">
                  Speaker Notes
                </span>{" "}
              </div>{" "}
              <button
                onClick={() => setShowSpeakerNotes(!showSpeakerNotes)}
                className="text-xs text-gray-400 hover:text-white transition"
              >
                {" "}
                {showSpeakerNotes ? "Hide" : "Show"}{" "}
              </button>{" "}
            </div>{" "}
            {showSpeakerNotes && (
              <div className="flex-1 overflow-y-auto p-4 text-sm leading-relaxed">
                {" "}
                {currentSlide.speakerNotes ? (
                  <p className="whitespace-pre-wrap text-gray-300">
                    {" "}
                    {currentSlide.speakerNotes}{" "}
                  </p>
                ) : (
                  <p className="text-muted-foreground italic">
                    {" "}
                    No speaker notes for this slide{" "}
                  </p>
                )}{" "}
              </div>
            )}{" "}
          </div>{" "}
          {/* Slide Thumbnails */}{" "}
          <div className="flex-1 overflow-y-auto border-b border-gray-700 p-2">
            {" "}
            <div className="text-xs font-semibold text-gray-400 mb-2 px-2">
              {" "}
              Slides{" "}
            </div>{" "}
            <div className="space-y-1">
              {" "}
              {deck.slides.map((slide, idx) => (
                <button
                  key={slide.id}
                  onClick={() => handleGoToSlide(idx)}
                  className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${idx === currentSlideIndex ? "bg-primary text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
                >
                  {" "}
                  {idx + 1}. {slide.title}{" "}
                </button>
              ))}{" "}
            </div>{" "}
          </div>{" "}
          {/* Bottom Controls */}{" "}
          <div className="p-3 border-t border-gray-700 space-y-2">
            {" "}
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={onExitPresenter}
            >
              {" "}
              <X className="w-4 h-4 mr-2" /> Exit Presenter{" "}
            </Button>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {/* Bottom Info Bar */}{" "}
      <div className="px-6 py-3 bg-gray-800 border-t border-gray-700 flex items-center justify-between">
        {" "}
        <div className="flex items-center gap-4">
          {" "}
          <div className="text-sm">
            {" "}
            <span className="text-gray-400">Presentation:</span>{" "}
            <span className="ml-2 font-semibold">{deck.title}</span>{" "}
          </div>{" "}
          <div className="text-sm">
            {" "}
            <span className="text-gray-400">Duration:</span>{" "}
            <span className="ml-2 font-semibold">
              {" "}
              {formatTime(totalElapsedSeconds)}{" "}
            </span>{" "}
          </div>{" "}
        </div>{" "}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {" "}
          <Eye className="w-4 h-4" /> Presenter Mode Active{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};
export default PresenterMode;
