/** * Device Selector Component * Displays available hardware devices and allows selection */ import React, {
  useEffect,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { HardwareDevice, DeviceDetectionResult } from "../types";
interface DeviceSelectorProps {
  onSelect: (deviceId: string) => void;
  onDetect: () => Promise<DeviceDetectionResult>;
  isLoading?: boolean;
  selectedDeviceId?: string | null;
  allowAutoDetect?: boolean;
}
export function DeviceSelector({
  onSelect,
  onDetect,
  isLoading = false,
  selectedDeviceId = null,
  allowAutoDetect = true,
}: DeviceSelectorProps) {
  const [devices, setDevices] = useState<HardwareDevice[]>([]);
  const [autoDetected, setAutoDetected] = useState<HardwareDevice | null>(null);
  const [recommended, setRecommended] = useState<HardwareDevice | null>(null);
  const [isDetecting, setIsDetecting] = useState(false); // Detect devices on mount useEffect(() => { const detect = async () => { setIsDetecting(true); try { const result = await onDetect(); setDevices(result.available); setAutoDetected(result.autoDetected || null); setRecommended(result.recommended || null); // Auto-select if available if (allowAutoDetect && result.autoDetected) { onSelect(result.autoDetected.id); } } catch (error) { console.error('Failed to detect devices:', error); } finally { setIsDetecting(false); } }; detect(); }, [onDetect, onSelect, allowAutoDetect]); const getDeviceTypeLabel = (type: string): string => { switch (type) { case 'mobile': return '📱 Mobile Camera'; case 'lidar': return '📡 LiDAR'; case 'depthcam': return '🎥 Depth Camera'; case 'drone': return '🚁 Drone'; default: return type; } }; const getDeviceStatusColor = (device: HardwareDevice): string => { if (!device.connected) return 'default'; if (selectedDeviceId === device.id) return 'default'; if (autoDetected?.id === device.id) return 'secondary'; return 'outline'; }; return ( <Card className="w-full"> <CardHeader> <CardTitle>Hardware Scanner</CardTitle> <CardDescription> {isDetecting ? 'Detecting devices...' : `${devices.length} device(s) available`} </CardDescription> </CardHeader> <CardContent className="space-y-4"> {/* Auto-detected notice */} {autoDetected && allowAutoDetect && ( <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700"> ✓ Auto-detected: {getDeviceTypeLabel(autoDetected.type)} ({autoDetected.name}) </div> )} {/* Recommended notice */} {recommended && !autoDetected && ( <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700"> ⭐ Recommended: {getDeviceTypeLabel(recommended.type)} ({recommended.name}) </div> )} {/* Device list */} <div className="space-y-2"> {devices.length === 0 ? ( <div className="p-4 text-center text-sm text-muted-foreground"> {isDetecting ? 'Scanning for devices...' : 'No devices found'} </div> ) : ( devices.map((device) => ( <DeviceCard key={device.id} device={device} isSelected={selectedDeviceId === device.id} isAutoDetected={autoDetected?.id === device.id} isRecommended={recommended?.id === device.id} onSelect={() => onSelect(device.id)} isLoading={isLoading} /> )) )} </div> {/* Refresh button */} <Button variant="outline" size="sm" className="w-full" onClick={async () => { setIsDetecting(true); try { const result = await onDetect(); setDevices(result.available); setAutoDetected(result.autoDetected || null); setRecommended(result.recommended || null); } catch (error) { console.error('Detection failed:', error); } finally { setIsDetecting(false); } }} disabled={isDetecting || isLoading} > {isDetecting ? 'Scanning...' : 'Rescan Devices'} </Button> </CardContent> </Card> );
}
interface DeviceCardProps {
  device: HardwareDevice;
  isSelected: boolean;
  isAutoDetected: boolean;
  isRecommended: boolean;
  onSelect: () => void;
  isLoading: boolean;
}
function DeviceCard({
  device,
  isSelected,
  isAutoDetected,
  isRecommended,
  onSelect,
  isLoading,
}: DeviceCardProps) {
  const getDeviceTypeEmoji = (type: string): string => {
    switch (type) {
      case "mobile":
        return "📱";
      case "lidar":
        return "📡";
      case "depthcam":
        return "🎥";
      case "drone":
        return "🚁";
      default:
        return "⚙️";
    }
  };
  const getCapabilityLabel = (key: string): string => {
    switch (key) {
      case "supportsRGB":
        return "RGB";
      case "supportsDepth":
        return "Depth";
      case "supportsPointCloud":
        return "Point Cloud";
      case "supportsIMU":
        return "IMU";
      case "supportsGPS":
        return "GPS";
      default:
        return key;
    }
  };
  const capabilities = Object.entries(device.capabilities)
    .filter(([key, value]) => key.startsWith("supports") && value === true)
    .map(([key]) => getCapabilityLabel(key));
  return (
    <div
      className={`p-3 border rounded-lg cursor-pointer transition-all ${isSelected ? "border-blue-500 bg-blue-50" : "border-border hover:border-border"}`}
      onClick={onSelect}
    >
      {" "}
      <div className="flex items-start justify-between gap-3">
        {" "}
        <div className="flex-1 min-w-0">
          {" "}
          <div className="flex items-center gap-2">
            {" "}
            <span className="text-lg">
              {getDeviceTypeEmoji(device.type)}
            </span>{" "}
            <div className="flex-1">
              {" "}
              <h3 className="font-medium text-sm">{device.name}</h3>{" "}
              {device.manufacturer && (
                <p className="text-xs text-muted-foreground">
                  {device.manufacturer}
                </p>
              )}{" "}
            </div>{" "}
          </div>{" "}
          {/* Badges */}{" "}
          <div className="flex flex-wrap gap-1 mt-2">
            {" "}
            {isAutoDetected && (
              <Badge variant="secondary" className="text-xs">
                {" "}
                Auto-Detected{" "}
              </Badge>
            )}{" "}
            {isRecommended && (
              <Badge variant="secondary" className="text-xs">
                {" "}
                Recommended{" "}
              </Badge>
            )}{" "}
            {!device.connected && (
              <Badge variant="destructive" className="text-xs">
                {" "}
                Offline{" "}
              </Badge>
            )}{" "}
          </div>{" "}
          {/* Capabilities */}{" "}
          {capabilities.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {" "}
              {capabilities.map((cap) => (
                <Badge key={cap} variant="outline" className="text-xs">
                  {" "}
                  {cap}{" "}
                </Badge>
              ))}{" "}
            </div>
          )}{" "}
          {/* Specs */}{" "}
          <div className="text-xs text-muted-foreground mt-2 space-y-1">
            {" "}
            <div>
              Max Resolution: {device.capabilities.maxResolution.width}x
              {device.capabilities.maxResolution.height}
            </div>{" "}
            <div>Max Frame Rate: {device.capabilities.maxFrameRate} fps</div>{" "}
            {device.capabilities.depthRange && (
              <div>
                {" "}
                Depth Range: {device.capabilities.depthRange.min}m -{" "}
                {device.capabilities.depthRange.max}m{" "}
              </div>
            )}{" "}
          </div>{" "}
        </div>{" "}
        {/* Select button */}{" "}
        <Button
          size="sm"
          variant={isSelected ? "default" : "outline"}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          disabled={isLoading || !device.connected}
          className="whitespace-nowrap"
        >
          {" "}
          {isSelected ? "✓ Selected" : "Select"}{" "}
        </Button>{" "}
      </div>{" "}
    </div>
  );
}
export default DeviceSelector;
