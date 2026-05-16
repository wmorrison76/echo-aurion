import { Layers3, BookOpen, CalendarDays, DollarSign, BarChart2, Star } from "lucide-react";

export default function LeftSidebarDock(){
  const items = [
    { icon: <Layers3 className="w-4 h-4"/>, label: 'Dashboard' },
    { icon: <Layers3 className="w-4 h-4"/>, label: 'Scheduler Board', active: true },
    { icon: <BookOpen className="w-4 h-4"/>, label: 'LMS Control Panel' },
    { icon: <CalendarDays className="w-4 h-4"/>, label: 'Forecast Panel' },
    { icon: <DollarSign className="w-4 h-4"/>, label: 'Finance + GL Costing' },
    { icon: <BarChart2 className="w-4 h-4"/>, label: 'Analytics & Reports' },
    { icon: <Star className="w-4 h-4"/>, label: 'Staff Ratings' },
  ];
  return (
    <aside className="hidden lg:block w-56 border-r bg-background/50 p-2 space-y-1">
      {items.map((it)=> (
        <div key={it.label} className={`flex items-center gap-2 px-2 py-1 rounded-md text-sm ${it.active? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}> 
          {it.icon}<span className="truncate">{it.label}</span>
        </div>
      ))}
    </aside>
  );
}
