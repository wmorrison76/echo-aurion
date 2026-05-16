import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Timer, Play, Pause, Square } from "lucide-react";
import { realtimeManager } from "@/lib/supabase";

interface WorkshopTimerProps {
  sessionId: string;
  userId: string;
}

export function WorkshopTimer({ sessionId, userId }: WorkshopTimerProps) {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const unsubStart = realtimeManager.subscribe(sessionId, "timer-start", (data: any) => {
      const s = typeof data?.seconds === "number" ? data.seconds : data?.data?.seconds ?? 300;
      setSeconds(Math.max(0, s));
      setIsRunning(true);
    });
    const unsubStop = realtimeManager.subscribe(sessionId, "timer-stop", () => {
      setIsRunning(false);
      setSeconds(0);
    });
    return () => {
      unsubStart();
      unsubStop();
    };
  }, [sessionId]);

  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [isRunning]);

  const start = useCallback(
    (initialSeconds: number = 300) => {
      setSeconds(initialSeconds);
      setIsRunning(true);
      realtimeManager.sendTimerStart(sessionId, { userId, seconds: initialSeconds });
    },
    [sessionId, userId]
  );

  const stop = useCallback(() => {
    setIsRunning(false);
    setSeconds(0);
realtimeManager.sendTimerStop(sessionId);
  }, [sessionId, userId]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!showPanel && !isRunning && seconds === 0) {
    return (
      <div className="absolute bottom-4 right-48 z-30">
        <Button
          onClick={() => setShowPanel(true)}
          variant="outline"
          size="sm"
          className="rounded-lg gap-2"
          title="Workshop timer"
        >
          <Timer size={16} />
          Timer
        </Button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-4 right-48 z-30 bg-background/95 border border-border/30 rounded-lg p-3 shadow-lg backdrop-blur-sm flex items-center gap-3">
      <span className="text-lg font-mono font-semibold text-foreground min-w-[4rem]">
        {formatTime(seconds)}
      </span>
      {!isRunning && seconds === 0 && (
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="text-xs" onClick={() => start(60)}>
            1m
          </Button>
          <Button size="sm" variant="outline" className="text-xs" onClick={() => start(300)}>
            5m
          </Button>
          <Button size="sm" variant="outline" className="text-xs" onClick={() => start(600)}>
            10m
          </Button>
        </div>
      )}
      {seconds > 0 && (
        <>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => (isRunning ? setIsRunning(false) : start(seconds))}
            title={isRunning ? "Pause" : "Resume"}
          >
            {isRunning ? <Pause size={14} /> : <Play size={14} />}
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={stop} title="Stop">
            <Square size={14} />
          </Button>
        </>
      )}
      {showPanel && seconds === 0 && !isRunning && (
        <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowPanel(false)}>
          ✕
        </Button>
      )}
    </div>
  );
}
