import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, AlertCircle } from "lucide-react";
import { useOutlet } from "../context/OutletContext";
import { cn } from "@/lib/glass";
interface OutletSelectorProps {
  className?: string;
}
export function OutletSelector({ className }: OutletSelectorProps) {
  const { currentOutletId, availableOutlets, selectOutlet, loading, error } =
    useOutlet();
  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 p-2", className)}>
        {" "}
        <MapPin size={16} className="text-muted-foreground" />{" "}
        <span className="text-sm text-muted-foreground">
          {" "}
          Loading outlets...{" "}
        </span>{" "}
      </div>
    );
  }
  if (error) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 p-2 text-destructive",
          className,
        )}
      >
        {" "}
        <AlertCircle size={16} /> <span className="text-sm">{error}</span>{" "}
      </div>
    );
  }
  if (availableOutlets.length === 1) {
    return (
      <div className={cn("flex items-center gap-2 p-2", className)}>
        {" "}
        <MapPin size={16} className="text-muted-foreground" />{" "}
        <span className="text-sm font-medium">
          {availableOutlets[0].name}
        </span>{" "}
      </div>
    );
  }
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {" "}
      <MapPin size={16} className="text-muted-foreground" />{" "}
      <Select value={currentOutletId} onValueChange={selectOutlet}>
        {" "}
        <SelectTrigger className="w-[200px]">
          {" "}
          <SelectValue placeholder="Select outlet..." />{" "}
        </SelectTrigger>{" "}
        <SelectContent>
          {" "}
          {availableOutlets.map((outlet) => (
            <SelectItem key={outlet.id} value={outlet.id}>
              {" "}
              <div className="flex flex-col">
                {" "}
                <span className="font-medium">{outlet.name}</span>{" "}
                {outlet.location && (
                  <span className="text-xs text-muted-foreground">
                    {" "}
                    {outlet.location}{" "}
                  </span>
                )}{" "}
              </div>{" "}
            </SelectItem>
          ))}{" "}
        </SelectContent>{" "}
      </Select>{" "}
    </div>
  );
}
