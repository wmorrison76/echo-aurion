import React, { useEffect, useRef, useState } from "react";
import { Plus, Users, Calendar, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
interface QuickActionFABProps {
  onNewProspect?: () => void;
  onNewEvent?: () => void;
  onGenerateBEO?: () => void;
}
export default function QuickActionFAB({
  onNewProspect,
  onNewEvent,
  onGenerateBEO,
}: QuickActionFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null); // Keyboard shortcut: Cmd+N for quick create useEffect(() => { const handleKeyDown = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key ==="n") { e.preventDefault(); setIsOpen(!isOpen); } }; window.addEventListener("keydown", handleKeyDown); return () => window.removeEventListener("keydown", handleKeyDown); }, [isOpen]); const handleActionClick = (action: string) => { setSelectedAction(action); setIsAnimating(true); setTimeout(() => { switch (action) { case"prospect": onNewProspect?.(); break; case"event": onNewEvent?.(); break; case"beo": onGenerateBEO?.(); break; } setIsOpen(false); }, 300); }; return ( <> {/* Floating Action Button */} <DropdownMenu open={isOpen} onOpenChange={setIsOpen}> <DropdownMenuTrigger asChild> <Button ref={triggerRef} size="lg" className={cn("fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300","z-40", isOpen &&"scale-110" )} title="Quick Actions (Cmd+N)" > <Plus className={cn("h-6 w-6 transition-transform duration-300", isOpen &&"rotate-45")} /> </Button> </DropdownMenuTrigger> <DropdownMenuContent align="end" className="w-56"> <DropdownMenuLabel>Quick Actions</DropdownMenuLabel> <DropdownMenuSeparator /> <DropdownMenuItem onClick={() => handleActionClick("prospect")} className="gap-2 cursor-pointer" > <Users className="h-4 w-4" /> <div className="flex flex-col"> <span className="font-medium">New Prospect</span> <span className="text-xs text-muted-foreground">Add a new lead to pipeline</span> </div> </DropdownMenuItem> <DropdownMenuItem onClick={() => handleActionClick("event")} className="gap-2 cursor-pointer" > <Calendar className="h-4 w-4" /> <div className="flex flex-col"> <span className="font-medium">New Event</span> <span className="text-xs text-muted-foreground">Create a new event booking</span> </div> </DropdownMenuItem> <DropdownMenuItem onClick={() => handleActionClick("beo")} className="gap-2 cursor-pointer" > <FileText className="h-4 w-4" /> <div className="flex flex-col"> <span className="font-medium">Generate BEO</span> <span className="text-xs text-muted-foreground">Create Banquet Event Order</span> </div> </DropdownMenuItem> <DropdownMenuSeparator /> <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center gap-1"> <AlertCircle className="h-3 w-3" /> Shortcut: Cmd+N </div> </DropdownMenuContent> </DropdownMenu> {/* Action Dialog Placeholder */} {selectedAction && ( <Dialog open={!!selectedAction} onOpenChange={() => setSelectedAction(null)}> <DialogContent> <DialogHeader> <DialogTitle> {selectedAction ==="prospect" &&"New Prospect"} {selectedAction ==="event" &&"New Event"} {selectedAction ==="beo" &&"Generate BEO"} </DialogTitle> <DialogDescription> {selectedAction ==="prospect" &&"Add a new prospect to your sales pipeline"} {selectedAction ==="event" &&"Create a new event booking"} {selectedAction ==="beo" &&"Generate a new Banquet Event Order"} </DialogDescription> </DialogHeader> <div className="py-6 text-center text-muted-foreground"> Dialog form will be integrated here </div> </DialogContent> </Dialog> )} </> );
}
