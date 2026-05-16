import React, { useState } from "react";
import { useMultiOutlet } from "@/context/MultiOutletContext";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building2, Users, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
export function OutletSelector() {
  const { organization, outlets, currentOutlet, selectOutlet, isMultiOutlet } =
    useMultiOutlet();
  const [open, setOpen] = useState(false);
  if (!organization || outlets.length === 0) {
    return null;
  } // Single outlet - show as badge if (!isMultiOutlet()) { return ( <div className="flex items-center gap-2"> <Badge variant="secondary" className="px-3 py-1"> <Building2 className="w-3 h-3 mr-1" /> {currentOutlet?.name ||"No outlet"} </Badge> </div> ); } // Multi-outlet - show as dropdown/select return ( <DropdownMenu open={open} onOpenChange={setOpen}> <DropdownMenuTrigger asChild> <Button variant="outline" className="w-full max-w-xs flex items-center justify-between gap-2" > <div className="flex items-center gap-2 truncate"> <Building2 className="w-4 h-4 flex-shrink-0" /> <span className="truncate text-sm font-medium"> {currentOutlet?.name ||"Select outlet"} </span> </div> <span className="text-xs text-muted-foreground ml-auto flex-shrink-0"> {outlets.length} outlets </span> </Button> </DropdownMenuTrigger> <DropdownMenuContent align="start" className="w-80"> <DropdownMenuLabel className="flex items-center justify-between"> <span>Select Outlet</span> <Badge variant="secondary" className="text-xs"> {outlets.length} total </Badge> </DropdownMenuLabel> <DropdownMenuSeparator /> <div className="max-h-96 overflow-y-auto"> {outlets.map((outlet) => ( <DropdownMenuItem key={outlet.id} onClick={() => { selectOutlet(outlet.id); setOpen(false); }} className={cn("flex flex-col gap-2 p-3 cursor-pointer", currentOutlet?.id === outlet.id &&"bg-accent", )} > <div className="flex items-start justify-between w-full"> <div className="flex-1"> <p className="font-medium text-sm">{outlet.name}</p> <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground"> <MapPin className="w-3 h-3" /> <span> {outlet.location.city}, {outlet.location.state} </span> </div> </div> {outlet.status ==="active" && ( <Badge variant="default" className="ml-2"> Active </Badge> )} {outlet.status ==="inactive" && ( <Badge variant="secondary" className="ml-2"> Inactive </Badge> )} </div> <div className="flex gap-4 text-xs text-muted-foreground mt-1"> <div className="flex items-center gap-1"> <Users className="w-3 h-3" /> <span>{outlet.seats} seats</span> </div> <div className="flex items-center gap-1"> <Utensils className="w-3 h-3" /> <span>{outlet.covers} covers</span> </div> </div> <div className="text-xs bg-muted px-2 py-1 rounded mt-1"> Type: {outlet.type} </div> </DropdownMenuItem> ))} </div> {outlets.length > 0 && ( <> <DropdownMenuSeparator /> <div className="px-3 py-2 text-xs text-muted-foreground bg-muted"> Organization: {organization.name} </div> </> )} </DropdownMenuContent> </DropdownMenu> );
}
export function OutletSelectCompact() {
  const { outlets, currentOutlet, selectOutlet } = useMultiOutlet();
  if (outlets.length <= 1) {
    return null;
  }
  return (
    <Select
      value={currentOutlet?.id || ""}
      onValueChange={(value) => selectOutlet(value)}
    >
      {" "}
      <SelectTrigger className="w-48">
        {" "}
        <SelectValue placeholder="Select outlet" />{" "}
      </SelectTrigger>{" "}
      <SelectContent>
        {" "}
        {outlets.map((outlet) => (
          <SelectItem key={outlet.id} value={outlet.id}>
            {" "}
            <div className="flex items-center gap-2">
              {" "}
              <Building2 className="w-3 h-3" /> <span>{outlet.name}</span>{" "}
            </div>{" "}
          </SelectItem>
        ))}{" "}
      </SelectContent>{" "}
    </Select>
  );
} /** * Breadcrumb-style outlet navigation */
export function OutletBreadcrumb() {
  const { organization, currentOutlet } = useMultiOutlet();
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {" "}
      <span className="font-medium">{organization?.name}</span> <span>/</span>{" "}
      <span className="font-medium text-foreground">
        {" "}
        {currentOutlet?.name || "No outlet selected"}{" "}
      </span>{" "}
    </div>
  );
}
