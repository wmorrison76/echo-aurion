import { Cloud, CloudRain, Sun, Wind } from "lucide-react";
import { MiniPanel } from "../MiniPanel";
interface WeatherPanelProps {
  location?: string;
  temperature?: number;
  condition?: string;
  humidity?: number;
  windSpeed?: number;
  isMinimized?: boolean;
  onMinimize?: () => void;
  onClose?: () => void;
  size?: "small" | "medium" | "large";
  onSizeChange?: (size: "small" | "medium" | "large") => void;
}
export function WeatherPanel({
  location = "Miami, FL",
  temperature = 86,
  condition = "Partly Cloudy",
  humidity = 72,
  windSpeed = 12,
  isMinimized,
  onMinimize,
  onClose,
  size = "small",
  onSizeChange,
}: WeatherPanelProps) {
  return (
    <MiniPanel
      id="weather"
      title="Weather"
      icon={<Cloud className="h-4 w-4" />}
      isMinimized={isMinimized}
      onMinimize={onMinimize}
      onClose={onClose}
      size={size}
      onSizeChange={onSizeChange}
    >
      {" "}
      <div className="space-y-4">
        {" "}
        <div>
          {" "}
          <p className="text-xs text-white/60 mb-1">{location}</p>{" "}
          <div className="flex items-center justify-between">
            {" "}
            <div>
              {" "}
              <span className="text-3xl font-bold text-white">
                {" "}
                {temperature}°{" "}
              </span>{" "}
              <p className="text-xs text-white/80 mt-1">{condition}</p>{" "}
            </div>{" "}
            <Sun className="h-12 w-12 text-yellow-400 opacity-80" />{" "}
          </div>{" "}
        </div>{" "}
        <div className="grid grid-cols-2 gap-2">
          {" "}
          <div className="p-2 rounded-lg bg-background border border-white/10">
            {" "}
            <p className="text-xs text-white/60 mb-1">Humidity</p>{" "}
            <p className="text-sm font-semibold text-white">{humidity}%</p>{" "}
          </div>{" "}
          <div className="p-2 rounded-lg bg-background border border-white/10 flex items-center gap-2">
            {" "}
            <Wind className="h-4 w-4 text-white/60" />{" "}
            <div>
              {" "}
              <p className="text-xs text-white/60 mb-1">Wind</p>{" "}
              <p className="text-sm font-semibold text-white">
                {" "}
                {windSpeed} mph{" "}
              </p>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
          {" "}
          <p className="text-xs text-orange-300">
            {" "}
            No weather alerts for upcoming events{" "}
          </p>{" "}
        </div>{" "}
      </div>{" "}
    </MiniPanel>
  );
}
