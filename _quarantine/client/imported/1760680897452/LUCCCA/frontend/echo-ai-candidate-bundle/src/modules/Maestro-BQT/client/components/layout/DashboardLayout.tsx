/**
 * Unified Dashboard Layout - Maestro Banquets
 * Persistent sidebar with high z-index overlay for all pages
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ChefHat, Calendar, ClipboardList, Users, Package, 
  BarChart3, Settings, Bell, Search, Plus, 
  Home, FileText, Clock, TrendingUp, MessageSquare,
  PanelLeft, X, ChevronRight, MessageCircle, Presentation,
  ArrowLeft, Menu, Maximize2, Minimize2, ArrowLeftRight
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button, buttonVariants } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { ThemeToggle } from '../ui/theme-toggle';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import { MaestroBqtTabs, MaestroBqtDefaultRows } from '../../modules/MaestroBqt';
import { FloatingCompanion } from '../ai/FloatingCompanion';
import { StickyNoteWidget, StickyNoteToggle } from '../ui/sticky-note';
import { resolveTenantFromEnv, applyTenantTheme, setActiveTenant } from '../../lib/tenant';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  showBackButton?: boolean;
  backUrl?: string;
}

// Enhanced Multi-View Navigation Structure
const navigationStructure = [
  {
    group: 'Command Center',
    items: [
      { id: 'dashboard', label: 'Overview Dashboard', icon: Home, href: '/', badge: null },
      { id: 'global-calendar', label: 'Event Calendar', icon: Calendar, href: '/calendar', badge: 'Active' },
    ]
  },
  {
    group: 'Kitchen Operations',
    priority: true,
    items: [
      { id: 'chef-kitchen', label: 'Chef Kitchen View', icon: ChefHat, href: '/kitchen', badge: '12 Active' },
      { id: 'menu-analytics', label: 'Menu Analytics', icon: BarChart3, href: '/menu-analytics', badge: 'Live' },
    ]
  },
  {
    group: 'Event Management',
    items: [
      { id: 'beo-management', label: 'BEO Documents', icon: FileText, href: '/beo-management/new', badge: '3 New' },
      { id: 'team-dashboard', label: 'Staff Assignment', icon: Users, href: '/team-dashboard', badge: null },
      { id: 'personal-calendar', label: 'Personal Calendar', icon: Calendar, href: '/personal-calendar', badge: null },
    ]
  },
  {
    group: 'Resources',
    items: [
      { id: 'inventory', label: 'Inventory Tracking', icon: Package, href: '/inventory', badge: 'Low Stock' },
      { id: 'ordering', label: 'Ordering & Invoices', icon: ArrowLeftRight, href: '/ordering', badge: null },
      { id: 'internal-chat', label: 'Team Communication', icon: MessageCircle, href: '/chat', badge: '5' },
    ]
  },
  {
    group: 'System',
    items: [
      { id: 'settings', label: 'System Settings', icon: Settings, href: '/settings', badge: null },
    ]
  }
];

// Enhanced Sidebar Component with High Z-Index Overlay
const PersistentSidebar: React.FC<{
  isCollapsed: boolean;
  onToggle: () => void;
  isOverlay: boolean;
  onClose?: () => void;
}> = ({ isCollapsed, onToggle, isOverlay, onClose }) => {
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const tenant = React.useMemo(() => resolveTenantFromEnv(), []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {/* Overlay backdrop for mobile */}
      {isOverlay && !isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 h-full transition-all duration-300 ease-out z-[9999]",
        "sidebar-floating glass-panel",
        isCollapsed ? "w-16" : "w-64",
        isOverlay && "shadow-2xl"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex-1">
                <h2 className="font-bold text-lg">{tenant.brand.name}</h2>
                {tenant.brand.subtitle && (
                  <p className="text-sm text-muted-foreground">{tenant.brand.subtitle}</p>
                )}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={isOverlay ? onClose : onToggle}
              className="ml-auto"
            >
              {isOverlay ? (
                <X className="h-4 w-4" />
              ) : isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Time Display */}
        {!isCollapsed && (
          <div className="px-4 py-2 border-b border-border/50 bg-muted/30">
            <div className="text-center">
              <div className="text-lg font-bold text-primary">
                {currentTime.toLocaleTimeString('en-US', { 
                  hour12: false, 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
              <div className="text-xs text-muted-foreground">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'short',
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        {!isCollapsed && (
          <div className="p-4 border-b border-border/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-10 bg-background/50"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6">
            {navigationStructure.map((group, groupIndex) => (
              <div key={groupIndex}>
                {!isCollapsed && (
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {group.group}
                  </h4>
                )}
                <div className={cn(
                  "space-y-1",
                  group.priority && "border-l-4 border-primary pl-2 bg-primary/5 rounded-r-lg py-2"
                )}>
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.href ||
                                   (location.pathname.startsWith('/beo-management') && item.id === 'beo-management') ||
                                   (location.pathname.startsWith('/calendar') && item.id === 'global-calendar') ||
                                   (location.pathname.startsWith('/kitchen') && item.id === 'chef-kitchen') ||
                                   (location.pathname.startsWith('/production') && item.id === 'production-mgmt');
                    return (
                      <Link
                        key={item.id}
                        to={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
                          "hover:bg-accent hover:text-accent-foreground group",
                          isActive && "bg-accent text-accent-foreground shadow-md",
                          isCollapsed && "justify-center",
                          group.priority && "bg-gradient-to-r from-primary/10 to-transparent hover:from-primary/20"
                        )}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <item.icon className={cn(
                          "h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110",
                          group.priority && "text-primary"
                        )} />
                        {!isCollapsed && (
                          <>
                            <span className={cn(
                              "flex-1 font-medium",
                              group.priority && "text-primary font-semibold"
                            )}>{item.label}</span>
                            {item.badge && (
                              <Badge
                                variant={group.priority ? "default" : "secondary"}
                                className={cn(
                                  "text-xs transition-all",
                                  group.priority && "bg-primary text-primary-foreground animate-pulse"
                                )}
                              >
                                {item.badge}
                              </Badge>
                            )}
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">GJ</span>
            </div>
            {!isCollapsed && (
              <div className="flex-1">
                <div className="text-sm font-medium">Chef Gio</div>
                <div className="text-xs text-muted-foreground">Executive Chef</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// Top Launch Bar Component
const TopLaunchBar: React.FC = () => {
  const location = useLocation();
  const isChefContext = location.pathname.startsWith('/kitchen');
  return (
    <div className="border-t border-border/50 bg-background/70 backdrop-blur-md supports-[backdrop-filter]:bg-background/50">
      <div className="px-4 lg:px-6 py-3">
        <div className="flex items-center gap-4 flex-wrap">
          {navigationStructure.map((group, gi) => (
            <div key={gi} className="flex items-center gap-3 pr-5 mr-3 border-r last:border-r-0">
              {group.items.map((item) => {
                const isActive = location.pathname === item.href ||
                  (location.pathname.startsWith('/beo-management') && item.id === 'beo-management') ||
                  (location.pathname.startsWith('/calendar') && item.id === 'global-calendar') ||
                  (location.pathname.startsWith('/kitchen') && item.id === 'chef-kitchen') ||
                  (location.pathname.startsWith('/production') && item.id === 'production-mgmt');
                const Icon = item.icon as any;
                const href = item.id === 'beo-management' && isChefContext ? `${item.href}?mode=view` : item.href;
                return (
                  <Link key={item.id} to={href} className="group">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={cn(
                          "relative flex items-center justify-center w-10 h-10 rounded-xl border bg-white/60 dark:bg-slate-900/60 backdrop-blur-md shadow-sm",
                          "transition-all duration-150 ease-out hover:scale-110 hover:-translate-y-0.5",
                          isActive && "ring-2 ring-primary/40"
                        )} aria-label={item.label}>
                          <Icon className="h-5 w-5" />
                          {item.badge && (
                            <Badge variant={isActive ? 'secondary' : 'outline'} className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] px-1 py-0 rounded-full">
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>{item.label}</TooltipContent>
                    </Tooltip>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Layout Component
import { useBEOStore } from '../../stores/beoStore';
const BellButton: React.FC = () => {
  const [pulse, setPulse] = React.useState(false);
  const navigate = useNavigate();
  const initialBeos = Object.keys(useBEOStore.getState().beos).length;
  const initialEvents = useBEOStore.getState().events.length;
  const [seen, setSeen] = React.useState<{beos:number;events:number}>(()=>{ try{ const raw=localStorage.getItem('beo:lastSeen'); return raw? JSON.parse(raw) : { beos: initialBeos, events: initialEvents }; }catch{ return { beos: initialBeos, events: initialEvents }; } });
  const beoCount = useBEOStore(s=> Object.keys(s.beos).length);
  const evtCount = useBEOStore(s=> s.events.length);
  const unseenBeos = Math.max(0, beoCount - (seen.beos||0));
  React.useEffect(()=>{
    // If there are unseen items on mount (from while offline), alert once
    if((beoCount - (seen.beos||0)) > 0 || (evtCount - (seen.events||0)) > 0){
      setPulse(true); safeBeep();
    }
    const unsub1 = useBEOStore.subscribe(s=> Object.keys(s.beos).length, (next, prev)=>{
      if(next>prev){ setPulse(true); safeBeep(); setSeen(v=> ({ ...v, beos: next })); persistSeen(next, undefined); }
    });
    const unsub2 = useBEOStore.subscribe(s=> s.events.length, (next, prev)=>{
      if(next>prev){ setPulse(true); safeBeep(); setSeen(v=> ({ ...v, events: next })); persistSeen(undefined, next); }
    });
    return ()=> { unsub1(); unsub2(); };
  },[]);
  const onClick = ()=>{ setPulse(false); persistSeen(beoCount, evtCount); setSeen({ beos: beoCount, events: evtCount }); navigate('/calendar'); };
  return (
    <div className="relative">
      <Button variant={unseenBeos>0? 'destructive':'outline'} size="sm" onClick={onClick} aria-label="Notifications">
        <Bell className={cn("h-4 w-4", (pulse||unseenBeos>0) && "text-white animate-bounce")} />
      </Button>
      {unseenBeos>0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-4 px-1 bg-red-500 text-white text-[10px] leading-4 text-center rounded-full">
          {unseenBeos}
        </span>
      )}
    </div>
  );
};
function persistSeen(beos?: number, events?: number){ try{ const prev = JSON.parse(localStorage.getItem('beo:lastSeen')||'{}'); localStorage.setItem('beo:lastSeen', JSON.stringify({ beos: beos?? prev.beos ?? 0, events: events ?? prev.events ?? 0 })); }catch{} }
function safeBeep(){ try{ beep(); }catch{} }

function beep(){ try{ const ctx=new (window.AudioContext|| (window as any).webkitAudioContext)(); const o=ctx.createOscillator(); const g=ctx.createGain(); o.type='sine'; o.frequency.value=880; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(0.001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime+0.01); o.start(); o.stop(ctx.currentTime+0.2); }catch{}
}

export const DashboardLayout: React.FC<DashboardLayoutProps & { hideBrandIcon?: boolean }> = ({
  children,
  title,
  subtitle,
  actions,
  showBackButton = false,
  backUrl = '/',
  hideBrandIcon = false
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();


  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSidebarToggle = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const handleMobileMenuClose = () => {
    setMobileMenuOpen(false);
  };

  // Resolve tenant and apply theme once
  const tenant = React.useMemo(() => resolveTenantFromEnv(), []);
  React.useEffect(() => { try { applyTenantTheme(document, tenant); } catch {} }, [tenant]);
  React.useEffect(() => { try { setActiveTenant(tenant.id as any); } catch {} }, [tenant]);

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content Area with Top Launch Bar */}
      <div className={cn(
        "transition-all duration-300 ease-out min-h-screen"
      )}>
        {/* Top Header Bar */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center justify-between px-4 lg:px-6 py-3">
            <div className="flex items-center gap-3">
              {!hideBrandIcon && (
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <ChefHat className="h-5 w-5 text-white" />
                </div>
              )}
              <div>
                {title && (
                  <h1 className="text-xl lg:text-2xl font-bold text-primary">{title}</h1>
                )}
                {subtitle && (
                  <p className="text-muted-foreground text-sm">{subtitle}</p>
                )}
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2 lg:gap-4">
              {actions}
              <StickyNoteToggle />
              <Link to="/settings" className={buttonVariants({ variant: 'outline', size: 'icon' })} aria-label="Open Settings">
                <Settings className="h-4 w-4" />
              </Link>
              <Link
                to="/calendar"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
                aria-label="Open Global Calendar"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Global Calendar
              </Link>
              <ThemeToggle />
              <BellButton />
            </div>
          </div>
          <div className="px-4 lg:px-6 py-3">
            <div className="hidden md:block">
              <MaestroBqtTabs
                maxRows={3}
                initial={{ rows: MaestroBqtDefaultRows }}
                onUndock={()=> navigate('/whiteboard')}
                actions={{
                  openRoute: (path)=> navigate(path),
                  openLink: (url)=> window.open(url, '_blank'),
                  openPanel: (id)=> {
                    if (id === 'ProductionPlannerPanel') navigate('/production');
                    else if (id === 'ButcherPanel') navigate('/butcher');
                    else if (id === 'PrepListPanel') navigate('/production?view=lists');
                    else if (id === 'SchedulerPanel') navigate('/production?view=schedule');
                  }
                }}
              />
            </div>
          </div>
        </div>


        {/* Page Content (whiteboard-style container across pages) */}
        <div className="px-4 lg:px-6 py-6">
          <div className="glass-panel-elevated rounded-2xl p-4 md:p-6">
            {children}
          </div>
        </div>
      </div>
      <FloatingCompanion />
      {/* Sticky note floating widget (global) */}
      <StickyNoteWidget />
    </div>
  );
};

export default DashboardLayout;
