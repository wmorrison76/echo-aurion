import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MenuBar from "@/components/MenuBar";
import ViewSelector from "@/components/ViewSelector";
import HelpSystem from "@/components/HelpSystem";
import EchoAi from "@/components/EchoAi";
import SmartSearch, { useGlobalSearch } from "@/components/SmartSearch";
import EchoHelp from "@/components/EchoHelp";
import AiCompanionTopNav from "@/components/AiCompanionTopNav";
import BottomRightLinks from "@/components/BottomRightLinks";
import PersistentAIAssistant from "@/components/PersistentAIAssistant";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Building2, Calendar, Users, TrendingUp, MessageSquare, Settings, Bell, Search, Plus, User, LogOut, Moon, Sun, ChevronDown, Target, Clock, Megaphone, UserCheck, UserCog, Heart, Shield, Smartphone, Server, Brain, DollarSign, BarChart3, BarChart4, FileText, Video } from 'lucide-react';
import { useState, useEffect, useRef } from "react";

interface LayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: Building2,
    description: "Overview of all activities, KPIs, and current status"
  },
  {
    name: "Sales Pipeline",
    href: "/sales",
    icon: Target,
    description: "Complete sales management, lead qualification, and customer lifecycle"
  },
  {
    name: "Marketing Plan",
    href: "/marketing-plan",
    icon: Megaphone,
    description: "Create and manage marketing campaigns, strategies, and promotional activities"
  },
  {
    name: "Lead Management",
    href: "/lead-management",
    icon: UserCheck,
    description: "Track, qualify, and nurture leads throughout the sales funnel"
  },
  {
    name: "Lead Generation System",
    href: "/lead-generation-system",
    icon: Target,
    description: "AI-powered lead generation with client classification and proactive relationship management"
  },
  {
    name: "Sales Meeting",
    href: "/sales-meeting",
    icon: Video,
    description: "Digital whiteboard, video conferencing, and collaborative tools for remote sales teams"
  },
  {
    name: "Contacts",
    href: "/contacts",
    icon: Users,
    description: "Manage clients, vendors, and team member information"
  },
  {
    name: "Guest Experience",
    href: "/guest-experience",
    icon: Heart,
    description: "Comprehensive guest profiles, journey mapping, and personalized communication"
  },
  {
    name: "Events",
    href: "/events",
    icon: Calendar,
    description: "Plan, schedule, and track all hospitality events"
  },
  {
    name: "BEO/REO",
    href: "/beo-reo",
    icon: MessageSquare,
    description: "Banquet Event Orders and Resume Event Orders management"
  },
  {
    name: "EchoScope BEO",
    href: "/echoscope-beo",
    icon: FileText,
    description: "AI-powered BEO/REO builder with weather intelligence and real-time menu ingestion"
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: TrendingUp,
    description: "Performance metrics, reports, and business intelligence"
  },
  {
    name: "Menu Analytics",
    href: "/menu-analytics",
    icon: BarChart3,
    description: "Track best-selling items and identify opportunities for menu optimization across outlets"
  },
  {
    name: "Revenue Management",
    href: "/revenue-management",
    icon: DollarSign,
    description: "Dynamic pricing optimization, demand forecasting, and competitive analysis"
  },
  {
    name: "Reputation Management",
    href: "/reputation-management",
    icon: Shield,
    description: "Monitor reviews, manage responses, and track sentiment across all platforms"
  },
  {
    name: "Mobile Apps",
    href: "/mobile-apps",
    icon: Smartphone,
    description: "Manage mobile applications, PWA configuration, and staff/guest portals"
  },
  {
    name: "PMS Integration",
    href: "/pms-integration",
    icon: Server,
    description: "Configure Property Management Systems, channel managers, and booking engines"
  },
  {
    name: "AI/ML Enhancement",
    href: "/ai-ml-enhancement",
    icon: Brain,
    description: "Manage AI models, predictive analytics, and personalization engines"
  },
  {
    name: "Advanced Analytics",
    href: "/advanced-analytics",
    icon: BarChart4,
    description: "Real-time insights, executive dashboards, and performance benchmarking"
  },
  {
    name: "Report Builder",
    href: "/report-builder",
    icon: FileText,
    description: "Create custom reports with drag-and-drop components and automated distribution"
  },
  {
    name: "Time Management",
    href: "/time-management",
    icon: Clock,
    description: "Track time, monitor productivity, and optimize your workflow"
  },
  {
    name: "Director Profile",
    href: "/director-profile",
    icon: UserCog,
    description: "Monitor team performance, track productivity metrics, and view strategic insights"
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    description: "System configuration, user preferences, and team management"
  },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { preferences, updatePreference, toggleSidebar } = useUserPreferences();
  const { isOpen: isSearchOpen, openSearch, closeSearch } = useGlobalSearch();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(preferences.sidebarExpanded);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number>(null);
  const [currentPage, setCurrentPage] = useState("");

  useEffect(() => {
    // Set current page for contextual help
    const path = location.pathname;
    if (path.includes('beo-reo')) setCurrentPage('beo-reo');
    else if (path.includes('contacts')) setCurrentPage('contacts');
    else if (path.includes('events')) setCurrentPage('events');
    else if (path.includes('analytics')) setCurrentPage('analytics');
    else setCurrentPage('dashboard');
  }, [location.pathname]);

  // Sync sidebar state with preferences
  useEffect(() => {
    setIsSidebarExpanded(preferences.sidebarExpanded);
  }, [preferences.sidebarExpanded]);

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        // Allow Ctrl+K for global search even in inputs
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          openSearch();
        }
        return;
      }

      // Help shortcut (anywhere)
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        // Trigger help dialog
        document.querySelector('[title="Help & Documentation (Press ? for shortcuts)"]')?.click();
      }

      // Focus search with forward slash
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        openSearch();
      }

      // Alt + Number shortcuts for sidebar navigation
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 7) {
          e.preventDefault();
          const navItems = document.querySelectorAll('aside nav a');
          const targetItem = navItems[num - 1] as HTMLElement;
          if (targetItem) {
            targetItem.click();
          }
        }
      }

      // Global shortcuts with Ctrl/Cmd
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            openSearch();
            break;
          case 'b':
            e.preventDefault();
            toggleSidebar();
            break;
          case 'n':
            e.preventDefault();
            // Trigger new BEO/REO creation
            document.querySelector('button:contains("New Event")')?.click();
            break;
          case 'e':
            e.preventDefault();
            // Navigate to events page
            window.location.href = '/events';
            break;
          case 'a':
            if (e.shiftKey) {
              e.preventDefault();
              // Open AI Sales Assistant
              document.querySelector('button:contains("AI Sales Assistant")')?.click();
            } else {
              e.preventDefault();
              // Navigate to analytics
              window.location.href = '/analytics';
            }
            break;
          case 'd':
            e.preventDefault();
            // Navigate to dashboard
            window.location.href = '/';
            break;
          case 'c':
            e.preventDefault();
            // Navigate to contacts
            window.location.href = '/contacts';
            break;
          case 's':
            if (e.shiftKey) {
              e.preventDefault();
              // Navigate to settings
              window.location.href = '/settings';
            } else {
              e.preventDefault();
              // Navigate to sales pipeline
              window.location.href = '/sales';
            }
            break;
          case 'E':
            if (e.shiftKey) {
              e.preventDefault();
              // Trigger Echo AI
              (document.querySelector('[title="Echo AI System Administrator"]') as HTMLElement | null)?.click();
            }
            break;
          case 'h':
            if (e.shiftKey) {
              e.preventDefault();
              // Open EchoHelp
              (document.querySelector('[title="EchoHelp - Interactive Tutorials"]') as HTMLElement | null)?.click();
            } else {
              e.preventDefault();
              // Navigate to help
              document.querySelector('[title="Help & Documentation (Press ? for shortcuts)"]')?.click();
            }
            break;
          case ',':
            e.preventDefault();
            // Open user preferences/settings
            window.location.href = '/settings';
            break;
          default:
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openSearch, toggleSidebar]);

  const toggleTheme = () => {
    const newTheme = preferences.theme === 'dark' ? 'light' : 'dark';
    updatePreference('theme', newTheme);
  };

  const handleSidebarMouseEnter = () => {
    if (!preferences.sidebarAutoCollapse) return;

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }

    // Only update if state actually needs to change
    if (!isSidebarExpanded) {
      setIsSidebarExpanded(true);
    }
  };

  const handleSidebarMouseLeave = () => {
    if (!preferences.sidebarAutoCollapse) return;

    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    hoverTimeoutRef.current = setTimeout(() => {
      // Only update if state actually needs to change
      if (isSidebarExpanded !== preferences.sidebarExpanded) {
        setIsSidebarExpanded(preferences.sidebarExpanded);
      }
    }, 300);
  };

  // Cleanup timeout and animation frames on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-background gradient-bg-light dark:gradient-bg-dark">
      {/* Background gradient overlay */}
      <div className="fixed inset-0 gradient-bg-light dark:gradient-bg-dark pointer-events-none" />

      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-[900] bg-background/95 backdrop-blur-xl border-b border-border/20 shadow-sm">
        <div className="flex h-16 items-center justify-between px-6">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="h-10 flex items-center">
                <svg width="120" height="40" viewBox="0 0 120 40" className="h-10 w-auto">
                  <rect width="120" height="40" rx="8" fill="url(#logoGradient)" />
                  <defs>
                    <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(var(--primary)/0.8)" />
                    </linearGradient>
                  </defs>
                  <text x="60" y="25" textAnchor="middle" className="fill-white font-bold text-sm">
                    EchoCRM
                  </text>
                </svg>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-8">
            <div
              className="relative cursor-pointer"
              onClick={openSearch}
              title="Global Search (Ctrl+K)"
            >
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <div className="w-full pl-10 pr-4 py-2 apple-input rounded-lg hover:border-primary/40 transition-all duration-200 text-sm flex items-center justify-between">
                <span className="text-muted-foreground">Search contacts, events, BEO/REO...</span>
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <kbd className="px-1.5 py-0.5 bg-background/50 rounded text-xs border">Ctrl</kbd>
                  <kbd className="px-1.5 py-0.5 bg-background/50 rounded text-xs border">K</kbd>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 apple-button"
              title={`Switch to ${preferences.theme === 'dark' ? 'light' : 'dark'} theme (Ctrl+Shift+T)`}
            >
              {preferences.theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 apple-button"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
            </Button>

            <div title="Echo AI System Administrator">
              <EchoAi isSystemAdmin={true} />
            </div>

            <EchoHelp />

            <HelpSystem currentPage={currentPage} />

            <AiCompanionTopNav />

            <Button
              size="sm"
              className="apple-button bg-primary hover:bg-primary/90"
              title="Create new event (Ctrl+N)"
              onClick={() => window.location.href = '/events'}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Event
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-white/10 dark:hover:bg-black/10 transition-all duration-200 border border-transparent hover:border-white/20 dark:hover:border-white/10 backdrop-blur-sm">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder.svg" alt="William Morrison" />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      WM
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <div className="text-sm font-medium text-foreground">William Morrison</div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-muted-foreground">Admin</div>
                      <div className="h-2 w-2 bg-green-500 rounded-full" title="Online"></div>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 glass-panel border border-white/20 dark:border-white/10">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10 dark:bg-white/5" />
                <DropdownMenuItem className="hover:bg-white/10 dark:hover:bg-black/10">
                  <User className="mr-2 h-4 w-4" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-white/10 dark:hover:bg-black/10">
                  <Settings className="mr-2 h-4 w-4" />
                  Preferences
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10 dark:bg-white/5" />
                <DropdownMenuItem className="hover:bg-white/10 dark:hover:bg-black/10 text-red-500 dark:text-red-400">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* Menu Bar - Fixed Position */}
      <div className="fixed top-16 left-0 right-0 z-[800] bg-background/95 backdrop-blur-xl">
        <MenuBar />
      </div>

      {/* View Selector */}
      <div className="fixed top-20 left-0 right-0 z-[700] py-3 bg-background/95 backdrop-blur-xl border-b border-border/20">
        <div className="pl-20 pr-6">
          <ViewSelector />
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={cn(
          "fixed left-0 top-16 bottom-0 z-[999] transition-all duration-300 ease-out overflow-hidden",
          "bg-background/95 dark:bg-background/90 backdrop-blur-xl",
          "border-r-2 border-foreground/10 dark:border-foreground/20",
          "shadow-lg dark:shadow-2xl dark:shadow-primary/20",
          isSidebarExpanded ? "w-64" : "w-16"
        )}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
      >
        <nav className="p-2 space-y-2">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Tooltip key={item.name} delayDuration={300}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center px-3 py-2.5 mx-2 rounded-lg text-sm font-medium transition-all duration-300 border border-transparent relative",
                      "min-h-[44px] flex-shrink-0",
                      isActive
                        ? isSidebarExpanded
                          ? "bg-primary/15 text-primary shadow-md border-primary/20 dark:bg-primary/20 dark:border-primary/30 dark:shadow-lg dark:shadow-primary/20"
                          : "text-primary relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-6 before:bg-primary before:rounded-r-full"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-muted-foreground/20 hover:shadow-sm dark:hover:bg-muted/30 dark:hover:border-muted-foreground/30 dark:hover:shadow-md dark:hover:shadow-primary/10"
                    )}
                  >
                    <item.icon className="h-5 w-5 min-w-[20px] flex-shrink-0" />
                    <span
                      className={cn(
                        "ml-3 whitespace-nowrap transition-all duration-300 ease-in-out",
                        isSidebarExpanded
                          ? "opacity-100 translate-x-0 delay-150"
                          : "opacity-0 -translate-x-4 delay-0"
                      )}
                      style={{
                        width: isSidebarExpanded ? 'auto' : '0',
                        overflow: 'hidden'
                      }}
                    >
                      {item.name}
                    </span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="glass-panel border border-white/20 dark:border-white/10 ml-2"
                  sideOffset={8}
                >
                  <div className="max-w-xs">
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="pt-40 pb-6 pr-6 pl-20 relative z-10 main-content-container">
        <div className={cn(
          "bg-background/95 backdrop-blur-sm rounded-xl overflow-hidden transition-all duration-200",
          "border-2 border-foreground/10 dark:border-foreground/20",
          "shadow-lg dark:shadow-2xl dark:shadow-primary/10"
        )}>
          <div className="p-0">
            {children}
          </div>
        </div>
      </main>

      {/* Global Smart Search */}
      <SmartSearch isOpen={isSearchOpen} onClose={closeSearch} />

      {/* Bottom Right Help Links */}
      <BottomRightLinks />

      {/* Persistent AI Assistant - Available on all pages */}
      <PersistentAIAssistant />
    </div>
    </TooltipProvider>
  );
}
