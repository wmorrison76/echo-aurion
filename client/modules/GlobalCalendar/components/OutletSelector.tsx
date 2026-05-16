/** * OutletSelector Component * Dropdown/modal to select which calendar outlets to display * Shows checkboxes for each outlet with color indicators */ import React, {
  useState,
  useEffect,
} from "react";
import { ChevronDown, Plus, Check } from "lucide-react";
import { cn } from "@/lib/glass";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useCalendarStore,
  useSelectedOutlets,
  useCalendarOutlets,
} from "../stores/useCalendarStore";
import { CalendarOutlet } from "@/types/calendar";
interface OutletSelectorProps {
  onCreateOutlet?: () => void;
  disabled?: boolean;
  compact?: boolean;
} /** * OutletSelector Component */
export const OutletSelector: React.FC<OutletSelectorProps> = ({
  onCreateOutlet,
  disabled = false,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const selectedOutlets = useSelectedOutlets();
  const outlets = useCalendarOutlets();
  const setSelectedOutlets = useCalendarStore(
    (state) => state.setSelectedOutlets,
  );
  const addSelectedOutlet = useCalendarStore(
    (state) => state.addSelectedOutlet,
  );
  const removeSelectedOutlet = useCalendarStore(
    (state) => state.removeSelectedOutlet,
  ); // Filter outlets based on search const filteredOutlets = outlets.filter( (outlet) => outlet.name.toLowerCase().includes(searchTerm.toLowerCase()) && !outlet.is_archived, ); // Get outlet names for display const selectedOutletNames = outlets .filter((o) => selectedOutlets.includes(o.id)) .map((o) => o.name); const displayText = selectedOutletNames.length === 0 ?"All Outlets" : selectedOutletNames.length <= 2 ? selectedOutletNames.join(",") : `${selectedOutletNames.length} Outlets`; const handleOutletToggle = (outletId: string) => { if (selectedOutlets.includes(outletId)) { removeSelectedOutlet(outletId); } else { addSelectedOutlet(outletId); } }; const handleSelectAll = () => { if (selectedOutlets.length === filteredOutlets.length) { setSelectedOutlets([]); } else { setSelectedOutlets(filteredOutlets.map((o) => o.id)); } }; const handleClear = () => { setSelectedOutlets([]); }; if (compact) { return ( <div className="relative"> <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)} disabled={disabled} className="flex items-center gap-2" > <div className="flex gap-1"> {selectedOutlets.slice(0, 3).map((id) => { const outlet = outlets.find((o) => o.id === id); return outlet ? ( <div key={id} className="w-3 h-3 rounded-full" style={{ backgroundColor: outlet.color }} title={outlet.name} /> ) : null; })} {selectedOutlets.length > 3 && ( <div className="text-xs font-medium"> +{selectedOutlets.length - 3} </div> )} </div> <ChevronDown className="w-4 h-4" /> </Button> {isOpen && ( <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-background dark:bg-card rounded-lg shadow-lg border border-slate-200 dark:border-slate-800"> <OutletDropdownContent filteredOutlets={filteredOutlets} selectedOutlets={selectedOutlets} searchTerm={searchTerm} onSearchChange={setSearchTerm} onToggle={handleOutletToggle} onSelectAll={handleSelectAll} onClear={handleClear} onCreateOutlet={onCreateOutlet} onClose={() => setIsOpen(false)} /> </div> )} </div> ); } return ( <Card className="p-4 border-l-4" style={{ borderLeftColor:"var(--primary, #3b82f6)" }} > <div className="space-y-4"> <div> <h3 className="font-semibold text-sm mb-3">Calendar Outlets</h3> {/* Selected badges */} {selectedOutlets.length > 0 && ( <div className="flex flex-wrap gap-2 mb-3"> {selectedOutletNames.map((name) => ( <Badge key={name} variant="secondary"> {name} </Badge> ))} </div> )} {/* Search */} <input type="text" placeholder="Search outlets..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-surface dark:border-border text-sm mb-3" /> {/* Outlet list */} <div className="space-y-2 max-h-64 overflow-y-auto"> {filteredOutlets.length === 0 ? ( <div className="text-sm text-muted-foreground py-4 text-center"> No outlets found </div> ) : ( filteredOutlets.map((outlet) => ( <label key={outlet.id} className="flex items-center gap-3 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors" > <input type="checkbox" checked={selectedOutlets.includes(outlet.id)} onChange={() => handleOutletToggle(outlet.id)} disabled={disabled} className="w-4 h-4 rounded cursor-pointer" /> <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: outlet.color }} /> <div className="flex-1 min-w-0"> <div className="text-sm font-medium truncate"> {outlet.name} </div> {outlet.description && ( <div className="text-xs text-muted-foreground truncate"> {outlet.description} </div> )} </div> {outlet.is_system && ( <Badge variant="outline" className="text-xs"> System </Badge> )} </label> )) )} </div> </div> {/* Actions */} <div className="flex gap-2 pt-2 border-t"> <Button variant="ghost" size="sm" onClick={handleSelectAll} disabled={disabled || filteredOutlets.length === 0} className="flex-1 text-xs" > Select All </Button> <Button variant="ghost" size="sm" onClick={handleClear} disabled={disabled || selectedOutlets.length === 0} className="flex-1 text-xs" > Clear </Button> {onCreateOutlet && ( <Button variant="outline" size="sm" onClick={onCreateOutlet} disabled={disabled} className="flex-1 text-xs gap-1" > <Plus className="w-3 h-3" /> New </Button> )} </div> </div> </Card> );
}; /** * Dropdown content component (extracted for reusability) */
interface OutletDropdownContentProps {
  filteredOutlets: CalendarOutlet[];
  selectedOutlets: string[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onToggle: (outletId: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onCreateOutlet?: () => void;
  onClose: () => void;
}
export const OutletDropdownContent: React.FC<OutletDropdownContentProps> = ({
  filteredOutlets,
  selectedOutlets,
  searchTerm,
  onSearchChange,
  onToggle,
  onSelectAll,
  onClear,
  onCreateOutlet,
  onClose,
}) => {
  return (
    <div className="p-4 space-y-3">
      {" "}
      {/* Search */}{" "}
      <input
        type="text"
        placeholder="Search outlets..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        autoFocus
        className="w-full px-3 py-2 border rounded-lg dark:bg-surface dark:border-border text-sm"
      />{" "}
      {/* Outlet list */}{" "}
      <div className="space-y-1 max-h-60 overflow-y-auto">
        {" "}
        {filteredOutlets.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            {" "}
            No outlets found{" "}
          </div>
        ) : (
          filteredOutlets.map((outlet) => (
            <label
              key={outlet.id}
              className="flex items-center gap-3 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors"
            >
              {" "}
              <div className="relative">
                {" "}
                <input
                  type="checkbox"
                  checked={selectedOutlets.includes(outlet.id)}
                  onChange={() => onToggle(outlet.id)}
                  className="w-4 h-4 rounded cursor-pointer accent-blue-500"
                />{" "}
                {selectedOutlets.includes(outlet.id) && (
                  <Check className="w-3 h-3 absolute inset-0 m-auto pointer-events-none text-white" />
                )}{" "}
              </div>{" "}
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: outlet.color }}
              />{" "}
              <div className="flex-1 min-w-0">
                {" "}
                <div className="text-sm font-medium">{outlet.name}</div>{" "}
              </div>{" "}
            </label>
          ))
        )}{" "}
      </div>{" "}
      {/* Actions */}{" "}
      <div className="flex gap-2 pt-2 border-t">
        {" "}
        <Button
          variant="ghost"
          size="sm"
          onClick={onSelectAll}
          disabled={filteredOutlets.length === 0}
          className="flex-1 text-xs"
        >
          {" "}
          All{" "}
        </Button>{" "}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={selectedOutlets.length === 0}
          className="flex-1 text-xs"
        >
          {" "}
          None{" "}
        </Button>{" "}
        {onCreateOutlet && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onCreateOutlet();
              onClose();
            }}
            className="flex-1 text-xs gap-1"
          >
            {" "}
            <Plus className="w-3 h-3" /> New{" "}
          </Button>
        )}{" "}
      </div>{" "}
    </div>
  );
};
export default OutletSelector;
