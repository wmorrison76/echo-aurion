import { Plus, CalendarDays, PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MobileBottomNav({ onAdd, onToday, onOpenDrawer }:{ onAdd: ()=>void; onToday: ()=>void; onOpenDrawer: ()=>void }){
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/90 backdrop-blur md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="container px-2 py-2 grid grid-cols-3 gap-2">
        <Button size="xs" variant="secondary" onClick={onToday}><CalendarDays className="mr-1"/>Today</Button>
        <Button size="xs" onClick={onAdd}><Plus className="mr-1"/>Add</Button>
        <Button size="xs" variant="outline" onClick={onOpenDrawer}><PanelRight className="mr-1"/>Drawer</Button>
      </div>
    </div>
  );
}
