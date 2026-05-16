import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Box,
  Calendar,
  Users,
  BarChart3,
  Settings,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
const navigation = [
  { name: "Studio", href: "/studio", icon: Box },
  { name: "Planner", href: "/planner", icon: Users },
  { name: "Events", href: "/events", icon: Calendar },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];
export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation(); // Hide global nav entirely on Studio, Planner, Designer, and Layout; their title bars take over if ( location.pathname.startsWith("/studio") || location.pathname.startsWith("/planner") || location.pathname.startsWith("/designer") || location.pathname.startsWith("/layout") ) return null; return ( <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[min(1200px,calc(100%-2rem))]"> <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-apple px-4 sm:px-6"> <div className="flex justify-between items-center h-14"> {/* Links only (logo moved to Studio title bar) */} <div className="hidden md:flex items-center space-x-1"> {navigation.map((item) => { const Icon = item.icon; const isActive = location.pathname === item.href; return ( <Link key={item.name} to={item.href} className={cn("flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200", isActive ?"bg-primary/10 text-primary shadow-glow" :"text-muted-foreground hover:text-foreground hover:bg-accent/40", )} > <Icon className="h-4 w-4" /> <span>{item.name}</span> </Link> ); })} </div> {/* CTA Button */} <div className="hidden md:flex items-center ml-auto"> <Link to="/studio"> <Button size="sm" className="shadow-glow relative overflow-hidden group rounded-xl" > <span className="relative z-10 flex items-center space-x-2"> <Sparkles className="h-4 w-4" /> <span>Open Studio</span> </span> <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-90 group-hover:opacity-100 transition-opacity" /> </Button> </Link> </div> {/* Mobile menu button */} <div className="md:hidden ml-auto"> <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)} className="relative z-10" > {isOpen ? ( <X className="h-5 w-5" /> ) : ( <Menu className="h-5 w-5" /> )} </Button> </div> </div> </div> {/* Mobile Navigation */} {isOpen && ( <div className="md:hidden mt-2 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-apple"> <div className="px-3 pt-2 pb-3 space-y-1"> {navigation.map((item) => { const Icon = item.icon; const isActive = location.pathname === item.href; return ( <Link key={item.name} to={item.href} onClick={() => setIsOpen(false)} className={cn("flex items-center space-x-3 px-3 py-2 rounded-xl text-base font-medium transition-all duration-200", isActive ?"bg-primary/10 text-primary border-l-2 border-primary" :"text-muted-foreground hover:text-foreground hover:bg-accent/40", )} > <Icon className="h-5 w-5" /> <span>{item.name}</span> </Link> ); })} <div className="pt-2 pb-2"> <Link to="/studio" onClick={() => setIsOpen(false)} className="block" > <Button size="sm" className="w-full shadow-glow rounded-xl"> <Sparkles className="h-4 w-4 mr-2" /> Open Studio </Button> </Link> </div> </div> </div> )} </nav> );
}
